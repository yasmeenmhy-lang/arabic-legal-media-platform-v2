import type { AIContentInput, AIContentOutput, ApprovalStatus, ContentKind, ReviewResult } from "@/lib/types";
import { reviewContent } from "@/lib/services/review-service";

export interface AIService {
  generateContent(input: AIContentInput): Promise<AIContentOutput>;
}

function approvalStatusFromReview(review: ReviewResult): ApprovalStatus {
  if (!review.languageQuality.passed) return "NEEDS_CORRECTION";
  if (!review.exportAllowed && review.riskLevel !== "LOW") return "NEEDS_CORRECTION";
  if (review.exportAllowed) return "APPROVED";
  return "REVIEW_REQUIRED";
}

function reviewGeneratedItems(items: Array<{ text: string; kind: ContentKind }>) {
  return items.map((item) => reviewContent(item.text, item.kind));
}

export class MockAIService implements AIService {
  async generateContent(input: AIContentInput): Promise<AIContentOutput> {
    const base = `محتوى ${input.objective} موجه إلى ${input.audience} حول ${input.topic} في مجال ${input.practiceArea}، مناسب لقناة ${input.channel}.`;

    const output = {
      versions: [
        `${base} يركز على التوعية بلغة واضحة ويتجنب الوعود أو المبالغة.`,
        `${base} بصياغة مهنية مختصرة تدعو القارئ إلى طلب استشارة لفهم حالته الخاصة.`,
        `${base} قابل للتحويل إلى منشور قصير أو مقال تفصيلي حسب خطة النشر.`
      ],
      titles: [
        `ما الذي يجب معرفته عن ${input.topic}؟`,
        `${input.topic}: نقاط عملية قبل اتخاذ القرار`,
        `دليل موجز حول ${input.topic}`
      ],
      hashtags: ["#توعية_قانونية", "#محاماة", "#امتثال_مهني"],
      cta: "تواصل مع محام مرخص لفهم الخيارات المناسبة لحالتك."
    };

    const pipelineReviews = reviewGeneratedItems([
      ...output.versions.map((text) => ({ text, kind: "post" as const })),
      ...output.titles.map((text) => ({ text, kind: "title" as const })),
      ...output.hashtags.map((text) => ({ text, kind: "hashtag" as const })),
      { text: output.cta, kind: "caption" as const }
    ]);

    const legalCitations = pipelineReviews.flatMap((review) =>
      review.findings.map((finding) => ({
        legalCitation: finding.legalCitation,
        sourceDocument: finding.sourceDocument,
        ruleOrArticleNumber: finding.ruleOrArticleNumber,
        explanation: finding.explanation,
        sourceUrl: finding.sourceUrl
      }))
    );

    const averageLanguageScore = Math.round(
      pipelineReviews.reduce((sum, review) => sum + review.languageQuality.score, 0) / pipelineReviews.length
    );
    const averageComplianceScore = Math.round(
      pipelineReviews.reduce((sum, review) => sum + review.complianceScore, 0) / pipelineReviews.length
    );
    const highestRisk = pipelineReviews.some((review) => review.riskLevel === "CRITICAL")
      ? "CRITICAL"
      : pipelineReviews.some((review) => review.riskLevel === "HIGH")
        ? "HIGH"
        : pipelineReviews.some((review) => review.riskLevel === "MEDIUM")
          ? "MEDIUM"
          : "LOW";

    const approvalStatus: ApprovalStatus = pipelineReviews.every((review) => review.exportAllowed)
      ? "APPROVED"
      : pipelineReviews.some((review) => approvalStatusFromReview(review) === "NEEDS_CORRECTION")
        ? "NEEDS_CORRECTION"
        : "REVIEW_REQUIRED";

    return {
      ...output,
      languageQuality: {
        passed: pipelineReviews.every((review) => review.languageQuality.passed),
        score: averageLanguageScore,
        issuesCount: pipelineReviews.reduce((sum, review) => sum + review.languageQuality.issues.length, 0),
        reviews: pipelineReviews.map((review) => review.languageQuality)
      },
      compliance: {
        score: averageComplianceScore,
        riskLevel: highestRisk,
        approvalStatus,
        legalCitations,
        reviews: pipelineReviews
      }
    };
  }
}

export function getAIService(): AIService {
  return new MockAIService();
}
