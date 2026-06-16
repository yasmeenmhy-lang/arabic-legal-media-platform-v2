import { ButtonLink, DataTable, KpiGrid, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import { contentRows } from "@/lib/data";
import { formatDualDateTime } from "@/lib/dates";
import { Archive, FileClock, PencilLine, Save } from "lucide-react";

const drafts = [
  ["منشور توعوي عن العقود", "منشور توعوي", <StatusBadge key="draft" tone="neutral">مسودة محفوظة</StatusBadge>, "2026-06-16T07:30:00.000Z"],
  ["سيناريو قصير عن سرية العميل", "نص فيديو", <StatusBadge key="needs" tone="gold">يتطلب معالجة الملاحظات</StatusBadge>, "2026-06-15T12:00:00.000Z"],
  ["مقال عن الإعلان المهني", "مقال", <StatusBadge key="ready" tone="good">مناسب للمراجعة النهائية</StatusBadge>, "2026-06-13T09:00:00.000Z"]
].map(([title, type, status, updatedAt]) => [title, type, status, formatDualDateTime(updatedAt as string)]);

const history = contentRows.map((row) => [
  row.title,
  row.category,
  <StatusBadge key={row.title} tone={row.status.includes("مسودة") ? "neutral" : "good"}>{row.status}</StatusBadge>,
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
          { label: "مسودات محفوظة", value: "8", hint: "مواد قابلة للاستكمال", tone: "neutral", icon: <Save size={20} /> },
          { label: "مراجعات مكتملة", value: "26", hint: "نتائج محفوظة في السجل", tone: "good", icon: <Archive size={20} /> },
          { label: "تتطلب معالجة", value: "5", hint: "ملاحظات امتثال أو صياغة", tone: "gold", icon: <PencilLine size={20} /> },
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
