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

// Demo-grade activity feed — wire this to AuditLog/AIRequestLog once the
// platform is connected to a live database (see prisma/schema.prisma).
const userActivityLog: UserActivityLogEntry[] = [
  { user: "أحمد الحربي", role: "محام", action: "إرسال مراجعة محتوى جديدة", at: "2026-06-15T09:20:00.000Z" },
  { user: "نورة القحطاني", role: "مسؤول المنصة", action: "مراجعة تحديث مرجعي من وزارة العدل", at: "2026-06-14T14:05:00.000Z" },
  { user: "سارة العتيبي", role: "مسؤول المنصة", action: "تحديث إعدادات الحوكمة", at: "2026-06-14T11:40:00.000Z" },
  { user: "أحمد الحربي", role: "محام", action: "تجهيز حزمة تصدير لمنشور توعوي", at: "2026-06-13T16:30:00.000Z" },
  { user: "نورة القحطاني", role: "مسؤول المنصة", action: "مراجعة مسودة محفوظة", at: "2026-06-13T10:15:00.000Z" },
  { user: "أحمد الحربي", role: "محام", action: "ربط عنصر بالتقويم التفاعلي", at: "2026-06-12T08:50:00.000Z" }
];

const contentTypeCounts: Record<ContentKind, number> = {
  post: 34,
  advertisement: 18,
  campaign: 9,
  article: 21,
  script: 14,
  caption: 26,
  visual_content: 12,
  infographic: 7,
  publishing_plan: 5,
  title: 3,
  hashtag: 2,
  social_export: 6
};

const weeklyTrend = [
  { label: "الأسبوع 1", value: 58 },
  { label: "الأسبوع 2", value: 64 },
  { label: "الأسبوع 3", value: 71 },
  { label: "الأسبوع 4", value: 76 }
];

const monthlyTrend = [
  { label: "أبريل", value: 61 },
  { label: "مايو", value: 68 },
  { label: "يونيو", value: 76 }
];

function buildContentTypeDistribution() {
  return (Object.keys(contentTypeCounts) as ContentKind[]).map((kind) => ({
    label: contentKindLabels[kind],
    value: contentTypeCounts[kind]
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
