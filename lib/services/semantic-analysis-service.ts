// SEMANTIC COMPLIANCE ANALYSIS — HOLISTIC ENGINE
// ONE call to Claude. No rule list passed — Claude uses its full knowledge
// of the 46 professional conduct rules to judge the text holistically.
// Controlled by ANTHROPIC_API_KEY env var.

import Anthropic from "@anthropic-ai/sdk";
import type { ContentKind, FindingCategory, FindingDomain, ReviewContext, ReviewFinding, RiskLevel } from "@/lib/types";
import { legalKnowledgeEntries } from "@/lib/legal-knowledge-base";
import {
  arabicSeverity,
  businessSeverityForFinding,
  calculateFindingWeight,
  classifyLegalKnowledgeEntry,
  riskDimensionsForFinding
} from "@/lib/services/scoring-service";
import type { ScoringProfile } from "@/lib/scoring-profiles";
import { resolveScoringProfile } from "@/lib/scoring-profiles";

const DEFAULT_SOURCE_DOCUMENT_ID = "rules-professional-conduct-lawyers";
const DEFAULT_SOURCE_DOCUMENT = "قواعد السلوك المهني للمحامين";
const DEFAULT_SOURCE_URL = "https://laws.moj.gov.sa/ar/legislation/JmI0BPgVlA5GuIxkJUi08A";

function semanticTraceabilityId(entryId: string, evidence: string): string {
  const value = `${entryId}:${evidence}`;
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return `SEM-${hash.toString(16).toUpperCase().padStart(8, "0")}`;
}

function buildContextSummary(context?: ReviewContext): string {
  if (!context) return "غير محدد";
  const parts = [
    context.contentType && `نوع المحتوى: ${context.contentType}`,
    context.channel && `القناة: ${context.channel}`,
    context.audience && `الجمهور: ${context.audience}`,
    context.purpose && `الهدف: ${context.purpose}`
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" | ") : "غير محدد";
}

