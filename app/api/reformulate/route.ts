import { z } from "zod";
import { NextResponse } from "next/server";
import { badRequest, ok } from "@/lib/api";
import { AI_CONSTITUTION } from "@/lib/governance";
import { runSemanticAnalysis } from "@/lib/services/semantic-analysis-service";
import { evaluateContent } from "@/lib/services/content-evaluation-service";
import { describeProviderError } from "@/lib/ai-provider-errors";
import { mentionsSource, researchTrustedSources } from "@/lib/services/web-research-service";
import { countHardLanguageErrors, HARD_LANGUAGE_CATEGORIES } from "@/lib/language-gate";
import { WRITING_CODE } from "@/lib/writing-code";
import { NO_SUBSTANCE_MESSAGE, NON_COMPLIANT_MESSAGE, OUT_OF_MANDATE_MESSAGE } from "@/lib/reformulate-messages";
import { recordUsage, runWithCostMeter, meterCostUsd, currentMeter } from "@/lib/cost-meter";
import { ledgerDb, deductUsd } from "@/lib/cost-ledger";
import { completeJob, createJob, failJob, jobsDb } from "@/lib/content-jobs";
import { waitUntil } from "@vercel/functions";

// مدة تنفيذ صريحة على فيرسل — إعادة الصياغة دورة ذكاء كاملة (توليد + حكم)
// تتجاوز المدة الافتراضية القصيرة فتُقطع في منتصفها بدون هذا التصريح.
export const maxDuration = 300;

const schema = z.object({
  text: z.string().min(5),
  contentType: z.string().optional(),
  channel: z.string().optional(),
  audience: z.string().optional(),
  purpose: z.string().optional(),
  // حد الأحرف الأقصى للقناة — الصياغة المقترحة تلتزم به مثل النص الأصلي
  charLimit: z.number().int().positive().max(100000).optional(),
  findings: z.array(z.object({
    issue: z.string(),
    evidence: z.string(),
    suggestedSaferWording: z.string(),
    legalReference: z.string()
  })).default([]),
  languageIssues: z.array(z.object({
    message: z.string(),
    excerpt: z.string().optional(),
    suggestion: z.string().optional()
  })).default([]),
  // بقرار مالكة المنصة: البحث في التحسين يعمل إن كان النص يتضمن مصدراً — يُكشف تلقائياً،
  // أو يُقرّه المستخدم صراحةً من مسار المراجعة (hasSource) فيُدعَّم بمصدر موثوق حقيقي.
  hasSource: z.boolean().optional(),
  // وصف المرجع الذي يريده المستخدم أو رابطه — يوجّه البحث بدقة داخل المصادر المعتمدة.
  sourceHint: z.string().max(500).optional()
});

// إكمال تلقائي: إن قُطعت الصياغة لبلوغ سقف التوكنز تُطلب متابعتها من حيث توقفت
// دون تكرار، ثم تُدمج — فلا تُعرض صياغة مقترحة ناقصة أبداً مهما طالت.
async function callModel(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const messages: { role: "user" | "assistant"; content: string }[] = [{ role: "user", content: userPrompt }];
  let full = "";
  let stopReason: string | undefined;
  for (let round = 0; round < 4; round++) {
    const response = await fetch(`${process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com"}/v1/messages`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 4096,
        thinking: { type: "disabled" },
        // تخزين مؤقت للموجّه الثابت الضخم (الدستور + المدونة + القواعد) — يخفض تكلفة
        // مدخلاته نحو ٩٠٪ في كل نداء تالٍ خلال الجولات (بقرار مالكة المنصة لضبط الاستهلاك)
        system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
        messages
      })
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(err.error?.message ?? "تعذر إنشاء الصياغة المقترحة");
    }
    const data = await response.json() as { content?: Array<{ type?: string; text?: string }>; stop_reason?: string; usage?: unknown };
    recordUsage(data.usage); // عدّاد التكلفة الداخلي
    const part = data.content?.find((item) => item.type === "text")?.text ?? "";
    full += part;
    stopReason = data.stop_reason;
    if (stopReason !== "max_tokens") break;
    messages.push({ role: "assistant", content: part });
    messages.push({
      role: "user",
      content: "أكمل النص من حيث توقفت تماماً — لا تُعد كتابة أي كلمة سبقت، ولا تضف أي مقدمة أو تعليق، تابع مباشرة حتى يكتمل النص وينتهي بخاتمته الطبيعية."
    });
  }
  return full.trim();
}

