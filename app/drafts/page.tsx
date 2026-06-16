import { ButtonLink, DataTable, KpiGrid, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import { Edit3, FileClock, Save, Trash2 } from "lucide-react";

const drafts = [
  ["منشور توعوي عن العقود", "منشور إعلامي", "لينكدإن", <StatusBadge key="draft-1" tone="warn">مسودة محفوظة</StatusBadge>, "استكمال المراجعة"],
  ["سيناريو قصير عن سرية العميل", "نص فيديو", "يوتيوب شورتس", <StatusBadge key="draft-2" tone="danger">يتطلب معالجة الملاحظات</StatusBadge>, "فتح الملاحظات"],
  ["مقال عن الإعلان المهني", "مقال", "الموقع الإلكتروني", <StatusBadge key="draft-3" tone="good">جاهز للمراجعة</StatusBadge>, "فتح المسودة"]
];

export default function DraftsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="المسودات"
        title="المسودات"
        description="مساحة مستقلة لمتابعة المواد المحفوظة قبل استكمال مراجعتها أو ربطها بخطة نشر أو حملة إعلامية."
        action={<ButtonLink href="/content-review">مراجعة مسودة</ButtonLink>}
      />

      <KpiGrid
        items={[
          { label: "مسودات محفوظة", value: "8", hint: "مواد يمكن استكمالها", tone: "warn", icon: <Save size={20} /> },
          { label: "تحتاج معالجة", value: "3", hint: "ملاحظات صياغة أو امتثال", tone: "danger", icon: <Edit3 size={20} /> },
          { label: "مرتبطة بتقويم", value: "4", hint: "ضمن التخطيط الإعلامي", tone: "good", icon: <FileClock size={20} /> },
          { label: "جاهزة للحذف", value: "1", hint: "مسودات منتهية الصلاحية", tone: "neutral", icon: <Trash2 size={20} /> }
        ]}
      />

      <Panel>
        <SectionTitle title="قائمة المسودات" subtitle="كل صف يمثل مسودة قابلة للفتح أو الاستكمال داخل مسار مراجعة المحتوى." />
        <DataTable headers={["العنوان", "نوع المحتوى", "القناة", "الحالة", "الإجراء"]} rows={drafts} />
      </Panel>
    </div>
  );
}
