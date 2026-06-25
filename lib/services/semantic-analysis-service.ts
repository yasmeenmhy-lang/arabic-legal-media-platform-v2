// SEMANTIC COMPLIANCE ANALYSIS — HOLISTIC ENGINE
// ONE call to Claude with all eligible rules. Claude reads the text first,
// then identifies only the rules actually violated — ignores the rest.
// This prevents false positives caused by per-rule prompting.
// Controlled by SEMANTIC_ANALYSIS_ENABLED=true + ANTHROPIC_API_KEY env vars.

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

function buildHolisticPrompt(
  text: string,
  entries: (typeof legalKnowledgeEntries),
  contextSummary: string
): string {
  const rulesList = entries
    .map((entry) => {
      const shortText = entry.fullText.length > 500
        ? entry.fullText.slice(0, 500) + "..."
        : entry.fullText;
      const patterns = entry.prohibitedPatterns.slice(0, 3).join("، ");
      return [
        `[${entry.id}]`,
        `المرجع: ${entry.legalReference}`,
        `العنوان: ${entry.articleTitle ?? entry.section}`,
        `النص: ${shortText}`,
        patterns ? `أمثلة محظورة: ${patterns}` : ""
      ].filter(Boolean).join("\n");
    })
    .join("\n\n---\n\n");

  return `أنت محلل امتثال قانوني متخصص في مراجعة المحتوى الرقمي الصادر عن المحامين في المملكة العربية السعودية.

## السياق الثابت
هذه المنصة مخصصة للمحامين حصراً. كل نص يُدخل هو نص ينشره محامٍ أو مكتب محاماة على وسائل التواصل الاجتماعي — سواء كان منشوراً، تغريدة، تعليقاً، رداً، أو إعلاناً. حلّل النص دائماً من هذا المنظور حتى لو بدا النص غير رسمي أو مكتوباً بضمير المتكلم.

## النص المراد تحليله
«${text}»

## السياق الإضافي
${contextSummary}

## قائمة القواعد القانونية (${entries.length} قاعدة)
${rulesList}

## المهمة
١. اقرأ النص كاملاً وافهمه أولاً.
٢. مرّ على قائمة القواعد وحدد فقط ما ينتهكه النص فعلاً.
٣. القاعدة التي لا ينتهكها النص — تجاهلها تماماً ولا تذكرها.
٤. إذا لم توجد أي مخالفة — أرجع مصفوفة فارغة [].

## قواعد صارمة
- لا تخترع مخالفات غير موجودة فعلاً في النص
- الوصف المهني المشروع والتثقيف القانوني العام والتعريف بالخدمات بأسلوب محايد ليست مخالفات
- إذا كان مستوى ثقتك "منخفض" في وجود المخالفة — لا تُدرجها
- evidenceExcerpt يجب أن يكون نصاً حرفياً مقتبساً من النص المُعطى

أجب بـ JSON array فقط — لا تضف أي نص خارجه ([] إذا لم توجد مخالفات):
[
  {
    "ruleId": "معرّف القاعدة من القائمة أعلاه",
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
  ruleId: string;
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
      .filter((v) => typeof v.ruleId === "string" && v.ruleId && typeof v.evidenceExcerpt === "string" && v.evidenceExcerpt)
      .map((v) => ({
        ruleId: v.ruleId!,
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

function buildSemanticFinding(
  entry: (typeof legalKnowledgeEntries)[number],
  violation: HolisticViolation,
  profile: ScoringProfile
): ReviewFinding | null {
  if (!entry.legalReference) return null;
  if (violation.confidenceLevel === "منخفض") return null;

  const evidence = violation.evidenceExcerpt.trim();
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
    severity: violation.severity,
    evidence,
    matchedPattern: `[دلالي — ${violation.violationType}]`,
    contentClassification: "إعلان مضلل محتمل" as const,
    advice: violation.advice || entry.recommendedAction,
    suggestedSaferWording: entry.recommendedAction,
    legalCitation: `${entry.sourceDocument}، ${entry.legalReference}`,
    sourceDocument: entry.sourceDocument,
    legalReference: entry.legalReference,
    articleTitle: entry.articleTitle ?? entry.section,
    articleTextExcerpt: entry.fullText,
    explanation: violation.explanation,
    legalExplanation: `رصد التحليل الدلالي عبارة «${evidence}» بوصفها مخالفة ${violation.violationType} لـ${entry.legalReference} من ${entry.sourceDocument}. ${violation.explanation}`,
    reviewOutcome: "رصدت ملاحظة" as const,
    confidenceLevel: violation.confidenceLevel,
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
  const targetEntries = legalKnowledgeEntries.filter((entry) => entry.legalReference !== null);

  if (targetEntries.length === 0) {
    console.log("[semantic] gated: no eligible entries with legalReference");
    return [];
  }

  console.log("[semantic] starting holistic analysis: entries =", targetEntries.length);

  const client = new Anthropic({ apiKey });
  const prompt = buildHolisticPrompt(text, targetEntries, contextSummary);

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
      const entry = targetEntries.find((e) => e.id === violation.ruleId);
      if (!entry) {
        console.log(`[semantic] unknown ruleId skipped: ${violation.ruleId}`);
        return null;
      }
      return buildSemanticFinding(entry, violation, profile);
    })
    .filter((f): f is ReviewFinding => f !== null);

  console.log("[semantic] done: findings =", findings.length);
  return findings;
}
