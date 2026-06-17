import { ButtonLink, PageHeader, Panel, SectionTitle } from "@/components/ui";
import { ClipboardCheck } from "lucide-react";

export default function ReviewResultsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="نتائج المراجعة"
        title="نتائج المراجعة التنفيذية"
        description="لا تعرض هذه الصفحة نتائج افتراضية. تظهر النتائج التنفيذية بعد تحليل محتوى فعلي من مسار مراجعة المحتوى الإعلامي والإعلاني."
        action={<ButtonLink href="/content-review">بدء مراجعة محتوى</ButtonLink>}
      />

      <Panel className="text-center">
        <ClipboardCheck className="mx-auto text-palm" size={34} />
        <SectionTitle
          title="لا توجد نتيجة مراجعة معروضة"
          subtitle="أدخل المحتوى وحدد نوعه والقناة والجمهور والغرض، ثم شغّل التحليل لعرض درجات الامتثال والمخاطر والمراجع والتوصيات المستندة إلى النص المدخل فقط."
        />
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-ink/65">
          لن تعرض المنصة أي ملاحظات أو درجات أو مراجع ما لم تكن ناتجة عن محتوى مقدم ومطابقة لقواعد السلوك المهني للمحامين أو اللائحة التنفيذية لنظام المحاماة في المملكة العربية السعودية.
        </p>
      </Panel>
    </div>
  );
}
