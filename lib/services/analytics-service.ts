import { sectorMetrics } from "@/lib/data";

export function getDashboardAnalytics() {
  return {
    contentPerformance: [],
    channelPerformance: [],
    campaignPerformance: []
  };
}

export function getAggregatedSectorAnalytics() {
  return {
    metrics: sectorMetrics,
    riskDistribution: [],
    note: "المؤشرات مجمعة ولا تتضمن ترتيباً فردياً أو درجات سمعة."
  };
}
