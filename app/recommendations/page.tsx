import { ButtonLink, DataTable, KpiGrid, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import { CheckCircle2, Lightbulb, MessageSquareText, Wand2 } from "lucide-react";

const opportunities = [
  ["الصياغة", "تحويل العبارات العامة إلى صياغة محددة ومهنية.", <StatusBadge key="style" tone="good">تحسين مباشر</StatusBadge>],
  ["الوضوح", "إضافة سياق يوضح أن المادة توعوية ولا تتناول حالة محددة.", <StatusBadge key="read" tone="good">تحسين قابل للتطبيق</StatusBadge>],
  ["الاتساق", "توحيد المصطلحات بين الإعلان والمنشور والحملة.", <StatusBadge key="terms" tone="neutral">يحتاج متابعة</StatusBadge>],
  ["الجاهزية", "مراجعة الملاحظات المرتفعة قبل تجهيز حزمة التصدير.", <StatusBadge key="ready" tone="gold">أولوية قبل النشر</StatusBadge>]
];

export default function RecommendationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="فرص التحسين"
        title="فرص تحسين المحتوى الإعلامي والإعلاني"
        description="اقتراحات عملية لتحسين جودة اللغة والوضوح المهني وجاهزية النشر دون الإيحاء بأن المنصة تنشئ المحتوى أو تصدر قراراً نهائياً."
        action={<ButtonLink href="/content-review">تطبيقها ضمن المراجعة</ButtonLink>}
      />

      <KpiGrid
        items={[
          { label: "فرص نشطة", value: "14", hint: "مرتبطة بسجل المراجعات", tone: "good", icon: <Lightbulb size={20} /> },
          { label: "تحسينات لغوية", value: "8", hint: "صياغة ووضوح واتساق", tone: "neutral", icon: <MessageSquareText size={20} /> },
          { label: "معالجة مكتملة", value: "11", hint: "تم تطبيقها على مسودات", tone: "good", icon: <CheckCircle2 size={20} /> },
          { label: "جاهزية أعلى", value: "+22%", hint: "بعد تحسين المحتوى", tone: "good", icon: <Wand2 size={20} /> }
        ]}
      />

      <Panel>
        <SectionTitle title="قائمة فرص التحسين" subtitle="تعرض كاتجاهات تحريرية ومهنية يمكن للمستخدم تطبيقها وفق تقديره." />
        <DataTable headers={["المجال", "المقترح", "الحالة"]} rows={opportunities} />
      </Panel>
    </div>
  );
}
