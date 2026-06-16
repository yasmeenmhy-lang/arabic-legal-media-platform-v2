import type { ReviewReadinessItem, ReviewReadinessStatus, ReviewResult, RiskLevel } from "@/lib/types";
import { isDemoMode } from "@/lib/services/demo-mode";

export const reviewReadinessStates: ReviewReadinessStatus[] = ["DRAFT", "REVIEW_REQUIRED", "NEEDS_CORRECTION", "READY_FOR_PUBLISHING", "EXPORTED", "SHARED"];

export const reviewReadinessStateLabels: Record<ReviewReadinessStatus, string> = {
  DRAFT: "مسودة",
  REVIEW_REQUIRED: "تتطلب مراجعة",
  NEEDS_CORRECTION: "يتطلب معالجة الملاحظات",
  READY_FOR_PUBLISHING: "مناسب للنشر وفق نتائج المراجعة",
  EXPORTED: "تم التصدير",
  SHARED: "تمت المشاركة"
};

function normalizeReviewReadinessStatus(status?: string | null): ReviewReadinessStatus {
  if (status === "APPROVED") return "READY_FOR_PUBLISHING";
  return reviewReadinessStates.includes(status as ReviewReadinessStatus) ? (status as ReviewReadinessStatus) : "DRAFT";
}

function normalizeRiskLevel(riskLevel?: string | null): RiskLevel {
  return ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(riskLevel ?? "") ? (riskLevel as RiskLevel) : "LOW";
}

function getDemoReviewReadinessItems(): ReviewReadinessItem[] {
  const updatedAt = new Date("2026-06-15T00:00:00.000Z").toISOString();

  return [
    {
      id: "demo-draft",
      title: "مسودة منشور توعوي عن الاستشارات القانونية",
      owner: "فريق المحتوى",
      status: "DRAFT",
      languageQualityScore: 86,
      complianceScore: 0,
      riskLevel: "LOW",
      updatedAt
    },
    {
      id: "demo-review-required",
      title: "مقال تثقيفي عن حقوق الموكل",
      owner: "المراجع المهني",
      status: "REVIEW_REQUIRED",
      languageQualityScore: 91,
      complianceScore: 84,
      riskLevel: "MEDIUM",
      updatedAt
    },
    {
      id: "demo-needs-correction",
      title: "حملة تتضمن ادعاء نتيجة مضمونة",
      owner: "فريق الحملات",
      status: "NEEDS_CORRECTION",
      languageQualityScore: 72,
      complianceScore: 55,
      riskLevel: "HIGH",
      updatedAt
    },
    {
      id: "demo-ready",
      title: "نص قصير عن سرية معلومات العميل",
      owner: "المحرر المهني",
      status: "READY_FOR_PUBLISHING",
      languageQualityScore: 95,
      complianceScore: 93,
      riskLevel: "LOW",
      updatedAt
    },
    {
      id: "demo-exported",
      title: "حزمة نشر LinkedIn مع بيانات الامتثال",
      owner: "دعم التصدير",
      status: "EXPORTED",
      languageQualityScore: 92,
      complianceScore: 90,
      riskLevel: "LOW",
      updatedAt
    },
    {
      id: "demo-shared",
      title: "منشور X تمت مشاركته يدوياً",
      owner: "دعم المشاركة",
      status: "SHARED",
      languageQualityScore: 89,
      complianceScore: 88,
      riskLevel: "MEDIUM",
      updatedAt
    }
  ];
}

export function runPublishingReadinessReview(review: Pick<ReviewResult, "languageQuality" | "complianceScore" | "riskLevel">) {
  const readyForPublishing =
    review.languageQuality.passed &&
    review.complianceScore >= 82 &&
    (review.riskLevel === "LOW" || review.riskLevel === "MEDIUM");

  return {
    readyForPublishing,
    status: readyForPublishing ? "ready_for_publishing" : "needs_revision",
    reason: readyForPublishing
      ? "المحتوى مناسب للنشر وفق نتائج مراجعة اللغة والامتثال ومؤشرات المخاطر."
      : "يتطلب المحتوى معالجة الملاحظات قبل التصدير أو المشاركة."
  };
}

export async function getReviewReadinessItems(): Promise<ReviewReadinessItem[]> {
  if (isDemoMode()) return getDemoReviewReadinessItems();

  const { prisma } = await import("@/lib/prisma");
  const contents = await prisma.content.findMany({
    include: {
      owner: true,
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 1
      }
    },
    orderBy: { updatedAt: "desc" }
  });

  return contents.map((content) => {
    const latestReview = content.reviews[0];
    const status = normalizeReviewReadinessStatus(content.approvalStatus || content.status);

    return {
      id: content.id,
      title: content.title,
      owner: content.owner.name,
      status,
      languageQualityScore: latestReview?.languageQualityScore ?? 0,
      complianceScore: latestReview?.complianceScore ?? 0,
      riskLevel: normalizeRiskLevel(latestReview?.riskLevel),
      updatedAt: content.updatedAt.toISOString()
    };
  });
}

export async function getReviewReadinessCenter() {
  const items = await getReviewReadinessItems();

  return {
    states: reviewReadinessStates.map((state) => reviewReadinessStateLabels[state]),
    stateLabels: reviewReadinessStateLabels,
    items,
    metrics: {
      draft: items.filter((item) => item.status === "DRAFT").length,
      reviewRequired: items.filter((item) => item.status === "REVIEW_REQUIRED").length,
      needsCorrection: items.filter((item) => item.status === "NEEDS_CORRECTION").length,
      readyForPublishing: items.filter((item) => item.status === "READY_FOR_PUBLISHING").length,
      exported: items.filter((item) => item.status === "EXPORTED").length,
      shared: items.filter((item) => item.status === "SHARED").length
    }
  };
}
