"use client";

// ★ لوحة أداء المنصة (بقرار مالكة المنصة): تقارير المنصة عند المدير فقط.
// تُحسب الأرقام من سجل المحتوى الفعلي المحفوظ على هذا الجهاز — لا من عدادات
// الخادم المؤقتة — فتعكس الاستعمال الحقيقي: قرارات النشر، المخاطر، أكثر
// الملاحظات تكراراً، إثبات المصادر، والاتجاه الشهري.
import { useEffect, useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { DataTable, KpiGrid, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import { loadContentRecords, type StoredContentRecord, type StoredContentVersion } from "@/lib/content-record-store";
import { hasNoRisks, riskDisplay, type ReviewResult, type RiskLevel } from "@/lib/types";

type PeriodKey = "month" | "quarter" | "all";

const PERIODS: Array<{ key: PeriodKey; label: string; days: number | null }> = [
  { key: "month", label: "آخر ٣٠ يوماً", days: 30 },
  { key: "quarter", label: "آخر ٩٠ يوماً", days: 90 },
  { key: "all", label: "كل السجل", days: null }
];

const DECISION_LABELS: Record<string, string> = {
  RECOMMENDED: "موصى بالنشر",
  RECOMMENDED_AFTER_FINDINGS: "موصى به بعد معالجة الملاحظات",
  LEGAL_REVIEW_REQUIRED: "يتطلب مراجعة قانونية",
  NOT_RECOMMENDED: "غير موصى بالنشر"
};

function riskBadgeFor(analysis: ReviewResult): { label: string; tone: "good" | "gold" | "warning" | "danger" | "neutral" } | null {
  const level = analysis.riskLevel as RiskLevel | undefined;
  if (!level) return null;
  const parties = analysis.riskScoreExplanation?.affectedParties ?? [];
  return riskDisplay(level, { noRisks: hasNoRisks(level, parties.length, (analysis.findings ?? []).length) });
}

function monthLabel(iso: string): string {
  return new Intl.DateTimeFormat("ar", { month: "long", year: "numeric" }).format(new Date(iso));
}

// أشرطة أعداد (لا نسب): BarList المشترك يعرض القيمة بعلامة ٪ دائماً، وهذه أعداد —
// فالعرض هنا نسبي لأكبر قيمة والرقم يظهر كما هو.
function CountBars({ items, barClass = "bg-palm" }: { items: { label: string; value: number }[]; barClass?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-2 flex justify-between gap-3 text-sm">
            <span className="min-w-0 font-normal text-ink/75">{item.label}</span>
            <span className="shrink-0 font-normal tabular-nums">{item.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-line/60">
            <div className={`h-full rounded-full ${barClass}`} style={{ width: `${Math.round((item.value / max) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PerformanceDashboard() {
  const [records, setRecords] = useState<StoredContentRecord[] | null>(null);
  const [period, setPeriod] = useState<PeriodKey>("all");

  useEffect(() => {
    setRecords(loadContentRecords());
  }, []);

  const stats = useMemo(() => {
    if (!records) return null;
    const days = PERIODS.find((p) => p.key === period)?.days ?? null;
    const cutoff = days === null ? null : Date.now() - days * 24 * 60 * 60 * 1000;
    const inPeriod = (iso: string) => cutoff === null || new Date(iso).getTime() >= cutoff;

    // النسخ المحللة داخل الفترة — كل نسخة تحمل نتيجة تحليل هي مراجعة مكتملة
    const analyzedVersions: StoredContentVersion[] = [];
    // أحدث نسخة محللة لكل محتوى نشط داخل الفترة — عليها تُحسب القرارات والمخاطر والأنواع
    const latestAnalyzed: StoredContentVersion[] = [];
    let firstTimeReady = 0;
    let firstTimeTotal = 0;

    for (const record of records) {
      if (record.archived) continue;
      const analyzed = record.versions
        .filter((v) => v.analysis && inPeriod(v.updatedAt))
        .sort((a, b) => a.version - b.version);
      analyzedVersions.push(...analyzed);
      if (analyzed.length > 0) {
        latestAnalyzed.push(analyzed[analyzed.length - 1]);
        const firstDecision = analyzed[0].analysis?.publicationDecision;
        if (firstDecision) {
          firstTimeTotal += 1;
          if (firstDecision.recommended) firstTimeReady += 1;
        }
      }
    }

    const activeRecords = records.filter((r) => !r.archived && r.versions.some((v) => inPeriod(v.updatedAt)));
    const approvedCount = activeRecords.filter((r) => r.status === "معتمد" || r.approvedVersion != null).length;

    const decisionCounts = new Map<string, number>();
    const riskCounts = new Map<string, { count: number; tone: "good" | "gold" | "warning" | "danger" | "neutral" }>();
    const typeCounts = new Map<string, number>();
    const findingCounts = new Map<string, number>();
    let claimsTotal = 0;
    let claimsProven = 0;

    for (const version of latestAnalyzed) {
      const analysis = version.analysis!;
      const outcome = analysis.publicationDecision?.outcome;
      if (outcome) {
        const label = DECISION_LABELS[outcome] ?? analysis.publicationDecision.label;
        decisionCounts.set(label, (decisionCounts.get(label) ?? 0) + 1);
      }
      const badge = riskBadgeFor(analysis);
      if (badge) {
        const entry = riskCounts.get(badge.label) ?? { count: 0, tone: badge.tone };
        entry.count += 1;
        riskCounts.set(badge.label, entry);
      }
      typeCounts.set(version.contentTypeLabel, (typeCounts.get(version.contentTypeLabel) ?? 0) + 1);
    }

    for (const version of analyzedVersions) {
      for (const finding of version.analysis?.findings ?? []) {
        if (finding.title) findingCounts.set(finding.title, (findingCounts.get(finding.title) ?? 0) + 1);
      }
      for (const claim of version.sourceDossier?.claims ?? []) {
        claimsTotal += 1;
        if (claim.status === "مثبت") claimsProven += 1;
      }
    }

    // الاتجاه الشهري: عدد النسخ المحللة ونصيب الموصى به شهراً بشهر (تصاعدياً)
    const monthly = new Map<string, { label: string; total: number; ready: number }>();
    for (const version of analyzedVersions) {
      const key = version.updatedAt.slice(0, 7);
      const entry = monthly.get(key) ?? { label: monthLabel(version.updatedAt), total: 0, ready: 0 };
      entry.total += 1;
      if (version.analysis?.publicationDecision?.recommended) entry.ready += 1;
      monthly.set(key, entry);
    }
    const monthlyRows = [...monthly.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, v]) => v);

    return {
      totalRecords: activeRecords.length,
      analyzedCount: analyzedVersions.length,
      approvedCount,
      firstTimeReadyShare: firstTimeTotal > 0 ? Math.round((firstTimeReady / firstTimeTotal) * 100) : null,
      decisions: [...decisionCounts.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })),
      risks: [...riskCounts.entries()].sort((a, b) => b[1].count - a[1].count),
      types: [...typeCounts.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value })),
      topFindings: [...findingCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, value]) => ({ label, value })),
      claimsTotal,
      claimsProven,
      monthlyRows
    };
  }, [records, period]);

  if (!records) return null;

  return (
    <div className="space-y-5">
      <Panel className="overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SectionTitle
            title="أداء المنصة — من السجل الفعلي"
            subtitle="تُحسب هذه الأرقام من سجل المحتوى المحفوظ على هذا الجهاز، وتعكس ما فيه فقط."
          />
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriod(p.key)}
                className={
                  period === p.key
                    ? "rounded-full border border-palm/40 bg-mint/60 px-3 py-1 text-xs text-palmDeep"
                    : "rounded-full border border-line bg-white px-3 py-1 text-xs text-ink/60 hover:border-palm/30"
                }
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {stats && stats.analyzedCount === 0 ? (
          <p className="rounded-lg border border-line bg-white p-4 text-sm leading-7 text-ink/65">
            لا توجد مراجعات محللة في هذه الفترة على سجل هذا الجهاز — الأرقام تظهر فور وجود محتوى محلل.
          </p>
        ) : stats ? (
          <div className="space-y-5">
            <KpiGrid
              items={[
                { label: "محتويات نشطة", value: `${stats.totalRecords}`, hint: "ضمن الفترة المختارة", tone: "neutral", icon: <BarChart3 size={20} /> },
                { label: "مراجعات محللة", value: `${stats.analyzedCount}`, hint: "كل نسخة حللها المحرك", tone: "good" },
                { label: "جاهز من أول تحليل", value: stats.firstTimeReadyShare === null ? "—" : `${stats.firstTimeReadyShare}٪`, hint: "موصى به دون حاجة لإعادة", tone: "gold" },
                { label: "محتوى معتمد", value: `${stats.approvedCount}`, hint: "اعتُمد للنشر", tone: "good" }
              ]}
            />

            <div className="grid gap-5 xl:grid-cols-2">
              <div>
                <SectionTitle title="قرارات النشر" subtitle="توزيع قرار المحرك على أحدث تحليل لكل محتوى." />
                <CountBars items={stats.decisions} />
              </div>
              <div>
                <SectionTitle title="مستويات المخاطر" subtitle="على أحدث تحليل لكل محتوى — بمقياس العرض المعتمد." />
                <DataTable
                  headers={["المستوى", "عدد المحتويات"]}
                  rows={stats.risks.map(([label, entry]) => [
                    <StatusBadge key={label} tone={entry.tone}>{label}</StatusBadge>,
                    `${entry.count}`
                  ])}
                />
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <div>
                <SectionTitle title="أكثر الملاحظات تكراراً" subtitle="مواطن الانتباه المتكررة عبر كل المراجعات في الفترة." />
                {stats.topFindings.length > 0 ? (
                  <CountBars items={stats.topFindings} barClass="bg-gold" />
                ) : (
                  <p className="text-sm leading-7 text-ink/60">لم تُرصد ملاحظات في مراجعات هذه الفترة.</p>
                )}
              </div>
              <div>
                <SectionTitle title="توزيع أنواع المحتوى" subtitle="أنواع المحتوى المحلل في الفترة المختارة." />
                <CountBars items={stats.types} />
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <div>
                <SectionTitle title="إثبات المصادر" subtitle="الادعاءات المعرفية التي عُثر لها على مصدر رسمي مثبت." />
                {stats.claimsTotal > 0 ? (
                  <CountBars
                    items={[
                      { label: "مثبت بمصدر رسمي", value: stats.claimsProven },
                      { label: "لم يُعثر له على أصل منشور", value: stats.claimsTotal - stats.claimsProven }
                    ]}
                  />
                ) : (
                  <p className="text-sm leading-7 text-ink/60">لا توجد ادعاءات خضعت للبحث الحي في هذه الفترة.</p>
                )}
              </div>
              <div>
                <SectionTitle title="الاتجاه الشهري" subtitle="عدد المراجعات المحللة، ومنها الموصى به، شهراً بشهر." />
                <DataTable
                  headers={["الشهر", "مراجعات", "موصى به"]}
                  rows={stats.monthlyRows.map((row) => [row.label, `${row.total}`, `${row.ready}`])}
                />
              </div>
            </div>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
