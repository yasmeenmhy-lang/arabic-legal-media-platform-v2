import { ButtonLink, BarList, DataTable, KpiGrid, NeedleGauge, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import { AlertTriangle, Eye, ShieldAlert, TrendingDown } from "lucide-react";

const riskRows = [
  ["الادعاء بنتيجة مضمونة", "إعلانات وخدمات", <StatusBadge key="critical" tone="gold">مرتفع</StatusBadge>, "استبدال الوعد بصياغة احتمالية دقيقة"],
  ["كشف معلومات عميل", "قصص وتجارب", <StatusBadge key="high" tone="gold">مرتفع</StatusBadge>, "تعميم المثال وحذف البيانات المحددة"],
  ["مبالغة في الصفة المهنية", "نبذة أو إعلان", <StatusBadge key="medium" tone="neutral">متوسط</StatusBadge>, "استخدام وصف مهني موثق ومحدد"]
];

export default function RiskAssessmentPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="مؤشرات المخاطر"
        title="مؤشرات المخاطر المهنية والإعلامية"
        description="متابعة مؤشرات المخاطر التي تظهر في المحتوى الإعلامي والإعلاني، وربطها بمسارات التحسين قبل النشر أو التصدير."
        action={<ButtonLink href="/content-review">تحليل محتوى جديد</ButtonLink>}
      />

      <KpiGrid
        items={[
          { label: "مؤشرات مرتفعة", value: "4", hint: "تتطلب معالجة قبل المشاركة", tone: "gold", icon: <ShieldAlert size={20} /> },
          { label: "مؤشرات متوسطة", value: "9", hint: "تحتاج تحسين الصياغة", tone: "neutral", icon: <AlertTriangle size={20} /> },
          { label: "انخفاض المخاطر", value: "18%", hint: "بعد تطبيق المقترحات", tone: "good", icon: <TrendingDown size={20} /> },
          { label: "مجالات مرصودة", value: "6", hint: "قنوات ومضامين مختلفة", tone: "neutral", icon: <Eye size={20} /> }
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[0.55fr_0.8fr_1.2fr]">
        <Panel className="flex flex-col items-center justify-center">
          <SectionTitle title="المستوى العام للمخاطر" subtitle="مؤشر إبرة يلخص حدة المخاطر الحالية." />
          <NeedleGauge value={38} label="مرتفع جزئياً ضمن نطاق آمن" tone="gold" />
        </Panel>
        <Panel>
          <SectionTitle title="توزيع المخاطر" subtitle="مؤشر تشغيلي لمساعدة فرق المراجعة على ترتيب الأولويات." />
          <BarList
            tone="gold"
            items={[
              { label: "ضمان النتائج", value: 82 },
              { label: "السرية والخصوصية", value: 76 },
              { label: "المبالغة التسويقية", value: 63 },
              { label: "الصفة المهنية", value: 52 }
            ]}
          />
        </Panel>
        <Panel>
          <SectionTitle title="أبرز مؤشرات المخاطر" subtitle="كل مؤشر يظهر مع اتجاه معالجة مقترح داخل تقرير المراجعة." />
          <DataTable headers={["المؤشر", "النطاق", "المستوى", "اتجاه المعالجة"]} rows={riskRows} />
        </Panel>
      </div>
    </div>
  );
}
