import { ExternalLink } from "lucide-react";
import { ButtonLink, PageHeader, Panel, SectionTitle } from "@/components/ui";
import { ReviewContextSummary, ReviewReferencesSection } from "@/components/review-context-summary";

export default function LibraryPage() {
  const quickLinks = [
    ["قواعد السلوك المهني للمحامين", "https://laws.moj.gov.sa/ar/legislation/JmI0BPgVlA5GuIxkJUi08A"],
    ["اللائحة التنفيذية لنظام المحاماة", "https://laws.moj.gov.sa/ar/legislation/5huwCrAuvCK62BbuXv7fjg"],
    ["موقع وزارة العدل", "https://www.moj.gov.sa/"],
    ["منصة ناجز", "https://najiz.sa/"],
    ["موقع الهيئة السعودية للمحامين", "https://sba.gov.sa/"],
    ["موقع وزارة الإعلام", "https://media.gov.sa/"],
    ["ضوابط وزارة الإعلام بشأن استخدام وسائل التواصل الاجتماعي", "https://gmedia.gov.sa/"]
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
          {quickLinks.map(([label, href]) => (
            <a key={label} href={href} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-lg border border-line bg-white p-4 text-sm font-normal text-palm transition hover:border-palm focus-ring">
              {label}
              <ExternalLink size={16} />
            </a>
          ))}
        </div>
      </Panel>
    </div>
  );
}
