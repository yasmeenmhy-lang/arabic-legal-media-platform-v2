import { ButtonLink, DataTable, KpiGrid, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import { CalendarDays, Clock, Radio, Send } from "lucide-react";

const scheduleRows = [
  ["منشور توعوي عن العقود", "منصة إكس", "الثلاثاء 10:00 ص", <StatusBadge key="ready" tone="good">مناسب للنشر وفق المراجعة</StatusBadge>],
  ["سيناريو قصير عن السرية", "يوتيوب شورتس", "الخميس 7:00 م", <StatusBadge key="needs" tone="warn">يتطلب معالجة ملاحظات</StatusBadge>],
  ["مقال عن الإعلان المهني", "لينكدإن", "الأحد 1:00 م", <StatusBadge key="planned" tone="neutral">مقترح جدولة</StatusBadge>]
];

export default function PublishingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="دعم النشر والجدولة"
        title="جاهزية النشر"
        description="تنظيم المواد المناسبة للنشر وفق نتائج المراجعة، مع عرض المواد التي تتطلب معالجة الملاحظات قبل المشاركة أو التصدير."
        action={<ButtonLink href="/social-media">فتح مركز المشاركة</ButtonLink>}
      />

      <KpiGrid
        items={[
          { label: "مواد مناسبة للنشر", value: "17", hint: "وفق نتائج المراجعة", tone: "good", icon: <Send size={20} /> },
          { label: "مجدولة", value: "11", hint: "مرتبطة بتواريخ نشر", tone: "gold", icon: <CalendarDays size={20} /> },
          { label: "تنتظر معالجة", value: "5", hint: "قبل المشاركة أو التصدير", tone: "warn", icon: <Clock size={20} /> },
          { label: "قنوات مدعومة", value: "6", hint: "منصات اجتماعية مدعومة", tone: "neutral", icon: <Radio size={20} /> }
        ]}
      />

      <Panel>
        <SectionTitle title="خطة النشر" subtitle="لا يتم النشر المباشر من المنصة؛ تعرض هذه الصفحة دعم الجدولة والاستعداد للمشاركة." />
        <DataTable headers={["المادة", "القناة", "الوقت المقترح", "جاهزية النشر"]} rows={scheduleRows} />
      </Panel>
    </div>
  );
}
