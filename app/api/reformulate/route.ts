import { z } from "zod";
import { NextResponse } from "next/server";
import { badRequest, ok } from "@/lib/api";
import { AI_CONSTITUTION } from "@/lib/governance";
import { runSemanticAnalysis } from "@/lib/services/semantic-analysis-service";
import { evaluateContent } from "@/lib/services/content-evaluation-service";

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
  })).default([])
});

async function callModel(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }]
    })
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(err.error?.message ?? "تعذر إنشاء الصياغة المقترحة");
  }
  const data = await response.json() as { content?: Array<{ type?: string; text?: string }> };
  return data.content?.find((item) => item.type === "text")?.text?.trim() ?? "";
}

// التحقق الإلزامي: الصياغة المقترحة تمر عبر محركي الامتثال واللغة قبل عرضها.
// لا تُعرض أي صياغة فيها مخالفات أو أخطاء إملائية/نحوية.
async function verifySuggestion(
  text: string,
  context: { contentType?: string; channel?: string; audience?: string; purpose?: string }
) {
  const [semantic, evaluation] = await Promise.all([
    runSemanticAnalysis(text, context),
    evaluateContent(text)
  ]);
  const spellingGrammarIssues = evaluation.language.issues.filter(
    (issue) => issue.category === "spelling" || issue.category === "grammar"
  );
  const clean =
    semantic.findings.length === 0 &&
    evaluation.language.passed &&
    spellingGrammarIssues.length === 0;

  const remainingNotes = [
    ...semantic.findings.map(
      (f) => `- مخالفة: ${f.issue} — العبارة: "${f.evidence}" — البديل الآمن: ${f.suggestedSaferWording}`
    ),
    ...spellingGrammarIssues.map(
      (i) => `- خطأ لغوي: "${i.excerpt}" — ${i.message} — التصحيح: ${i.suggestion}`
    )
  ];
  return { clean, remainingNotes };
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return badRequest("بيانات غير صالحة");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "خدمة التحليل غير مهيأة — تأكد من ضبط متغيرات البيئة." }, { status: 503 });

  const { text, contentType, channel, audience, purpose, charLimit, findings, languageIssues } = parsed.data;
  const context = { contentType, channel, audience, purpose };

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
    "أنت محرر قانوني متخصص في ضبط محتوى المحامين وفق نظام مهنة المحاماة السعودي ولوائحه التنفيذية.",
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
    "- الأمانة العلمية: أي اقتباس أو فكرة أو إحصائية منقولة تُنسب لصاحبها صراحةً في موضعها، ولا يُختلق مصدر",
    "- لغة عربية فصحى سليمة خالية من الأخطاء الإملائية والنحوية",
    "- أسلوب مهني رصين يعكس مستوى محامٍ محترف ومعتمد",
    "- معالجة كاملة لجميع الملاحظات المذكورة دون إغفال أي منها",
    "- الحفاظ على الهدف والمعنى الجوهري للنص الأصلي",
    "- البقاء داخل إطار السياق المحدد إلزامي: الصياغة المقترحة تبقى من نفس نوع المحتوى وبقالبه (منشور يبقى منشوراً، ونص فيديو يبقى نصاً يُقرأ صوتياً، ومقال يبقى مقالاً)، وملائمة للقناة المحددة وأعرافها وحد أحرفها، ومكتوبة لنفس الجمهور ولنفس الهدف — لا تحوّل النص إلى نوع آخر ولا تخرج عن سياقه",
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
    "",
    "أعد كتابة النص معالجًا جميع النقاط أعلاه مع الحفاظ على روح النص وهدفه المهني:"
  ].join("\n");

  try {
    let suggestedText = await callModel(apiKey, systemPrompt, userPrompt);
    if (!suggestedText) return NextResponse.json({ error: "لم يُنتج النموذج صياغة صالحة" }, { status: 503 });

    // جولة تحقق أولى عبر محركي الامتثال واللغة
    let verification = await verifySuggestion(suggestedText, context);

    // جولة تصحيحية واحدة إذا بقيت ملاحظات
    if (!verification.clean && verification.remainingNotes.length > 0) {
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
      if (fixedText) {
        const secondVerification = await verifySuggestion(fixedText, context);
        if (secondVerification.clean || secondVerification.remainingNotes.length < verification.remainingNotes.length) {
          suggestedText = fixedText;
          verification = secondVerification;
        }
      }
    }

    // لا تُعرض صياغة غير ملتزمة — القاعدة الدستورية
    if (!verification.clean) {
      return NextResponse.json(
        { error: "تعذر إنتاج صياغة ملتزمة بالكامل بقواعد السلوك المهني واللائحة التنفيذية — عدّل النص الأصلي ثم أعد المحاولة." },
        { status: 422 }
      );
    }

    return ok({ suggestedText });
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطأ غير متوقع";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
