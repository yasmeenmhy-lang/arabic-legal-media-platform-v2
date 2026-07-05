import { ExternalLink, FileText, Globe } from "lucide-react";
import { ButtonLink, PageHeader, Panel, SectionTitle } from "@/components/ui";
import { ReviewContextSummary, ReviewReferencesSection } from "@/components/review-context-summary";

// ── Entity groups ──────────────────────────────────────────────────────────

type LinkEntry = { label: string; href: string; type?: "doc" | "site" };

type EntityGroup = {
  key: string;
  name: string;
  shortName: string;
  domain: string;
  bg: string;
  accent: string;
  border: string;
  headerBg: string;
  favicon: string;
  links: LinkEntry[];
};

const entityGroups: EntityGroup[] = [
  {
    key: "moj",
    name: "وزارة العدل",
    shortName: "MOJ",
    domain: "laws.moj.gov.sa",
    bg: "bg-emerald-50",
    accent: "text-emerald-800",
    border: "border-emerald-200",
    headerBg: "bg-emerald-100",
    favicon: "https://laws.moj.gov.sa/logo.png",
    links: [
      { label: "قواعد السلوك المهني للمحامين",  href: "https://laws.moj.gov.sa/ar/legislation/JmI0BPgVlA5GuIxkJUi08A", type: "doc"  },
      { label: "اللائحة التنفيذية لنظام المحاماة", href: "https://laws.moj.gov.sa/ar/legislation/5huwCrAuvCK62BbuXv7fjg", type: "doc"  },
      { label: "الموقع الرسمي لوزارة العدل",       href: "https://www.moj.gov.sa/",                                                 type: "site" },
    ],
  },
  {
    key: "najiz",
    name: "ناجز",
    shortName: "ناجز",
    domain: "najiz.sa",
    bg: "bg-teal-50",
    accent: "text-teal-800",
    border: "border-teal-200",
    headerBg: "bg-teal-100",
    favicon: "https://najiz.sa/favicon.ico",
    links: [
      { label: "البوابة الإلكترونية ناجز", href: "https://najiz.sa/", type: "site" },
    ],
  },
  {
    key: "sba",
    name: "الهيئة السعودية للمحامين",
    shortName: "SBA",
    domain: "sba.gov.sa",
    bg: "bg-slate-50",
    accent: "text-slate-800",
    border: "border-slate-200",
    headerBg: "bg-slate-100",
    favicon: "https://sba.gov.sa/favicon.ico",
    links: [
      { label: "الموقع الرسمي للهيئة السعودية للمحامين", href: "https://sba.gov.sa/", type: "site" },
    ],
  },
  {
    key: "media",
    name: "وزارة الإعلام",
    shortName: "MEDIA",
    domain: "media.gov.sa",
    bg: "bg-sky-50",
    accent: "text-sky-800",
    border: "border-sky-200",
    headerBg: "bg-sky-100",
    favicon: "https://media.gov.sa/favicon.ico",
    links: [
      { label: "الموقع الرسمي لوزارة الإعلام",                              href: "https://media.gov.sa/",   type: "site" },
      { label: "ضوابط استخدام وسائل التواصل الاجتماعي", href: "https://gmedia.gov.sa/", type: "doc"  },
    ],
  },
];

// ── Page ───────────────────────────────────────────────────────────────────

export default function LibraryPage() {
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

        <div className="grid gap-4 sm:grid-cols-2">
          {entityGroups.map((group) => (
            <div
              key={group.key}
              className={`overflow-hidden rounded-xl border ${group.border} ${group.bg}`}
            >
              {/* Entity header */}
              <div className={`flex items-center gap-3 px-4 py-3 ${group.headerBg} border-b ${group.border}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={group.favicon}
                  alt={group.name}
                  className="h-8 w-8 shrink-0 rounded-md object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-bold leading-5 ${group.accent}`}>{group.name}</p>
                  <p className="text-[11px] text-ink/45">{group.domain}</p>
                </div>
                <span className={`rounded-md border ${group.border} bg-white/60 px-2 py-0.5 text-[10px] font-semibold tracking-wide ${group.accent}`}>
                  {group.shortName}
                </span>
              </div>

              {/* Links list */}
              <div className="divide-y divide-black/5">
                {group.links.map(({ label, href, type }) => (
                  <a
                    key={href}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`group flex items-center gap-3 px-4 py-3 transition hover:bg-white/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-palm focus-visible:ring-offset-1`}
                  >
                    {/* Type icon */}
                    {type === "doc"
                      ? <FileText size={14} className={`shrink-0 ${group.accent} opacity-60`} aria-hidden="true" />
                      : <Globe     size={14} className={`shrink-0 ${group.accent} opacity-60`} aria-hidden="true" />
                    }
                    {/* Label */}
                    <span className={`flex-1 text-sm leading-6 ${group.accent} group-hover:underline group-hover:decoration-current/40 underline-offset-2`}>
                      {label}
                    </span>
                    {/* External arrow */}
                    <ExternalLink size={13} className={`shrink-0 ${group.accent} opacity-40 group-hover:opacity-70 transition`} aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
