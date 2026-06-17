import { PageHeader, Panel, SectionTitle } from "@/components/ui";
import { BarChart3 } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="قياس الأداء"
        title="التقارير والمؤشرات"
        description="تعرض التقارير المؤشرات المحسوبة من مراجعات فعلية محفوظة فقط، ولا تعرض نسب امتثال أو مخاطر أو جاهزية افتراضية."
      />

      <Panel className="text-center">
        <BarChart3 className="mx-auto text-palm" size={34} />
        <SectionTitle
          title="لا توجد مؤشرات محفوظة"
          subtitle="ستظهر مؤشرات المحتوى والقنوات والمخاطر بعد توفر مراجعات فعلية أو سجلات نشر مرتبطة بنتائج مراجعة."
        />
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-ink/65">
          لا يتم احتساب أي رسم أو مؤشر تنفيذي من بيانات ثابتة؛ يجب أن تستند المؤشرات إلى نتائج مراجعة فعلية أو سجلات محفوظة.
        </p>
      </Panel>
    </div>
  );
}
