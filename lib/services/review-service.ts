import type {
  ContentKind,
  LanguageIssueCategory,
  LanguageIssueSeverity,
  LanguageQualityIssue,
  LanguageQualityReviewResult,
  ReviewContext,
  ReviewFinding,
  ReviewResult,
  ReviewWorkflowStep,
  RiskAffectedParty,
  RiskLevel
} from "@/lib/types";
import { advisoryDisclaimer } from "@/lib/governance";
import { createReviewedContentContext } from "@/lib/review-context";
import { runPublishingReadinessReview } from "@/lib/services/approval-workflow-service";
import { rebuildComplianceFromFindings } from "@/lib/services/legal-compliance-service";
import { runSemanticAnalysis } from "@/lib/services/semantic-analysis-service";
import type { SemanticAnalysisResult } from "@/lib/services/semantic-analysis-service";
import { evaluateContent } from "@/lib/services/content-evaluation-service";
import { buildGovernedRewriteSuggestions } from "@/lib/services/recommendation-service";
import {
  calculateContentQualityScore,
  calculatePublishingReadiness,
  calculateRiskFromEvaluation,
  deriveReviewStatus,
  SCORING_MODEL_VERSION
} from "@/lib/services/scoring-service";
import { resolveScoringProfile } from "@/lib/scoring-profiles";
import {
  buildChannelRecommendations,
  buildConfidence,
  buildDecisionWorkflow,
  buildPublicationDecision,
  buildReadinessDecision
} from "@/lib/services/decision-support-service";

const noRegisteredViolationMessage = "لم يتم رصد ملاحظة مرتبطة بالمراجع المهنية والتنظيمية المسجلة.";

// الامتثال يحكم أرضية المخاطر: لا يجوز أن يظهر خطر "منخفض" مع وجود مخالفات مرصودة
const RISK_ORDER: RiskLevel[] = ["منخفض", "متوسط", "مرتفع", "بالغ"];

function riskFloorFromFindings(findings: ReviewFinding[]): RiskLevel {
  const active = findings.filter((f) => !f.resolved);
  if (active.some((f) => f.businessSeverity === "critical" || f.businessSeverity === "high")) return "مرتفع";
  if (active.length > 0) return "متوسط";
  return "منخفض";
}

const workflowLabels: Array<[ReviewWorkflowStep["key"], string]> = [
  ["language_quality_review", "جودة اللغة والصياغة"],
  ["legal_compliance_review", "ملاحظات الامتثال"],
  ["risk_assessment", "مؤشرات المخاطر"],
  ["publishing_readiness", "ملخص المراجعة وجاهزية النشر"],
  ["export_support", "دعم التصدير"]
];

function buildWorkflow(languageQualityPassed: boolean, compliancePassed: boolean, readinessPassed: boolean): ReviewWorkflowStep[] {
  return workflowLabels.map(([key, label], index) => {
    if (index === 0) return { key, label, status: languageQualityPassed ? "passed" : "failed" };
    if (!languageQualityPassed) return { key, label, status: "blocked" };
    if (index === 1 || index === 2) return { key, label, status: compliancePassed ? "passed" : "failed" };
    if (!compliancePassed) return { key, label, status: "blocked" };
    return { key, label, status: readinessPassed ? "passed" : "pending" };
  });
}

function mapToLanguageQualityResult(
  aiLang: { score: number; passed: boolean; issues: Array<{ category: LanguageIssueCategory; severity: LanguageIssueSeverity; excerpt: string; message: string; suggestion: string }> }
): LanguageQualityReviewResult {
  const weights: Record<LanguageIssueSeverity, number> = { low: 2, medium: 5, high: 9, critical: 16 };
  const issues: LanguageQualityIssue[] = aiLang.issues.map((issue, index) => ({
    id: `ai-${issue.category}-${index + 1}`,
    category: issue.category,
    severity: issue.severity,
    message: issue.message || "يوجد خطأ في النص",
    excerpt: issue.excerpt,
    suggestion: issue.suggestion
  }));

  const categoryScores: Record<LanguageIssueCategory, number> = {
    spelling: 100,
    grammar: 100,
    style: 100,
    readability: 100,
    "اتساق المصطلحات": 100
  };
  for (const issue of issues) {
    categoryScores[issue.category] = Math.max(0, categoryScores[issue.category] - weights[issue.severity]);
  }

  return {
    passed: aiLang.passed,
    score: aiLang.score,
    threshold: 75,
    normalizedText: "",
    improvedDraft: "",
    issues,
    categoryScores,
    reviewedAt: new Date().toISOString()
  };
}

