import Link from "next/link";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileCheck2,
  ShieldAlert,
  ShieldCheck,
  TrendingUp
} from "lucide-react";
import { BarList, ButtonLink, KpiGrid, PageHeader, Panel, ProgressBar, SectionTitle, StatusBadge } from "@/components/ui";
import { getDashboardOverview } from "@/lib/services/dashboard-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const quickLinks = [
  ["وزارة العدل", "https://www.moj.gov.sa"],
  ["ناجز", "https://najiz.sa"],
  ["الهيئة السعودية للمحامين", "https://sba.gov.sa"],
  ["قواعد السلوك المهني", "https://laws.moj.gov.sa/ar/legislation/JmI0BPgVlA5GuIxkJUi08A"],
  ["اللائحة التنفيذية لنظام المحاماة", "https://laws.moj.gov.sa/ar/legislation/5huwCrAuvCK62BbuXv7fjg"]
];

const readinessIndicators: Array<{
  label: string;
  value: number;
  tone: "good" | "warn" | "danger" | "gold" | "neutral";
  hint: string;
  href: string;
}> = [
  { label: "جاهزية النشر", value: 76, tone: "good", hint: "المحتوى المناسب للتصدير بعد المراجعة.", href: "/publishing" },
  { label: "مستوى الامتثال", value: 88, tone: "good", hint: "مدى انخفاض ملاحظات الامتثال المؤثرة.", href: "/legal-compliance" },
  { label: "جودة المحتوى", value: 91, tone: "gold", hint: "اللغة والصياغة والوضوح واتساق المصطلحات.", href: "/content-review" },
  { label: "مؤشر المخاطر", value: 18, tone: "warn", hint: "نسبة العناصر التي تحتاج متابعة مهنية.", href: "/risk-assessment" }
];

