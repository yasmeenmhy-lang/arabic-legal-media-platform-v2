import { BarList, DataTable, KpiGrid, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import { getDashboardAnalytics } from "@/lib/services/analytics-service";
import { sectorMetrics } from "@/lib/data";
import { BarChart3, Building2, TrendingUp, Users } from "lucide-react";

const sectorRows = sectorMetrics.map((metric) => [
  metric.label,
  metric.value,
  <StatusBadge key={metric.label} tone="good">{metric.trend}</StatusBadge>
]);

export default function AnalyticsPage() {
  const analytics = getDashboardAnalytics();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="قياس الأداء"
        title="التقارير والمؤشرات"
        description="مؤشرات مرئية لمتابعة جودة المحتوى، القنوات، التخطيط، ومخرجات المراجعة المهنية، إلى جانب قراءة تشغيلية لمؤشرات القطاع القانوني الإعلامية."
      />

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel className="overflow-hidden">
          <SectionTitle title="مؤشرات المحتوى" subtitle="توزيع نوع المحتوى محل المراجعة." />
          <BarList items={analytics.contentPerformance} tone="good" />
        </Panel>
        <Panel className="overflow-hidden">
          <SectionTitle title="مؤشرات القنوات" subtitle="القنوات الأكثر استخداماً في التخطيط." />
          <BarList items={analytics.channelPerformance} tone="gold" />
        </Panel>
        <Panel className="overflow-hidden">
          <SectionTitle title="مؤشرات التخطيط" subtitle="اتجاهات المقترحات والحملات." />
          <BarList items={analytics.campaignPerformance} tone="neutral" />
        </Panel>
      </div>

      <KpiGrid
        items={[
          { label: "مؤشرات قطاعية", value: "12", hint: "مؤشرات محتوى ومخاطر", tone: "neutral", icon: <BarChart3 size={20} /> },
          { label: "منشآت متابعة", value: "34", hint: "ضمن البيانات التجريبية", tone: "good", icon: <Building2 size={20} /> },
          { label: "نمو الاستخدام", value: "+18%", hint: "مقارنة بالفترة السابقة", tone: "gold", icon: <TrendingUp size={20} /> },
          { label: "مستخدمون نشطون", value: "126", hint: "فرق قانونية وإعلامية", tone: "neutral", icon: <Users size={20} /> }
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel className="overflow-hidden">
          <SectionTitle title="اتجاهات القطاع" subtitle="ملخص بصري للموضوعات الأكثر حضوراً في المحتوى المهني." />
          <BarList
            items={[
              { label: "التوعية التعاقدية", value: 78 },
              { label: "حماية البيانات", value: 64 },
              { label: "الإعلان المهني", value: 58 },
              { label: "حل النزاعات", value: 47 }
            ]}
          />
        </Panel>
        <Panel className="overflow-hidden">
          <SectionTitle title="المؤشرات المسجلة" subtitle="تدعم هذه المؤشرات لوحة التحكم والتقارير التنفيذية." />
          <DataTable headers={["المؤشر", "القيمة", "الاتجاه"]} rows={sectorRows} />
        </Panel>
      </div>
    </div>
  );
}
