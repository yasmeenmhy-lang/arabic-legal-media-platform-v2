import type { ContentKind, ReviewContext, ReviewResult, ReviewWorkflowStep } from "@/lib/types";
import { advisoryDisclaimer } from "@/lib/governance";
import { createReviewedContentContext } from "@/lib/review-context";
import { reviewLanguageQuality, reviewProfessionalism } from "@/lib/services/language-quality-service";
import { runPublishingReadinessReview } from "@/lib/services/approval-workflow-service";
import { rebuildComplianceFromFindings } from "@/lib/services/legal-compliance-service";
import { runSemanticAnalysis } from "@/lib/services/semantic-analysis-service";
import { buildGovernedRewriteSuggestions } from "@/lib/services/recommendation-service";
import {
  calculateContentQualityScore,
  calculatePublishingReadiness,
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

export async function reviewContent(text: string, kind: ContentKind = "post", context: ReviewContext = {}): Promise<ReviewResult> {
  const profile = resolveScoringProfile(kind, context.channel);
  const languageQuality = reviewLanguageQuality({
    text,
    kind,
    terminologyMap: {
      المسؤولية: ["المسؤليه", "المسئولية"],
      الإجراء: ["الاجراء", "اجراءات"]
    }
  });

  const professionalism = reviewProfessionalism(text);
  const compliance = rebuildComplianceFromFindings(await runSemanticAnalysis(text, context, kind), profile);
  const reviewStatus = deriveReviewStatus({
    languageScore: languageQuality.score,
    complianceScore: compliance.complianceScore,
    riskLevel: compliance.riskLevel,
    requestedStatus: context.reviewStatus
  });
  const approved = ["READY_FOR_PUBLISHING", "EXPORTED", "SHARED"].includes(reviewStatus);
  const contentQualityExplanation = calculateContentQualityScore({
    complianceScore: compliance.complianceScore,
    riskScore: compliance.riskScore,
    professionalismScore: professionalism.score,
    languageScore: languageQuality.score
  });
  const publishingReadinessExplanation = calculatePublishingReadiness({
    complianceScore: compliance.complianceScore,
    riskScore: compliance.riskScore,
    languageScore: languageQuality.score,
    approvalScore: approved ? 100 : 0,
    context,
    reviewStatus,
    profile
  });
  const publishingReadinessScore = publishingReadinessExplanation.finalScore;
  const readiness = runPublishingReadinessReview({
    languageQuality,
    complianceScore: compliance.complianceScore,
    riskLevel: compliance.riskLevel,
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
    originalRiskLevel: compliance.riskLevel,
    originalRiskScore: compliance.riskScore
  });
  const reviewContext = createReviewedContentContext(text, context);
  const calculatedAt = new Date().toISOString();
  const confidence = buildConfidence(compliance.findings, context);
  const readinessDecision = buildReadinessDecision({
    complianceScore: compliance.complianceScore,
    riskLevel: compliance.riskLevel,
    languagePassed: languageQuality.passed,
    approved,
    findings: compliance.findings
  });
  const publicationDecision = buildPublicationDecision({
    confidence,
    readiness: readinessDecision,
    findings: compliance.findings,
    riskLevel: compliance.riskLevel
  });
  const channelRecommendations = buildChannelRecommendations(kind, context, compliance.findings, readinessDecision);
  const decisionWorkflow = buildDecisionWorkflow(publicationDecision, governedRewrites.length > 0, approved);

  return {
    reviewContext,
    languageQuality,
    professionalismScore: professionalism.score,
    contentQualityScore: contentQualityExplanation.finalScore,
    contentQualityScoreExplanation: contentQualityExplanation,
    complianceScore: compliance.complianceScore,
    complianceScoreExplanation: compliance.complianceScoreExplanation,
    riskLevel: compliance.riskLevel,
    riskScore: compliance.riskScore,
    riskScoreExplanation: compliance.riskScoreExplanation,
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
    decisionWorkflow
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
