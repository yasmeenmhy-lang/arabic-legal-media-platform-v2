import type {
  BusinessSeverity,
  ComplianceScoreExplanation,
  FindingCategory,
  FindingDomain,
  LegalKnowledgeEntry,
  PublishingReadinessExplanation,
  ReviewContext,
  ReviewFinding,
  ReviewReadinessStatus,
  RiskLevel,
  RiskScoreExplanation
} from "@/lib/types";
import type { ScoringProfile } from "@/lib/scoring-profiles";
import { resolveScoringProfile } from "@/lib/scoring-profiles";

export const SCORING_MODEL_VERSION = "decision-support-v2";

function boundedScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function businessSeverityForFinding(finding: Pick<ReviewFinding, "legalKnowledgeEntryId" | "severity" | "category">): BusinessSeverity {
  if (
    finding.legalKnowledgeEntryId.includes("no-guaranteed-outcomes") ||
    finding.legalKnowledgeEntryId.includes("confidentiality")
  ) return "critical";
  if (finding.severity === "حرج" || finding.severity === "مرتفع") return "high";
  if (finding.severity === "متوسط") return "medium";
  return "low";
}

export function classifyLegalKnowledgeEntry(entry: LegalKnowledgeEntry): {
  category: FindingCategory;
  domain: FindingDomain;
  potentialImpact: RiskLevel;
} {
  if (entry.id.includes("no-guaranteed-outcomes")) return { category: "الوعود بالنتائج", domain: "نظامي", potentialImpact: "حرج" };
  if (entry.id.includes("confidentiality")) return { category: "السرية والخصوصية", domain: "نظامي", potentialImpact: "حرج" };
  if (entry.id.includes("conflict")) return { category: "تعارض المصالح", domain: "مهني", potentialImpact: "مرتفع" };
  if (entry.id.includes("license") || entry.id.includes("prohibited-wording")) return { category: "الصفة المهنية", domain: "نظامي", potentialImpact: "مرتفع" };
  if (entry.id.includes("solicitation")) return { category: "استقطاب العملاء", domain: "إعلاني", potentialImpact: entry.severity };
  if (entry.id.includes("advertising")) return { category: "ضوابط الإعلان", domain: "إعلاني", potentialImpact: entry.severity };
  if (entry.id.includes("training")) return { category: "الخبرة المهنية", domain: "مهني", potentialImpact: entry.severity };
  if (entry.id.includes("dignity")) return { category: "كرامة المهنة", domain: "مهني", potentialImpact: entry.severity };
  if (entry.id.includes("competent-authority")) return { category: "الامتثال التنظيمي", domain: "نظامي", potentialImpact: "مرتفع" };
  return { category: "التواصل العام", domain: "إجرائي", potentialImpact: entry.severity };
}

export function arabicSeverity(severity: BusinessSeverity): RiskLevel {
  return severity === "critical" ? "حرج" : severity === "high" ? "مرتفع" : severity === "medium" ? "متوسط" : "منخفض";
}

export function riskDimensionsForFinding(finding: Pick<ReviewFinding, "legalKnowledgeEntryId" | "category">) {
  const dimensions: NonNullable<ReviewFinding["riskDimensions"]> = ["reputational"];
  if (
    finding.legalKnowledgeEntryId.includes("no-guaranteed-outcomes") ||
    finding.legalKnowledgeEntryId.includes("license") ||
    finding.legalKnowledgeEntryId.includes("conflict")
  ) dimensions.push("legal");
  if (finding.legalKnowledgeEntryId.includes("confidentiality")) dimensions.push("confidentiality", "legal");
  if (
    finding.legalKnowledgeEntryId.includes("advertising") ||
    finding.legalKnowledgeEntryId.includes("solicitation") ||
    finding.legalKnowledgeEntryId.includes("no-guaranteed-outcomes")
  ) dimensions.push("misleadingCommunication");
  return [...new Set(dimensions)];
}

export function calculateFindingWeight(
  severity: RiskLevel,
  _category: ReviewFinding["category"],
  _potentialImpact: RiskLevel,
  profile?: ScoringProfile
) {
  const selected = profile ?? resolveScoringProfile("post");
  const businessSeverity: BusinessSeverity =
    severity === "حرج" ? "critical" : severity === "مرتفع" ? "high" : severity === "متوسط" ? "medium" : "low";
  return selected.complianceDeductions[businessSeverity];
}

export function calculateComplianceScore(findings: ReviewFinding[], profile?: ScoringProfile): ComplianceScoreExplanation {
  const selected = profile ?? resolveScoringProfile("post");
  const unresolved = findings.filter((finding) => !finding.resolved);
  const contributions = unresolved.map((finding) => {
    const severity = finding.businessSeverity ?? businessSeverityForFinding(finding);
    const value = selected.complianceDeductions[severity];
    return {
      traceabilityId: finding.traceabilityId,
      label: finding.title,
      value,
      explanation: `أثرت الملاحظة على الامتثال بسبب شدتها وارتباطها بمرجع مهني أو رسمي واجب المراعاة.`
    };
  });
  const totalDeduction = contributions.reduce((sum, contribution) => sum + contribution.value, 0);
  return {
    modelVersion: `${selected.id}-v${selected.version}`,
    baseScore: 100,
    totalDeduction,
    finalScore: Math.max(0, 100 - totalDeduction),
    calculatedFromFindingsOnly: true,
    contributions
  };
}

