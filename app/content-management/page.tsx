import { ButtonLink, PageHeader, Panel, SectionTitle } from "@/components/ui";
import { Archive } from "lucide-react";

export default function ContentManagementPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="السجل والمسودات"
        title="سجل المراجعات والمسودات"
        description="يعرض هذا المسار المراجعات والمسودات الفعلية عند توفرها، ولا يعرض سجلات أو نتائج افتراضية."
        action={<ButtonLink href="/content-review">بدء مراجعة جديدة</ButtonLink>}
      />

      <Panel className="text-center">
        <Archive className="mx-auto text-palm" size={34} />
        <SectionTitle
          title="لا توجد مراجعات أو مسودات محفوظة"
          subtitle="بعد تحليل محتوى فعلي وحفظ نتيجته، ستظهر هنا بيانات المراجعة والمسودة المرتبطة بها."
        />
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-ink/65">
          لا تُعرض في هذا السجل أي درجات امتثال أو مخاطر أو جاهزية نشر ما لم تكن ناتجة عن مراجعة فعلية محفوظة.
        </p>
      </Panel>
    </div>
  );
}
