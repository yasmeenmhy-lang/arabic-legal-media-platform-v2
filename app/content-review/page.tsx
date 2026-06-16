"use client";

import { useMemo, useState } from "react";
import { Download, FileText, Link2, Share2 } from "lucide-react";
import { DataTable, PageHeader, Panel, StatusBadge, WorkflowSteps } from "@/components/ui";
import { advisoryDisclaimer } from "@/lib/governance";
import type { ContentKind, LanguageIssueCategory, LanguageIssueSeverity, ReviewResult, RiskLevel } from "@/lib/types";

const contentTypes: Array<{ value: ContentKind; label: string }> = [
  { value: "post", label: "منشور إعلامي" },
  { value: "advertisement", label: "محتوى إعلاني" },
  { value: "campaign", label: "حملة إعلامية أو إعلانية" },
  { value: "article", label: "مقال" },
  { value: "script", label: "نص فيديو" },
  { value: "caption", label: "تعليق قصير" },
  { value: "visual_content", label: "محتوى بصري" },
  { value: "infographic", label: "إنفوجرافيك" },
  { value: "publishing_plan", label: "خطة نشر" }
];

const channels = ["LinkedIn", "X", "Instagram", "TikTok", "Snapchat", "YouTube Shorts", "الموقع الإلكتروني", "قناة أخرى"];

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

const severityLabels: Record<LanguageIssueSeverity, string> = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
  critical: "حرجة"
};

const riskLabels: Record<RiskLevel, string> = {
  LOW: "منخفض",
  MEDIUM: "متوسط",
  HIGH: "عال",
  CRITICAL: "حرج"
};

const workflowStatusLabels = {
  pending: "قيد المتابعة",
  blocked: "يتطلب معالجة الملاحظات",
  passed: "مستوى مناسب",
  failed: "يتطلب تحسيناً"
} as const;

function readinessTone(review: ReviewResult) {
  if (review.exportAllowed) return "good";
  if (review.riskLevel === "LOW" || review.riskLevel === "MEDIUM") return "warn";
  return "danger";
}

function buildExportPayload(review: ReviewResult, text: string, context: Record<string, string>) {
  return {
    title: "تقرير مراجعة المحتوى الإعلامي والإعلاني",
    reviewedContent: text,
    context,
    result: {
      languageQualityScore: review.languageQuality.score,
      complianceScore: review.complianceScore,
      riskLevel: review.riskLevel,
      publishingReadiness: review.exportAllowed ? "مناسب للتصدير وفق نتائج المراجعة" : "يتطلب معالجة الملاحظات",
      executiveSummary: review.summary,
      observationsCount: review.findings.length,
      improvementOpportunitiesCount: review.languageQuality.issues.length
    },
    references: review.findings.map((finding) => ({
      observation: finding.issue,
      source: finding.sourceDocument,
      articleOrRule: finding.ruleOrArticleNumber,
      officialLink: finding.sourceUrl
    })),
    advisoryNote: review.advisoryDisclaimer
  };
}