export function calculateRiskScore(findings: ReviewFinding[], profile?: ScoringProfile): RiskScoreExplanation {
  const selected = profile ?? resolveScoringProfile("post");
  const unresolved = findings.filter((finding) => !finding.resolved);
  const contributions = unresolved.map((finding) => {
    const severity = finding.businessSeverity ?? businessSeverityForFinding(finding);
    return {
      traceabilityId: finding.traceabilityId,
      label: finding.title,
      value: selected.riskPoints[severity],
      explanation: `يسهم هذا العامل في المخاطر بسبب ${finding.riskDimensions?.length ? "أثره القانوني أو المهني أو الاتصالي" : "أثره المحتمل عند النشر"}.`
    };
  });
  const score = boundedScore(contributions.reduce((sum, contribution) => sum + contribution.value, 0));
  const level: RiskLevel =
    score > selected.thresholds.risk.high ? "حرج" :
      score > selected.thresholds.risk.medium ? "مرتفع" :
        score > selected.thresholds.risk.low ? "متوسط" : "منخفض";

  return {
    modelVersion: `${selected.id}-v${selected.version}`,
    score,
    level,
    findingCount: unresolved.length,
    severityContribution: score,
    categoryContribution: 0,
    impactContribution: 0,
    domainContribution: 0,
    countContribution: 0,
    contributions
  };
}

export function calculateMetadataCompleteness(context: ReviewContext) {
  const fields = [context.contentType, context.channel, context.audience, context.purpose];
  return boundedScore((fields.filter((value) => Boolean(value?.trim())).length / fields.length) * 100);
}

export function deriveReviewStatus({
  languageScore,
  complianceScore,
  riskLevel,
  requestedStatus
}: {
  languageScore: number;
  complianceScore: number;
  riskLevel: RiskLevel;
  requestedStatus?: ReviewReadinessStatus;
}): ReviewReadinessStatus {
  if (requestedStatus && ["EXPORTED", "SHARED", "READY_FOR_PUBLISHING"].includes(requestedStatus)) return requestedStatus;
  if (riskLevel === "حرج" || riskLevel === "مرتفع" || complianceScore < 70 || languageScore < 82) return "NEEDS_CORRECTION";
  return "REVIEW_REQUIRED";
}

export function calculatePublishingReadiness({
  complianceScore,
  riskScore,
  languageScore,
  professionalismScore,
  context,
  reviewStatus,
  profile
}: {
  complianceScore: number;
  riskScore: number;
  languageScore: number;
  professionalismScore: number;
  context: ReviewContext;
  reviewStatus: ReviewReadinessStatus;
  profile?: ScoringProfile;
}): PublishingReadinessExplanation {
  const selected = profile ?? resolveScoringProfile("post", context.channel);
  const weights = selected.readinessWeights;
  const riskSafetyScore = 100 - riskScore;

  // خط أحمر: امتثال صفر أو مخاطر قصوى → النتيجة الكلية صفر فوراً
  const redLine = complianceScore === 0 || riskSafetyScore === 0;

  const factors: PublishingReadinessExplanation["factors"] = [
    {
      key: "compliance",
      label: "الامتثال القانوني",
      sourceScore: complianceScore,
      weight: weights.compliance,
      weightedScore: complianceScore * (weights.compliance / 100),
      explanation: "يعكس مدى خلو المحتوى من المخالفات المهنية والتنظيمية المسجلة."
    },
    {
      key: "risk",
      label: "السلامة من المخاطر",
      sourceScore: riskSafetyScore,
      weight: weights.risk,
      weightedScore: riskSafetyScore * (weights.risk / 100),
      explanation: "يعكس مستوى الأمان القانوني والمهني والاتصالي عند النشر (100 − درجة المخاطر)."
    },
    {
      key: "professionalism",
      label: "المهنية",
      sourceScore: professionalismScore,
      weight: weights.professionalism,
      weightedScore: professionalismScore * (weights.professionalism / 100),
      explanation: "يعكس رسمية الأسلوب وخلوّه من العامية والعبارات الانفعالية والادعاءات المبالغ فيها."
    },
    {
      key: "language",
      label: "جودة اللغة",
      sourceScore: languageScore,
      weight: weights.language,
      weightedScore: languageScore * (weights.language / 100),
      explanation: "يعكس سلامة الإملاء والنحو والأسلوب ووضوح الصياغة."
    }
  ];

  const rawScore = boundedScore(factors.reduce((sum, factor) => sum + factor.weightedScore, 0));

  return {
    modelVersion: `${selected.id}-v${selected.version}`,
    finalScore: redLine ? 0 : rawScore,
    metadataCompletenessScore: calculateMetadataCompleteness(context),
    reviewStatus,
    redLine,
    factors
  };
}
