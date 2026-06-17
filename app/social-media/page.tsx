import { ButtonLink, DataTable, KpiGrid, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import { buildExportPackage, buildShareUrl, getSocialMediaCenter } from "@/lib/services/social-media-service";
import { socialBrandIcons } from "@/components/social-icons";
import { Copy, Download, FileText, PackageCheck, ShieldCheck, Smartphone } from "lucide-react";

export default function SocialMediaPage() {
  const center = getSocialMediaCenter();
  const primaryContent = center.content[0];
  const firstPackage = buildExportPackage(primaryContent?.id ?? "");

  const platformRows = center.platforms.map((platform) => {
    const Icon = socialBrandIcons[platform.key];
    const shareUrl = primaryContent ? buildShareUrl(platform.key, primaryContent) : null;

    return [
      <span key={`${platform.key}-label`} className="flex items-center gap-2 font-normal">
        {Icon ? <Icon size={18} className="text-ink/70" /> : null}
        {platform.label}
      </span>,
      platform.characterLimit ? platform.characterLimit.toLocaleString("ar-SA") : "حسب المنصة",
      platform.supportsWebShare ? (
        <StatusBadge key={`${platform.key}-web`} tone="good">يدعم المشاركة</StatusBadge>
      ) : (
        <StatusBadge key={`${platform.key}-manual`} tone="neutral">تعليمات يدوية</StatusBadge>
      ),
      shareUrl ? (
        <a key={`${platform.key}-share`} href={shareUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 break-words font-normal text-palm underline underline-offset-4">
          فتح رابط المشاركة
        </a>
      ) : (
        <StatusBadge key={`${platform.key}-fallback`} tone="gold">إرشادات بديلة</StatusBadge>
      )
    ];
  });

  const packageRows = center.content.map((content) => [
    content.title,
    content.readyForPublishing ? (
      <StatusBadge key={`${content.id}-ready`} tone="good">مناسب للتصدير وفق نتائج المراجعة</StatusBadge>
    ) : (
      <StatusBadge key={`${content.id}-needs`} tone="neutral">يتطلب معالجة الملاحظات</StatusBadge>
    ),
    content.complianceMetadata?.complianceScore ?? "غير متاح",
    content.complianceMetadata?.riskLevel ?? "غير متاح"
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="المشاركة الاجتماعية والتصدير"
        title="مركز المشاركة الاجتماعية والتصدير"
        description="تجهيز المحتوى المناسب للمشاركة والتصدير بعد مراجعة النتائج، مع النسخ وحزم التصدير وروابط المشاركة الرسمية أو الإرشادات البديلة حسب كل منصة، وبيانات الامتثال والمخاطر والمراجع المهنية ذات الصلة."
        action={<ButtonLink href="/content-review">مراجعة مادة قبل التصدير</ButtonLink>}
      />

      <KpiGrid
        items={[
          { label: "منصات مدعومة", value: `${center.platforms.length}`, hint: "X، LinkedIn، Instagram، TikTok، Snapchat، YouTube", tone: "good", icon: <Smartphone size={20} /> },
          { label: "حزم متاحة", value: `${center.content.length}`, hint: "مرتبطة بمحتوى مناسب للتصدير", tone: "gold", icon: <PackageCheck size={20} /> },
          { label: "بيانات امتثال", value: "بعد المراجعة", hint: "لا تُعرض دون نتيجة تحليل فعلية", tone: "neutral", icon: <ShieldCheck size={20} /> },
          { label: "صيغة الحزمة", value: "ملف بيانات", hint: firstPackage?.fileName ?? "تُجهز بعد مراجعة المحتوى", tone: "neutral", icon: <FileText size={20} /> }
        ]}
      />

      <Panel className="overflow-hidden">
        <SectionTitle title="المنصات الاجتماعية" subtitle="يعرض المركز خصائص المشاركة والتصدير لكل منصة دون نشر مباشر نيابة عن المستخدم." />
        <DataTable headers={["المنصة", "حد الأحرف", "المشاركة", "الرابط أو البديل"]} rows={platformRows} />
      </Panel>

      <Panel className="overflow-hidden">
        <SectionTitle title="حزم التصدير" subtitle="كل حزمة تتضمن نتيجة المراجعة ومؤشرات المخاطر وبيانات الاستناد المهني." />
        {packageRows.length > 0 ? (
          <DataTable headers={["المحتوى", "جاهزية التصدير", "مستوى الامتثال", "مستوى المخاطر"]} rows={packageRows} />
        ) : (
          <div className="rounded-lg border border-dashed border-line bg-paper p-5 text-sm leading-7 text-ink/65">
            لا توجد حزم تصدير معروضة. تُنشأ الحزمة من نتيجة مراجعة محتوى فعلية فقط، وتتضمن عندها الملاحظات والدرجات والمراجع التي فعّلها النص المدخل.
          </div>
        )}
        <p className="mt-3 flex items-center gap-2 text-xs leading-6 text-ink/55">
          <Copy size={14} className="text-palm" />
          <Download size={14} className="text-palm" />
          النسخ للحافظة وتنزيل الحزمة متاحان من تجربة مراجعة المحتوى بعد إتمام التحليل.
        </p>
      </Panel>
    </div>
  );
}
