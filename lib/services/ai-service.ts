import type { AIContentInput, AIContentOutput, ApprovalStatus, ContentKind, ReviewResult } from "@/lib/types";
import { advisoryDisclaimer } from "@/lib/governance";
import { approvalWorkflowStateLabels } from "@/lib/services/approval-workflow-service";
import { reviewContent } from "@/lib/services/review-service";

export interface AIService {
  reviewMediaContent(input: AIContentInput): Promise<AIContentOutput>;
}

function readinessStatusFromReview(review: ReviewResult): ApprovalStatus {
  if (!review.languageQuality.passed) return "NEEDS_CORRECTION";
  if (!review.exportAllowed && review.riskLevel !== "LOW") return "NEEDS_CORRECTION";
  if (review.exportAllowed) return "APPROVED";
  return "REVIEW_REQUIRED";
}

function reviewSuggestedItems(items: Array<{ text: string; kind: ContentKind }>) {
  return items.map((item) => reviewContent(item.text, item.kind));
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
        "اللائحة التنفيذية لنظام المحاماة",
        "مصادر قاعدة المراجع المهنية والتنظيمية"
      ]
    };

    const pipelineReviews = reviewSuggestedItems([
      ...output.observations.map((text) => ({ text, kind: "ai_response" as const })),
      ...output.riskIndicators.map((text) => ({ text, kind: "ai_response" as const })),
      ...output.improvementSuggestions.map((text) => ({ text, kind: "ai_response" as const })),
      ...output.referenceHighlights.map((text) => ({ text, kind: "ai_response" as const }))
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

    const readinessState: ApprovalStatus = pipelineReviews.every((review) => review.exportAllowed)
      ? "APPROVED"
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
        readinessStatus: approvalWorkflowStateLabels[readinessState],
        publishingReadiness: approvalWorkflowStateLabels[readinessState],
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
