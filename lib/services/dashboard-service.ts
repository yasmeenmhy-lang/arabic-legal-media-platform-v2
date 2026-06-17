import { legalSourceDocuments } from "@/lib/legal-knowledge-base";
import { isDemoMode } from "@/lib/services/demo-mode";

function getDemoDashboardOverview() {
  return {
    pendingReviews: 0,
    publishableContent: 0,
    exportsRequiringAttention: 0,
    highRiskContent: 0,
    legalReferenceVersion: legalSourceDocuments.map((source) => source.version).filter(Boolean).join(" / ") || "غير محدد",
    lastLegalSourceCheck: new Date("2026-06-15T00:00:00.000Z").toISOString(),
    pendingLegalSourceUpdates: 0
  };
}

export async function getDashboardOverview() {
  if (isDemoMode()) return getDemoDashboardOverview();

  const { prisma } = await import("@/lib/prisma");
  const [
    pendingReviews,
    publishableContent,
    exportsRequiringAttention,
    highRiskContent,
    pendingLegalSourceUpdates,
    legalSources
  ] = await Promise.all([
    prisma.content.count({ where: { approvalStatus: "REVIEW_REQUIRED" } }),
    prisma.content.count({ where: { approvalStatus: "APPROVED" } }),
    prisma.content.count({ where: { approvalStatus: "NEEDS_CORRECTION" } }),
    prisma.contentReview.count({ where: { riskLevel: "مرتفع" } }),
    prisma.legalSourceDocument.count({
      where: {
        OR: [{ changeDetected: true }, { status: "PENDING_APPROVAL" }]
      }
    }),
    prisma.legalSourceDocument.findMany({
      where: { status: { in: ["ACTIVE", "CURRENT", "APPROVED"] } },
      select: { version: true, lastCheckedAt: true },
      orderBy: { updatedAt: "desc" }
    })
  ]);

  const lastLegalSourceCheck = legalSources
    .map((source) => source.lastCheckedAt)
    .filter((value): value is Date => Boolean(value))
    .sort((a, b) => a.getTime() - b.getTime())
    .at(-1);

  return {
    pendingReviews,
    publishableContent,
    exportsRequiringAttention,
    highRiskContent,
    legalReferenceVersion: legalSources.map((source) => source.version).filter(Boolean).join(" / ") || "غير محدد",
    lastLegalSourceCheck: lastLegalSourceCheck?.toISOString() ?? "غير محدد",
    pendingLegalSourceUpdates
  };
}
