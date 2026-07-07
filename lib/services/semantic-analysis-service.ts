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

function buildValidReferencesList(entries: typeof legalKnowledgeEntries): string {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const entry of entries) {
    if (!entry.legalReference) continue;
    const baseRef = entry.legalReference.split("،")[0].trim();
    if (seen.has(baseRef)) continue;
    seen.add(baseRef);
    const cats = entry.riskCategories?.length ? ` | يشمل: ${entry.riskCategories.join("، ")}` : "";
    lines.push(`- ${baseRef} (${entry.articleTitle ?? entry.section})${cats}`);
  }
  return lines.join("\n");
}

function buildHolisticPrompt(text: string, contextSummary: string, entries: typeof legalKnowledgeEntries): string {
  const validRefs = buildValidReferencesList(entries);
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

احكم بالمعنى والسياق والغرض — لا بوجود كلمات أو أنماط بعينها.
المحتوى الخارج عن نطاق المهنة الذي لا يرتبط بقاعدة محددة من القائمة أدناه: صنّفه مؤشر مخاطر مهنية بـ severity="منخفض".

## النص المراد تحليله
«${text}»

## المهمة
اقرأ النص وحدد هل ينتهك أياً من القواعد الـ46 بشكل مباشر أو غير مباشر.
حكم بفهمك الكامل للقواعد وسياق المهنة — لا تبحث عن كلمات أو أنماط محددة.
إذا لم توجد أي مخالفة — أرجع مصفوفة فارغة [].
إذا كان مستوى ثقتك "منخفض" في وجود المخالفة — لا تُدرجها.
evidenceExcerpt يجب أن يكون نصاً حرفياً مقتبساً من النص المُعطى.

## طبقة التحليل متعددة الزوايا
بعد التحليل الأساسي، طبّق على كل مخالفة محتملة المستويات الثلاثة الآتية قبل تسجيلها:

### المستوى الأول — التثبت
هل الدليل من النص واضح وصريح؟ هل المخالفة حقيقية أم مجرد احتمال؟
لا تُسجل مخالفة بدون دليل مباشر من النص.

### المستوى الثاني — التوضيح
وضّح لماذا تندرج هذه المخالفة تحت مؤشرها المحدد (الامتثال / المخاطر / الكتابة المهنية / اللغة).
ضع الزاوية التي اكتشفتها والمبرر المنطقي للتصنيف في حقل explanation.

### المستوى الثالث — الرابط
اربط المخالفة بالقاعدة الرسمية من قائمة القواعد المعتمدة أدناه.
لا تستشهد بقاعدة خارج القائمة.

---

حلّل النص من الزوايا الآتية مقسّمةً على أربعة مؤشرات:

### أولاً — الامتثال القانوني (7 زوايا)
1. زاوية لجنة التأديب: هل لو قُدم هذا النص شكوى أمام لجنة تأديبية يستوجب النظر؟
2. زاوية القواعد المهنية: هل ينتهك أي قاعدة من الـ46 بشكل مباشر أو غير مباشر؟
3. زاوية الالتزام بالأنظمة: هل يتعارض مع أنظمة المملكة أو التوجهات التشريعية؟
4. زاوية النظام العام: هل يتعارض مع النظام العام أو السياسة التشريعية؟
5. زاوية الأخلاق العامة: هل يتعارض مع القيم الإسلامية والأخلاق العامة في المملكة؟
6. زاوية التضليل: هل يتضمن ادعاءً مضللاً أو مبالغاً فيه أو يوحي بشيء غير ثابت؟
7. زاوية المصداقية المهنية: هل يقدم معلومات قانونية غير دقيقة أو مضللة أو ناقصة؟

### ثانياً — المخاطر (6 زوايا)
1. زاوية الموكل: هل يضر بمصلحة موكل حالي أو محتمل؟
2. زاوية هيبة القضاء: هل يمس هيبة القضاء أو الجهات القضائية أو يشكك فيها؟
3. زاوية السرية المهنية: هل يكشف أو يلمح إلى معلومات سرية تخص موكلين أو قضايا؟
4. زاوية الاستغلال: هل يستغل حاجة أو ضعف أو خوف أو استعجال الموكل المحتمل؟
5. زاوية التنافس غير المشروع: هل يستخدم وسائل غير مشروعة لاستقطاب العملاء؟
6. زاوية الاستقلالية: هل يوحي بتأثير خارجي على المحامي أو ارتباط بجهات غير مشروعة؟

### ثالثاً — الالتزام بمعايير الكتابة المهنية (3 زوايا)
1. زاوية السمعة المهنية: هل يسيء إلى سمعة المهنة القانونية أو يقلل من هيبتها؟
2. زاوية تمثيل العدالة: هل يليق هذا النص بشخص يمثل العدالة؟
3. زاوية الكرامة المهنية: هل يحافظ على كرامة المهنة وهيبة القضاء؟

### رابعاً — اللغة والإملاء (زاويتان)
1. زاوية الحياد والاستقلال المهني: هل يؤثر على حياد المحامي أو موضوعيته في الصياغة؟
2. زاوية الثقة العامة: هل الأخطاء اللغوية أو الإملائية تضعف ثقة المتلقي بالمحامي؟

## قواعد الرصد متعدد الزوايا
- لا تُسجل مخالفة إلا إذا اجتازت المستويات الثلاثة (التثبت → التوضيح → الرابط)
- هذه الزوايا طبقة إضافية ولا تُلغي أو تُخفف أي آلية تقييم حالية
- تُطبق جميع الزوايا الـ18 على كل نص دون استثناء
- لا يُفترض قصد الكاتب إلا إذا دل عليه النص صراحةً
- إذا اتفقت أكثر من زاوية على وجود إشكال: يُرفع مستوى الخطورة ويُوضح السبب في الـ explanation
- إذا تداخلت زاويتان في نفس المخالفة: تُدمجان في نتيجة واحدة لتجنب التكرار
- إذا وُجدت مؤشرات مهنية دون سند نظامي كافٍ: تُصنف severity="منخفض" مع إشارة في الـ explanation أنه مؤشر مخاطر مهني يحتاج مراجعة
- لا يجوز خفض مستوى الحساسية أو الرصد الحالي

## القواعد المرجعية المعتمدة
استشهد في ruleReference فقط بالقواعد الواردة في القائمة التالية — لا تستشهد بقاعدة غير موجودة فيها:
${validRefs}

أجب بـ JSON array فقط — لا تضف أي نص خارجه:
[
  {
    "ruleReference": "القاعدة الثانية",
    "confidenceLevel": "مرتفع" أو "متوسط",
    "evidenceExcerpt": "العبارة الحرفية من النص التي تُثبت المخالفة",
    "violationType": "صريح" أو "ضمني" أو "سياقي",
    "severity": "حرج" أو "مرتفع" أو "متوسط" أو "منخفض",
    "explanation": "شرح توعوي تعليمي (جملتان إلى ثلاث) يوضح للمحامي لماذا تُعد العبارة مخالفة، والغاية التي تحميها القاعدة، والأثر المهني أو القانوني المحتمل — بأسلوب إرشادي واضح لا تقني",
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

function extractJsonArray(raw: string): string | null {
  const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) {
    const inner = codeBlock[1].trim();
    const arr = inner.match(/\[[\s\S]*\]/);
    return arr ? arr[0] : null;
  }
  const arr = raw.match(/\[[\s\S]*\]/);
  return arr ? arr[0] : null;
}

function parseHolisticResponse(raw: string): HolisticViolation[] {
  try {
    const jsonMatch = extractJsonArray(raw);
    if (!jsonMatch) return [];
    const parsed = JSON.parse(jsonMatch) as Partial<HolisticViolation>[];
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
    legalExplanation: `العبارة «${evidence}» تُعد مخالفة ${violation.violationType} لـ${legalReference} من ${sourceDocument}: ${violation.explanation}`,
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

export type SemanticAnalysisResult =
  | { mode: "full"; findings: ReviewFinding[] }
  | { mode: "pattern-only"; findings: ReviewFinding[]; degradedReason: "missing-key" | "api-error" | "timeout" };

export async function runSemanticAnalysis(
  text: string,
  context: ReviewContext | undefined,
  contentKind?: ContentKind
): Promise<SemanticAnalysisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[semantic] ANTHROPIC_API_KEY missing — falling back to pattern-only");
    return { mode: "pattern-only", findings: [], degradedReason: "missing-key" };
  }

  const profile = resolveScoringProfile(contentKind ?? ("post" as ContentKind), context?.channel);
  const contextSummary = buildContextSummary(context);

  const eligibleEntries = legalKnowledgeEntries.filter((e) => e.legalReference);
  console.log("[semantic] starting holistic analysis: anchored to", eligibleEntries.length, "KB entries");

  const client = new Anthropic({ apiKey });
  const prompt = buildHolisticPrompt(text, contextSummary, eligibleEntries);

  let message: Awaited<ReturnType<typeof client.messages.create>>;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    try {
      message = await client.messages.create(
        { model: "claude-sonnet-5", max_tokens: 4096, messages: [{ role: "user", content: prompt }] },
        { signal: controller.signal }
      );
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    const isTimeout = err instanceof Error && (err.name === "AbortError" || err.message.includes("abort"));
    const degradedReason = isTimeout ? "timeout" : "api-error";
    console.warn("[semantic] API call failed — falling back to pattern-only, reason:", degradedReason, err instanceof Error ? err.message : "");
    return { mode: "pattern-only", findings: [], degradedReason };
  }

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
  return { mode: "full", findings };
}
