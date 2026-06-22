"use client";

import { useEffect, useMemo, useState } from "react";
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
  Info,
  ShieldAlert,
  ShieldCheck,
  TrendingUp
} from "lucide-react";
import { ButtonLink, KpiGrid, PageHeader, Panel, ProgressBar, SectionTitle } from "@/components/ui";
import { formatDualDate } from "@/lib/dates";
import { legalSourceDocuments } from "@/lib/legal-knowledge-base";
import { loadContentRecords, type StoredContentRecord } from "@/lib/content-record-store";

const quickLinks = [
  ["وزارة العدل", "https://www.moj.gov.sa"],
  ...legalSourceDocuments.map((source) => [source.title, source.sourceUrl])
];

export default function DashboardPage() {
  const [records, setRecords] = useState<StoredContentRecord[]>([]);

  useEffect(() => {
    function refresh() {
      setRecords(loadContentRecords());
    }
    refresh();
    window.addEventListener("lawyer-media:records-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("lawyer-media:records-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const overview = useMemo(() => {
    const versions = records.flatMap((record) => record.versions.map((version) => ({ record, version })));
    const analyzed = versions.filter((item) => item.version.analysis);
    const approved = versions.filter((item) => item.version.approvedAt);
    const pendingReviews = records.filter((record) => record.status !== "معتمد" && record.versions.some((version) => version.analysis)).length;
    const publishableContent = approved.length;
    const exportsRequiringAttention = records.filter((record) => record.sharingStatus !== "تمت المشاركة" && record.approvedVersion).length;
    const highRiskContent = analyzed.filter((item) => ["حرج", "مرتفع"].includes(item.version.analysis?.riskLevel ?? "")).length;
    const avgCompliance = analyzed.length ? Math.round(analyzed.reduce((sum, item) => sum + (item.version.analysis?.complianceScore ?? 0), 0) / analyzed.length) : 0;
    const avgReadiness = analyzed.length ? Math.round(analyzed.reduce((sum, item) => sum + (item.version.analysis?.publishingReadinessScore ?? 0), 0) / analyzed.length) : 0;
    const avgRisk = analyzed.length ? Math.round(analyzed.reduce((sum, item) => sum + (item.version.analysis?.riskScore ?? 0), 0) / analyzed.length) : 0;
    const recentActions = records.flatMap((record) => record.actions.map((action) => ({ record, action }))).sort((a, b) => Date.parse(b.action.at) - Date.parse(a.action.at)).slice(0, 4);

    return {
      analyzedCount: analyzed.length,
      pendingReviews,
      publishableContent,
      exportsRequiringAttention,
      highRiskContent,
      avgCompliance,
      avgReadiness,
      avgRisk,
      recentActions
    };
  }, [records]);

  const dashboardKpis = [
    {
      label: "مراجعات معلقة",
      value: String(overview.pendingReviews),
      hint: "مواد محللة ولم تصل بعد إلى اعتماد نهائي",
      tone: "neutral" as const,
      icon: <Clock3 size={19} />,
      href: "/content-management"
    },
    {
      label: "مناسب للنشر",
      value: String(overview.publishableContent),
      hint: "نسخ معتمدة وجاهزة لمسار المشاركة والتصدير",
      tone: "good" as const,
      icon: <CheckCircle2 size={19} />,
      href: "/social-media"
    },
    {
      label: "تصدير متوقف",
      value: String(overview.exportsRequiringAttention),
      hint: "نسخ معتمدة لم يكتمل تجهيز المشاركة لها",
      tone: overview.exportsRequiringAttention ? "gold" as const : "good" as const,
      icon: <AlertTriangle size={19} />,
      href: "/social-media"
    },
    {
      label: "مخاطر عالية",
      value: String(overview.highRiskContent),
      hint: "نتائج مراجعة تحتاج متابعة مهنية عاجلة",
      tone: overview.highRiskContent ? "gold" as const : "good" as const,
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
          <SectionTitle title="مؤشرات الجاهزية" subtitle="تعرض المؤشرات بيانات فعلية من سجلات نافذة المراجعة المحفوظة في المتصفح." />
          {overview.analyzedCount ? (
            <div className="space-y-4">
              {([
                { label: "الامتثال", value: overview.avgCompliance, tone: "good" as const },
                { label: "جاهزية النشر", value: overview.avgReadiness, tone: "good" as const },
                { label: "المخاطر المتبقية", value: overview.avgRisk, tone: "gold" as const }
              ]).map(({ label, value, tone }) => (
                <div key={label}>
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                    <span className="text-ink/75">{label}</span>
                    <span className={tone === "good" ? "font-semibold tabular-nums text-palm" : "font-semibold tabular-nums text-gold"}>
                      {value > 0 ? `${value}%` : "—"}
                    </span>
                  </div>
                  <ProgressBar value={value} tone={tone} />
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-line bg-paper p-6 text-sm leading-7 text-ink/65">
              لا توجد درجات مراجعة معروضة حالياً. ابدأ مراجعة محتوى لإظهار المؤشرات المحسوبة من الملاحظات الفعلية والمواد المهنية والتنظيمية المرتبطة بها.
            </div>
          )}
          <p className="mt-4 border-t border-line pt-3 text-xs leading-6 text-ink/50">
            ★ الدرجات مؤشرات مساندة وليست النتيجة الأساسية
          </p>
        </Panel>

        <Panel>
          <SectionTitle title="ملخص تنفيذي" subtitle="أهم ما يحتاج متابعة اليوم." />
          {records.length ? (
            <div className="space-y-3">
              <p className="rounded-lg bg-paper p-4 text-sm leading-7">
                توجد {records.length} مادة محفوظة، منها {overview.publishableContent} نسخة معتمدة، و{overview.highRiskContent} نتيجة عالية المخاطر.
              </p>
              <Link href="/analytics" className="inline-flex items-center gap-2 text-sm font-normal text-palm">
                <BarChart3 size={16} />
                عرض التقارير والمؤشرات
              </Link>
            </div>
          ) : (
            <div className="rounded-lg border border-line bg-paper p-4">
              <div className="mb-3 flex items-center gap-2 text-palm">
                <AlertTriangle size={18} />
                <p className="font-normal">لا توجد ملاحظات مراجعة معروضة</p>
              </div>
              <p className="text-sm leading-7 text-ink/75">
                لا تعرض اللوحة تنبيهات امتثال أو مخاطر ما لم تكن ناتجة عن محتوى تمت مراجعته فعلياً.
              </p>
            </div>
          )}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link href="/library" className="rounded-lg border border-line p-3 transition hover:border-palm focus-ring">
              <p className="text-xs text-ink/55">آخر فحص للمراجع</p>
              <p className="mt-1 break-words font-normal">{formatDualDate(new Date("2026-06-15T00:00:00.000Z").toISOString())}</p>
            </Link>
            <Link href="/administration" className="rounded-lg border border-line p-3 transition hover:border-palm focus-ring">
              <p className="text-xs text-ink/55">تحديثات مرجعية</p>
              <p className="mt-1 font-normal">0</p>
            </Link>
          </div>
        </Panel>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-3">
        <Panel>
          <SectionTitle title="الاتجاهات" subtitle="مؤشرات مختصرة لمتابعة التحسن." />
          {overview.analyzedCount ? (
            <div className="space-y-2 text-sm leading-7">
              <p>تم احتساب الاتجاهات من {overview.analyzedCount} إصدار محلل محفوظ.</p>
              <p>انخفاض المخاطر وارتفاع الامتثال يظهران هنا بعد كل مراجعة محفوظة.</p>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-line bg-paper p-5 text-sm leading-7 text-ink/65">
              لا توجد اتجاهات محسوبة قبل توفر مراجعات فعلية محفوظة.
            </div>
          )}
          <Link href="/analytics" className="mt-4 inline-flex items-center gap-2 text-sm font-normal text-palm">
            <BarChart3 size={16} />
            عرض التقارير والمؤشرات
          </Link>
        </Panel>

        <Panel>
          <SectionTitle title="تنبيهات مهنية" subtitle="عناصر تحتاج متابعة." />
          {overview.highRiskContent ? (
            <div className="rounded-lg border border-gold/40 bg-gold/10 p-5 text-sm leading-7">
              توجد نتائج عالية المخاطر. راجع الملاحظات الحرجة قبل أي اعتماد أو مشاركة.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper px-3 py-1.5 text-xs text-ink/55">
                <Info size={12} />
                لا تنبيهات مهنية فعلية حالياً
              </span>
            </div>
          )}
          <Link href="/content-review#findings" className="mt-3 inline-flex items-center gap-1.5 text-xs text-palm">
            <ExternalLink size={12} />
            عرض الملاحظات التفصيلية
          </Link>
          <p className="mt-4 border-t border-line pt-3 text-xs leading-6 text-ink/50">
            ★ الدرجات مؤشرات مساندة وليست النتيجة الأساسية
          </p>
        </Panel>

        <Panel>
          <SectionTitle title="النشاط الأخير" subtitle="آخر عناصر المراجعة." />
          {overview.recentActions.length ? (
            <div className="space-y-3">
              {overview.recentActions.map(({ record, action }) => (
                <div key={action.id} className="rounded-lg border border-line p-3 text-sm">
                  <p className="font-semibold">{action.label}</p>
                  <p className="mt-1 text-ink/65">{record.title}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-line bg-paper p-5 text-sm leading-7 text-ink/65">
              يظهر النشاط الأخير بعد حفظ مراجعات فعلية أو استكمال تصدير مبني على نتيجة مراجعة.
            </div>
          )}
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
          <SectionTitle title="خدمات رئيسية" subtitle="اختصارات عملية إلى المسارات المطلوبة." />
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
