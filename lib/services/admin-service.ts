import type { ContentKind, RiskLevel } from "@/lib/types";
import { contentKindLabels } from "@/lib/content-types";
import { legalKnowledgeEntries } from "@/lib/legal-knowledge-base";
import { getReviewReadinessItems } from "@/lib/services/approval-workflow-service";

export type UserActivityLogEntry = {
  user: string;
  role: string;
  action: string;
  at: string;
};

const userActivityLog: UserActivityLogEntry[] = [];

const contentTypeCounts: Partial<Record<ContentKind, number>> = {};

const weeklyTrend: Array<{ label: string; value: number }> = [];

const monthlyTrend: Array<{ label: string; value: number }> = [];

function buildContentTypeDistribution() {
  return (Object.keys(contentTypeCounts) as ContentKind[]).map((kind) => ({
    label: contentKindLabels[kind],
    value: contentTypeCounts[kind] ?? 0
  }));
}

function buildRiskPatternAnalysis() {
  const levels: RiskLevel[] = ["مرتفع", "متوسط", "منخفض"];

  return levels.map((level) => {
    const entries = legalKnowledgeEntries.filter((entry) => entry.severity === level);
    const categoryCounts = new Map<string, number>();
    for (const entry of entries) {
      for (const category of entry.riskCategories) {
        categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
      }
    }
    const topCategory = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "غير متاح";

    return { level, ruleCount: entries.length, topCategory };
  });
}

async function buildLawyerBehaviorInsights() {
  const items = await getReviewReadinessItems();
  const byOwner = new Map<string, { owner: string; reviews: number; avgCompliance: number; highRisk: number }>();

  for (const item of items) {
    const entry = byOwner.get(item.owner) ?? { owner: item.owner, reviews: 0, avgCompliance: 0, highRisk: 0 };
    entry.reviews += 1;
    entry.avgCompliance += item.complianceScore;
    if (item.riskLevel === "مرتفع") entry.highRisk += 1;
    byOwner.set(item.owner, entry);
  }

  return [...byOwner.values()].map((entry) => ({
    owner: entry.owner,
    reviews: entry.reviews,
    avgCompliance: entry.reviews ? Math.round(entry.avgCompliance / entry.reviews) : 0,
    highRisk: entry.highRisk
  }));
}

export async function getAdminInsights() {
  const [lawyerBehavior, readinessItems] = await Promise.all([buildLawyerBehaviorInsights(), getReviewReadinessItems()]);

  return {
    userActivityLog,
    contentTypeDistribution: buildContentTypeDistribution(),
    riskPatternAnalysis: buildRiskPatternAnalysis(),
    weeklyTrend,
    monthlyTrend,
    lawyerBehavior,
    totals: {
      activeUsers: new Set(userActivityLog.map((entry) => entry.user)).size,
      trackedReviews: readinessItems.length,
      highRiskShare: readinessItems.length
        ? Math.round((readinessItems.filter((item) => item.riskLevel === "مرتفع").length / readinessItems.length) * 100)
        : 0
    }
  };
}
