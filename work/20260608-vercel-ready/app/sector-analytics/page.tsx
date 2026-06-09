import { BarList, KpiGrid, PageHeader, Panel } from "@/components/ui";
import { getAggregatedSectorAnalytics } from "@/lib/services/analytics-service";

export default function SectorAnalyticsPage() {
  const data = getAggregatedSectorAnalytics();
  return (
    <>
      <PageHeader
        title="مؤشرات القطاع"
        description="لوحة للمشرفين تعرض مؤشرات مجمعة فقط: حجم المحتوى، الفئات، التبني، الاستخدام، الاتجاهات، وتوزيع مخاطر المراجعة."
      />
      <KpiGrid items={data.metrics.map((metric) => ({ label: metric.label, value: metric.value, hint: metric.trend }))} />
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <Panel>
          <h3 className="mb-4 font-extrabold">توزيع مخاطر المراجعة</h3>
          <BarList items={data.riskDistribution} />
        </Panel>
        <Panel>
          <h3 className="mb-3 font-extrabold">ضوابط العرض</h3>
          <p className="text-sm leading-7 text-ink/65">{data.note}</p>
          <p className="mt-3 text-sm leading-7 text-ink/65">لا توجد ترتيبات للمحامين، ولا درجات سمعة، ولا تقييمات عامة فردية.</p>
        </Panel>
      </div>
    </>
  );
}
