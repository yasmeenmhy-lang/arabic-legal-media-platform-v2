import { BookOpen, ExternalLink, FileText, Globe } from "lucide-react";
import { ButtonLink, PageHeader, Panel, SectionTitle } from "@/components/ui";
import { EntityLogo } from "@/components/entity-logo";

// ── بيانات الجهات وروابطها ─────────────────────────────────────────────────

type LinkEntry = { label: string; href: string; type: "doc" | "site" };

type EntityGroup = {
  key:      string;
  name:     string;
  domain:   string;
  favicon:  string;
  links:    LinkEntry[];
};

const entityGroups: EntityGroup[] = [
  {
    key:    "moj",
    name:   "وزارة العدل",
    domain: "moj.gov.sa",
    favicon: "https://laws.moj.gov.sa/logo.png",
    links: [
      { label: "قواعد السلوك المهني للمحامين",    href: "https://laws.moj.gov.sa/ar/legislation/JmI0BPgVlA5GuIxkJUi08A", type: "doc"  },
      { label: "اللائحة التنفيذية لنظام المحاماة", href: "https://laws.moj.gov.sa/ar/legislation/5huwCrAuvCK62BbuXv7fjg", type: "doc"  },
      { label: "الموقع الرسمي لوزارة العدل",       href: "https://www.moj.gov.sa/",                                          type: "site" },
    ],
  },
  {
    key:    "najiz",
    name:   "ناجز",
    domain: "najiz.sa",
    favicon: "https://najiz.sa/favicon.ico",
    links: [
      { label: "البوابة الإلكترونية ناجز", href: "https://najiz.sa/", type: "site" },
    ],
  },
  {
    key:    "sba",
    name:   "الهيئة السعودية للمحامين",
    domain: "sba.gov.sa",
    favicon: "https://sba.gov.sa/favicon.ico",
    links: [
      { label: "الموقع الرسمي للهيئة السعودية للمحامين", href: "https://sba.gov.sa/", type: "site" },
    ],
  },
  {
    key:    "media",
    name:   "وزارة الإعلام",
    domain: "media.gov.sa",
    favicon: "https://media.gov.sa/favicon.ico",
    links: [
      { label: "الموقع الرسمي لوزارة الإعلام",               href: "https://media.gov.sa/",   type: "site" },
      { label: "ضوابط استخدام وسائل التواصل الاجتماعي", href: "https://gmedia.gov.sa/", type: "doc"  },
    ],
  },
];

// ── الصفحة ─────────────────────────────────────────────────────────────────

export default function LibraryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="الوصول السريع والمراجع"
        title="المراجع المهنية والرسمية"
        action={<ButtonLink href="/analysis">مراجعة محتوى</ButtonLink>}
      />

      {/* خانة دليل الاستخدام أعلى الصفحة — الخدمة قيد الإعداد وتُوسم «قريبًا» */}
      <Panel className="border-r-4 border-r-palm bg-mint/25">
        <div className="flex flex-wrap items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-palm text-white">
            <BookOpen size={20} aria-hidden="true" />
          </div>
          <h2 className="text-lg font-bold text-ink">دليل الاستخدام</h2>
          <span className="rounded-full bg-palm px-3 py-1 text-xs font-bold text-white">قريبًا</span>
        </div>
        <p className="mt-3 leading-7 text-ink/70">
          دليل تفصيلي يوضّح خطوات استخدام النظام قيد الإعداد، وسيُتاح قريبًا.
        </p>
      </Panel>

      <Panel>
        <SectionTitle
          title="الوصول السريع"
        />

        <div className="grid gap-3 sm:grid-cols-2">
          {entityGroups.map((group) => (
            <div
              key={group.key}
              className="overflow-hidden rounded-xl border border-line bg-white"
            >
              {/* ── رأس الجهة ── */}
              <div className="flex items-center gap-3 border-b border-line bg-paper px-4 py-3">
                <EntityLogo domain={group.domain} size={32} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{group.name}</p>
                  <p className="text-[11px] text-ink/45">{group.domain}</p>
                </div>
                {/* شارة النطاق الحكومي */}
                <span className="flex items-center gap-1 rounded-md border border-palm/20 bg-mint px-2 py-0.5 text-[10px] font-semibold text-palm">
                  <span aria-hidden="true">🇸🇦</span>
                  gov
                </span>
              </div>

              {/* ── قائمة الروابط ── */}
              <ul role="list" className="divide-y divide-line">
                {group.links.map(({ label, href, type }) => (
                  <li key={href}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-3 px-4 py-3 transition hover:bg-mint/30 focus-ring"
                    >
                      {/* أيقونة النوع */}
                      {type === "doc"
                        ? <FileText size={15} className="shrink-0 text-ink/40 group-hover:text-palm transition" aria-label="وثيقة" />
                        : <Globe    size={15} className="shrink-0 text-ink/40 group-hover:text-palm transition" aria-label="موقع" />
                      }
                      {/* العنوان */}
                      <span className="flex-1 text-sm leading-6 text-ink group-hover:text-palm transition">
                        {label}
                      </span>
                      {/* سهم الخروج */}
                      <ExternalLink
                        size={13}
                        className="shrink-0 text-ink/25 transition group-hover:text-palm"
                        aria-hidden="true"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
