import type { ReviewResult } from "@/lib/types";
import { isDemoMode } from "@/lib/services/demo-mode";

export function buildReviewPersistenceData(contentId: string, review: ReviewResult) {
  return {
    contentId,
    complianceScore: review.complianceScore,
    languageQualityScore: review.languageQuality.score,
    riskLevel: review.riskLevel,
    riskScore: review.riskScore,
    publishingReadinessScore: review.publishingReadinessScore,
    reviewStatus: review.reviewStatus,
    complianceScoreExplanation: JSON.stringify(review.complianceScoreExplanation),
    riskScoreExplanation: JSON.stringify(review.riskScoreExplanation),
    publishingReadinessExplanation: JSON.stringify(review.publishingReadinessExplanation),
    traceability: JSON.stringify(review.traceability),
    summary: review.summary,
    findings: {
      create: review.findings.map((finding) => ({
        traceabilityId: finding.traceabilityId,
        title: finding.title,
        category: finding.category,
        domain: finding.domain,
        potentialImpact: finding.potentialImpact,
        weight: finding.weight,
        scoreImpact: finding.scoreImpact,
        issue: finding.issue,
        severity: finding.severity,
        evidence: finding.evidence,
        advice: finding.advice,
        legalCitation: finding.legalCitation,
        sourceDocument: finding.sourceDocument,
        ruleOrArticleNumber: finding.legalReference,
        articleTitle: finding.articleTitle,
        articleTextExcerpt: finding.articleTextExcerpt,
        confidenceLevel: finding.confidenceLevel,
        explanation: finding.legalExplanation,
        sourceUrl: finding.sourceUrl
      }))
    }
  };
}

export async function persistReviewResult(contentId: string, review: ReviewResult) {
  if (isDemoMode()) return { persisted: false, reason: "demo_mode" as const };

  const { prisma } = await import("@/lib/prisma");
  const stored = await prisma.contentReview.create({
    data: buildReviewPersistenceData(contentId, review),
    select: { id: true }
  });

  return { persisted: true, reviewId: stored.id };
}
