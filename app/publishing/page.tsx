import { ButtonLink, PageHeader, Panel, SectionTitle } from "@/components/ui";
import { Send } from "lucide-react";

export default function PublishingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="دعم النشر والجدولة"
        title="جاهزية النشر"
        description="لا تعرض هذه الصفحة جاهزية نشر افتراضية. تُحسب الجاهزية بعد تحليل محتوى فعلي وفق الملاحظات المرصودة وشدتها والمراجع التي تم تفعيلها."
        action={<ButtonLink href="/content-review">تحليل محتوى</ButtonLink>}
      />

      <Panel className="text-center">
        <Send className="mx-auto text-palm" size={34} />
        <SectionTitle
          title="لا توجد مواد جاهزة للنشر معروضة"
          subtitle="تظهر جاهزية النشر بعد مراجعة محتوى فعلي، ولا تُعرض أي درجة أو حالة إلا إذا كانت محسوبة من نتائج التحليل."
        />
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-ink/65">
          عند وجود ملاحظات مهنية أو تنظيمية مؤثرة، ستتغير جاهزية النشر تلقائياً إلى يتطلب معالجة الملاحظات قبل التصدير أو المشاركة.
        </p>
      </Panel>
    </div>
  );
}
