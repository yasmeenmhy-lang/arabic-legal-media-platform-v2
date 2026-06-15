import { DataTable, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { advisoryDisclaimer } from "@/lib/governance";
import { shareReadyContent } from "@/lib/services/social-media-service";

export default function ExportCenterPage() {
  return (
    <>
      <PageHeader
        title="مركز التصدير"
        description="تجهيز حزم التصدير للمحتوى المناسب للنشر بعد عرض درجات جودة اللغة ومستوى الامتثال ونتيجة جاهزية النشر."
      />
      <Panel>
        <DataTable
          headers={["المحتوى", "الحالة", "ملف النص", "ملف البيانات", "المنصات"]}
          rows={shareReadyContent.map((content) => [
            content.title,
            <StatusBadge key={content.id} tone={content.readyForPublishing ? "good" : "danger"}>{content.readyForPublishing ? "مناسب للنشر" : "يتطلب معالجة"}</StatusBadge>,
            content.exportPackage.textFileName,
            content.exportPackage.metadataFileName,
            Array.isArray(content.exportPackage.payload.platforms) ? content.exportPackage.payload.platforms.join(", ") : "-"
          ])}
        />
      </Panel>
      <div className="mt-5 rounded border border-line bg-white p-4 text-xs leading-6 text-ink/65">
        {advisoryDisclaimer}
      </div>
    </>
  );
}
