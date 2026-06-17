import { ButtonLink, PageHeader, Panel, SectionTitle } from "@/components/ui";
import { ShieldAlert } from "lucide-react";

export default function RiskAssessmentPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="مؤشرات المخاطر"
        title="مؤشرات المخاطر المهنية والإعلامية"
        description="لا تعرض هذه الصفحة مؤشرات مخاطر افتراضية. تظهر مؤشرات المخاطر بعد تحليل محتوى فعلي وربط كل ملاحظة بالمراجع المهنية والتنظيمية المسجلة."
        action={<ButtonLink href="/content-review">تحليل محتوى جديد</ButtonLink>}
      />

      <Panel className="text-center">
        <ShieldAlert className="mx-auto text-palm" size={34} />
        <SectionTitle
          title="لا توجد مؤشرات مخاطر معروضة"
          subtitle="ابدأ من مراجعة المحتوى لإظهار مستوى المخاطر وسبب التصنيف والمرجع النظامي الداعم بناءً على النص المدخل فقط."
        />
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-ink/65">
          إذا لم يُفعّل النص أي قاعدة من قواعد السلوك المهني للمحامين أو اللائحة التنفيذية لنظام المحاماة في المملكة العربية السعودية، ستعرض المنصة: لم يتم رصد ملاحظة مرتبطة بالمراجع المهنية والتنظيمية المسجلة.
        </p>
      </Panel>
    </div>
  );
}
