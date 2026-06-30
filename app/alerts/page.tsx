"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, ChevronDown, ExternalLink, FileSearch, Settings } from "lucide-react";
import { ButtonLink, DgaSpinner, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import { OfficialLogo, officialEntityFromUrl } from "@/components/official-logos";
import { loadContentRecords, type StoredContentRecord } from "@/lib/content-record-store";
import { riskDisplayLabel, type ReviewFinding, type RiskLevel } from "@/lib/types";

const severityRank: Record<RiskLevel, number> = { "بالغ": 5, "حرج": 4, "مرتفع": 3, "متوسط": 2, "منخفض": 1 };
const severeLevels: RiskLevel[] = ["بالغ", "حرج", "مرتفع"];

type FindingAlert = {
  recordTitle: string;
  finding: ReviewFinding;
};

type AssessmentAlert = {
  title: string;
  label: string;
  tone: "neutral" | "gold" | "danger";
  reason: string;
  action?: string;
};

export default function AlertsPage() {
  const [records, setRecords] = useState<StoredContentRecord[]>([]);
  const [openSection, setOpenSection] = useState<"findings" | "assessments" | "references" | null>("findings");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setRecords(loadContentRecords());
    setLoaded(true);
  }, []);

  const latestReviews = useMemo(() => records
    .map((record) => {
      const version = record.versions.find((item) => item.version === record.currentVersion) ?? record.versions.at(-1);
      return { record, review: version?.analysis };
    })
    .filter((item) => item.review), [records]);

  const findingAlerts = useMemo<FindingAlert[]>(() => latestReviews
    .flatMap(({ record, review }) => (review?.findings ?? [])
      .filter((finding) => !finding.resolved)
      .map((finding) => ({ recordTitle: record.title, finding })))
    .sort((a, b) => severityRank[b.finding.severity] - severityRank[a.finding.severity]), [latestReviews]);

  const assessmentAlerts = useMemo<AssessmentAlert[]>(() => latestReviews
    .flatMap(({ record, review }) => {
      if (!review) return [];
      const alerts: AssessmentAlert[] = [];
      if (review.riskLevel !== "منخفض") {
        alerts.push({
          title: record.title,
          label: `المخاطر ${riskDisplayLabel(review.riskLevel)}`,
          tone: severeLevels.includes(review.riskLevel) ? "danger" : "gold",
          reason: review.legalRiskAssessment.reason,
          action: review.riskScoreExplanation.contributions[0]?.explanation
        });
      }
      if (review.complianceScore < 100 || review.findings.length > 0) {
        alerts.push({
          title: record.title,
          label: `الامتثال ${review.complianceScore}%`,
          tone: review.complianceScore < 70 ? "danger" : "gold",
          reason: review.findings[0]?.legalExplanation ?? "توجد نتيجة امتثال تحتاج مراجعة قبل النشر.",
          action: review.findings[0]?.suggestedSaferWording
        });
      }
      if (review.publishingReadinessScore < 100 || review.readinessDecision.blockers.length > 0) {
        alerts.push({
          title: record.title,
          label: review.readinessDecision.level,
          tone: review.publishingReadinessScore === 0 ? "danger" : "gold",
          reason: review.readinessDecision.reasons[0] ?? "جاهزية النشر أقل من المستوى المطلوب.",
          action: review.readinessDecision.blockers[0] ?? review.readinessDecision.actions[0]
        });
      }
      return alerts;
    }), [latestReviews]);

  const referenceAlerts = useMemo(() => findingAlerts
    .filter(({ finding }) => finding.sourceUrl)
    .slice(0, 6), [findingAlerts]);

  const sections = [
    {
      key: "findings" as const,
      icon: <Bell size={18} aria-hidden="true" />,
      title: "تنبيهات المراجعة",
      subtitle: "مرتبطة بنتائج مراجعة فعلية محفوظة في الجلسة.",
      badge: findingAlerts.length ? `${findingAlerts.length} ملاحظة` : "حالي",
      badgeTone: (findingAlerts.length ? "gold" : "good") as "good" | "gold" | "danger" | "neutral",
      dotColor: findingAlerts.length ? "bg-gold" : "bg-palm",
      content: findingAlerts.length ? (
        <div className="space-y-3">
          {findingAlerts.slice(0, 4).map(({ recordTitle, finding }) => (
            <article key={`${recordTitle}-${finding.traceabilityId}`} className="rounded-lg border border-line bg-white p-3 text-sm leading-7">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <b>{finding.title}</b>
                <StatusBadge tone={severeLevels.includes(finding.severity) ? "danger" : "gold"}>{riskDisplayLabel(finding.severity)}</StatusBadge>
              </div>
              <p className="mt-1 text-xs text-ink/60">{recordTitle}</p>
              <p className="mt-1 text-sm leading-7 text-ink/70">{finding.evidence}</p>
              <p className="mt-1 text-sm leading-7 text-ink/70">{finding.suggestedSaferWording}</p>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-white py-6 text-center">
          <Bell size={18} className="text-ink/30" aria-hidden="true" />
          <span className="text-sm text-ink/50">لا تنبيهات مراجعة حالياً</span>
        </div>
      )
    },
    {
      key: "assessments" as const,
      icon: <AlertTriangle size={18} aria-hidden="true" />,
      title: "تنبيهات المخاطر والامتثال والجاهزية",
      subtitle: "تظهر تلقائياً عند وجود مخالفة أو ملاحظة خطرة أو انخفاض في الامتثال أو جاهزية النشر.",
      badge: assessmentAlerts.some((a) => a.tone === "danger") ? "متابعة عاجلة" : assessmentAlerts.length ? "متابعة مطلوبة" : "متابعة",
      badgeTone: (assessmentAlerts.some((a) => a.tone === "danger") ? "danger" : assessmentAlerts.length ? "gold" : "neutral") as "good" | "gold" | "danger" | "neutral",
      dotColor: assessmentAlerts.some((a) => a.tone === "danger") ? "bg-red-400" : assessmentAlerts.length ? "bg-gold" : "bg-line",
      content: assessmentAlerts.length ? (
        <div className="space-y-3">
          {assessmentAlerts.slice(0, 5).map((alert, index) => (
            <article key={`${alert.title}-${alert.label}-${index}`} className={`rounded-lg border p-3 text-sm leading-7 ${alert.tone === "danger" ? "border-red-100 bg-red-50 text-red-900" : "border-amber-100 bg-amber-50 text-amber-900"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <b>{alert.title}</b>
                <StatusBadge tone={alert.tone}>{alert.label}</StatusBadge>
              </div>
              <p className="mt-1 text-sm leading-7">{alert.reason}</p>
              {alert.action ? <p className="mt-1 text-sm leading-7 text-ink/70">{alert.action}</p> : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-white py-6 text-center">
          <AlertTriangle size={18} className="text-ink/30" aria-hidden="true" />
          <span className="text-sm text-ink/50">لا مخاطر تحتاج متابعة</span>
        </div>
      )
    },
    {
      key: "references" as const,
      icon: <Settings size={18} aria-hidden="true" />,
      title: "تنبيهات المراجع",
      subtitle: "روابط رسمية مباشرة للمراجع المهنية والنظامية المرتبطة بالملاحظات.",
      badge: "المراجع",
      badgeTone: (referenceAlerts.length ? "neutral" : "good") as "good" | "gold" | "danger" | "neutral",
      dotColor: referenceAlerts.length ? "bg-ink/30" : "bg-palm",
      content: referenceAlerts.length ? (
        <div className="space-y-3">
          {referenceAlerts.map(({ recordTitle, finding }) => (
            <article key={`${recordTitle}-${finding.traceabilityId}-reference`} className="rounded-lg border border-line bg-white p-3 text-sm leading-7 transition-shadow hover:shadow-md">
              <div className="flex items-start gap-3">
                <OfficialLogo entity={officialEntityFromUrl(finding.sourceUrl)} />
                <div className="pt-1">
                  <b>{finding.sourceDocument}</b>
                  <p className="text-xs text-ink/60">{finding.legalReference}</p>
                </div>
              </div>
              <p className="mt-2 text-sm leading-7 text-ink/65">{finding.legalExplanation}</p>
              <a href={finding.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-palm underline">
                فتح المصدر الرسمي <ExternalLink size={13} />
              </a>
            </article>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-white py-6 text-center">
          <Settings size={18} className="text-ink/30" aria-hidden="true" />
          <span className="text-sm text-ink/50">لا تحديثات مرجعية معلقة</span>
        </div>
      )
    }
  ];

  if (!loaded) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="التنبيهات"
          title="التنبيهات"
          description="متابعة الملاحظات المهنية والتنظيمية الفعلية المرتبطة بالمحتوى المحفوظ والمراجع الرسمية المستخدمة في التقييم."
          action={<ButtonLink href="/content-review">فتح المراجعة</ButtonLink>}
        />
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-line bg-white py-16 shadow-sm">
          <DgaSpinner size="lg" />
          <span className="text-sm text-ink/50">جاري تحميل التنبيهات...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="التنبيهات"
        title="التنبيهات"
        description="متابعة الملاحظات المهنية والتنظيمية الفعلية المرتبطة بالمحتوى المحفوظ والمراجع الرسمية المستخدمة في التقييم."
        action={<ButtonLink href="/content-review">فتح المراجعة</ButtonLink>}
      />

      <div className="overflow-hidden rounded-xl border border-line bg-white shadow-sm">
        {sections.map((section, i) => {
          const isOpen = openSection === section.key;
          return (
            <div key={section.key} className="border-b border-line last:border-none">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={`alerts-panel-${section.key}`}
                onClick={() => setOpenSection(isOpen ? null : section.key)}
                className={`flex w-full items-center justify-between gap-3 px-5 py-4 text-right transition focus-ring ${isOpen ? "bg-paper" : "hover:bg-paper/60"}`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <span className={`shrink-0 h-2 w-2 rounded-full ${section.dotColor}`} aria-hidden="true" />
                  <span className="text-sm font-semibold text-ink">{section.title}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge tone={section.badgeTone}>{section.badge}</StatusBadge>
                  <ChevronDown size={16} className={`text-ink/40 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </div>
              </button>

              {isOpen && (
                <div id={`alerts-panel-${section.key}`} role="region">
                  <div className="border-t border-line/60 px-5 py-4 bg-paper/40">
                    <p className="mb-4 text-xs text-ink/50">{section.subtitle}</p>
                    {section.content}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Panel>
        <SectionTitle title="مسارات المتابعة" subtitle="اختصارات لمعالجة سبب التنبيه عند ظهوره." />
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/content-review#findings">مراجعة الملاحظات</ButtonLink>
          <ButtonLink href="/risk-assessment">مؤشرات المخاطر</ButtonLink>
          <ButtonLink href="/administration">إعدادات المراجع</ButtonLink>
        </div>
        <p className="mt-4 flex items-center gap-2 text-xs leading-6 text-ink/55">
          <FileSearch size={14} className="text-palm" />
          تظهر التنبيهات عند توفر مراجعات أو تحديثات فعلية.
        </p>
      </Panel>
    </div>
  );
}
