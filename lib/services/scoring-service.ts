import type {
  BusinessSeverity,
  ComplianceScoreExplanation,
  ContentEvaluationRisks,
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

export function riskLevelToNumeric(level: RiskLevel): number {
  if (level === "بالغ") return 100;
  if (level === "مرتفع") return 70;
  if (level === "متوسط") return 40;
  return 10; // منخفض or حرج (mapped to 10 when used in new model context)
}

export function calculateRiskFromEvaluation(
  risks: ContentEvaluationRisks,
  findingCount: number,
  profile?: ScoringProfile
): RiskScoreExplanation {
  const selected = profile ?? resolveScoringProfile("post");
  const riskNumeric = riskLevelToNumeric(risks.level);
  const parties = risks.affectedParties;
  const numParties = parties.length || 1;
  const baseValue = Math.floor(riskNumeric / numParties);
  const remainder = riskNumeric - baseValue * numParties;

  const contributions =
    parties.length > 0
      ? parties.map((party, i) => ({
          traceabilityId: `RISK-${party}`,
          label: party,
          value: i === 0 ? baseValue + remainder : baseValue,
          explanation: risks.explanation
        }))
      : [
          {
            traceabilityId: "RISK-NONE",
            label: "لا مخاطر محددة",
            value: riskNumeric,
            explanation: risks.explanation || "لم يُرصد خطر مباشر على أي جهة."
          }
        ];

  return {
    modelVersion: `${selected.id}-v${selected.version}`,
    score: riskNumeric,
    level: risks.level,
    findingCount,
    severityContribution: riskNumeric,
    categoryContribution: 0,
    impactContribution: 0,
    domainContribution: 0,
    countContribution: 0,
    contributions,
    affectedParties: risks.affectedParties,
    explanation: risks.explanation,
    fix: risks.fix
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
  if (riskLevel === "بالغ" || riskLevel === "مرتفع" || complianceScore < 70 || languageScore < 82) return "NEEDS_CORRECTION";
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
  // Red lines: any violation (compliance < 100) or extreme risk (بالغ = riskScore === 100)
  const redLine = complianceScore < 100 || riskScore >= 100;

  const factors: ContentQualityScoreExplanation["factors"] = [
    {
      key: "compliance",
      label: "الامتثال",
      sourceScore: complianceScore,
      weight: 40,
      weightedScore: 40 // Fixed 40 when compliant; red line prevents reaching this otherwise
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
      label: "الالتزام بمعايير الجوانب المهنية",
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
  complianceScore,
  riskScore,
  professionalismScore,
  languageScore,
  context,
  reviewStatus
}: {
  complianceScore: number;
  riskScore: number;
  professionalismScore: number;
  languageScore: number;
  context: ReviewContext;
  reviewStatus: ReviewReadinessStatus;
  profile?: ScoringProfile;
}): PublishingReadinessExplanation {
  const gates: PublishingReadinessGate[] = [
    {
      key: "compliance",
      label: "الامتثال",
      passed: complianceScore === 100,
      sourceValue: complianceScore,
      threshold: "100%",
      reason: complianceScore === 100
        ? "لا توجد مخالفات قانونية — النص ملتزم بالكامل."
        : "يوجد مخالفات قانونية يجب إصلاحها قبل النشر."
    },
    {
      key: "risk",
      label: "مستوى المخاطر",
      passed: riskScore < 20,
      sourceValue: riskScore,
      threshold: "أقل من 20",
      reason: riskScore < 20
        ? "مستوى المخاطر منخفض جداً ومناسب للنشر."
        : "المحتوى يحتوي على مخاطر عالية."
    },
    {
      key: "professionalism",
      label: "الالتزام بمعايير الجوانب المهنية",
      passed: professionalismScore >= 80,
      sourceValue: professionalismScore,
      threshold: "80%",
      reason: professionalismScore >= 80
        ? "الأسلوب مستوفٍ للمعايير المهنية المعتمدة."
        : "الأسلوب غير مستوفٍ للمعايير المهنية المعتمدة."
    },
    {
      key: "language",
      label: "جودة اللغة",
      passed: languageScore >= 75,
      sourceValue: languageScore,
      threshold: "75%",
      reason: languageScore >= 75
        ? "اللغة سليمة ومناسبة للنشر."
        : "يوجد أخطاء لغوية يجب تصحيحها."
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
