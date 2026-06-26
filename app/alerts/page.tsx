"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, ExternalLink, FileSearch, Settings } from "lucide-react";
import { ButtonLink, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import { OfficialLogo, officialEntityFromUrl } from "@/components/official-logos";
import { loadContentRecords, type StoredContentRecord } from "@/lib/content-record-store";
import type { ReviewFinding, RiskLevel } from "@/lib/types";

const severityRank: Record<RiskLevel, number> = { "حرج": 4, "مرتفع": 3, "متوسط": 2, "منخفض": 1 };
const severeLevels: RiskLevel[] = ["حرج", "مرتفع"];

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

  useEffect(() => {
    setRecords(loadContentRecords());
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
          label: `المخاطر ${review.riskLevel}`,
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
      if (review.publishingReadinessScore < 70 || review.readinessDecision.blockers.length > 0) {
        alerts.push({
          title: record.title,
          label: review.readinessDecision.level,
          tone: review.publishingReadinessScore < 60 ? "danger" : "gold",
          reason: review.readinessDecision.reasons[0] ?? "جاهزية النشر أقل من المستوى المطلوب.",
          action: review.readinessDecision.blockers[0] ?? review.readinessDecision.actions[0]
        });
      }
      return alerts;
    }), [latestReviews]);

  const referenceAlerts = useMemo(() => findingAlerts
    .filter(({ finding }) => finding.sourceUrl)
    .slice(0, 6), [findingAlerts]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="التنبيهات"
        title="التنبيهات"
        description="متابعة الملاحظات المهنية والتنظيمية الفعلية المرتبطة بالمحتوى المحفوظ والمراجع الرسمية المستخدمة في التقييم."
        action={<ButtonLink href="/content-review">فتح المراجعة</ButtonLink>}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel>
          <div className="mb-3 flex items-center justify-between gap-3">
            <Bell className="text-palm" size={22} />
            <StatusBadge tone={findingAlerts.length ? "gold" : "good"}>{findingAlerts.length ? `${findingAlerts.length} ملاحظة` : "حالي"}</StatusBadge>
          </div>
          <SectionTitle title="تنبيهات المراجعة" subtitle="مرتبطة بنتائج مراجعة فعلية محفوظة في الجلسة." />
          {findingAlerts.length ? (
            <div className="space-y-3">
              {findingAlerts.slice(0, 4).map(({ recordTitle, finding }) => (
                <article key={`${recordTitle}-${finding.traceabilityId}`} className="rounded-lg border border-line bg-paper p-3 text-sm leading-7">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <b>{finding.title}</b>
                    <StatusBadge tone={severeLevels.includes(finding.severity) ? "danger" : "gold"}>{finding.severity}</StatusBadge>
                  </div>
                  <p className="mt-1 text-xs text-ink/60">{recordTitle}</p>
                  <p className="mt-2 text-ink/75">الدليل: {finding.evidence}</p>
                  <p className="mt-1 text-palm">الإجراء: {finding.suggestedSaferWording}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-paper py-6 text-center">
              <Bell size={18} className="text-ink/30" />
              <span className="text-sm text-ink/50">لا تنبيهات مراجعة حالياً</span>
            </div>
          )}
        </Panel>

        <Panel>
          <div className="mb-3 flex items-center justify-between gap-3">
            <AlertTriangle className="text-gold" size={22} />
            <StatusBadge tone={assessmentAlerts.some((alert) => alert.tone === "danger") ? "danger" : assessmentAlerts.length ? "gold" : "neutral"}>{assessmentAlerts.length ? "متابعة مطلوبة" : "متابعة"}</StatusBadge>
          </div>
          <SectionTitle title="تنبيهات المخاطر والامتثال والجاهزية" subtitle="تظهر تلقائياً عند وجود مخالفة أو ملاحظة خطرة أو انخفاض في الامتثال أو جاهزية النشر." />
          {assessmentAlerts.length ? (
            <div className="space-y-3">
              {assessmentAlerts.slice(0, 5).map((alert, index) => (
                <article key={`${alert.title}-${alert.label}-${index}`} className={`rounded-lg border p-3 text-sm leading-7 ${alert.tone === "danger" ? "border-red-100 bg-red-50 text-red-900" : "border-amber-100 bg-amber-50 text-amber-900"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <b>{alert.title}</b>
                    <StatusBadge tone={alert.tone}>{alert.label}</StatusBadge>
                  </div>
                  <p className="mt-2">{alert.reason}</p>
                  {alert.action ? <p className="mt-1 text-xs">الإجراء: {alert.action}</p> : null}
                </article>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-paper py-6 text-center">
              <AlertTriangle size={18} className="text-ink/30" />
              <span className="text-sm text-ink/50">لا مخاطر تحتاج متابعة</span>
            </div>
          )}
        </Panel>

        <Panel>
          <div className="mb-3 flex items-center justify-between gap-3">
            <Settings className="text-palm" size={22} />
            <StatusBadge tone={referenceAlerts.length ? "neutral" : "good"}>المراجع</StatusBadge>
          </div>
          <SectionTitle title="تنبيهات المراجع" subtitle="روابط رسمية مباشرة للمراجع المهنية والنظامية المرتبطة بالملاحظات." />
          {referenceAlerts.length ? (
            <div className="space-y-3">
              {referenceAlerts.map(({ recordTitle, finding }) => (
                <article key={`${recordTitle}-${finding.traceabilityId}-reference`} className="rounded-lg border border-line p-3 text-sm leading-7">
                  <div className="flex items-start gap-3">
                    <OfficialLogo entity={officialEntityFromUrl(finding.sourceUrl)} />
                    <div className="pt-1">
                      <b>{finding.sourceDocument}</b>
                      <p className="text-xs text-ink/60">{finding.legalReference}</p>
                    </div>
                  </div>
                  <p className="mt-1 text-ink/70">{finding.legalExplanation}</p>
                  <a href={finding.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-palm underline">
                    فتح المصدر الرسمي <ExternalLink size={13} />
                  </a>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-paper py-6 text-center">
              <Settings size={18} className="text-ink/30" />
              <span className="text-sm text-ink/50">لا تحديثات مرجعية معلقة</span>
            </div>
          )}
        </Panel>
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
