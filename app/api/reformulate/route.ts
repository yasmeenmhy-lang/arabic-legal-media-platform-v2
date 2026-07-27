import { z } from "zod";
import { NextResponse } from "next/server";
import { badRequest, ok } from "@/lib/api";
import { AI_CONSTITUTION } from "@/lib/governance";
import { runSemanticAnalysis } from "@/lib/services/semantic-analysis-service";
import { evaluateContent } from "@/lib/services/content-evaluation-service";
import { describeProviderError } from "@/lib/ai-provider-errors";
import { researchClaimsWithExpansion, openAndExtract, nameFailedStage, hostOf, PIPELINE_STAGES } from "@/lib/services/web-research-service";
import { isSaudiOfficialUrl } from "@/lib/services/web-research-service";
import { analyzeIntent } from "@/lib/services/intent-analysis-service";
import { buildDossier, provenExcerpts, markUsedSources, computeCompleteness, archivePreviousDossier, type SourceDossier } from "@/lib/source-dossier";
import { buildOfficialRuleCorpusText } from "@/lib/rule-corpus-text";
import { SOURCE_GOVERNANCE, ARTICLE_10_DECLARATION } from "@/lib/source-governance";
import { article10Violations, article10ViolationsWithProof } from "@/lib/services/article10-enforcer";
import { countHardLanguageErrors, HARD_LANGUAGE_CATEGORIES } from "@/lib/language-gate";
import { WRITING_CODE } from "@/lib/writing-code";
import { NO_SUBSTANCE_MESSAGE, NON_COMPLIANT_MESSAGE, OUT_OF_MANDATE_MESSAGE } from "@/lib/reformulate-messages";
import { recordUsage, runWithCostMeter, meterCostUsd, currentMeter } from "@/lib/cost-meter";
import { ledgerDb, deductUsd } from "@/lib/cost-ledger";
import { completeJob, createJob, failJob, jobsDb, recordJobLog, recordResearchTrace } from "@/lib/content-jobs";
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
  sourceHint: z.string().max(500).optional(),
  // ★ ملف المصادر المرافق للنسخة (قاعدة المحرك الواحد): يُستهلك كما هو — لا بحث
  // جديد إلا بطلب المستخدم الصريح refreshSources (مبدأ: المصادر لا يُعاد بناؤها)
  sourceDossier: z.custom<import("@/lib/source-dossier").SourceDossier>().optional(),
  refreshSources: z.boolean().optional()
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
    recordUsage(data.usage, { stage: "معيد الصياغة", model: "claude-sonnet-5" }); // عدّاد التكلفة الداخلي
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
  // متتابعتان — نفس أساس المراجعة والحاكم: الامتثال عنصر في قياس المخاطر،
  // فلا تُقاس مخاطر صياغة مقترحة بمعزل عن مخالفاتها المرصودة.
  const semantic = await runSemanticAnalysis(text, context);
  const evaluation = await evaluateContent(text, context, semantic.findings);
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
  | { ok: true; suggestedText: string; sources: { title: string; url: string }[]; sourceNote?: string; dossier?: SourceDossier }
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
  const { text, contentType, channel, audience, purpose, charLimit, findings, languageIssues, hasSource, sourceHint, sourceDossier, refreshSources } = data;
  const context = { contentType, channel, audience, purpose };

  // ★ قاعدة المحرك الواحد + مبدأ «المصادر لا يُعاد بناؤها»: الملف المرافق للنسخة
  // هو المرجع الوحيد للمصادر — يُستهلك كما هو بلا أي بحث جديد. البحث حصراً حين
  // يطلب المستخدم التحديث صراحةً (refreshSources) أو يقرّ بمرجع لنص لا ملف له —
  // وعندها عبر المحرك الواحد نفسه: محرك الفهم ← باحث الادعاءات ← بناء الملف.
  let researchBlock = "";
  let researchSources: { title: string; url: string }[] = [];
  let sourceNote: string | undefined;
  // مقاطع الادعاءات المثبتة — مدخل منفّذ المادة (١٠) بمبدأ الإثبات
  let proofList: string[] = [];
  let activeDossier: SourceDossier | undefined = sourceDossier;

  if (refreshSources || (hasSource && !activeDossier)) {
    // بحث جديد بالمحرك الواحد — بطلب صريح أو لنصٍّ أُقرّ بمرجعه ولا ملف له
    const hint = (sourceHint ?? "").trim();
    const intent = await analyzeIntent({
      topic: text.slice(0, 600),
      contentType,
      extraDirectives: hint ? `المرجع الذي وصفه المستخدم: ${hint}` : undefined,
    });
    if (intent) {
      // حلقة البحث المحكومة (الدفعة ب): توقف فور الإثبات، توسيع مبرر عند الحاجة
      // فقط بأثر مسجل، ثم التثبيت بالفتح الفعلي — النطاق الحكومي لازم لا كافٍ
      const research = intent.claims.some((c) => c.needsProof) ? await researchClaimsWithExpansion(intent) : null;
      activeDossier = buildDossier(intent, research?.findings ?? [], isSaudiOfficialUrl);
      if (research?.trace?.length) activeDossier = { ...activeDossier, researchTrace: research.trace };
      // الفتح شرط الإثبات (بقرار المالكة): فتح الصفحات فعلياً والاستخراج بنوع الوثيقة
      activeDossier = await openAndExtract(activeDossier, intent);
      // ★ الرسمية بالإثبات: إن شهدت صفحة حكومية مفتوحة لنطاق موقع الجهة، يُعاد
      // بناء الملف بالمعيار الموسّع (الحكومي أو المُثبت رسميةً) ويُفتح من جديد —
      // يُقدَّم موقع الجهة الأصل على الصفحة الناقلة، بلا أي قائمة يدوية.
      const attestedHosts = new Set(activeDossier.attestedOfficialDomains ?? []);
      if (attestedHosts.size > 0 && research) {
        const recoverable = activeDossier.claims.some((c) => {
          if (c.status !== "محكوم بالمادة ١٠") return false;
          const f = research.findings.find((x) => x.claimId === c.id && x.status === "مثبت" && x.url);
          return Boolean(f?.url && attestedHosts.has(hostOf(f.url)));
        });
        if (recoverable) {
          const prevTrace = activeDossier.researchTrace ?? [];
          activeDossier = buildDossier(intent, research.findings, (u) => isSaudiOfficialUrl(u) || attestedHosts.has(hostOf(u)));
          activeDossier = {
            ...activeDossier,
            attestedOfficialDomains: [...attestedHosts],
            researchTrace: [
              ...prevTrace,
              { stage: "اختيار المصدر", reason: "الرسمية بالإثبات: صفحة حكومية مفتوحة شهدت حرفياً لنطاق موقع الجهة — يُقدَّم الأصل على الناقل", claimIds: [], outcome: `نطاقات مثبتة الرسمية: ${[...attestedHosts].join("، ")}`, at: new Date().toISOString() },
            ],
          };
          activeDossier = await openAndExtract(activeDossier, intent);
        }
      }
      if (refreshSources) {
        activeDossier = { ...activeDossier, refreshedAt: new Date().toISOString() };
        // ★ (بقرار المالكة): فشل الشبكة يمس التحقق الحالي فقط ولا يمحو المعرفة —
        // إن أخفقت إعادة البناء تقنياً (لا رفضاً موضوعياً) وكان للنسخة ملف سابق
        // بادعاءات مثبتة، يُبقى الملف السابق «آخر نسخة متحقق منها» كما هو،
        // مع ملاحظة صريحة أن إعادة التحقق الحالية تعذرت تقنياً.
        const rebuiltProven = activeDossier.claims.some((c) => c.status === "مثبت");
        const previousProven = Boolean(sourceDossier?.claims.some((c) => c.status === "مثبت"));
        const rebuildTechnical =
          activeDossier.sources.some((s) => s.fetchStatus === "تعذر الفتح تقنياً") ||
          (activeDossier.researchTrace ?? []).some((e) => e.outcome.startsWith("تعذر تنفيذ البحث"));
        if (sourceDossier && !rebuiltProven && previousProven && rebuildTechnical) {
          activeDossier = {
            ...sourceDossier,
            researchTrace: [
              ...(sourceDossier.researchTrace ?? []),
              { stage: "تحديث المصادر", reason: "تعذرت إعادة التحقق تقنياً — المعرفة السابقة لا تُمحى بعطل شبكي", claimIds: [], outcome: "أُبقيت آخر نسخة متحقق منها كما هي، ويمكن إعادة المحاولة لاحقاً", at: new Date().toISOString() },
            ],
          };
          sourceNote = "ملاحظة: تعذرت إعادة التحقق من المصادر تقنياً في هذه اللحظة — عُرضت آخر نسخة متحقق منها من مصادر هذه النسخة، ويمكن طلب التحديث مجدداً لاحقاً.";
        } else if (sourceDossier) {
          activeDossier = archivePreviousDossier(
            activeDossier,
            sourceDossier,
            (sourceHint ?? "").trim() ? `تحديث بطلب المستخدم — توجيهه: ${(sourceHint ?? "").trim()}` : "تحديث المصادر بطلب صريح من المستخدم",
            "المستخدم — مفتاح «تحديث المصادر»"
          );
          const diff = activeDossier.previousDossiers?.[activeDossier.previousDossiers.length - 1]?.diffSummary ?? "";
          activeDossier = {
            ...activeDossier,
            researchTrace: [
              ...(activeDossier.researchTrace ?? []),
              { stage: "تحديث المصادر", reason: "طلب صريح من المستخدم — أُرشف الملف السابق بتاريخه", claimIds: [], outcome: diff || "لا فروقات جوهرية", at: new Date().toISOString() },
            ],
          };
        }
      }
    } else if (hasSource) {
      // إخفاق مسمى بمرحلته (الدفعة ج) — تسري المادة (١٠)
      console.log(`[reformulate:intent] إخفاق ${PIPELINE_STAGES[0]} — تسري المادة (١٠)`);
      sourceNote = ARTICLE_10_DECLARATION;
    }
  }

  if (activeDossier) {
    proofList = provenExcerpts(activeDossier);
    const proven = activeDossier.claims.filter((c) => c.status === "مثبت");
    const unproven = activeDossier.claims.filter((c) => c.status === "غير قابل للجزم" || c.status === "محكوم بالمادة ١٠");
    // «المصادر المستخدمة» من الملف (مصادر الادعاءات المثبتة) — لا من ورود الرابط في المتن
    researchSources = activeDossier.sources
      .filter((s) => s.linkedClaimIds.some((id) => proven.some((c) => c.id === id)))
      .map((s) => ({ title: s.title, url: s.url }));

    // ★ سلوك التسليم المعتمد (بقرار المالكة الأخير قبل الجولة): تعذر الإثبات لا
    // يحجب الصياغة — تُكتب بلا الادعاءات غير المثبتة كلياً، والملاحظة المرافقة
    // توضح الحال (والتقني مبين بصفته لا كغياب مصدر)، والجاهزية تُمنع حتى المعالجة.
    if (unproven.length > 0) {
      const technicalFailure = unproven.find((c) => c.failure?.technical);
      // ★ صيغة الحالة المختلطة: إن ثبت بعضٌ وتعذر بعضٌ فالملاحظة تصف الواقع بدقة —
      // لا تصريح «لا مصدر» يكذّب المصادر المعروضة، ولا سكوت يوحي بإثبات الكل.
      sourceNote = proven.length > 0
        ? "استُند في بعض معلومات هذا المحتوى إلى المصادر الرسمية المبينة، وما لم يتوافر له مصدر متحقق منه لم يُذكر جزماً."
        : technicalFailure
        ? "ملاحظة: تعذر تقنياً الوصول إلى المصدر الرسمي أثناء إعداد هذه الصياغة، فلم تُدرج أي تفاصيل نظامية — المصدر قد يكون موجوداً ولم يُتحقق منه في هذه اللحظة. يمكنك إعادة المحاولة أو طلب تحديث المصادر."
        : ARTICLE_10_DECLARATION;
      const failedStage = unproven[0].failure
        ? `${unproven[0].failure.stage} — ${unproven[0].failure.reason}`
        : nameFailedStage(activeDossier.researchTrace);
      if (failedStage) console.log("[reformulate:failed-stage]", failedStage);
      activeDossier = { ...activeDossier, article10: { applied: true, stopped: false, notice: sourceNote, failedStage } };
    }

    if (proven.length > 0) {
      // خريطة الإثبات بالأدلة المستخرجة من الصفحات المفتوحة أولاً — بعزو في الموضع
      const provenLines = proven.map((c) => {
        const src = activeDossier!.sources.find((s) => s.id === c.sourceId);
        const evs = (activeDossier!.evidence ?? []).filter((e) => c.evidenceIds?.includes(e.id));
        if (evs.length > 0) {
          return evs.map((e) =>
            `- ${c.text}\n  الدليل المستخرج (${e.docKind}${e.locator ? ` — ${e.locator}` : ""}${e.natureLabel ? ` — طبيعته: ${e.natureLabel}` : ""}) [الصلة: ${e.relevance}]: «${e.text}»\n  الجهة: ${src?.issuer ?? src?.title ?? ""}`
          ).join("\n");
        }
        return `- ${c.text}\n  المقطع الداعم: «${c.supportingExcerpt ?? ""}»\n  الجهة: ${src?.issuer ?? src?.title ?? ""}`;
      }).join("\n");
      const dropLines = unproven.length
        ? `\nوادعاءات بلا إثبات — احذفها من الصياغة كلياً ولا تبقها مع تنبيه (الإفصاح لا يصحح معلومة غير مثبتة)، وأعد بناء الفكرة بدونها متماسكة:\n${unproven.map((c) => `- ${c.text}`).join("\n")}`
        : "";
      researchBlock = [
        "",
        "★ خريطة الإثبات المرافقة للنسخة (المرجع الوحيد للحقيقة — لا تنشئ حقيقة خارجها): صحّح أو ادعم من الأدلة أدناه. كل دليل جوهري يدخل الصياغة بمضمونه مع عزوه في موضعه بصيغة مهنية («وفق المادة (…) من النظام…» / «وفق ما أعلنته الجهة بتاريخ…») بحسب نوعه — ولا تختلق رقم مادة لدليل ليس نصاً نظامياً، ولا تضع روابط داخل المتن. ميّز الحقيقة الرسمية عن التلخيص عن الشرح عن التحليل (بصيغته) عن الرأي، وممنوع استنتاج آثار غير واردة (بطلان/اختصاص/التزام/نتيجة قضائية) إلا تحليلاً احتمالياً صريح الصيغة. والدليل الذي طبيعته نتيجة دراسة أو مقالة صحفية يُعرض منسوباً لصاحبه دائماً ولا يُعرض حكماً نظامياً. ممنوع أي تفصيلة نظامية خارج الأدلة.",
        provenLines,
        dropLines,
      ].join("\n");
    } else if ((hasSource || refreshSources) && !sourceNote) {
      // ملف بلا ادعاءات إثبات أصلاً (كلها عامة) مع إقرار مرجع — التصريح ملاحظةً مستقلة
      sourceNote = ARTICLE_10_DECLARATION;
      activeDossier = { ...activeDossier, article10: { applied: true, stopped: false, notice: sourceNote } };
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

  // ★★ القاعدة المؤسسة (بأمر مالكة المنصة — ممنوع تجاوزها): قواعد السلوك المهني
  // واللائحة التنفيذية نقطة الانطلاق لكل مسار. المعيد يقرأ المتن الرسمي كاملاً
  // أولاً قبل أي إعادة صياغة — كما يقرؤه الكاتب في الإنشاء حرفاً بحرف — فلا
  // يُصاغ نص ثم يُحاكَم بما لم يره.
  const systemPrompt = [
    AI_CONSTITUTION,
    "",
    "## نقطة الانطلاق — المتن الرسمي المعتمد: اقرأه أولاً وأعد الصياغة من داخله",
    "هذا هو النص الحرفي الكامل لقواعد السلوك المهني للمحامين (٤٧ قاعدة) واللائحة التنفيذية لنظام المحاماة (٩٠ مادة). وهو المتن نفسه الذي تُحاكَم به صياغتك بعد كتابتها، فأعد الصياغة وأنت تراه:",
    "- لا تكتب ما يخالف قاعدةً منه بالمعنى أو بالمقصد — المخالفة بالمعنى مخالفة ولو أُعيدت صياغتها.",
    "- وإن استشهدت بقاعدة أو مادة منه فانقلها من نصّها هنا حرفاً بحرف برقمها — ممنوع نقلها من ذاكرتك.",
    "",
    buildOfficialRuleCorpusText(),
    "",
    "## وثيقة حوكمة المصادر — دستور أعلى ملزم لكل ما تكتبه",
    SOURCE_GOVERNANCE,
    "",
    "إنفاذ المادة (١٠) في صياغتك: إن لم تُرفق لك مصادر موثوقة في هذا الطلب، فلا تُبقِ في الصياغة ولا تُدخل عليها أي تفصيلة نظامية بلا مصدر — لا رقم مادة ولا مدة ولا مهلة ولا عقوبة ولا نسبة — واعرض الفكرة عامةً مشروعة. (يستثنى الاستشهاد بقواعد السلوك المهني واللائحة التنفيذية لنظام المحاماة — فمتنهما معتمد في المنصة.)",
    "",
    "أنت محرر متخصص في ضبط ما ينشره المحامي باسمه المهني مهما كان موضوعه، وفق قواعد السلوك المهني ونظام المحاماة في المملكة العربية السعودية ولائحته التنفيذية — فهذه القواعد تحكم كل ما ينشره المحامي باسمه لا منشوراته القانونية وحدها.",
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

    // ★ المنفّذ البرمجي الحتمي للمادة (١٠) على الصياغة النهائية — بقرار المالكة
    // الملزم: لا مصدر ⇒ لا تفصيلة نظامية. تُرصد بالكود، وتُمنح جولة تصحيح محددة،
    // فإن بقيت لا تُسلَّم الصياغة ويُعرض التصريح فقط.
    let a10 = article10ViolationsWithProof(suggestedText, proofList);
    if (a10.length > 0) {
      const a10Prompt = [
        "النص التالي اقترحته أنت، لكن الفحص البرمجي رصد فيه تفاصيل نظامية بلا مصدر رسمي مرفق — وهذا محظور بالمادة (١٠) من وثيقة حوكمة المصادر:",
        ...a10.map((v) => `- ${v}`),
        "",
        "أعد كتابته حاذفاً هذه التفاصيل ومعيداً صياغة أفكارها عامةً مشروعة، وأعد تقييم سلامة النص كاملاً بعد التعديل — لا حذفاً موضعياً يترك نصاً ناقصاً أو مضللاً.",
        "",
        "النص المقترح السابق:",
        suggestedText,
        "",
        "أخرج النص المُصحح فقط دون أي تعليق.",
      ].join("\n");
      const fixed = await callModel(apiKey, systemPrompt, a10Prompt);
      if (fixed && !isOutOfMandateOutput(fixed) && !isNonSubstantiveOutput(fixed)) {
        const fixedA10 = article10ViolationsWithProof(fixed, proofList);
        const fixedVerification = await verifySuggestion(fixed, context);
        if (fixedA10.length === 0 && fixedVerification.clean) {
          suggestedText = fixed;
          a10 = fixedA10;
        }
      }
      if (a10.length > 0) {
        console.log("[reformulate:article10] إيقاف —", JSON.stringify(a10).slice(0, 400));
        return { ok: false, status: 422, error: ARTICLE_10_DECLARATION };
      }
    }

    // «المصادر المستخدمة» من الملف — لا تختفي لغياب الرابط من متن الصياغة
    // (بقرار المالكة: لا روابط داخل المتن أصلاً). الملف يعود مع الصياغة موسوماً
    // بالاستخدام الفعلي ومعه حكم اكتمال الإثبات المحسوب على النص المسلَّم.
    let deliveredDossier = activeDossier ? markUsedSources(activeDossier, suggestedText) : undefined;
    if (deliveredDossier) {
      const verdict = computeCompleteness(deliveredDossier, suggestedText, {
        unsupportedDetails: article10ViolationsWithProof(suggestedText, proofList).map((v) => v.split(":")[0].trim()),
      });
      deliveredDossier = { ...deliveredDossier, completeness: verdict };
    }
    return {
      ok: true,
      suggestedText,
      sources: researchSources,
      sourceNote,
      dossier: deliveredDossier,
    };
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
      const jobStartedAt = Date.now();
      await runWithCostMeter(async () => {
      const settleCost = async (): Promise<number> => {
        const m = currentMeter();
        const costUsd = m ? meterCostUsd(m) : 0;
        try { const l = ledgerDb(); if (l && costUsd > 0) await deductUsd(l, costUsd); } catch { /* دفتر اختياري */ }
        return costUsd;
      };
      // السجل الدائم (بقرار المالكة): لكل مهمة — الاستدعاءات تفصيلاً والإجمالي والزمن
      const persistJobLog = async (costUsd: number) => {
        try {
          const m = currentMeter();
          if (!m) return;
          await recordJobLog(sql, {
            jobId, kind: "reformulate",
            durationMs: Date.now() - jobStartedAt,
            calls: m.calls,
            inputTokens: m.inputTokens, outputTokens: m.outputTokens,
            cacheReadTokens: m.cacheReadTokens, cacheWriteTokens: m.cacheWriteTokens,
            searches: m.searches, costUsd,
            callLogJson: JSON.stringify(m.callLog),
          });
        } catch (error) {
          console.error("[reformulate:job-log]", error);
        }
      };
      try {
        const r = await runReformulation(parsed.data, apiKey);
        const costUsd = await settleCost();
        if (r.ok) {
          await completeJob(sql, jobId, r.suggestedText, false, undefined, r.sources.length ? JSON.stringify(r.sources) : undefined, r.sourceNote, costUsd, undefined, r.dossier ? JSON.stringify(r.dossier) : undefined);
          // سجل تتبع قرار البحث الدائم (الدفعة ج) — أفضل جهد، لا يُسقط المهمة
          await recordResearchTrace(sql, jobId, "reformulate", r.dossier?.researchTrace ?? [])
            .catch((error) => console.error("[reformulate:research-trace]", error));
        } else {
          await failJob(sql, jobId, r.error, costUsd);
        }
        await persistJobLog(costUsd);
      } catch (error) {
        const raw = error instanceof Error ? error.message : "خطأ غير متوقع";
        const costUsd = await settleCost().catch(() => 0);
        await failJob(sql, jobId, describeProviderError(raw) ?? raw, costUsd).catch(() => {});
        await persistJobLog(costUsd).catch(() => {});
      }
      });
    })();
    try { waitUntil(work); } catch { void work; }
    return NextResponse.json({ jobId });
  }

  // احتياطي (تشغيل محلي بلا قاعدة بيانات): متزامن كالسابق
  const r = await runReformulation(parsed.data, apiKey);
  if (r.ok) return ok({ suggestedText: r.suggestedText, sources: r.sources.length ? r.sources : undefined, sourceNote: r.sourceNote, sourceDossier: r.dossier });
  return NextResponse.json({ error: r.error }, { status: r.status });
}
