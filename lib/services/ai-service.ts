import type { AIContentInput, AIContentOutput, ReviewReadinessStatus, ReviewResult } from "@/lib/types";
import { advisoryDisclaimer } from "@/lib/governance";
import { reviewReadinessStateLabels } from "@/lib/services/approval-workflow-service";
import { reviewContent } from "@/lib/services/review-service";

export interface AIService {
  reviewMediaContent(input: AIContentInput): Promise<AIContentOutput>;
}

function readinessStatusFromReview(review: ReviewResult): ReviewReadinessStatus {
  if (!review.languageQuality.passed) return "NEEDS_CORRECTION";
  if (!review.exportAllowed && review.riskLevel !== "منخفض") return "NEEDS_CORRECTION";
  if (review.exportAllowed) return "READY_FOR_PUBLISHING";
  return "REVIEW_REQUIRED";
}

export class MockAIService implements AIService {
  async reviewMediaContent(input: AIContentInput): Promise<AIContentOutput> {
    const submittedContextText = [input.topic, input.audience, input.practiceArea, input.channel, input.objective].filter(Boolean).join(" ");
    const pipelineReviews = await Promise.all([reviewContent(submittedContextText, "post", {
      contentType: "طلب مراجعة مساند",
      channel: input.channel,
      audience: input.audience,
      purpose: input.objective
    })]);

    const legalCitations = pipelineReviews.flatMap((review) =>
      review.findings.map((finding) => ({
        traceabilityId: finding.traceabilityId,
        title: finding.title,
        category: finding.category,
        weight: finding.weight,
        scoreImpact: finding.scoreImpact,
        legalCitation: finding.legalCitation,
        sourceDocument: finding.sourceDocument,
        legalReference: finding.legalReference,
        articleTitle: finding.articleTitle,
        articleTextExcerpt: finding.articleTextExcerpt,
        explanation: finding.legalExplanation,
        confidenceLevel: finding.confidenceLevel,
        sourceUrl: finding.sourceUrl
      }))
    );
    const findings = pipelineReviews.flatMap((review) => review.findings);
    const governedRewrites = pipelineReviews.flatMap((review) => review.governedRewrites);
    const primaryReview = pipelineReviews[0];

    const averageLanguageScore = Math.round(
      pipelineReviews.reduce((sum, review) => sum + review.languageQuality.score, 0) / pipelineReviews.length
    );
    const averageComplianceScore = Math.round(
      pipelineReviews.reduce((sum, review) => sum + review.complianceScore, 0) / pipelineReviews.length
    );
    const highestRisk = pipelineReviews.some((review) => review.riskLevel === "مرتفع")
      ? "مرتفع"
      : pipelineReviews.some((review) => review.riskLevel === "متوسط")
        ? "متوسط"
        : "منخفض";

    const readinessState: ReviewReadinessStatus = pipelineReviews.every((review) => review.exportAllowed)
      ? "READY_FOR_PUBLISHING"
      : pipelineReviews.some((review) => readinessStatusFromReview(review) === "NEEDS_CORRECTION")
        ? "NEEDS_CORRECTION"
        : "REVIEW_REQUIRED";

    return {
      observations: findings.map((finding) => finding.legalExplanation),
      riskIndicators: findings.map(
        (finding) => `${finding.title}: شدة ${finding.severity} وأثر محتمل ${finding.potentialImpact} (${finding.traceabilityId}).`
      ),
      improvementSuggestions: governedRewrites.map((rewrite) => rewrite.suggestedText),
      referenceHighlights: primaryReview.referencesPanel.map(
        (reference) => `${reference.sourceDocument} - ${reference.legalReference}`
      ),
      languageQuality: {
        passed: pipelineReviews.every((review) => review.languageQuality.passed),
        score: averageLanguageScore,
        issuesCount: pipelineReviews.reduce((sum, review) => sum + review.languageQuality.issues.length, 0),
        reviews: pipelineReviews.map((review) => review.languageQuality)
      },
      compliance: {
        score: averageComplianceScore,
        scoreExplanation: primaryReview.complianceScoreExplanation,
        riskScore: primaryReview.riskScore,
        riskLevel: highestRisk,
        riskScoreExplanation: primaryReview.riskScoreExplanation,
        publishingReadinessScore: primaryReview.publishingReadinessScore,
        publishingReadinessExplanation: primaryReview.publishingReadinessExplanation,
        readinessStatus: reviewReadinessStateLabels[readinessState],
        publishingReadiness: reviewReadinessStateLabels[readinessState],
        advisoryDisclaimer,
        legalCitations,
        traceability: primaryReview.traceability,
        reviews: pipelineReviews
      }
    };
  }
}

export function getAIService(): AIService {
  return new MockAIService();
}