function buildHolisticPrompt(text: string, contextSummary: string): string {
  return `أنت متخصص في قواعد السلوك المهني للمحامين في المملكة العربية السعودية (46 قاعدة، 1447هـ).

## السياق الثابت
هذه المنصة مخصصة للمحامين المرخصين حصراً. النص التالي كتبه محامٍ ويريد نشره على وسائل التواصل الاجتماعي — سواء كان منشوراً، تغريدة، تعليقاً، رداً، أو إعلاناً.${contextSummary !== "غير محدد" ? `\nالسياق الإضافي: ${contextSummary}` : ""}

## المبدأ الجوهري — اقرأه أولاً قبل أي تقييم
المحامي لا ينشر إلا ما يخدم أحد هذه الأهداف:
- خدمة العدالة وتوعية الجمهور بحقوقهم
- توضيح المسائل القانونية
- الإعلان عن خدماته القانونية بأسلوب مهني ورصين

أي محتوى خارج هذه الأهداف ينتهك القواعد المهنية بغض النظر عن صياغته أو كلماته، بما في ذلك:
- إظهار الثروة أو المكانة المادية بأي شكل
- المحتوى الترويجي الذي يستغل المظاهر المادية لجذب العملاء
- أي محتوى لا علاقة له بالمهنة القانونية

## النص المراد تحليله
«${text}»

## المهمة
اقرأ النص وحدد هل ينتهك أياً من القواعد الـ46 بشكل مباشر أو غير مباشر.
حكم بفهمك الكامل للقواعد وسياق المهنة — لا تبحث عن كلمات أو أنماط محددة.
إذا لم توجد أي مخالفة — أرجع مصفوفة فارغة [].
إذا كان مستوى ثقتك "منخفض" في وجود المخالفة — لا تُدرجها.
evidenceExcerpt يجب أن يكون نصاً حرفياً مقتبساً من النص المُعطى.

## طبقة التحليل متعددة الزوايا
بعد التحليل الأساسي أعلاه، حلل النص من الزوايا الآتية جميعها دون استثناء:

1. زاوية لجنة التأديب: هل لو قُدم هذا النص شكوى ضد محامٍ أمام لجنة تأديبية، فقد يستوجب النظر فيه؟
2. زاوية السمعة المهنية: هل يسيء النص إلى سمعة المهنة القانونية أو يقلل من هيبتها؟
3. زاوية الموكل: هل قد يضر بمصلحة موكل حالي أو محتمل؟
4. زاوية القواعد المهنية: هل ينتهك أي قاعدة من القواعد الـ46 بصورة مباشرة أو غير مباشرة؟
5. زاوية تمثيل العدالة: هل يليق هذا النص بشخص يمثل العدالة؟
6. زاوية الثقة العامة: هل يضعف ثقة المجتمع بالمحامين أو بالمهنة؟
7. زاوية التضليل: هل يتضمن ادعاءً مضللاً أو مبالغاً فيه أو يوحي بشيء غير ثابت؟
8. زاوية الاستغلال: هل يستغل حاجة أو ضعف أو خوف أو استعجال الموكل المحتمل؟
9. زاوية الحياد والاستقلال المهني: هل يؤثر على حياد المحامي أو استقلاليته أو موضوعيته المهنية؟
10. زاوية الكرامة المهنية: هل يحافظ على كرامة المهنة وهيبة القضاء؟
11. زاوية النظام العام: هل يتعارض مع النظام العام أو السياسة التشريعية في المملكة؟
12. زاوية هيبة القضاء: هل يمس هيبة القضاء أو الجهات القضائية أو يشكك فيها؟
13. زاوية السرية المهنية: هل يكشف أو يلمح إلى معلومات سرية تخص موكلين أو قضايا؟
14. زاوية التنافس غير المشروع: هل يستخدم وسائل غير مشروعة أو غير مهنية لاستقطاب العملاء؟
15. زاوية الالتزام بالأنظمة: هل يتعارض مع أنظمة المملكة العربية السعودية أو التوجهات التشريعية؟
16. زاوية الأخلاق العامة: هل يتعارض مع القيم الإسلامية أو الأخلاق العامة أو القيم المجتمعية في المملكة؟
17. زاوية المصداقية المهنية: هل يقدم معلومات قانونية غير دقيقة أو مضللة أو ناقصة بصورة قد تضلل المتلقي؟
18. زاوية الاستقلالية: هل يوحي بوجود تأثير خارجي على المحامي أو ارتباط بجهات غير مشروعة أو يثير شبهة تضارب مصالح؟

## قواعد الرصد متعدد الزوايا
- هذه الزوايا طبقة إضافية ولا تُلغي أو تُخفف أي آلية تقييم حالية
- تُطبق جميع الزوايا الـ18 على كل نص دون استثناء
- إذا أجابت أي زاوية بنعم، افحص وجود سند نظامي يدعم ذلك
- لا تُسجل مخالفة إلا إذا كانت مدعومة بدليل واضح قابل للدفاع أمام لجنة تأديبية
- لا يُفترض قصد الكاتب إلا إذا دل عليه النص صراحةً
- إذا اتفقت أكثر من زاوية على وجود إشكال: يُرفع مستوى الخطورة ويُوضح السبب في الـ explanation
- إذا تداخلت زاويتان في نفس المخالفة: تُدمجان في نتيجة واحدة لتجنب التكرار
- إذا وُجدت مؤشرات مهنية دون سند نظامي كافٍ: تُصنف severity="منخفض" مع إشارة في الـ explanation أنه مؤشر مخاطر مهني يحتاج مراجعة
- لا يجوز خفض مستوى الحساسية أو الرصد الحالي

أجب بـ JSON array فقط — لا تضف أي نص خارجه:
[
  {
    "ruleReference": "القاعدة الثانية",
    "confidenceLevel": "مرتفع" أو "متوسط",
    "evidenceExcerpt": "العبارة الحرفية من النص التي تُثبت المخالفة",
    "violationType": "صريح" أو "ضمني" أو "سياقي",
    "severity": "حرج" أو "مرتفع" أو "متوسط" أو "منخفض",
    "explanation": "شرح موجز لسبب المخالفة",
    "advice": "التوصية التطبيقية للمحامي"
  }
]`;
}

interface HolisticViolation {
  ruleReference: string;
  confidenceLevel: "مرتفع" | "متوسط" | "منخفض";
  evidenceExcerpt: string;
  violationType: "صريح" | "ضمني" | "سياقي";
  severity: RiskLevel;
  explanation: string;
  advice: string;
}

function parseHolisticResponse(raw: string): HolisticViolation[] {
  try {
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch[0]) as Partial<HolisticViolation>[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((v) => typeof v.ruleReference === "string" && v.ruleReference && typeof v.evidenceExcerpt === "string" && v.evidenceExcerpt)
      .map((v) => ({
        ruleReference: v.ruleReference!,
        confidenceLevel: v.confidenceLevel ?? "متوسط",
        evidenceExcerpt: v.evidenceExcerpt!.trim(),
        violationType: v.violationType ?? "سياقي",
        severity: v.severity ?? "متوسط",
        explanation: v.explanation ?? "",
        advice: v.advice ?? ""
      }));
  } catch {
    return [];
  }
}

