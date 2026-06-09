import { sectorMetrics } from "@/lib/data";

export function getDashboardAnalytics() {
  return {
    contentPerformance: [
      { label: "توعوي", value: 42 },
      { label: "تعليمي", value: 31 },
      { label: "مهني", value: 19 },
      { label: "إعلاني", value: 8 }
    ],
    channelPerformance: [
      { label: "X", value: 36 },
      { label: "LinkedIn", value: 44 },
      { label: "الموقع", value: 20 }
    ],
    campaignPerformance: [
      { label: "حملة العقود", value: 78 },
      { label: "التوعية التجارية", value: 64 },
      { label: "الملكية الفكرية", value: 52 }
    ]
  };
}

export function getAggregatedSectorAnalytics() {
  return {
    metrics: sectorMetrics,
    riskDistribution: [
      { label: "منخفض", value: 71 },
      { label: "متوسط", value: 21 },
      { label: "عال", value: 8 }
    ],
    note: "المؤشرات مجمعة ولا تتضمن ترتيبا فرديا أو درجات سمعة."
  };
}
