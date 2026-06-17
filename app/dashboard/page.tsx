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
import { ButtonLink, KpiGrid, PageHeader, Panel, SectionTitle } from "@/components/ui";
import { getDashboardOverview } from "@/lib/services/dashboard-service";
import { formatDualDate } from "@/lib/dates";
import { legalSourceDocuments } from "@/lib/legal-knowledge-base";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Official Ministry of Justice links only — the law-specific deep links are
// read from the single canonical source list so this can never drift out of
// sync with what /library shows.
const quickLinks = [
  ["وزارة العدل", "https://www.moj.gov.sa"],
  ...legalSourceDocuments.map((source) => [source.title, source.sourceUrl])
];

export default async function DashboardPage() {
  const overview = await getDashboardOverview();

  const dashboardKpis = [
    {
      label: "مراجعات معلقة",
      value: String(overview.pendingReviews),
      hint: "مواد تنتظر استكمال الملاحظات",
      tone: "neutral" as const,
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
      tone: "gold" as const,
      icon: <AlertTriangle size={19} />,
      href: "/social-media"
    },
    {
      label: "مخاطر عالية",
      value: String(overview.highRiskContent),
      hint: "تحتاج متابعة مهنية عاجلة",
      tone: "gold" as const,
      icon: <ShieldAlert size={19} />,
      href: "/risk-assessment"
    }
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
          <SectionTitle title="مؤشرات الجاهزية" subtitle="تظهر درجات الجاهزية والامتثال والمخاطر بعد تحليل محتوى فعلي فقط." />
          <div className="rounded-lg border border-dashed border-line bg-paper p-6 text-sm leading-7 text-ink/65">
            لا توجد درجات مراجعة معروضة حالياً. ابدأ مراجعة محتوى لإظهار المؤشرات المحسوبة من الملاحظات الفعلية والمواد المهنية والتنظيمية المرتبطة بها.
          </div>
        </Panel>

        <Panel>
          <SectionTitle title="ملخص تنفيذي" subtitle="أهم ما يحتاج متابعة اليوم." />
          <div className="rounded-lg border border-line bg-paper p-4">
            <div className="mb-3 flex items-center gap-2 text-palm">
              <AlertTriangle size={18} />
              <p className="font-normal">لا توجد ملاحظات مراجعة معروضة</p>
            </div>
            <p className="text-sm leading-7 text-ink/75">
              لا تعرض اللوحة تنبيهات امتثال أو مخاطر ما لم تكن ناتجة عن محتوى تمت مراجعته فعلياً.
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link href="/library" className="rounded-lg border border-line p-3 transition hover:border-palm focus-ring">
              <p className="text-xs text-ink/55">آخر فحص للمراجع</p>
              <p className="mt-1 break-words font-normal">
                {overview.lastLegalSourceCheck === "غير محدد" ? "غير محدد" : formatDualDate(overview.lastLegalSourceCheck)}
              </p>
            </Link>
            <Link href="/administration" className="rounded-lg border border-line p-3 transition hover:border-palm focus-ring">
              <p className="text-xs text-ink/55">تحديثات مرجعية</p>
              <p className="mt-1 font-normal">{overview.pendingLegalSourceUpdates}</p>
            </Link>
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <Panel>
          <SectionTitle title="الاتجاهات" subtitle="مؤشرات مختصرة لمتابعة التحسن." />
          <div className="rounded-lg border border-dashed border-line bg-paper p-5 text-sm leading-7 text-ink/65">
            لا توجد اتجاهات محسوبة قبل توفر مراجعات فعلية محفوظة.
          </div>
          <Link href="/analytics" className="mt-4 inline-flex items-center gap-2 text-sm font-normal text-palm">
            <BarChart3 size={16} />
            عرض التقارير والمؤشرات
          </Link>
        </Panel>

        <Panel>
          <SectionTitle title="تنبيهات مهنية" subtitle="عناصر تحتاج متابعة." />
          <div className="rounded-lg border border-dashed border-line bg-paper p-5 text-sm leading-7 text-ink/65">
            لا توجد تنبيهات مهنية مشتقة من مراجعة فعلية حالياً.
          </div>
        </Panel>

        <Panel>
          <SectionTitle title="النشاط الأخير" subtitle="آخر عناصر المراجعة." />
          <div className="rounded-lg border border-dashed border-line bg-paper p-5 text-sm leading-7 text-ink/65">
            يظهر النشاط الأخير بعد حفظ مراجعات فعلية أو استكمال تصدير مبني على نتيجة مراجعة.
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <Panel>
          <SectionTitle title="وصول سريع" subtitle="المراجع والخدمات الرسمية ذات الصلة." />
          <div className="grid gap-2">
            {quickLinks.map(([label, href]) => (
              <a key={label} href={href} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5 text-sm font-normal transition hover:border-palm hover:bg-paper focus-ring">
                <span className="min-w-0 break-words">{label}</span>
                <ExternalLink size={15} className="shrink-0 text-palm" />
              </a>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionTitle title="خدمات رئيسية" subtitle="اختصارات عملية إلى المسارات المطلوبة دون إخفاء أي Capability." />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["المراجعة", "/content-review", FileCheck2],
              ["التقويم", "/calendar", CalendarDays],
              ["الامتثال", "/legal-compliance", ShieldCheck],
              ["المراجع", "/library", BookOpen],
              ["المخاطر", "/risk-assessment", ShieldAlert],
              ["التصدير", "/social-media", TrendingUp]
            ].map(([label, href, Icon]) => {
              const ServiceIcon = Icon as typeof FileCheck2;
              return (
                <Link key={label as string} href={href as string} className="rounded-lg border border-line bg-white p-4 text-center transition hover:border-palm hover:bg-mint focus-ring">
                  <ServiceIcon className="mx-auto text-palm" size={22} />
                  <p className="mt-2 text-sm font-normal">{label as string}</p>
                </Link>
              );
            })}
          </div>
        </Panel>
      </div>
    </>
  );
}
