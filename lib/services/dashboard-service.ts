export async function getDashboardOverview() {
  const { prisma } = await import("@/lib/prisma");
  const [
    pendingReviews,
    approvedContent,
    blockedExports,
    highRiskContent,
    pendingLegalSourceUpdates,
    legalSources
  ] = await Promise.all([
    prisma.content.count({ where: { approvalStatus: "REVIEW_REQUIRED" } }),
    prisma.content.count({ where: { approvalStatus: "APPROVED" } }),
    prisma.content.count({ where: { approvalStatus: "NEEDS_CORRECTION" } }),
    prisma.contentReview.count({ where: { riskLevel: { in: ["HIGH", "CRITICAL"] } } }),
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
    approvedContent,
    blockedExports,
    highRiskContent,
    legalReferenceVersion: legalSources.map((source) => source.version).filter(Boolean).join(" / ") || "غير محدد",
    lastLegalSourceCheck: lastLegalSourceCheck?.toISOString() ?? "غير محدد",
    pendingLegalSourceUpdates
  };
}