export async function reviewContent(text: string, kind: ContentKind = "post", context: ReviewContext = {}): Promise<ReviewResult> {
  const profile = resolveScoringProfile(kind, context.channel);

  // Run compliance analysis and content evaluation (risk + professionalism + language) in parallel
  const [semanticResult, contentEval] = await Promise.all([
    runSemanticAnalysis(text, context, kind),
    evaluateContent(text)
  ]);

  const semanticFindings = semanticResult.findings;
  const analysisMode: ReviewResult["analysisMode"] = semanticResult.mode;
  const degradedReason: ReviewResult["degradedReason"] =
    semanticResult.mode === "pattern-only" ? (semanticResult as Extract<SemanticAnalysisResult, { mode: "pattern-only" }>).degradedReason : undefined;
  if (analysisMode === "pattern-only") {
    console.warn("[review-service] degraded to pattern-only, reason:", degradedReason);
  }

  const languageQuality = mapToLanguageQualityResult(contentEval.language);
  const compliance = rebuildComplianceFromFindings(semanticFindings, profile);

  // Override risk values with AI-based evaluation (affected parties model),
  // floored by compliance findings — non-compliance always raises the risk level
  const complianceFloor = riskFloorFromFindings(compliance.findings);
  const effectiveRisks =
    RISK_ORDER.indexOf(complianceFloor) > RISK_ORDER.indexOf(contentEval.risks.level)
      ? {
          level: complianceFloor,
          affectedParties: contentEval.risks.affectedParties.length > 0
            ? contentEval.risks.affectedParties
            : (["المحامي", "المهنة"] as RiskAffectedParty[]),
          explanation: [
            `رُصدت ${compliance.findings.length} مخالفة امتثال — عدم الالتزام بقواعد السلوك المهني يعرّض المحامي للمساءلة ويضر بسمعة المهنة.`,
            contentEval.risks.explanation && !contentEval.risks.explanation.startsWith("تعذّر")
              ? contentEval.risks.explanation
              : ""
          ].filter(Boolean).join(" "),
          fix: contentEval.risks.fix || "عالج مخالفات الامتثال المرصودة قبل النشر لخفض مستوى المخاطر."
        }
      : contentEval.risks;
  const riskScore = effectiveRisks.level === "بالغ" ? 100
    : effectiveRisks.level === "مرتفع" ? 70
    : effectiveRisks.level === "متوسط" ? 40
    : 10;
  const riskLevel = effectiveRisks.level;
  const riskScoreExplanation = calculateRiskFromEvaluation(effectiveRisks, compliance.findings.length, profile);
  const professionalismScore = contentEval.professionalWriting.score;
  const reviewStatus = deriveReviewStatus({
    languageScore: languageQuality.score,
    complianceScore: compliance.complianceScore,
    riskLevel,
    requestedStatus: context.reviewStatus
  });
  const approved = ["READY_FOR_PUBLISHING", "EXPORTED", "SHARED"].includes(reviewStatus);
  const contentQualityExplanation = calculateContentQualityScore({
    complianceScore: compliance.complianceScore,
    riskScore,
    professionalismScore,
    languageScore: languageQuality.score
  });
  const publishingReadinessExplanation = calculatePublishingReadiness({
    complianceScore: compliance.complianceScore,
    riskScore,
    professionalismScore,
    languageScore: languageQuality.score,
    context,
    reviewStatus
  });
  const publishingReadinessScore = publishingReadinessExplanation.finalScore;
  const readiness = runPublishingReadinessReview({
    languageQuality,
    complianceScore: compliance.complianceScore,
    riskLevel,
    publishingReadinessScore,
    reviewStatus
  });
  const readyForPublishing = readiness.readyForPublishing;
  const governedRewrites = buildGovernedRewriteSuggestions({
    text,
    kind,
    context,
    originalFindings: compliance.findings,
    originalComplianceScore: compliance.complianceScore,
    originalLanguageQuality: languageQuality.score,
    originalRiskLevel: riskLevel,
    originalRiskScore: riskScore
  });
  const reviewContext = createReviewedContentContext(text, context);
  const calculatedAt = new Date().toISOString();
  const confidence = buildConfidence(compliance.findings, context);
  const readinessDecision = buildReadinessDecision({
    complianceScore: compliance.complianceScore,
    riskLevel,
    languagePassed: languageQuality.passed,
    approved,
    findings: compliance.findings
  });
  const publicationDecision = buildPublicationDecision({
    confidence,
    readiness: readinessDecision,
    findings: compliance.findings,
    riskLevel
  });
  const channelRecommendations = buildChannelRecommendations(kind, context, compliance.findings, readinessDecision);
  const decisionWorkflow = buildDecisionWorkflow(publicationDecision, governedRewrites.length > 0, approved);

  return {
    reviewContext,
    languageQuality,
    professionalismScore,
    contentQualityScore: contentQualityExplanation.finalScore,
    contentQualityScoreExplanation: contentQualityExplanation,
    complianceScore: compliance.complianceScore,
    complianceScoreExplanation: compliance.complianceScoreExplanation,
    riskLevel,
    riskScore,
    riskScoreExplanation,
    publishingReadinessScore,
    publishingReadinessExplanation,
    reviewStatus,
    summary:
      compliance.findings.length > 0
        ? `توجد ${compliance.findings.length} ملاحظة مهنية أو تنظيمية مرتبطة بمواد وقواعد محددة من قواعد السلوك المهني أو اللائحة التنفيذية. تظهر كل ملاحظة سبب الرصد، مستوى الثقة، والمصدر الرسمي.`
        : noRegisteredViolationMessage,
    findings: compliance.findings,
    professionalConductCompliance: compliance.professionalConductCompliance,
    executiveRegulationCompliance: compliance.executiveRegulationCompliance,
    legalRiskAssessment: compliance.legalRiskAssessment,
    referencesPanel: compliance.referencesPanel,
    governedRewrites,
    traceability: {
      reviewId: reviewContext.reviewId,
      scoringModelVersion: SCORING_MODEL_VERSION,
      calculatedAt,
      findingTraceabilityIds: compliance.findings.map((finding) => finding.traceabilityId),
      legalKnowledgeEntryIds: [...new Set(compliance.findings.map((finding) => finding.legalKnowledgeEntryId))],
      sourceDocumentIds: [...new Set(compliance.findings.map((finding) => finding.sourceDocumentId))]
    },
    workflow: buildWorkflow(languageQuality.passed, compliance.passed, readyForPublishing),
    exportAllowed: readyForPublishing,
    advisoryDisclaimer,
    publicationDecision,
    confidence,
    readinessDecision,
    channelRecommendations,
    decisionWorkflow,
    analysisMode,
    semanticAvailable: analysisMode === "full",
    degradedReason
  };
}

export async function assertContentCanExport(text: string, kind: ContentKind = "social_export") {
  const review = await reviewContent(text, kind);

  return {
    allowed: review.exportAllowed,
    review,
    message: review.exportAllowed
      ? "المحتوى مناسب للتصدير وفق نتائج المراجعة."
      : "يتاح التصدير بعد مراجعة ومعالجة ملاحظات اللغة والامتثال والمخاطر."
  };
}