// التحقق الإلزامي: الصياغة المقترحة تمر عبر محركي الامتثال واللغة قبل عرضها.
// لا تُعرض أي صياغة فيها مخالفات أو أخطاء إملائية/نحوية.
async function verifySuggestion(
  text: string,
  context: { contentType?: string; channel?: string; audience?: string; purpose?: string }
) {
  const [semantic, evaluation] = await Promise.all([
    runSemanticAnalysis(text, context),
    evaluateContent(text, context)
  ]);
  // ★ بقرار مالكة المنصة: يحجب عرض الصياغة الخطأُ القطعي (إملاء/نحو/اتساق مصطلحات)
  // والمخالفة والمخاطر؛ أما الملاحظة الأسلوبية (أسلوب/وضوح) فإرشادية لا تحجب — فلا
  // تدخل الصياغة النظيفة حلقةً لا تنتهي بسبب تفضيل ذوقي متغيّر. الكشف كما هو.
  const hardLangErrors = countHardLanguageErrors(evaluation.language.issues);
  const clean =
    semantic.findings.length === 0 &&
    evaluation.language.passed &&
    hardLangErrors === 0 &&
    evaluation.risks.level === "منخفض";

  // جولات التصحيح تُوجَّه للحواجز فقط (مخالفة/خطأ قطعي/مخاطر) — لا للأسلوبيات الذوقية
  const remainingNotes = [
    ...semantic.findings.map(
      (f) => `- مخالفة: ${f.issue} — العبارة: "${f.evidence}" — البديل الآمن: ${f.suggestedSaferWording}`
    ),
    ...evaluation.language.issues
      .filter((i) => (HARD_LANGUAGE_CATEGORIES as readonly string[]).includes(i.category ?? ""))
      .map((i) => `- خطأ لغوي قطعي: "${i.excerpt ?? ""}" — ${i.message}${i.suggestion ? ` — التصحيح: ${i.suggestion}` : ""}`),
    ...(evaluation.risks.level !== "منخفض"
      ? [`- مخاطر مهنية (${evaluation.risks.level}): ${evaluation.risks.explanation}${evaluation.risks.fix ? ` — المعالجة: ${evaluation.risks.fix}` : ""}`]
      : [])
  ];
  return { clean, remainingNotes };
}

type ReformOutcome =
  | { ok: true; suggestedText: string; sources: { title: string; url: string }[]; sourceNote?: string }
  | { ok: false; status: number; error: string };

// يكشف مخرجاً ليس صياغةً فعلية: رمز «بلا مضمون» الذي يُخرجه النموذج عند نصٍّ بلا مضمون
// قابل لإعادة الصياغة، أو اعتذارٌ/طلب معلومات، أو تسرّبٌ للغة داخلية. عندئذٍ نعرض رسالة
// مهنية مختصرة بدل عرض اعتذار النموذج الطويل كأنه «صياغة محسّنة». لا يمسّ منطق الفحص.
// المحتوى خارج ولاية المنصة (الخطاب الديني والعقدي والفتوى) — رسالة مستقلة عن «بلا مضمون»
// كي لا يُقال لنصٍّ فيه مضمون إنه بلا مضمون.
function isOutOfMandateOutput(output: string): boolean {
  return output.trim().includes("__OUT_OF_MANDATE__");
}

function isNonSubstantiveOutput(output: string): boolean {
  const t = output.trim();
  if (t.includes("__NO_SUBSTANCE__")) return true;
  const startsWithRefusal = /^(لا يمكنني|لا أستطيع|يتعذّر|يتعذر|عذرًا|عذراً|للأسف|أعتذر)/.test(t);
  const leaksInternal = /(القواعد الحاكمة|المدونة المذكورة|حظر التخمين|الاستكمال بالافتراض|القواعد المذكورة أعلاه|وفق القواعد أعلاه|تعليماتي)/.test(t);
  const demandsInputs = /(أحتاج منك|يرجى تزويدي|بعد تزويدي|زوّدني بـ|حدّد لي المجال)/.test(t);
  return startsWithRefusal || leaksInternal || demandsInputs;
}

