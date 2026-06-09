import { contentRows } from "@/lib/data";
import { DataTable, PageHeader, StatusBadge } from "@/components/ui";

export default function ContentManagementPage() {
  return (
    <>
      <PageHeader
        title="إدارة المحتوى"
        description="إدارة المسودات والإصدارات والاعتمادات والأرشفة والبحث والتصنيف دون وظائف إدارة القضايا."
      />
      <DataTable
        headers={["العنوان", "التصنيف", "الحالة", "المالك", "إجراءات"]}
        rows={contentRows.map((row) => [
          row.title,
          row.category,
          <StatusBadge key={row.title} tone={row.status === "مسودة" ? "neutral" : "good"}>{row.status}</StatusBadge>,
          row.owner,
          "فتح، تكرار، أرشفة"
        ])}
      />
    </>
  );
}
