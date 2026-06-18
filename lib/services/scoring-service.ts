import type {
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

export const SCORING_MODEL_VERSION = "governed-scoring-v1";

const severityComplianceWeight: Record<RiskLevel, number> = {
  منخفض: 6,
  متوسط: 12,
  مرتفع: 20
};

const severityRiskWeight: Record<RiskLevel, number> = {
  منخفض: 6,
  متوسط: 14,
  مرتفع: 24
};

const categoryWeights: Record<FindingCategory, number> = {
  "ضوابط الإعلان": 6,
  "الوعود بالنتائج": 10,
  "السرية والخصوصية": 10,
  "استقطاب العملاء": 7,
  "الصفة المهنية": 9,
  "الخبرة المهنية": 5,
  "تعارض المصالح": 10,
  "كرامة المهنة": 5,
  "التواصل العام": 4
};

const impactWeights: Record<RiskLevel, number> = {
  منخفض: 2,
  متوسط: 5,
  مرتفع: 9
};

const domainWeights: Record<FindingDomain, number> = {
  نظامي: 8,
  مهني: 6,
  إعلاني: 7,
  لغوي: 2,
  إجرائي: 4
};

const reviewStatusScores: Record<ReviewReadinessStatus, number> = {
  DRAFT: 45,
  REVIEW_REQUIRED: 65,
  NEEDS_CORRECTION: 20,
  READY_FOR_PUBLISHING: 100,
  EXPORTED: 100,
  SHARED: 100
};

function boundedScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function classifyLegalKnowledgeEntry(entry: LegalKnowledgeEntry): {
  category: FindingCategory;
  domain: FindingDomain;
  potentialImpact: RiskLevel;
} {
  if (entry.id.includes("no-guaranteed-outcomes")) return { category: "الوعود بالنتائج", domain: "نظامي", potentialImpact: "مرتفع" };
  if (entry.id.includes("confidentiality")) return { category: "السرية والخصوصية", domain: "نظامي", potentialImpact: "مرتفع" };
  if (entry.id.includes("conflict")) return { category: "تعارض المصالح", domain: "مهني", potentialImpact: "مرتفع" };
  if (entry.id.includes("license") || entry.id.includes("prohibited-wording")) return { category: "الصفة المهنية", domain: "نظامي", potentialImpact: "مرتفع" };
  if (entry.id.includes("solicitation")) return { category: "استقطاب العملاء", domain: "إعلاني", potentialImpact: entry.severity };
  if (entry.id.includes("advertising")) return { category: "ضوابط الإعلان", domain: "إعلاني", potentialImpact: entry.severity };
  if (entry.id.includes("training")) return { category: "الخبرة المهنية", domain: "مهني", potentialImpact: entry.severity };
  if (entry.id.includes("dignity")) return { category: "كرامة المهنة", domain: "مهني", potentialImpact: entry.severity };
  return { category: "التواصل العام", domain: "إجرائي", potentialImpact: entry.severity };
}

export function calculateFindingWeight(
  severity: RiskLevel,
  category: FindingCategory,
  potentialImpact: RiskLevel
) {
  return Math.min(40, severityComplianceWeight[severity] + categoryWeights[category] + impactWeights[potentialImpact]);
}

export function calculateComplianceScore(findings: ReviewFinding[]): ComplianceScoreExplanation {
  const contributions = findings.map((finding) => ({
    traceabilityId: finding.traceabilityId,
    label: finding.title,
    value: finding.scoreImpact,
    explanation: `خصم ${finding.scoreImpact} نقطة بسبب ملاحظة ${finding.category} بدرجة ${finding.severity} وأثر محتمل ${finding.potentialImpact}.`
  }));
  const totalDeduction = contributions.reduce((sum, contribution) => sum + contribution.value, 0);

  return {
    modelVersion: SCORING_MODEL_VERSION,
    baseScore: 100,
    totalDeduction,
    finalScore: findings.length === 0 ? 100 : Math.max(0, 100 - totalDeduction),
    calculatedFromFindingsOnly: true,
    contributions
  };
}

export function calculateRiskScore(findings: ReviewFinding[]): RiskScoreExplanation {
  const severityContribution = findings.reduce((sum, finding) => sum + severityRiskWeight[finding.severity], 0);
  const categoryContribution = findings.reduce((sum, finding) => sum + categoryWeights[finding.category], 0);
  const impactContribution = findings.reduce((sum, finding) => sum + impactWeights[finding.potentialImpact], 0);
  const domains = new Set(findings.map((finding) => finding.domain));
  const domainContribution = Array.from(domains).reduce((sum, domain) => sum + domainWeights[domain], 0);
  const countContribution = findings.length > 1 ? Math.min(15, (findings.length - 1) * 4) : 0;
  const score = findings.length === 0
    ? 0
    : boundedScore(severityContribution + categoryContribution + impactContribution + domainContribution + countContribution);
  const level: RiskLevel = score >= 50 ? "مرتفع" : score >= 25 ? "متوسط" : "منخفض";

  return {
    modelVersion: SCORING_MODEL_VERSION,
    score,
    level,
    findingCount: findings.length,
    severityContribution,
    categoryContribution,
    impactContribution,
    domainContribution,
    countContribution,
    contributions: findings.map((finding) => ({
      traceabilityId: finding.traceabilityId,
      label: finding.title,
      value:
        severityRiskWeight[finding.severity] +
        categoryWeights[finding.category] +
        impactWeights[finding.potentialImpact],
      explanation: `${finding.category}: شدة ${finding.severity}، مجال ${finding.domain}، وأثر محتمل ${finding.potentialImpact}.`
    }))
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
  if (requestedStatus && ["EXPORTED", "SHARED"].includes(requestedStatus)) return requestedStatus;
  if (riskLevel === "مرتفع" || complianceScore < 82 || languageScore < 82) return "NEEDS_CORRECTION";
  if (riskLevel === "منخفض" && complianceScore >= 95 && languageScore >= 95) return "READY_FOR_PUBLISHING";
  return "REVIEW_REQUIRED";
}

export function calculatePublishingReadiness({
  complianceScore,
  riskScore,
  languageScore,
  context,
  reviewStatus
}: {
  complianceScore: number;
  riskScore: number;
  languageScore: number;
  context: ReviewContext;
  reviewStatus: ReviewReadinessStatus;
}): PublishingReadinessExplanation {
  const metadataCompletenessScore = calculateMetadataCompleteness(context);
  const factors: PublishingReadinessExplanation["factors"] = [
    {
      key: "compliance",
      label: "مستوى الامتثال",
      sourceScore: complianceScore,
      weight: 40,
      weightedScore: complianceScore * 0.4,
      explanation: "يمثل أثر الملاحظات المهنية والتنظيمية المرتبطة بالمراجع المسجلة."
    },
    {
      key: "risk",
      label: "مؤشر السلامة من المخاطر",
      sourceScore: 100 - riskScore,
      weight: 25,
      weightedScore: (100 - riskScore) * 0.25,
      explanation: "يعكس عكس درجة المخاطر المحسوبة من الشدة والعدد والنوع والأثر والمجال."
    },
    {
      key: "language",
      label: "جودة اللغة والصياغة",
      sourceScore: languageScore,
      weight: 20,
      weightedScore: languageScore * 0.2,
      explanation: "مبني على الإملاء والنحو والترقيم والأسلوب والمقروئية واتساق المصطلحات."
    },
    {
      key: "metadata",
      label: "اكتمال بيانات المراجعة",
      sourceScore: metadataCompletenessScore,
      weight: 10,
      weightedScore: metadataCompletenessScore * 0.1,
      explanation: "يقيس اكتمال نوع المحتوى والقناة والجمهور والغرض."
    },
    {
      key: "review_status",
      label: "حالة مسار المراجعة",
      sourceScore: reviewStatusScores[reviewStatus],
      weight: 5,
      weightedScore: reviewStatusScores[reviewStatus] * 0.05,
      explanation: "يعكس حالة المحتوى في مسار المراجعة وجاهزية النشر."
    }
  ];

  return {
    modelVersion: SCORING_MODEL_VERSION,
    finalScore: boundedScore(factors.reduce((sum, factor) => sum + factor.weightedScore, 0)),
    metadataCompletenessScore,
    reviewStatus,
    factors
  };
}
