import type {
  BusinessSeverity,
  ComplianceScoreExplanation,
  ContentQualityScoreExplanation,
  FindingCategory,
  FindingDomain,
  LegalKnowledgeEntry,
  PublishingReadinessExplanation,
  PublishingReadinessGate,
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

export function calculateContentQualityScore({
  complianceScore,
  riskScore,
  professionalismScore,
  languageScore
}: {
  complianceScore: number;
  riskScore: number;
  professionalismScore: number;
  languageScore: number;
}): ContentQualityScoreExplanation {
  const riskSafetyScore = 100 - riskScore;
  const redLine = complianceScore === 0 || riskSafetyScore === 0;

  const factors: ContentQualityScoreExplanation["factors"] = [
    {
      key: "compliance",
      label: "الامتثال القانوني",
      sourceScore: complianceScore,
      weight: 40,
      weightedScore: complianceScore * 0.4
    },
    {
      key: "risk",
      label: "السلامة من المخاطر",
      sourceScore: riskSafetyScore,
      weight: 30,
      weightedScore: riskSafetyScore * 0.3
    },
    {
      key: "professionalism",
      label: "المهنية",
      sourceScore: professionalismScore,
      weight: 20,
      weightedScore: professionalismScore * 0.2
    },
    {
      key: "language",
      label: "جودة اللغة",
      sourceScore: languageScore,
      weight: 10,
      weightedScore: languageScore * 0.1
    }
  ];

  const rawScore = boundedScore(factors.reduce((sum, factor) => sum + factor.weightedScore, 0));

  return {
    finalScore: redLine ? 0 : rawScore,
    redLine,
    factors
  };
}

export function calculatePublishingReadiness({
  contentQualityScore,
  findings,
  riskLevel,
  complianceScore,
  riskScore,
  context,
  reviewStatus
}: {
  contentQualityScore: number;
  findings: ReviewFinding[];
  riskLevel: RiskLevel;
  complianceScore: number;
  riskScore: number;
  context: ReviewContext;
  reviewStatus: ReviewReadinessStatus;
  profile?: ScoringProfile;
}): PublishingReadinessExplanation {
  const unresolvedFindings = findings.filter((f) => !f.resolved);
  const hasSeriousViolations = unresolvedFindings.some(
    (f) => f.businessSeverity === "critical" || f.businessSeverity === "high" || f.severity === "حرج" || f.severity === "مرتفع"
  );
  const isRedLine = complianceScore === 0 || riskScore >= 100;
  const seriousCount = unresolvedFindings.filter(
    (f) => f.businessSeverity === "critical" || f.businessSeverity === "high"
  ).length;

  const gates: PublishingReadinessGate[] = [
    {
      key: "content_quality",
      label: "جودة المحتوى",
      passed: contentQualityScore >= 70,
      sourceValue: contentQualityScore,
      threshold: "70%",
      reason: contentQualityScore >= 70
        ? "جودة المحتوى مقبولة وفق المعادلة المعتمدة."
        : `جودة المحتوى ${contentQualityScore}% أقل من الحد الأدنى المطلوب 70%.`
    },
    {
      key: "no_serious_violations",
      label: "لا مخالفات خطيرة",
      passed: !hasSeriousViolations,
      sourceValue: seriousCount,
      threshold: "0",
      reason: !hasSeriousViolations
        ? "لا توجد مخالفات خطيرة أو بالغة مرصودة."
        : `توجد ${seriousCount} مخالفة خطيرة تمنع النشر حتى معالجتها.`
    },
    {
      key: "low_risk",
      label: "مستوى المخاطر منخفض",
      passed: riskLevel === "منخفض",
      sourceValue: riskLevel,
      threshold: "منخفض",
      reason: riskLevel === "منخفض"
        ? "مستوى المخاطر منخفض ومناسب للنشر."
        : `مستوى المخاطر ${riskLevel} يستوجب المعالجة قبل النشر.`
    },
    {
      key: "no_red_line",
      label: "لا خط أحمر",
      passed: !isRedLine,
      sourceValue: `امتثال: ${complianceScore}%، مخاطر: ${riskScore}%`,
      threshold: "امتثال > 0% ومخاطر < 100%",
      reason: !isRedLine
        ? "المحتوى لا يقع في نطاق الخط الأحمر."
        : complianceScore === 0
          ? "الامتثال صفر: المحتوى ينتهك جميع معايير الامتثال المسجلة."
          : "درجة المخاطر بلغت الحد الأقصى: لا يجوز نشر هذا المحتوى."
    }
  ];

  const allPassed = gates.every((gate) => gate.passed);

  return {
    modelVersion: SCORING_MODEL_VERSION,
    finalScore: allPassed ? 100 : 0,
    metadataCompletenessScore: calculateMetadataCompleteness(context),
    reviewStatus,
    allPassed,
    gates
  };
}