// دورة إعادة الصياغة الكاملة (بحث + كتابة + تحقق + تصحيح) — تُشغَّل خلفياً كي لا
// يبقى المستخدم على طلب طويل متزامن ينقطع على الجوال. لا تمسّ منطق الفحص إطلاقاً.
async function runReformulation(data: z.infer<typeof schema>, apiKey: string): Promise<ReformOutcome> {
  const { text, contentType, channel, audience, purpose, charLimit, findings, languageIssues, hasSource, sourceHint } = data;
  const context = { contentType, channel, audience, purpose };

  // ★ طبقة البحث الحي في التحسين (بقرار مالكة المنصة): تعمل فقط إن كان النص المُحسَّن
  // يتضمن مصدراً أو مرجعاً أو دراسة — يُكشف تلقائياً أو يُقرّه المستخدم (hasSource).
  // فتُجلب مصادر موثوقة حقيقية يستند إليها التحسين بدل إبقاء تخمين النص الأصلي.
  // لا تمسّ الفحص: الصياغة المحسّنة تمرّ على المؤشرات كاملةً. فشلها لا يوقف التحسين.
  let researchBlock = "";
  // المصادر المعتمدة المجلوبة — تُعاد للواجهة لعرضها كأدلة مرئية (لوحة «المصادر المعتمدة»)
  let researchSources: { title: string; url: string }[] = [];
  // إشعار المصارحة: أقرّ المستخدم بمرجع ولم يُعثر على مطابق — يُبلَّغ صراحةً لا صمتاً
  let sourceNote: string | undefined;
  if (hasSource || mentionsSource(text)) {
    const hint = (sourceHint ?? "").trim();
    const research = await researchTrustedSources({
      contentType,
      topic: text.slice(0, 500),
      // وصف/رابط المرجع الذي حدده المستخدم يوجّه البحث بدقة داخل المصادر المعتمدة
      spec: hint ? { wantSource: true, sourceDesc: hint } : undefined,
      // صار المسار خلفياً، فيحتمل السقف الكامل (٦٠ث) لجودة أعلى للمصادر — والدورة
      // كلها ضمن حدّ الدالة (٣٠٠ث) وحدّ المتابعة (٦ دقائق)، بلا انقطاع على الجوال.
      timeoutMs: 60_000,
    });
    if (research) {
      researchSources = research.sources; // للعرض كأدلة مرئية
      const sourceLines = research.sources.map((s) => `- ${s.title}: ${s.url}`).join("\n");
      researchBlock = [
        "",
        "★ مصادر موثوقة مجلوبة من البحث الحي في جهات رسمية وأكاديمية معتمدة — إن أشار النص الأصلي إلى مصدر أو دراسة أو رقم، فصحّحه أو ادعمه بهذه المصادر الحقيقية واذكر رابطها في النص عند الاستشهاد. ممنوع الإبقاء على رقم مادة أو دراسة أو إحصائية لا سند لها هنا؛ وما لا تجد له سنداً موثوقاً اعرضه نسبةً عامة صادقة دون رقم مخترع.",
        "تقرير المصادر:",
        research.briefing,
        "قائمة الروابط للاستشهاد:",
        sourceLines,
      ].join("\n");
    } else if (hasSource) {
      sourceNote = "طُلب تعزيز الصياغة بمرجع موثّق، ولم يُعثر على مصدر مطابق في المصادر المعتمدة — صيغ النص بنسبة عامة صادقة دون اختلاق مرجع. يمكنك إعادة المحاولة بوصف أدق للمرجع أو رابطه.";
    }
  }

  const findingsList = findings.length
    ? findings.map((f, i) =>
        `${i + 1}. المشكلة: ${f.issue}\n   العبارة المتأثرة: "${f.evidence}"\n   التوجيه القانوني: ${f.suggestedSaferWording}\n   المرجع: ${f.legalReference}`
      ).join("\n\n")
    : "لا توجد ملاحظات امتثالية.";

  const languageList = languageIssues.length
    ? languageIssues.map((i) => `- "${i.excerpt ?? ""}" → ${i.suggestion ?? i.message}`).join("\n")
    : "لا توجد ملاحظات لغوية أو إملائية.";

  const systemPrompt = [
    AI_CONSTITUTION,
    "",
    "أنت محرر متخصص في ضبط ما ينشره المحامي باسمه المهني مهما كان موضوعه، وفق قواعد السلوك المهني ونظام المحاماة في المملكة ولائحته التنفيذية — فهذه القواعد تحكم كل ما ينشره المحامي باسمه لا منشوراته القانونية وحدها.",
    "",
    "مهمتك إعادة كتابة النص بحيث يكون النص المُخرَج خالياً تماماً من المخالفات القانونية والمهنية التالية:",
    "المحظورات الصريحة التي يجب أن يخلو منها النص المقترح:",
    "- أي وعد أو ضمان بنتيجة قانونية أو نسبة نجاح أو ربح قضية",
    "- أي مقارنة بالمحامين الآخرين أو ادعاء تفوق أو أفضلية",
    "- أي استقطاب مباشر للعملاء أو عروض ترويجية تنافسية",
    "- أي إفصاح عن رسوم أو أسعار في المحتوى الإعلامي",
    "- أي تصريح بالتخصص في مجال لا تدعمه مؤهلات معلنة",
    "- أي ادعاء مضلل أو مبالغة في وصف الخبرة أو الكفاءة",
    "- أي انتهاك لمبدأ سرية العميل أو الإشارة إلى قضايا بعينها",
    "- أي صياغة تخل بكرامة المهنة القانونية أو تنافي الوقار المهني",
    "",
    "معايير الجودة الإلزامية للنص المقترح:",
    "- سقف الجودة غير قابل للتفاوض: صياغة بمستوى أرقى المدارس القانونية (أكسفورد، هارفارد، جامعة الإمام محمد بن سعود الإسلامية) — نص قانونيين محترفين رفيعي المستوى، وأي صياغة دون ذلك تُعاد كتابتها قبل الإخراج",
    "- مستوى الخبير إلزامي: إن كانت المسألة نظامية فحافظ على التحليل والتأصيل النظامي الدقيق أو ارفعه ولا تستبدل بمضمون متخصص عموميات؛ وإن كان موضوع النص غير نظامي فلا تُقحم فيه تحليلاً ولا استشهاداً قانونياً، واكتفِ برفع جودة اللغة والأسلوب والوضوح والوقار المهني — وفي الحالتين لا تُبقِ جملة لا تضيف معلومة أو فكرة أو أثراً",
    "- الأمانة العلمية: أي اقتباس أو فكرة أو إحصائية منقولة تُنسب لصاحبها صراحةً في موضعها، ولا يُختلق مصدر",
    "- لغة عربية فصحى سليمة خالية من الأخطاء الإملائية والنحوية",
    "- أسلوب مهني رصين يعكس مستوى محامٍ محترف ومعتمد",
    "- وضوح الصياغة معيار جودة مقيس آلياً في المنصة فالتزمه أثناء الكتابة: جملة واحدة لفكرة واحدة، ومتوسط طول الجملة نحو عشرين كلمة ولا يتجاوز ثلاثين، ولا تكدّس شروطاً واستثناءات متعددة في جملة واحدة بل قسّمها — فالرصانة القانونية لا تعني الجمل المتشعبة؛ والنص ينتهي بعلامة ترقيم ختامية",
    "- معالجة كاملة لجميع الملاحظات المذكورة دون إغفال أي منها",
    "- الحفاظ على الهدف والمعنى الجوهري للنص الأصلي",
    "- البقاء داخل إطار السياق المحدد إلزامي: الصياغة المقترحة تبقى من نفس نوع المحتوى وبقالبه (منشور يبقى منشوراً، ونص فيديو يبقى نصاً يُقرأ صوتياً، ومقال يبقى مقالاً)، وملائمة للقناة المحددة وأعرافها وحد أحرفها، ومكتوبة لنفس الجمهور ولنفس الهدف — لا تحوّل النص إلى نوع آخر ولا تخرج عن سياقه",
    "",
    WRITING_CODE,
    "",
    "ضوابط المُخرَج (إلزامية):",
    "- المستخدم لا يرى تعليماتك؛ فلا تُشِر إطلاقاً إلى قواعدك أو «المدونة» أو «القواعد الحاكمة» أو «الدستور» أو «أعلاه» أو أي مرجع داخلي، ولا تشرح منهجيتك أو سبب امتناعك.",
    "- مخرجك هو النص المُعاد صياغته فقط: لا اعتذار، ولا مقدمة، ولا تعليق، ولا مطالبة المستخدم بمعلومات، ولا قائمة متطلبات.",
    "- حسّن أي نص يتضمّن مضموناً فعلياً مهما كان موضوعه: ارفع لغته وأسلوبه ووضوحه ووقاره المهني دون إضافة أي محتوى أو معلومة لم ترد فيه، مع بقاء موضوعه ومعناه الجوهري كما هو.",
    "- لا تُخرج الرمز __NO_SUBSTANCE__ إلا في حالة واحدة ضيّقة: أن يكون النص خالياً من أي فكرة أصلاً — كادعاء أفضلية شخصية أو تفضيل مجرّد أو شعار دعائي فارغ لا يحمل مضموناً يُعاد صياغته. عندئذٍ أخرج هذا الرمز وحده حرفياً دون أي نص آخر: __NO_SUBSTANCE__",
    "- الخطاب الديني أو العقدي أو الفتوى خارج ولاية المنصة ولا يُصاغ ولا يُحسَّن: إن كان مضمون النص من هذا الباب فأخرج هذا الرمز وحده حرفياً دون أي نص آخر: __OUT_OF_MANDATE__",
    "",
    "قبل إخراج النص النهائي، راجع ذاتياً: هل يحتوي النص على أي من المحظورات أعلاه؟ إذا وجدت أي منها فأزلها وعدّل حتى يخلو النص منها تماماً.",
    "أخرج النص المُعاد كتابته فقط، دون عنوان أو شرح أو مقدمة أو تعليق."
  ].join("\n");

  const userPrompt = [
    `السياق (إطار إلزامي للصياغة المقترحة — لا تخرج عنه): نوع المحتوى: ${contentType ?? "محتوى مهني"} — القناة: ${channel ?? "غير محددة"} — الجمهور: ${audience ?? "غير محدد"} — الهدف: ${purpose ?? "غير محدد"}`,
    ...(charLimit ? [`قيد إلزامي: الحد الأقصى المسموح على هذه القناة ${charLimit} حرفاً شاملاً المسافات — الصياغة المقترحة يجب ألا تتجاوزه، وإن كان النص الأصلي متجاوزاً فاختصر ضمن المعالجة.`] : []),
    "",
    "النص الأصلي:",
    text,
    "",
    "الملاحظات الامتثالية والقانونية التي يجب معالجتها:",
    findingsList,
    "",
    "الملاحظات اللغوية والإملائية التي يجب تصحيحها:",
    languageList,
    researchBlock,
    "",
    "أعد كتابة النص معالجًا جميع النقاط أعلاه مع الحفاظ على روح النص وهدفه المهني:"
  ].join("\n");

  try {
    let suggestedText = await callModel(apiKey, systemPrompt, userPrompt);
    if (!suggestedText) return { ok: false, status: 503, error: "لم يُنتج النموذج صياغة صالحة" };

    // النص بلا مضمون قابل لإعادة الصياغة (تفضيل/دعاية عامة)، أو ردّ النموذج باعتذار أو
    // طلب معلومات أو تسرّبٍ للغة داخلية — نعرض رسالة مهنية مختصرة بدل عرض ذلك كأنه صياغة.
    if (isOutOfMandateOutput(suggestedText)) {
      return { ok: false, status: 422, error: OUT_OF_MANDATE_MESSAGE };
    }
    if (isNonSubstantiveOutput(suggestedText)) {
      return { ok: false, status: 422, error: NO_SUBSTANCE_MESSAGE };
    }

    // جولة تحقق أولى عبر محركي الامتثال واللغة
    let verification = await verifySuggestion(suggestedText, context);

    // جولات تصحيحية متعددة حتى النظافة (بقرار مالكة المنصة: نرفع جهد الصياغة لا سقف
    // الفحص). صار المسار خلفياً، فيحتمل عدة جولات كمسار الإنشاء بدل جولة واحدة تستسلم.
    // نقبل نص الجولة فقط إن نظّف أو نقّص الملاحظات (لا نتراجع)، ونتوقف إن لم يتحسّن.
    for (let round = 0; round < 3 && !verification.clean && verification.remainingNotes.length > 0; round++) {
      const fixPrompt = [
        "النص التالي اقترحته أنت، لكن التحقق الآلي رصد فيه الملاحظات المتبقية أدناه.",
        "أعد كتابته معالجاً كل ملاحظة نهائياً مع الالتزام الكامل بالقاعدة الدستورية ومعايير الجودة.",
        "",
        "النص المقترح السابق:",
        suggestedText,
        "",
        "الملاحظات المتبقية التي يجب إزالتها:",
        verification.remainingNotes.join("\n"),
        "",
        "أخرج النص المُصحح فقط دون أي تعليق."
      ].join("\n");
      const fixedText = await callModel(apiKey, systemPrompt, fixPrompt);
      if (!fixedText || isOutOfMandateOutput(fixedText) || isNonSubstantiveOutput(fixedText)) break;
      const next = await verifySuggestion(fixedText, context);
      if (next.clean || next.remainingNotes.length < verification.remainingNotes.length) {
        suggestedText = fixedText;
        verification = next;
      } else {
        break; // لم تتحسّن هذه الجولة — لا فائدة من جهد إضافي
      }
    }

    // لا تُعرض صياغة غير ملتزمة — القاعدة الدستورية
    if (!verification.clean) {
      return { ok: false, status: 422, error: NON_COMPLIANT_MESSAGE };
    }

    // حارس نطاق المملكة الحتمي على النص النهائي المنشور
    return { ok: true, suggestedText, sources: researchSources, sourceNote };
  } catch (error) {
    const raw = error instanceof Error ? error.message : "خطأ غير متوقع";
    // أخطاء المزود المعروفة (رصيد/مفتاح/ضغط) تُعرض بالعربية بسببها وإجرائها — لا بنصها الإنجليزي الخام
    const message = describeProviderError(raw) ?? raw;
    return { ok: false, status: 503, error: message };
  }
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return badRequest("بيانات غير صالحة");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "خدمة التحليل غير متاحة حالياً — تواصل مع مسؤول المنصة." }, { status: 503 });

  // الوضع الأساسي (الإنتاج): مهمة خلفية — كمسار الإنشاء تماماً. الخادم يرد فوراً برقم
  // مهمة، وتكمل الصياغة عبر waitUntil ولو أُغلقت الصفحة؛ فلا ينقطع طلب طويل على الجوال
  // («Load failed»). الواجهة تتابع على نقطة حالة الإنشاء نفسها (النتيجة نص + مصادر).
  const sql = jobsDb();
  if (sql) {
    const jobId = crypto.randomUUID();
    await createJob(sql, jobId);
    const work = (async () => {
      // عدّاد التكلفة الداخلي — التكلفة تُخزَّن مع المهمة وتُخصم من دفتر الرصيد
      await runWithCostMeter(async () => {
      const settleCost = async (): Promise<number> => {
        const m = currentMeter();
        const costUsd = m ? meterCostUsd(m) : 0;
        try { const l = ledgerDb(); if (l && costUsd > 0) await deductUsd(l, costUsd); } catch { /* دفتر اختياري */ }
        return costUsd;
      };
      try {
        const r = await runReformulation(parsed.data, apiKey);
        const costUsd = await settleCost();
        if (r.ok) {
          await completeJob(sql, jobId, r.suggestedText, false, undefined, r.sources.length ? JSON.stringify(r.sources) : undefined, r.sourceNote, costUsd);
        } else {
          await failJob(sql, jobId, r.error, costUsd);
        }
      } catch (error) {
        const raw = error instanceof Error ? error.message : "خطأ غير متوقع";
        const costUsd = await settleCost().catch(() => 0);
        await failJob(sql, jobId, describeProviderError(raw) ?? raw, costUsd).catch(() => {});
      }
      });
    })();
    try { waitUntil(work); } catch { void work; }
    return NextResponse.json({ jobId });
  }

  // احتياطي (تشغيل محلي بلا قاعدة بيانات): متزامن كالسابق
  const r = await runReformulation(parsed.data, apiKey);
  if (r.ok) return ok({ suggestedText: r.suggestedText, sources: r.sources.length ? r.sources : undefined, sourceNote: r.sourceNote });
  return NextResponse.json({ error: r.error }, { status: r.status });
}
