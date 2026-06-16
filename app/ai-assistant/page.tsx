import { ButtonLink, DataTable, KpiGrid, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import { BookOpenCheck, FileSearch, Lightbulb, ShieldAlert } from "lucide-react";

const assistantOutputs = [
  ["ملاحظة امتثال", "تجنب العبارات التي توحي بضمان النتيجة أو التفوق المطلق.", <StatusBadge key="high" tone="danger">أولوية عالية</StatusBadge>],
  ["مؤشر مخاطر", "وجود صياغة تسويقية قد تفهم كتضليل للجمهور.", <StatusBadge key="medium" tone="warn">أولوية متوسطة</StatusBadge>],
  ["فرصة تحسين", "تحويل الرسالة إلى توعية عامة مع دعوة مهنية هادئة.", <StatusBadge key="good" tone="good">قابل للتطبيق</StatusBadge>]
];

const references = [
  ["قواعد السلوك المهني للمحامين", "الإعلان والتواصل المهني", "الصدق والدقة وتجنب المبالغة"],
  ["اللائحة التنفيذية لنظام المحاماة", "مزاولة المهنة", "دقة الصفة المهنية وعدم الإيحاء بصفة غير موثقة"]
];

export default function ReviewAssistantPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="مساعد داعم للمراجعة"
        title="مساعد المراجعة المهنية"
        description="أداة تحليل مساندة تعرض ملاحظات الامتثال ومؤشرات المخاطر وفرص التحسين استناداً إلى نتائج مراجعة المحتوى والمراجع المهنية والتنظيمية."
        action={<ButtonLink href="/content-review">فتح تجربة المراجعة الموحدة</ButtonLink>}
      />

      <KpiGrid
        items={[
          { label: "ملاحظات مكتشفة", value: "7", hint: "مرتبطة بصياغة وامتثال", tone: "warn", icon: <FileSearch size={20} /> },
          { label: "مؤشرات مخاطر", value: "3", hint: "قابلة للمعالجة قبل النشر", tone: "danger", icon: <ShieldAlert size={20} /> },
          { label: "فرص تحسين", value: "9", hint: "تحسين اللغة والوضوح المهني", tone: "good", icon: <Lightbulb size={20} /> },
          { label: "مراجع مستندة", value: "4", hint: "مصادر مهنية وتنظيمية", tone: "gold", icon: <BookOpenCheck size={20} /> }
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
        <Panel>
          <SectionTitle title="نتيجة التحليل المساند" subtitle="لا تمثل هذه النتائج قراراً نهائياً، بل مدخلات مهنية لدعم مراجعة المحتوى." />
          <DataTable headers={["البند", "الملاحظة", "الأولوية"]} rows={assistantOutputs} />
        </Panel>
        <Panel>
          <SectionTitle title="المراجع ذات الصلة" subtitle="مصادر تظهر ضمن نتائج المراجعة عند ارتباطها بالمحتوى." />
          <DataTable headers={["المصدر", "النطاق", "الدلالة"]} rows={references} />
        </Panel>
      </div>
    </div>
  );
}
