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
    const base = `مراجعة محتوى ${input.objective} موجه إلى ${input.audience} حول ${input.topic} في مجال ${input.practiceArea} لقناة ${input.channel}.`;

    const output = {
      observations: [
        `${base} يحتاج إلى وضوح في نطاق الرسالة الإعلامية وتجنب أي وعد بنتيجة.`,
        "ينبغي التحقق من اتساق المصطلحات المهنية مع سياق المحاماة والخدمة المعروضة.",
        "يلزم عرض أي دعوة للتواصل بصياغة مهنية لا توحي بضمان نتيجة أو استغلال حاجة المتلقي."
      ],
      riskIndicators: [
        "مؤشر خطر عند وجود عبارات تفضيل مطلقة أو وعود بنتائج.",
        "مؤشر خطر عند عرض صفة مهنية أو خبرة دون سياق موثق.",
        "مؤشر خطر عند استخدام أمثلة قد تكشف بيانات عميل أو واقعة محددة."
      ],
      improvementSuggestions: [
        "استخدم صياغة توعوية محددة ومباشرة وتجنب المبالغة.",
        "اربط الرسالة بموضوع مهني واضح وقابل للمراجعة.",
        "أضف تنبيها توعويا مناسبا عند تناول حالات عامة أو أمثلة تطبيقية."
      ],
      referenceHighlights: [
        "قواعد السلوك المهني للمحامين",
        "اللائحة التنفيذية لنظام المحاماة في المملكة العربية السعودية",
        "مصادر قاعدة المراجع المهنية والتنظيمية"
      ]
    };

    const submittedContextText = [input.topic, input.audience, input.practiceArea, input.channel, input.objective].filter(Boolean).join(" ");
    const pipelineReviews = [reviewContent(submittedContextText, "post", {
      contentType: "طلب مراجعة مساند",
      channel: input.channel,
      audience: input.audience,
      purpose: input.objective
    })];

    const legalCitations = pipelineReviews.flatMap((review) =>
      review.findings.map((finding) => ({
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
        readinessStatus: reviewReadinessStateLabels[readinessState],
        publishingReadiness: reviewReadinessStateLabels[readinessState],
        advisoryDisclaimer,
        legalCitations,
        reviews: pipelineReviews
      }
    };
  }
}

export function getAIService(): AIService {
  return new MockAIService();
}
