import { ExternalLink } from "lucide-react";
import { ButtonLink, PageHeader, Panel, SectionTitle } from "@/components/ui";
import { ReviewContextSummary, ReviewReferencesSection } from "@/components/review-context-summary";
import { OfficialLogo, officialEntityFromUrl } from "@/components/official-logos";

export default function LibraryPage() {
  const quickLinks = [
    { label: "قواعد السلوك المهني للمحامين", href: "https://laws.moj.gov.sa/ar/legislation/JmI0BPgVlA5GuIxkJUi08A" },
    { label: "اللائحة التنفيذية لنظام المحاماة", href: "https://laws.moj.gov.sa/ar/legislation/5huwCrAuvCK62BbuXv7fjg" },
    { label: "موقع وزارة العدل", href: "https://www.moj.gov.sa/" },
    { label: "ناجز", href: "https://najiz.sa/" },
    { label: "موقع الهيئة السعودية للمحامين", href: "https://sba.gov.sa/" },
    { label: "موقع وزارة الإعلام", href: "https://media.gov.sa/" },
    { label: "ضوابط وزارة الإعلام بشأن استخدام وسائل التواصل الاجتماعي", href: "https://gmedia.gov.sa/" }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="الوصول السريع والمراجع"
        title="المراجع المهنية والرسمية"
        description="المراجع المرتبطة بالمحتوى والإصدار الحالي وآخر تحليل، مع روابط مباشرة إلى الجهات والمصادر الرسمية المحددة."
        action={<ButtonLink href="/content-review">مراجعة محتوى</ButtonLink>}
      />

      <ReviewContextSummary focus="references" />
      <ReviewReferencesSection />
      <Panel>
        <SectionTitle title="الوصول السريع" subtitle="روابط مباشرة إلى المراجع والجهات ذات الصلة." />
        <div className="grid gap-3 sm:grid-cols-2">
          {quickLinks.map(({ label, href }) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white p-4 text-sm font-normal text-palm transition hover:border-palm focus-ring">
              <span className="flex items-center gap-3"><OfficialLogo entity={officialEntityFromUrl(href)} />{label}</span>
              <ExternalLink size={16} />
            </a>
          ))}
        </div>
      </Panel>
    </div>
  );
}