export default function ContentReviewPage() {
  const [text, setText] = useState("يجب مراجعة صياغة الإعلان قبل نشره لأنه يتضمن وعداً بنتيجة مضمونة للعميل.");
  const [kind, setKind] = useState<ContentKind>("post");
  const [audience, setAudience] = useState("عملاء محتملون من الأفراد");
  const [channel, setChannel] = useState("LinkedIn");
  const [purpose, setPurpose] = useState("رفع الوعي بالخدمات المهنية دون تقديم وعود أو نتائج قطعية");
  const [fileName, setFileName] = useState("");
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportMessage, setExportMessage] = useState("");

  const selectedKind = contentTypes.find((item) => item.value === kind)?.label ?? "محتوى إعلامي";
  const context = useMemo(
    () => ({ "نوع المحتوى": selectedKind, "الجمهور المستهدف": audience, "القناة": channel, "الغرض": purpose, "الملف المرفق": fileName || "لا يوجد" }),
    [audience, channel, fileName, purpose, selectedKind]
  );

  async function runReview() {
    setLoading(true);
    setExportMessage("");
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, kind })
    });
    const payload = await response.json();
    setReview(payload.data);
    setLoading(false);
  }

  async function copyReviewPackage() {
    if (!review) return;
    await navigator.clipboard.writeText(JSON.stringify(buildExportPayload(review, text, context), null, 2));
    setExportMessage("تم نسخ تقرير المراجعة وبيانات التصدير.");
  }

  function downloadReviewPackage() {
    if (!review) return;
    const payload = buildExportPayload(review, text, context);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "media-content-review-package.json";
    link.click();
    URL.revokeObjectURL(url);
    setExportMessage("تم تجهيز حزمة التصدير وفق نتائج المراجعة.");
  }

  const planningSuggestions = [
    ["توقيت مقترح", "بعد معالجة الملاحظات ذات الأولوية العالية ومراجعة الصياغة النهائية."],
    ["قناة مقترحة", channel],
    ["اتجاه الرسالة", "صياغة مهنية تثقيفية تركّز على الوعي والالتزامات دون وعود بنتائج."],
    ["ملاحظة تخطيطية", "يفضل ربط النشر بسياق توعوي أو موسمي وتجنب العبارات الترويجية المطلقة."]
  ];

  return (
    <>
      <PageHeader
        title="مراجعة المحتوى الإعلامي والإعلاني"
        description="مسار موحد لمراجعة جودة اللغة والصياغة، ملاحظات الامتثال، مؤشرات المخاطر، فرص التحسين، المراجع المهنية والتنظيمية، جاهزية النشر، ودعم التصدير."
      />

      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <Panel>
          <h3 className="mb-4 font-extrabold">بيانات المراجعة</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-bold">
              نوع المحتوى
              <select className="mt-2 w-full rounded border border-line bg-white px-3 py-2 focus-ring" value={kind} onChange={(event) => setKind(event.target.value as ContentKind)}>
                {contentTypes.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-bold">
              القناة
              <select className="mt-2 w-full rounded border border-line bg-white px-3 py-2 focus-ring" value={channel} onChange={(event) => setChannel(event.target.value)}>
                {channels.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-bold sm:col-span-2">
              الجمهور المستهدف
              <input className="mt-2 w-full rounded border border-line px-3 py-2 focus-ring" value={audience} onChange={(event) => setAudience(event.target.value)} />
            </label>
            <label className="text-sm font-bold sm:col-span-2">
              الغرض من المحتوى
              <input className="mt-2 w-full rounded border border-line px-3 py-2 focus-ring" value={purpose} onChange={(event) => setPurpose(event.target.value)} />
            </label>
            <label className="text-sm font-bold sm:col-span-2">
              ملف داعم للمراجعة
              <input
                className="mt-2 w-full rounded border border-line px-3 py-2 text-sm focus-ring"
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
              />
              <span className="mt-2 block text-xs leading-6 text-ink/55">
                يمكن إرفاق ملف داعم لتوثيق سياق المراجعة. تتم مراجعة النص المدخل في هذه المرحلة، وتظهر المرفقات ضمن بيانات التقرير.
              </span>
            </label>
          </div>

          <label className="mt-4 block text-sm font-bold">
            المحتوى محل المراجعة
            <textarea className="mt-2 min-h-56 w-full rounded border border-line p-3 leading-7 focus-ring" value={text} onChange={(event) => setText(event.target.value)} />
          </label>
          <button
            className="mt-4 inline-flex items-center gap-2 rounded bg-palm px-5 py-2 text-sm font-bold text-white focus-ring disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
            onClick={runReview}
            disabled={loading || text.trim().length < 5}
          >
            <FileText size={16} />
            {loading ? "جار تحليل المحتوى..." : "تحليل المحتوى"}
          </button>
        </Panel>

        <Panel>
          <h3 className="mb-4 font-extrabold">ملخص تنفيذي لنتيجة المراجعة</h3>
          {review ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded bg-paper p-4">
                  <p className="text-sm text-ink/60">جودة اللغة</p>
                  <p className="mt-2 text-3xl font-extrabold text-gold">{review.languageQuality.score}%</p>
                </div>
                <div className="rounded bg-paper p-4">
                  <p className="text-sm text-ink/60">مستوى الامتثال</p>
                  <p className="mt-2 text-3xl font-extrabold text-gold">{review.complianceScore}%</p>
                </div>
                <div className="rounded bg-paper p-4">
                  <p className="text-sm text-ink/60">مستوى المخاطر</p>
                  <p className="mt-3">
                    <StatusBadge tone={review.riskLevel === "LOW" ? "good" : review.riskLevel === "MEDIUM" ? "warn" : "danger"}>{riskLabels[review.riskLevel]}</StatusBadge>
                  </p>
                </div>
                <div className="rounded bg-paper p-4">
                  <p className="text-sm text-ink/60">جاهزية النشر</p>
                  <p className="mt-3">
                    <StatusBadge tone={readinessTone(review)}>
                      {review.exportAllowed ? "مناسب للتصدير وفق نتائج المراجعة" : "يتطلب معالجة الملاحظات"}
                    </StatusBadge>
                  </p>
                </div>
              </div>
              <p className="mt-4 leading-8 text-ink/70">{review.summary}</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded border border-line p-3 text-sm">
                  <span className="text-ink/55">ملاحظات الامتثال</span>
                  <p className="mt-1 text-xl font-extrabold">{review.findings.length}</p>
                </div>
                <div className="rounded border border-line p-3 text-sm">
                  <span className="text-ink/55">فرص التحسين</span>
                  <p className="mt-1 text-xl font-extrabold">{review.languageQuality.issues.length}</p>
                </div>
                <div className="rounded border border-line p-3 text-sm">
                  <span className="text-ink/55">المراجع ذات الصلة</span>
                  <p className="mt-1 text-xl font-extrabold">{review.findings.length}</p>
                </div>
              </div>
            </>
          ) : (
            <p className="leading-7 text-ink/65">أدخل بيانات المحتوى ثم ابدأ التحليل لعرض نتيجة موحدة تشمل الامتثال، المخاطر، فرص التحسين، المراجع، جاهزية النشر، والتصدير.</p>
          )}
        </Panel>
      </div>

      {review ? (
        <>
          <div className="mt-5">
            <Panel>
              <h3 className="mb-4 font-extrabold">مسار نتيجة المراجعة</h3>
              <WorkflowSteps steps={review.workflow.map((step) => `${step.label}: ${workflowStatusLabels[step.status]}`)} />
            </Panel>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <Panel>
              <h3 className="mb-4 font-extrabold">جودة اللغة والصياغة</h3>
              <DataTable
                headers={["الفئة", "الدرجة"]}
                rows={Object.entries(review.languageQuality.categoryScores).map(([category, score]) => [categoryLabels[category as LanguageIssueCategory], `${score}%`])}
              />
              <div className="mt-4 rounded border border-line bg-paper p-4">
                <p className="mb-2 text-sm font-bold text-ink/70">صياغة محسنة مقترحة</p>
                <p className="leading-8">{review.languageQuality.improvedDraft}</p>
              </div>
            </Panel>

            <Panel>
              <h3 className="mb-4 font-extrabold">فرص التحسين</h3>
              <DataTable
                headers={["الفئة", "الأولوية", "الموضع", "اتجاه التحسين"]}
                rows={review.languageQuality.issues.length > 0 ? review.languageQuality.issues.map((issue) => [
                  categoryLabels[issue.category],
                  <StatusBadge key={issue.id} tone={severityTone[issue.severity]}>{severityLabels[issue.severity]}</StatusBadge>,
                  issue.excerpt || "-",
                  issue.suggestion
                ]) : [["لا توجد ملاحظات لغوية مؤثرة", <StatusBadge key="ok" tone="good">مناسب</StatusBadge>, "-", "يمكن الانتقال إلى مراجعة الامتثال والمخاطر."]]}
              />
            </Panel>
          </div>

          <div className="mt-5">
            <Panel>
              <h3 className="mb-4 font-extrabold">ملاحظات الامتثال ومؤشرات المخاطر والمراجع المهنية</h3>
              <DataTable
                headers={["الملاحظة", "مستوى المخاطر", "الموضع", "المرجع الرسمي", "المادة أو القاعدة", "الأثر المحتمل", "اتجاه التحسين"]}
                rows={review.findings.length > 0 ? review.findings.map((finding) => [
                  finding.issue,
                  <StatusBadge key={finding.evidence} tone="danger">{riskLabels[finding.severity]}</StatusBadge>,
                  finding.evidence,
                  <a key={finding.sourceUrl} href={finding.sourceUrl} target="_blank" rel="noreferrer" className="font-bold text-palm underline">{finding.sourceDocument}</a>,
                  finding.ruleOrArticleNumber,
                  finding.explanation,
                  finding.advice
                ]) : [["لا توجد ملاحظات امتثال عالية الأثر", <StatusBadge key="low" tone="good">منخفض</StatusBadge>, "-", "المراجع المهنية والتنظيمية المسجلة في قاعدة المعرفة", "-", "لا تظهر مؤشرات مخالفة واضحة في النص المدخل.", "استمر في الحفاظ على صياغة مهنية غير قطعية."]]}
              />
            </Panel>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <Panel>
              <h3 className="mb-4 font-extrabold">مقترحات التخطيط الإعلامي</h3>
              <DataTable headers={["البند", "المقترح"]} rows={planningSuggestions} />
            </Panel>

            <Panel>
              <h3 className="mb-4 font-extrabold">دعم التصدير والمشاركة</h3>
              <p className="text-sm leading-7 text-ink/65">
                يتاح تجهيز حزمة التصدير بعد عرض نتيجة المراجعة. تتضمن الحزمة ملخص النتيجة، ملاحظات الامتثال، مؤشرات المخاطر، المراجع ذات الصلة، وحالة جاهزية النشر.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" onClick={copyReviewPackage} className="inline-flex items-center gap-2 rounded border border-line bg-white px-4 py-2 text-sm font-bold focus-ring">
                  <Link2 size={16} />
                  نسخ تقرير المراجعة
                </button>
                <button type="button" onClick={downloadReviewPackage} className="inline-flex items-center gap-2 rounded bg-palm px-4 py-2 text-sm font-bold text-white focus-ring">
                  <Download size={16} />
                  تنزيل حزمة التصدير
                </button>
                <button type="button" onClick={copyReviewPackage} className="inline-flex items-center gap-2 rounded border border-line bg-white px-4 py-2 text-sm font-bold focus-ring">
                  <Share2 size={16} />
                  تجهيز بيانات المشاركة
                </button>
              </div>
              {exportMessage ? <p className="mt-3 text-sm font-bold text-palm">{exportMessage}</p> : null}
            </Panel>
          </div>

          <div className="mt-5 rounded border border-line bg-white p-4 text-xs leading-6 text-ink/65">{advisoryDisclaimer}</div>
        </>
      ) : null}
    </>
  );
}
