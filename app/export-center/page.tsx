import { DataTable, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { shareReadyContent } from "@/lib/services/social-media-service";

export default function ExportCenterPage() {
  return (
    <>
      <PageHeader
        title="مركز التصدير"
        description="تجهيز حزم التصدير للمحتوى المعتمد فقط، مع درجات جودة اللغة والامتثال وحالة الاعتماد."
      />
      <Panel>
        <DataTable
          headers={["المحتوى", "الحالة", "ملف النص", "ملف البيانات", "المنصات"]}
          rows={shareReadyContent.map((content) => [
            content.title,
            <StatusBadge key={content.id} tone={content.approved ? "good" : "danger"}>{content.approved ? "معتمد" : "محظور"}</StatusBadge>,
            content.exportPackage.textFileName,
            content.exportPackage.metadataFileName,
            Array.isArray(content.exportPackage.payload.platforms) ? content.exportPackage.payload.platforms.join(", ") : "-"
          ])}
        />
      </Panel>
    </>
  );
}
