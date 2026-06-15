"use client";

import { useState } from "react";
import { DataTable, PageHeader, Panel, StatusBadge, WorkflowSteps } from "@/components/ui";
import type { LanguageIssueCategory, ReviewResult } from "@/lib/types";

const categoryLabels: Record<LanguageIssueCategory, string> = {
  spelling: "الإملاء",
  grammar: "النحو والترقيم",
  style: "الأسلوب",
  readability: "المقروئية",
  terminology_consistency: "اتساق المصطلحات"
};

const severityTone = {
  low: "neutral",
  medium: "warn",
  high: "danger",
  critical: "danger"
} as const;

export default function ContentReviewPage() {
  const [text, setText] = useState("لازم الشركة تراجع الاجراءات, لان الموضوع قد يكون مشكلة مشكلة بشكل كبير");
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function runReview() {
    setLoading(true);
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, kind: "ai_response" })
    });
    const payload = await response.json();
    setReview(payload.data);
    setLoading(false);
  }

  return (
    <>
      <PageHeader
        title="مراجعة المحتوى"
        description="تبدأ المراجعة بفحص جودة اللغة العربية، ثم الامتثال القانوني، ثم تقييم المخاطر، ثم الاعتماد، ثم التصدير."
      />

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel>
          <h3 className="mb-4 font-extrabold">نص للمراجعة</h3>
          <textarea
            className="min-h-56 w-full rounded border border-line p-3 leading-7 focus-ring"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <button
            className="mt-4 rounded bg-palm px-5 py-2 text-sm font-bold text-white focus-ring disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            onClick={runReview}
            disabled={loading}
          >
            {loading ? "جار المراجعة..." : "تشغيل المراجعة"}
          </button>
        </Panel>

        <Panel>
          <h3 className="mb-4 font-extrabold">نتيجة جودة اللغة العربية</h3>
          {review ? (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded bg-paper p-4">
                  <p className="text-sm text-ink/60">درجة اللغة</p>
                  <p className="mt-2 text-3xl font-extrabold text-gold">{review.languageQuality.score}%</p>
                </div>
                <div className="rounded bg-paper p-4">
                  <p className="text-sm text-ink/60">حالة اللغة</p>
                  <p className="mt-3">
                    <StatusBadge tone={review.languageQuality.passed ? "good" : "danger"}>
                      {review.languageQuality.passed ? "مجتاز" : "يتطلب تصحيحا"}
                    </StatusBadge>
                  </p>
                </div>
                <div className="rounded bg-paper p-4">
                  <p className="text-sm text-ink/60">السماح بالتصدير</p>
                  <p className="mt-3">
                    <StatusBadge tone={review.exportAllowed ? "good" : "danger"}>
                      {review.exportAllowed ? "مسموح" : "محظور"}
                    </StatusBadge>
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded border border-line bg-paper p-4">
                <p className="mb-2 text-sm font-bold text-ink/70">الصياغة المقترحة</p>
                <p className="leading-8">{review.languageQuality.improvedDraft}</p>
              </div>
            </>
          ) : (
            <p className="leading-7 text-ink/65">أدخل النص وشغل المراجعة لعرض درجة اللغة والملاحظات والتصحيحات.</p>
          )}
        </Panel>
      </div>

      {review ? (
        <>
          <div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <Panel>
              <h3 className="mb-4 font-extrabold">درجات الفئات</h3>
              <DataTable
                headers={["الفئة", "الدرجة"]}
                rows={Object.entries(review.languageQuality.categoryScores).map(([category, score]) => [
                  categoryLabels[category as LanguageIssueCategory],
                  `${score}%`
                ])}
              />
            </Panel>

            <Panel>
              <h3 className="mb-4 font-extrabold">نتيجة الامتثال القانوني</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded bg-paper p-4">
                  <p className="text-sm text-ink/60">درجة الامتثال</p>
                  <p className="mt-2 text-3xl font-extrabold text-gold">{review.complianceScore}%</p>
                </div>
                <div className="rounded bg-paper p-4">
                  <p className="text-sm text-ink/60">مستوى المخاطر</p>
                  <p className="mt-3">
                    <StatusBadge tone={review.riskLevel === "LOW" ? "good" : review.riskLevel === "MEDIUM" ? "warn" : "danger"}>
                      {review.riskLevel}
                    </StatusBadge>
                  </p>
                </div>
              </div>
              <p className="mt-4 leading-7 text-ink/70">{review.summary}</p>
            </Panel>
          </div>

          <div className="mt-5">
            <Panel>
              <h3 className="mb-4 font-extrabold">الملاحظات والتصحيحات المقترحة</h3>
              <DataTable
                headers={["الفئة", "الشدة", "الموضع", "التصحيح المقترح"]}
                rows={review.languageQuality.issues.map((issue) => [
                  categoryLabels[issue.category],
                  <StatusBadge key={issue.id} tone={severityTone[issue.severity]}>{issue.severity}</StatusBadge>,
                  issue.excerpt || "-",
                  issue.suggestion
                ])}
              />
            </Panel>
          </div>

          {review.findings.length > 0 ? (
            <div className="mt-5">
              <Panel>
                <h3 className="mb-4 font-extrabold">ملاحظات الامتثال</h3>
                <DataTable
                  headers={["الملاحظة", "الشدة", "الدليل", "السند النظامي", "الشرح", "الاقتراح"]}
                  rows={review.findings.map((finding) => [
                    finding.issue,
                    <StatusBadge key={finding.evidence} tone="danger">{finding.severity}</StatusBadge>,
                    finding.evidence,
                    `${finding.legalCitation} (${finding.sourceUrl})`,
                    finding.explanation,
                    finding.advice
                  ])}
                />
              </Panel>
            </div>
          ) : null}

          <div className="mt-5">
            <WorkflowSteps steps={review.workflow.map((step) => `${step.label}: ${step.status}`)} />
          </div>
        </>
      ) : null}
    </>
  );
}
