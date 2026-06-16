import { ButtonLink, DataTable, KpiGrid, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import { buildExportPackage, getSocialMediaCenter } from "@/lib/services/social-media-service";
import { Download, FileText, PackageCheck, ShieldCheck } from "lucide-react";

export default function ExportCenterPage() {
  const center = getSocialMediaCenter();
  const firstPackage = buildExportPackage(center.content[0]?.id ?? "");
  const packageRows = center.content.map((content) => [
    content.title,
    content.readyForPublishing ? <StatusBadge key={`${content.id}-ready`} tone="good">مناسب للتصدير وفق نتائج المراجعة</StatusBadge> : <StatusBadge key={`${content.id}-needs`} tone="neutral">يتطلب معالجة الملاحظات</StatusBadge>,
    content.complianceMetadata?.complianceScore ?? "غير متاح",
    content.complianceMetadata?.riskLevel ?? "غير متاح"
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="مركز التصدير"
        title="مركز التصدير"
        description="تجهيز حزم التصدير بعد عرض نتائج المراجعة، وتشمل بيانات الامتثال والمخاطر والمراجع المهنية ذات الصلة."
        action={<ButtonLink href="/content-review">مراجعة مادة قبل التصدير</ButtonLink>}
      />

      <KpiGrid
        items={[
          { label: "حزم متاحة", value: `${center.content.length}`, hint: "مرتبطة بمحتوى مناسب للتصدير", tone: "good", icon: <PackageCheck size={20} /> },
          { label: "منصات التصدير", value: `${center.platforms.length}`, hint: "منصات اجتماعية مدعومة", tone: "neutral", icon: <Download size={20} /> },
          { label: "بيانات امتثال", value: "مضمنة", hint: "درجة ومراجع وملاحظات", tone: "gold", icon: <ShieldCheck size={20} /> },
          { label: "صيغة الحزمة", value: "ملف بيانات", hint: firstPackage?.fileName ?? "حزمة قابلة للتجهيز", tone: "neutral", icon: <FileText size={20} /> }
        ]}
      />

      <Panel>
        <SectionTitle title="حزم التصدير" subtitle="كل حزمة تتضمن نتيجة المراجعة ومؤشرات المخاطر وبيانات الاستناد المهني." />
        <DataTable headers={["المحتوى", "جاهزية التصدير", "مستوى الامتثال", "مستوى المخاطر"]} rows={packageRows} />
      </Panel>
    </div>
  );
}
