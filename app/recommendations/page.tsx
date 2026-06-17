import { ButtonLink, PageHeader, Panel, SectionTitle } from "@/components/ui";
import { Lightbulb } from "lucide-react";

export default function RecommendationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="فرص التحسين"
        title="فرص تحسين المحتوى الإعلامي والإعلاني"
        description="لا تعرض هذه الصفحة مقترحات جاهزة أو عامة. تظهر فرص التحسين بعد تحليل نص فعلي، وتُصنف الملاحظات الصياغية غير النظامية بشكل مستقل عن الملاحظات المرتبطة بالمراجع الرسمية."
        action={<ButtonLink href="/content-review">تحليل محتوى</ButtonLink>}
      />

      <Panel className="text-center">
        <Lightbulb className="mx-auto text-palm" size={34} />
        <SectionTitle
          title="لا توجد فرص تحسين معروضة"
          subtitle="تظهر فرص التحسين بعد إدخال محتوى وتشغيل التحليل، ولن تُعرض كتوصيات نظامية إلا إذا ارتبطت بقاعدة مهنية أو تنظيمية مسجلة."
        />
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-ink/65">
          الملاحظات اللغوية أو التحريرية التي لا ترتبط بمرجع نظامي محدد تُعرض بوصفها: ملاحظة تحسين صياغي غير مرتبطة بمرجع نظامي محدد.
        </p>
      </Panel>
    </div>
  );
}