function findKbEntry(ruleReference: string): typeof legalKnowledgeEntries[number] | null {
  return legalKnowledgeEntries.find(
    (e) => e.legalReference && e.legalReference.startsWith(ruleReference)
  ) ?? null;
}

function buildSemanticFinding(
  violation: HolisticViolation,
  entry: typeof legalKnowledgeEntries[number] | null,
  profile: ScoringProfile
): ReviewFinding | null {
  if (violation.confidenceLevel === "منخفض") return null;
  const evidence = violation.evidenceExcerpt.trim();
  if (!evidence) return null;

  const legalKnowledgeEntryId = entry?.id ?? violation.ruleReference.replace(/\s+/g, "-").replace(/،/g, "");
  const legalReference = entry?.legalReference ?? violation.ruleReference;
  const sourceDocumentId = entry?.sourceDocumentId ?? DEFAULT_SOURCE_DOCUMENT_ID;
  const sourceDocument = entry?.sourceDocument ?? DEFAULT_SOURCE_DOCUMENT;
  const articleTitle = entry?.articleTitle ?? violation.ruleReference;
  const sourceUrl = entry?.sourceUrl ?? DEFAULT_SOURCE_URL;

  const classification = entry
    ? classifyLegalKnowledgeEntry(entry)
    : { category: "التواصل العام" as FindingCategory, domain: "إجرائي" as FindingDomain, potentialImpact: violation.severity };

  const baseFinding = {
    traceabilityId: semanticTraceabilityId(legalKnowledgeEntryId, evidence),
    legalKnowledgeEntryId,
    sourceDocumentId,
    title: articleTitle,
    category: classification.category,
    domain: classification.domain,
    potentialImpact: classification.potentialImpact,
    weight: 0,
    scoreImpact: 0,
    issue: entry?.riskCategories.join("، ") || violation.explanation,
    severity: violation.severity,
    evidence,
    matchedPattern: `[دلالي — ${violation.violationType}]`,
    contentClassification: "إعلان مضلل محتمل" as const,
    advice: violation.advice || entry?.recommendedAction || "",
    suggestedSaferWording: entry?.recommendedAction ?? violation.advice,
    legalCitation: `${sourceDocument}، ${legalReference}`,
    sourceDocument,
    legalReference,
    articleTitle,
    articleTextExcerpt: entry?.fullText ?? "",
    explanation: violation.explanation,
    legalExplanation: `رصد التحليل الدلالي عبارة «${evidence}» بوصفها مخالفة ${violation.violationType} لـ${legalReference} من ${sourceDocument}. ${violation.explanation}`,
    reviewOutcome: "رصدت ملاحظة" as const,
    confidenceLevel: violation.confidenceLevel,
    sourceUrl,
    sourceType: "semantic" as const
  } satisfies ReviewFinding;

  const businessSeverity = businessSeverityForFinding(baseFinding);
  const normalizedSeverity = arabicSeverity(businessSeverity);
  const weight = calculateFindingWeight(normalizedSeverity, classification.category, classification.potentialImpact, profile);

  if (weight === 0) return null;

  return {
    ...baseFinding,
    severity: normalizedSeverity,
    potentialImpact: businessSeverity === "critical" ? "حرج" : classification.potentialImpact,
    businessSeverity,
    riskDimensions: riskDimensionsForFinding(baseFinding),
    resolved: false,
    weight,
    scoreImpact: weight
  };
}

export async function runSemanticAnalysis(
  text: string,
  context: ReviewContext | undefined,
  contentKind?: ContentKind
): Promise<ReviewFinding[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not configured");

  const profile = resolveScoringProfile(contentKind ?? ("post" as ContentKind), context?.channel);
  const contextSummary = buildContextSummary(context);

  console.log("[semantic] starting holistic analysis (full Claude judgment — no rule list)");

  const client = new Anthropic({ apiKey });
  const prompt = buildHolisticPrompt(text, contextSummary);

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }]
  });

  const rawText = message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { type: "text"; text: string }).text)
    .join("");

  const violations = parseHolisticResponse(rawText);
  console.log("[semantic] violations identified by Claude:", violations.length);

  const findings = violations
    .map((violation) => {
      const entry = findKbEntry(violation.ruleReference);
      if (!entry) console.log(`[semantic] no KB entry for "${violation.ruleReference}" — building from violation data`);
      return buildSemanticFinding(violation, entry, profile);
    })
    .filter((f): f is ReviewFinding => f !== null);

  console.log("[semantic] done: findings =", findings.length);
  return findings;
}
