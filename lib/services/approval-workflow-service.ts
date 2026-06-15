import type { ApprovalStatus, ApprovalWorkflowItem, ReviewResult, RiskLevel } from "@/lib/types";
import { isDemoMode } from "@/lib/services/demo-mode";

export const approvalWorkflowStates: ApprovalStatus[] = ["DRAFT", "REVIEW_REQUIRED", "NEEDS_CORRECTION", "APPROVED", "EXPORTED", "SHARED"];

function normalizeApprovalStatus(status?: string | null): ApprovalStatus {
  return approvalWorkflowStates.includes(status as ApprovalStatus) ? (status as ApprovalStatus) : "DRAFT";
}

function normalizeRiskLevel(riskLevel?: string | null): RiskLevel {
  return ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(riskLevel ?? "") ? (riskLevel as RiskLevel) : "LOW";
}

function getDemoApprovalWorkflowItems(): ApprovalWorkflowItem[] {
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
      owner: "المراجع القانوني",
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
      id: "demo-approved",
      title: "نص قصير عن سرية معلومات العميل",
      owner: "المحرر القانوني",
      status: "APPROVED",
      languageQualityScore: 95,
      complianceScore: 93,
      riskLevel: "LOW",
      updatedAt
    },
    {
      id: "demo-exported",
      title: "حزمة نشر LinkedIn مع بيانات الامتثال",
      owner: "مركز التصدير",
      status: "EXPORTED",
      languageQualityScore: 92,
      complianceScore: 90,
      riskLevel: "LOW",
      updatedAt
    },
    {
      id: "demo-shared",
      title: "منشور X تمت مشاركته يدويا",
      owner: "مركز المشاركة",
      status: "SHARED",
      languageQualityScore: 89,
      complianceScore: 88,
      riskLevel: "MEDIUM",
      updatedAt
    }
  ];
}

export function runApprovalWorkflow(review: Pick<ReviewResult, "languageQuality" | "complianceScore" | "riskLevel">) {
  const approved =
    review.languageQuality.passed &&
    review.complianceScore >= 82 &&
    (review.riskLevel === "LOW" || review.riskLevel === "MEDIUM");

  return {
    approved,
    status: approved ? "approved" : "needs_revision",
    reason: approved
      ? "Content passed language quality, legal compliance, and risk checks."
      : "Content must be revised before approval and export."
  };
}

export async function getApprovalWorkflowItems(): Promise<ApprovalWorkflowItem[]> {
  if (isDemoMode()) return getDemoApprovalWorkflowItems();

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
    const status = normalizeApprovalStatus(content.approvalStatus || content.status);

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

export async function getApprovalWorkflowCenter() {
  const items = await getApprovalWorkflowItems();

  return {
    states: approvalWorkflowStates,
    items,
    metrics: {
      draft: items.filter((item) => item.status === "DRAFT").length,
      reviewRequired: items.filter((item) => item.status === "REVIEW_REQUIRED").length,
      needsCorrection: items.filter((item) => item.status === "NEEDS_CORRECTION").length,
      approved: items.filter((item) => item.status === "APPROVED").length,
      exported: items.filter((item) => item.status === "EXPORTED").length,
      shared: items.filter((item) => item.status === "SHARED").length
    }
  };
}
