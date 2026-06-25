// SEMANTIC COMPLIANCE ANALYSIS — PRIMARY ANALYSIS ENGINE
// Sends content to Claude to detect violations by meaning and context across
// all eligible rules (legalReference !== null). No pattern matching pre-filter.
// Controlled by SEMANTIC_ANALYSIS_ENABLED=true env var.
// Falls back silently to empty results on any error or missing API key.

import Anthropic from "@anthropic-ai/sdk";
import type { ContentKind, ReviewContext, ReviewFinding, RiskLevel } from "@/lib/types";
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

// SEM- prefix distinguishes semantic findings from pattern findings (FND-) in audit trails.
function semanticTraceabilityId(entryId: string, evidence: string): string {
  const value = `${entryId}:${evidence}`;
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return `SEM-${hash.toString(16).toUpperCase().padStart(8, "0")}`;
}

function isSemanticAnalysisEnabled(): boolean {
  return process.env.SEMANTIC_ANALYSIS_ENABLED === "true";
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

function buildPrompt(
  text: string,
  entry: (typeof legalKnowledgeEntries)[number],
  contextSummary: string
): string {
  const examplePatterns = entry.prohibitedPatterns.length > 0
    ? entry.prohibitedPatterns.slice(0, 4).join("، ")
    : "(لا تنطبق أنماط حرفية — يعتمد التحليل على روح القاعدة والسياق)";
  return `أنت محلل امتثال قانوني متخصص في مراجعة المحتوى الإعلامي للمحامين في المملكة العربية السعودية.

النص المراد تحليله:
«${text}»

السياق: ${contextSummary}

القاعدة القانونية:
- المصدر: ${entry.sourceDocument}
- المرجع: ${entry.legalReference}
- عنوان المادة: ${entry.articleTitle ?? entry.section}
- نص المادة: ${entry.fullText}
- أمثلة على الأنماط المحظورة: ${examplePatterns}

المهمة: هل يخالف هذا النص روح هذه القاعدة، سواء بشكل صريح أو ضمني أو سياقي؟
ابحث تحديداً عن: الوعود الضمنية، الإيحاءات المضللة، والعبارات التي تنتهك روح القاعدة حتى لو لم تتطابق كلياً مع الأنماط المحظورة.
انتبه بشكل خاص لـ: عروض "الاستشارة المجانية" أو أي إيحاء تجاري في الإعلان القانوني (مخالفة محتملة للقاعدة 38/1)، وعبارات الاستعجال مثل "لا تتركوا حقوقكم تضيع" أو "تواصلوا معنا اليوم" التي توحي بضغط على العميل (مخالفة محتملة للقاعدة 37/6).

أجب بـ JSON فقط — لا تضف أي نص خارجه:
{
  "violationDetected": true أو false,
  "confidenceLevel": "مرتفع" أو "متوسط" أو "منخفض",
  "evidenceExcerpt": "العبارة أو الجملة المحددة من النص التي تحمل المخالفة (فارغة إذا لم توجد)",
  "violationType": "صريح" أو "ضمني" أو "سياقي",
  "severity": "حرج" أو "مرتفع" أو "متوسط" أو "منخفض",
  "explanation": "شرح موجز وواضح لسبب المخالفة أو غيابها",
  "advice": "التوصية التطبيقية للمحامي"
}

قواعد صارمة لا تتجاوزها:
١. لا تخترع مخالفات — فقط ما يدعمه النص فعلاً
٢. التوصيف المهني المشروع ليس مخالفة
٣. إذا وجدت دليلاً ضمنياً واضحاً على مخالفة، سجّلها بمستوى ثقة "متوسط" بدلاً من تجاهلها
٤. إذا كانت confidenceLevel "منخفض"، ضع violationDetected = false
٥. evidenceExcerpt يجب أن يكون مقتبساً حرفياً من النص المعطى`;
}

interface SemanticAnalysisResult {
  violationDetected: boolean;
  confidenceLevel: "مرتفع" | "متوسط" | "منخفض";
  evidenceExcerpt: string;
  violationType: "صريح" | "ضمني" | "سياقي";
  severity: RiskLevel;
  explanation: string;
  advice: string;
}

function parseSemanticResponse(raw: string): SemanticAnalysisResult | null {
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]) as Partial<SemanticAnalysisResult>;
    if (typeof parsed.violationDetected !== "boolean") return null;
    return {
      violationDetected: parsed.violationDetected,
      confidenceLevel: parsed.confidenceLevel ?? "منخفض",
      evidenceExcerpt: parsed.evidenceExcerpt ?? "",
      violationType: parsed.violationType ?? "سياقي",
      severity: parsed.severity ?? "متوسط",
      explanation: parsed.explanation ?? "",
      advice: parsed.advice ?? ""
    };
  } catch {
    return null;
  }
}

