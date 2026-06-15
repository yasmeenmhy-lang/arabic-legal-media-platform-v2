import type { ApprovalStatus, ApprovalWorkflowItem, ReviewResult, RiskLevel } from "@/lib/types";
import { prisma } from "@/lib/prisma";

export const approvalWorkflowStates: ApprovalStatus[] = ["DRAFT", "REVIEW_REQUIRED", "NEEDS_CORRECTION", "APPROVED", "EXPORTED", "SHARED"];

function normalizeApprovalStatus(status?: string | null): ApprovalStatus {
  return approvalWorkflowStates.includes(status as ApprovalStatus) ? (status as ApprovalStatus) : "DRAFT";
}

function normalizeRiskLevel(riskLevel?: string | null): RiskLevel {
  return ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(riskLevel ?? "") ? (riskLevel as RiskLevel) : "LOW";
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
