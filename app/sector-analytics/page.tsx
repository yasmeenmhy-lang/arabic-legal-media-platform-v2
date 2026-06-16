import { BarList, ButtonLink, DataTable, KpiGrid, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import { sectorMetrics } from "@/lib/data";
import { BarChart3, Building2, TrendingUp, Users } from "lucide-react";

const rows = sectorMetrics.map((metric) => [
  metric.label,
  metric.value,
  <StatusBadge key={metric.label} tone="good">{metric.trend}</StatusBadge>
]);

export default function SectorAnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="مؤشرات القطاع"
        title="مؤشرات القطاع القانوني الإعلامية"
        description="قراءة تشغيلية لمؤشرات المحتوى والمخاطر والاستخدام لدعم قرارات التخطيط الإعلامي والحوكمة."
        action={<ButtonLink href="/analytics">العودة للتقارير</ButtonLink>}
      />

      <KpiGrid
        items={[
          { label: "مؤشرات قطاعية", value: "12", hint: "مؤشرات محتوى ومخاطر", tone: "neutral", icon: <BarChart3 size={20} /> },
          { label: "منشآت متابعة", value: "34", hint: "ضمن البيانات التجريبية", tone: "good", icon: <Building2 size={20} /> },
          { label: "نمو الاستخدام", value: "+18%", hint: "مقارنة بالفترة السابقة", tone: "gold", icon: <TrendingUp size={20} /> },
          { label: "مستخدمون نشطون", value: "126", hint: "فرق قانونية وإعلامية", tone: "neutral", icon: <Users size={20} /> }
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel>
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
        <Panel>
          <SectionTitle title="المؤشرات المسجلة" subtitle="تدعم هذه المؤشرات لوحة التحكم والتقارير التنفيذية." />
          <DataTable headers={["المؤشر", "القيمة", "الاتجاه"]} rows={rows} />
        </Panel>
      </div>
    </div>
  );
}
