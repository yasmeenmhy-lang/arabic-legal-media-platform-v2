import { ButtonLink, DataTable, KpiGrid, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import { buildShareUrl, getSocialMediaCenter } from "@/lib/services/social-media-service";
import { socialBrandIcons } from "@/components/social-icons";
import { Copy, ExternalLink, PackageCheck, Share2, Smartphone } from "lucide-react";

export default function SocialMediaPage() {
  const center = getSocialMediaCenter();
  const primaryContent = center.content[0];

  const rows = center.platforms.map((platform) => {
    const Icon = socialBrandIcons[platform.key];
    const shareUrl = primaryContent ? buildShareUrl(platform.key, primaryContent) : null;

    return [
      <span key={`${platform.key}-label`} className="flex items-center gap-2 font-normal">
        {Icon ? <Icon size={18} className="text-ink/70" /> : null}
        {platform.label}
      </span>,
      platform.characterLimit ? platform.characterLimit.toLocaleString("ar-SA") : "حسب المنصة",
      platform.supportsWebShare ? <StatusBadge key={`${platform.key}-web`} tone="good">يدعم المشاركة</StatusBadge> : <StatusBadge key={`${platform.key}-manual`} tone="neutral">تعليمات يدوية</StatusBadge>,
      shareUrl ? (
        <a key={`${platform.key}-share`} href={shareUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-normal text-palm underline underline-offset-4">
          فتح رابط المشاركة
          <ExternalLink size={14} />
        </a>
      ) : (
        <StatusBadge key={`${platform.key}-fallback`} tone="gold">إرشادات بديلة</StatusBadge>
      )
    ];
  });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="مركز المشاركة الاجتماعية"
        title="مركز المشاركة الاجتماعية"
        description="تجهيز المحتوى المناسب للمشاركة بعد مراجعة النتائج، مع النسخ وحزم التصدير وروابط المشاركة الرسمية أو الإرشادات البديلة حسب كل منصة."
        action={<ButtonLink href="/export-center">تجهيز حزمة تصدير</ButtonLink>}
      />

      <KpiGrid
        items={[
          { label: "منصات مدعومة", value: `${center.platforms.length}`, hint: "X، LinkedIn، Instagram، TikTok، Snapchat، YouTube", tone: "good", icon: <Smartphone size={20} /> },
          { label: "مواد جاهزة", value: `${center.content.length}`, hint: "مرتبطة ببيانات مراجعة", tone: "gold", icon: <PackageCheck size={20} /> },
          { label: "نسخ للحافظة", value: "متاح", hint: "للنصوص والوسوم", tone: "neutral", icon: <Copy size={20} /> },
          { label: "مشاركة المتصفح", value: "مدعومة", hint: "عند توفرها في المتصفح", tone: "good", icon: <Share2 size={20} /> }
        ]}
      />

      <Panel className="overflow-hidden">
        <SectionTitle title="المنصات الاجتماعية" subtitle="يعرض المركز خصائص المشاركة والتصدير لكل منصة دون نشر مباشر نيابة عن المستخدم." />
        <DataTable headers={["المنصة", "حد الأحرف", "المشاركة", "الرابط أو البديل"]} rows={rows} />
      </Panel>
    </div>
  );
}