function buildSemanticFinding(
  entry: (typeof legalKnowledgeEntries)[number],
  result: SemanticAnalysisResult,
  profile: ScoringProfile
): ReviewFinding | null {
  // Only entries with legalReference can produce auditable findings
  if (!entry.legalReference) return null;

  // Reject low-confidence detections
  if (result.confidenceLevel === "منخفض") return null;

  // Evidence must quote something from the original text
  const evidence = result.evidenceExcerpt.trim();
  if (!evidence) return null;

  const classification = classifyLegalKnowledgeEntry(entry);

  const baseFinding = {
    traceabilityId: semanticTraceabilityId(entry.id, evidence),
    legalKnowledgeEntryId: entry.id,
    sourceDocumentId: entry.sourceDocumentId,
    title: entry.articleTitle ?? entry.section,
    category: classification.category,
    domain: classification.domain,
    potentialImpact: classification.potentialImpact,
    weight: 0,
    scoreImpact: 0,
    issue: entry.riskCategories.join("، "),
    severity: result.severity,
    evidence,
    matchedPattern: `[دلالي — ${result.violationType}]`,
    contentClassification: "إعلان مضلل محتمل" as const,
    advice: result.advice || entry.recommendedAction,
    suggestedSaferWording: entry.recommendedAction,
    legalCitation: `${entry.sourceDocument}، ${entry.legalReference}`,
    sourceDocument: entry.sourceDocument,
    legalReference: entry.legalReference,
    articleTitle: entry.articleTitle ?? entry.section,
    articleTextExcerpt: entry.fullText,
    explanation: result.explanation,
    legalExplanation: `رصد التحليل الدلالي عبارة «${evidence}» بوصفها مخالفة ${result.violationType} لـ${entry.legalReference} من ${entry.sourceDocument}. ${result.explanation}`,
    reviewOutcome: "رصدت ملاحظة" as const,
    confidenceLevel: result.confidenceLevel,
    sourceUrl: entry.sourceUrl,
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
  if (!isSemanticAnalysisEnabled()) {
    console.log("[semantic] gated: SEMANTIC_ANALYSIS_ENABLED =", JSON.stringify(process.env.SEMANTIC_ANALYSIS_ENABLED));
    return [];
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log("[semantic] gated: ANTHROPIC_API_KEY is empty or missing");
    return [];
  }

  const profile = resolveScoringProfile(contentKind ?? ("post" as ContentKind), context?.channel);
  const contextSummary = buildContextSummary(context);

  // All entries with an auditable legal reference are eligible — no pre-filter by entry list.
  const targetEntries = legalKnowledgeEntries.filter((entry) => entry.legalReference !== null);

  if (targetEntries.length === 0) {
    console.log("[semantic] gated: no eligible entries with legalReference");
    return [];
  }

  console.log("[semantic] starting: entries =", targetEntries.length);
  const client = new Anthropic({ apiKey });
  const results = await Promise.all(
    targetEntries.map(async (entry) => {
      try {
        const prompt = buildPrompt(text, entry, contextSummary);
        const message = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 512,
          messages: [{ role: "user", content: prompt }]
        });

        const rawText = message.content
          .filter((block) => block.type === "text")
          .map((block) => (block as { type: "text"; text: string }).text)
          .join("");

        const result = parseSemanticResponse(rawText);
        console.log(`[semantic] entry=${entry.id} violation=${result?.violationDetected} confidence=${result?.confidenceLevel}`);
        if (!result || !result.violationDetected) return null;

        return buildSemanticFinding(entry, result, profile);
      } catch (err) {
        console.error(`[semantic] circuit-breaker: entry=${entry.id} error=`, err instanceof Error ? err.message : String(err));
        return null;
      }
    })
  );

  const findings = results.filter((f): f is ReviewFinding => f !== null);
  console.log("[semantic] done: findings =", findings.length);
  return findings;
}