export default async function DashboardPage() {
  const overview = await getDashboardOverview();

  const dashboardKpis = [
    {
      label: "مراجعات معلقة",
      value: String(overview.pendingReviews),
      hint: "مواد تنتظر استكمال الملاحظات",
      tone: "warn" as const,
      icon: <Clock3 size={19} />,
      href: "/content-management"
    },
    {
      label: "مناسب للنشر",
      value: String(overview.publishableContent),
      hint: "جاهز للتصدير وفق نتائج المراجعة",
      tone: "good" as const,
      icon: <CheckCircle2 size={19} />,
      href: "/publishing"
    },
    {
      label: "تصدير متوقف",
      value: String(overview.exportsRequiringAttention),
      hint: "يتطلب معالجة قبل المشاركة",
      tone: "danger" as const,
      icon: <AlertTriangle size={19} />,
      href: "/export-center"
    },
    {
      label: "مخاطر عالية",
      value: String(overview.highRiskContent),
      hint: "تحتاج متابعة مهنية عاجلة",
      tone: "danger" as const,
      icon: <ShieldAlert size={19} />,
      href: "/risk-assessment"
    }
  ];

  const recentActivity = [
    ["مراجعة إعلان خدمات للشركات الناشئة", "يتطلب معالجة الملاحظات", "مرتفع", "قبل 18 دقيقة", "/content-review"],
    ["منشور توعوي عن العقود", "مناسب للنشر وفق النتائج", "منخفض", "قبل ساعة", "/publishing"],
    ["نص فيديو قصير", "يتطلب مراجعة إضافية", "متوسط", "اليوم", "/content-management"]
  ];

  return (
    <>
      <PageHeader
        eyebrow="مركز المتابعة التنفيذي"
        title="لوحة التحكم"
        description="نظرة تشغيلية على جودة المحتوى الإعلامي والإعلاني، ملاحظات الامتثال، مؤشرات المخاطر، جاهزية النشر، والتنبيهات ذات الأولوية."
        action={<ButtonLink href="/content-review">بدء مراجعة محتوى</ButtonLink>}
      />

      <KpiGrid items={dashboardKpis} />

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Panel>
          <SectionTitle title="مؤشرات الجاهزية" subtitle="ملخص بصري سريع يساعد على ترتيب الأولويات خلال ثوان." />
          <div className="grid gap-4 md:grid-cols-2">
            {readinessIndicators.map((indicator) => (
              <Link key={indicator.label} href={indicator.href} className="rounded-lg border border-line bg-white p-4 transition hover:border-palm hover:shadow-sm focus-ring">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-extrabold text-ink">{indicator.label}</span>
                  <span className="text-3xl font-extrabold text-palm">{indicator.value}%</span>
                </div>
                <div className="mt-4"><ProgressBar value={indicator.value} tone={indicator.tone} /></div>
                <p className="mt-3 text-xs leading-6 text-ink/60">{indicator.hint}</p>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionTitle title="ملخص تنفيذي" subtitle="أهم ما يحتاج متابعة اليوم." />
          <Link href="/alerts" className="block rounded-lg border border-red-200 bg-red-50 p-4 transition hover:border-red-300 focus-ring">
            <div className="mb-3 flex items-center gap-2 text-red-800">
              <AlertTriangle size={18} />
              <p className="font-extrabold">أولوية عالية</p>
            </div>
            <p className="text-sm leading-7 text-ink/75">
              توجد مواد عالية المخاطر وتصدير متوقف. يوصى بمعالجة ملاحظات الامتثال والمخاطر قبل أي مشاركة خارجية.
            </p>
          </Link>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link href="/library" className="rounded-lg border border-line p-3 transition hover:border-palm focus-ring">
              <p className="text-xs text-ink/55">آخر فحص للمراجع</p>
              <p className="mt-1 font-extrabold">
                {overview.lastLegalSourceCheck === "غير محدد" ? "غير محدد" : new Date(overview.lastLegalSourceCheck).toLocaleDateString("ar-SA")}
              </p>
            </Link>
            <Link href="/administration" className="rounded-lg border border-line p-3 transition hover:border-palm focus-ring">
              <p className="text-xs text-ink/55">تحديثات مرجعية</p>
              <p className="mt-1 font-extrabold">{overview.pendingLegalSourceUpdates}</p>
            </Link>
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <Panel>
          <SectionTitle title="الاتجاهات" subtitle="مؤشرات مختصرة لمتابعة التحسن." />
          <BarList
            items={[
              { label: "تحسن جودة الصياغة", value: 91 },
              { label: "انخفاض الملاحظات العالية", value: 64 },
              { label: "جاهزية التصدير", value: 76 }
            ]}
          />
          <Link href="/analytics" className="mt-4 inline-flex items-center gap-2 text-sm font-extrabold text-palm">
            <BarChart3 size={16} />
            عرض التقارير والمؤشرات
          </Link>
        </Panel>

        <Panel>
          <SectionTitle title="تنبيهات مهنية" subtitle="عناصر تحتاج متابعة." />
          <div className="space-y-3">
            <Link href="/risk-assessment" className="block rounded-lg border border-red-200 bg-red-50 p-3 transition hover:border-red-300 focus-ring">
              <StatusBadge tone="danger">مخاطر عالية</StatusBadge>
              <p className="mt-2 text-sm font-bold">إعلان يتضمن وعداً بنتيجة مضمونة.</p>
            </Link>
            <Link href="/content-review" className="block rounded-lg border border-amber-200 bg-amber-50 p-3 transition hover:border-amber-300 focus-ring">
              <StatusBadge tone="warn">مراجعة مطلوبة</StatusBadge>
              <p className="mt-2 text-sm font-bold">صياغة تحتاج توضيحاً قبل النشر.</p>
            </Link>
          </div>
        </Panel>

        <Panel>
          <SectionTitle title="النشاط الأخير" subtitle="آخر عناصر المراجعة." />
          <div className="space-y-3">
            {recentActivity.map(([title, status, risk, time, href]) => (
              <Link key={title} href={href} className="block rounded-lg border border-line p-3 transition hover:border-palm hover:bg-[#fbfcfb] focus-ring">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-extrabold leading-6">{title}</p>
                  <StatusBadge tone={risk === "مرتفع" ? "danger" : risk === "متوسط" ? "warn" : "good"}>{risk}</StatusBadge>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-ink/55">
                  <span>{status}</span>
                  <span>{time}</span>
                </div>
              </Link>
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel>
          <SectionTitle title="وصول سريع" subtitle="المراجع والخدمات الرسمية ذات الصلة." />
          <div className="grid gap-2">
            {quickLinks.map(([label, href]) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-lg border border-line px-3 py-2.5 text-sm font-extrabold transition hover:border-palm hover:bg-[#fbfcfb] focus-ring">
                <span>{label}</span>
                <ExternalLink size={15} className="text-palm" />
              </a>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionTitle title="خدمات رئيسية" subtitle="اختصارات عملية إلى المسارات المطلوبة دون إخفاء أي Capability." />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["المراجعة", "/content-review", FileCheck2],
              ["التقويم", "/media-planning", CalendarDays],
              ["الامتثال", "/legal-compliance", ShieldCheck],
              ["المراجع", "/library", BookOpen],
              ["المخاطر", "/risk-assessment", ShieldAlert],
              ["التصدير", "/export-center", TrendingUp]
            ].map(([label, href, Icon]) => {
              const ServiceIcon = Icon as typeof FileCheck2;
              return (
                <Link key={label as string} href={href as string} className="rounded-lg border border-line bg-white p-4 text-center transition hover:border-palm hover:bg-mint focus-ring">
                  <ServiceIcon className="mx-auto text-palm" size={22} />
                  <p className="mt-2 text-sm font-extrabold">{label as string}</p>
                </Link>
              );
            })}
          </div>
        </Panel>
      </div>
    </>
  );
}
