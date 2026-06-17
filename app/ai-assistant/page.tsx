import { ButtonLink, PageHeader, Panel, SectionTitle } from "@/components/ui";
import { FileSearch } from "lucide-react";

export default function ReviewAssistantPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="مساعد داعم للمراجعة"
        title="مساعد المراجعة المهنية"
        description="لا يعرض المساعد ملاحظات أو مراجع جاهزة. تظهر المخرجات بعد تحليل محتوى فعلي وربط النتائج بالمراجع المهنية والتنظيمية المسجلة."
        action={<ButtonLink href="/content-review">فتح تجربة المراجعة الموحدة</ButtonLink>}
      />

      <Panel className="text-center">
        <FileSearch className="mx-auto text-palm" size={34} />
        <SectionTitle
          title="لا توجد مخرجات تحليل مساند"
          subtitle="ابدأ من مراجعة المحتوى لعرض الملاحظات ومؤشرات المخاطر وفرص التحسين المستندة إلى النص المدخل."
        />
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-ink/65">
          أي ملاحظة امتثال أو مخاطرة يجب أن تتضمن العبارة المحفزة والمصدر الرسمي والمرجع النظامي وعنوانه ومقتطفه ومستوى الثقة.
        </p>
      </Panel>
    </div>
  );
}
