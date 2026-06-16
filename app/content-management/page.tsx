import { ButtonLink, DataTable, KpiGrid, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import { contentRows } from "@/lib/data";
import { Archive, FileClock, PencilLine, Save } from "lucide-react";

const drafts = [
  ["منشور توعوي عن العقود", "منشور اجتماعي", <StatusBadge key="draft" tone="warn">مسودة محفوظة</StatusBadge>, "آخر تعديل قبل ساعتين"],
  ["سيناريو قصير عن سرية العميل", "فيديو قصير", <StatusBadge key="needs" tone="danger">يتطلب معالجة الملاحظات</StatusBadge>, "أمس"],
  ["مقال عن الإعلان المهني", "مقال", <StatusBadge key="ready" tone="good">مناسب للمراجعة النهائية</StatusBadge>, "قبل 3 أيام"]
];

const history = contentRows.map((row) => [
  row.title,
  row.category,
  <StatusBadge key={row.title} tone={row.status.includes("مسودة") ? "warn" : "good"}>{row.status}</StatusBadge>,
  row.owner
]);

export default function ContentManagementPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="السجل والمسودات"
        title="سجل المراجعات والمسودات"
        description="متابعة المواد الإعلامية والإعلانية المحفوظة، واستكمال المراجعات السابقة دون فقدان مسارات الجودة والامتثال والمخاطر."
        action={<ButtonLink href="/content-review">بدء مراجعة جديدة</ButtonLink>}
      />

      <KpiGrid
        items={[
          { label: "مسودات محفوظة", value: "8", hint: "مواد قابلة للاستكمال", tone: "warn", icon: <Save size={20} /> },
          { label: "مراجعات مكتملة", value: "26", hint: "نتائج محفوظة في السجل", tone: "good", icon: <Archive size={20} /> },
          { label: "تتطلب معالجة", value: "5", hint: "ملاحظات امتثال أو صياغة", tone: "danger", icon: <PencilLine size={20} /> },
          { label: "قيد المتابعة", value: "12", hint: "مرتبطة بخطط نشر أو حملات", tone: "neutral", icon: <FileClock size={20} /> }
        ]}
      />

      <Panel>
        <SectionTitle title="المسودات النشطة" subtitle="مواد محفوظة يمكن استكمال مراجعتها أو ربطها بخطة نشر." />
        <DataTable headers={["العنوان", "نوع المحتوى", "حالة المراجعة", "آخر تحديث"]} rows={drafts} />
      </Panel>

      <Panel>
        <SectionTitle title="سجل المراجعات" subtitle="نتائج مراجعة محفوظة يمكن الرجوع إليها عند إعداد التقارير أو حزم التصدير." />
        <DataTable headers={["العنوان", "التصنيف", "نتيجة المراجعة", "المسؤول"]} rows={history} />
      </Panel>
    </div>
  );
}
