import { ButtonLink, DataTable, KpiGrid, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import { getSocialMediaCenter } from "@/lib/services/social-media-service";
import { Copy, PackageCheck, Share2, Smartphone } from "lucide-react";

const platformArabicNames: Record<string, string> = {
  tiktok: "تيك توك",
  snapchat: "سناب شات",
  x: "منصة إكس",
  linkedin: "لينكدإن",
  instagram: "إنستغرام",
  youtube_shorts: "يوتيوب شورتس"
};

export default function SocialMediaPage() {
  const center = getSocialMediaCenter();
  const rows = center.platforms.map((platform) => [
    platformArabicNames[platform.key] ?? platform.label,
    platform.characterLimit ? platform.characterLimit.toLocaleString("ar-SA") : "حسب المنصة",
    platform.supportsWebShare ? <StatusBadge key={`${platform.key}-web`} tone="good">يدعم المشاركة</StatusBadge> : <StatusBadge key={`${platform.key}-manual`} tone="neutral">تعليمات يدوية</StatusBadge>,
    platform.supportsDeepLink ? <StatusBadge key={`${platform.key}-link`} tone="good">رابط مشاركة</StatusBadge> : <StatusBadge key={`${platform.key}-fallback`} tone="warn">إرشادات بديلة</StatusBadge>
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="مركز المشاركة الاجتماعية"
        title="مركز المشاركة الاجتماعية"
        description="تجهيز المحتوى المناسب للمشاركة بعد مراجعة النتائج، مع النسخ وحزم التصدير وروابط المشاركة أو الإرشادات البديلة حسب كل منصة."
        action={<ButtonLink href="/export-center">تجهيز حزمة تصدير</ButtonLink>}
      />

      <KpiGrid
        items={[
          { label: "منصات مدعومة", value: `${center.platforms.length}`, hint: "تيك توك، سناب شات، إكس، لينكدإن، إنستغرام، ويوتيوب شورتس", tone: "good", icon: <Smartphone size={20} /> },
          { label: "مواد جاهزة", value: `${center.content.length}`, hint: "مرتبطة ببيانات مراجعة", tone: "gold", icon: <PackageCheck size={20} /> },
          { label: "نسخ للحافظة", value: "متاح", hint: "للنصوص والوسوم", tone: "neutral", icon: <Copy size={20} /> },
          { label: "مشاركة المتصفح", value: "مدعومة", hint: "عند توفرها في المتصفح", tone: "good", icon: <Share2 size={20} /> }
        ]}
      />

      <Panel>
        <SectionTitle title="المنصات الاجتماعية" subtitle="يعرض المركز خصائص المشاركة والتصدير لكل منصة دون نشر مباشر نيابة عن المستخدم." />
        <DataTable headers={["المنصة", "حد الأحرف", "المشاركة", "الرابط أو البديل"]} rows={rows} />
      </Panel>
    </div>
  );
}
