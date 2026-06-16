import { ButtonLink, BarList, DataTable, KpiGrid, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import { AlertTriangle, Eye, ShieldAlert, TrendingDown } from "lucide-react";

const riskRows = [
  ["الادعاء بنتيجة مضمونة", "إعلانات وخدمات", <StatusBadge key="critical" tone="danger">مرتفع</StatusBadge>, "استبدال الوعد بصياغة احتمالية دقيقة"],
  ["كشف معلومات عميل", "قصص وتجارب", <StatusBadge key="high" tone="danger">مرتفع</StatusBadge>, "تعميم المثال وحذف البيانات المحددة"],
  ["مبالغة في الصفة المهنية", "نبذة أو إعلان", <StatusBadge key="medium" tone="warn">متوسط</StatusBadge>, "استخدام وصف مهني موثق ومحدد"]
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
          { label: "مؤشرات مرتفعة", value: "4", hint: "تتطلب معالجة قبل المشاركة", tone: "danger", icon: <ShieldAlert size={20} /> },
          { label: "مؤشرات متوسطة", value: "9", hint: "تحتاج تحسين الصياغة", tone: "warn", icon: <AlertTriangle size={20} /> },
          { label: "انخفاض المخاطر", value: "18%", hint: "بعد تطبيق المقترحات", tone: "good", icon: <TrendingDown size={20} /> },
          { label: "مجالات مرصودة", value: "6", hint: "قنوات ومضامين مختلفة", tone: "neutral", icon: <Eye size={20} /> }
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel>
          <SectionTitle title="توزيع المخاطر" subtitle="مؤشر تشغيلي لمساعدة فرق المراجعة على ترتيب الأولويات." />
          <BarList
            tone="danger"
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
