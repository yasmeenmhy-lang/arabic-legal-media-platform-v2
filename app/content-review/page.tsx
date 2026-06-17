"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Download, FileText, Link2, Share2 } from "lucide-react";
import { BarList, DataTable, ModuleTabs, PageHeader, Panel, ScoreCard, SectionTitle, StatusBadge, WorkflowSteps } from "@/components/ui";
import { saveLatestReviewSnapshot } from "@/components/review-context-summary";
import { advisoryDisclaimer } from "@/lib/governance";
import { contentKindOptions } from "@/lib/content-types";
import type { ContentKind, LanguageIssueCategory, LanguageIssueSeverity, ReviewResult, RiskLevel } from "@/lib/types";

const contentTypes = contentKindOptions.filter((item) =>
  (["post", "advertisement", "campaign", "article", "script", "caption", "visual_content", "infographic", "publishing_plan"] as ContentKind[]).includes(item.value)
);

const channels = ["LinkedIn", "X", "Instagram", "TikTok", "Snapchat", "YouTube", "الموقع الإلكتروني", "قناة أخرى"];

const audienceOptions = [
  "عملاء محتملون من الأفراد",
  "منشآت ورواد أعمال",
  "عملاء قائمون",
  "زملاء وقطاع قانوني",
  "الجمهور العام",
  "أخرى"
];

const purposeOptions = [
  "رفع الوعي بالخدمات المهنية دون تقديم وعود أو نتائج قطعية",
  "تثقيف الجمهور حول موضوع قانوني",
  "الترويج لخدمة جديدة ضمن الأطر المهنية المسموحة",
  "تعزيز الحضور المهني والثقة",
  "دعوة لاستشارة أو تواصل مهني هادئ",
  "أخرى"
];

const categoryLabels: Record<LanguageIssueCategory, string> = {
  spelling: "الإملاء",
  grammar: "النحو والترقيم",
  style: "الأسلوب المهني",
  readability: "وضوح القراءة",
  "اتساق المصطلحات": "اتساق المصطلحات"
};

const severityTone: Record<LanguageIssueSeverity, "neutral" | "good" | "gold"> = {
  low: "neutral",
  medium: "neutral",
  high: "gold",
  critical: "gold"
};

const severityLabels: Record<LanguageIssueSeverity, string> = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
  critical: "حرجة"
};

const workflowStatusLabels = {
  pending: "قيد المتابعة",
  blocked: "يتطلب معالجة الملاحظات",
  passed: "مستوى مناسب",
  failed: "يتطلب تحسيناً"
} as const;

function toneFromScore(value: number) {
  if (value >= 85) return "good" as const;
  if (value >= 70) return "neutral" as const;
  return "gold" as const;
}

function toneFromRisk(risk: RiskLevel) {
  if (risk === "منخفض") return "good" as const;
  if (risk === "متوسط") return "neutral" as const;
  return "gold" as const;
}

function buildExportPayload(review: ReviewResult, context: Record<string, string>) {
  return {
    عنوان: "تقرير مراجعة المحتوى الإعلامي والإعلاني",
    سياق_المراجعة: {
      معرف_المراجعة: review.reviewContext.reviewId,
      مقتطف_مختصر: review.reviewContext.shortExcerpt,
      ...context
    },
    نتيجة_المراجعة: {
      جودة_المحتوى: review.languageQuality.score,
      مستوى_الامتثال: review.complianceScore,
      مستوى_المخاطر: review.riskLevel,
      جاهزية_النشر: review.exportAllowed ? "مناسب للتصدير وفق نتائج المراجعة" : "يتطلب معالجة الملاحظات",
      درجة_جاهزية_النشر: review.publishingReadinessScore,
      الملخص_التنفيذي: review.summary,
      عدد_ملاحظات_الامتثال: review.findings.length,
      عدد_فرص_التحسين: review.languageQuality.issues.length
    },
    المراجع_الرسمية: review.findings.map((finding) => ({
      الملاحظة: finding.issue,
      المصدر: finding.sourceDocument,
      المرجع_النظامي: finding.legalReference,
      عنوان_المرجع: finding.articleTitle,
      مقتطف_النص: finding.articleTextExcerpt,
      مستوى_الثقة: finding.confidenceLevel,
      الرابط_الرسمي: finding.sourceUrl
    })),
    ملاحظة_استرشادية: review.advisoryDisclaimer
  };
}

function ReadableBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="w-full max-w-full border-b border-line/70 pb-3 last:border-b-0 last:pb-0">
      <p className="mb-1 text-xs font-normal leading-6 text-ink/55">{label}</p>
      <div className="text-sm leading-8 text-ink">{children}</div>
    </div>
  );
}

function LanguageQualityMobile({ review }: { review: ReviewResult }) {
  return (
    <div className="space-y-4 md:hidden">
      {Object.entries(review.languageQuality.categoryScores).map(([category, score]) => (
        <article key={category} className="w-full rounded-lg border border-line bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-normal text-ink">{categoryLabels[category as LanguageIssueCategory]}</p>
            <span className="shrink-0 rounded-md bg-mint px-3 py-1 text-sm font-normal text-palm">{score}%</span>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-paper">
            <div className="h-full rounded-full bg-palm/80" style={{ width: `${score}%` }} />
          </div>
        </article>
      ))}
      <article className="w-full rounded-lg border border-line bg-paper p-4">
        <p className="mb-2 text-sm font-normal text-ink">صياغة محسنة مقترحة</p>
        <p className="text-sm leading-8 text-ink/75">{review.languageQuality.improvedDraft}</p>
      </article>
    </div>
  );
}

function ReviewContextHeader({
  review,
  contentType,
  channel
}: {
  review: ReviewResult;
  contentType: string;
  channel: string;
}) {
  return (
    <section id="review-results" className="mt-6 rounded-lg border border-line bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-normal leading-6 text-palm">سياق المراجعة الحالية</p>
          <p className="mt-1 text-sm font-normal leading-7 text-ink">{review.reviewContext.reviewId}</p>
          <p className="mt-1 text-sm leading-7 text-ink/75">{review.reviewContext.shortExcerpt || "محتوى إعلامي أو إعلاني محل المراجعة"}</p>
        </div>
        <div className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-5 xl:min-w-[720px]">
          <div className="rounded-md bg-paper p-3"><span className="block text-ink/50">نوع المحتوى</span><strong className="mt-1 block font-normal text-ink">{contentType}</strong></div>
          <div className="rounded-md bg-paper p-3"><span className="block text-ink/50">القناة</span><strong className="mt-1 block font-normal text-ink">{channel}</strong></div>
          <div className="rounded-md bg-paper p-3"><span className="block text-ink/50">مستوى المخاطر</span><strong className="mt-1 block font-normal text-ink">{review.riskLevel}</strong></div>
          <div className="rounded-md bg-paper p-3"><span className="block text-ink/50">الامتثال</span><strong className="mt-1 block font-normal text-ink">{review.complianceScore}%</strong></div>
          <div className="rounded-md bg-paper p-3"><span className="block text-ink/50">جاهزية النشر</span><strong className="mt-1 block font-normal text-ink">{review.publishingReadinessScore}%</strong></div>
        </div>
      </div>
      <nav className="mt-4 flex flex-wrap gap-2 text-xs">
        {[
          ["#language-quality", "جودة اللغة"],
          ["#opportunities", "فرص التحسين"],
          ["#findings", "الملاحظات"],
          ["#references", "المراجع"],
          ["#recommendations", "التوصيات"],
          ["#export", "التصدير"]
        ].map(([href, label]) => (
          <a key={href} href={href} className="rounded-md border border-line bg-paper px-3 py-2 text-ink/70 transition hover:border-palm hover:text-palm focus-ring">
            {label}
          </a>
        ))}
      </nav>
    </section>
  );
}

function OpportunityCards({ review }: { review: ReviewResult }) {
  const issues = review.languageQuality.issues;
  return (
    <div className="space-y-5">
      {issues.length > 0 ? issues.map((issue) => (
        <article key={issue.id} className="w-full rounded-lg border border-line bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <p className="text-sm font-normal leading-7 text-ink">{categoryLabels[issue.category]} - ملاحظة تحسين صياغي غير مرتبطة بمرجع نظامي محدد.</p>
            <StatusBadge tone={severityTone[issue.severity]}>{severityLabels[issue.severity]}</StatusBadge>
          </div>
          <div className="space-y-4">
            <ReadableBlock label="الموضع">{issue.excerpt || "-"}</ReadableBlock>
            <ReadableBlock label="اتجاه التحسين">{issue.suggestion}</ReadableBlock>
          </div>
        </article>
      )) : (
        <article className="w-full rounded-lg border border-line bg-white p-4">
          <div className="mb-3"><StatusBadge tone="good">مناسب</StatusBadge></div>
          <p className="text-sm leading-8 text-ink/75">لا توجد ملاحظات لغوية مؤثرة. يمكن الانتقال إلى مراجعة الامتثال والمخاطر.</p>
        </article>
      )}
    </div>
  );
}

function FindingCards({ review }: { review: ReviewResult }) {
  return (
    <div className="space-y-5">
      {review.findings.length > 0 ? review.findings.map((finding) => (
        <article key={`${finding.legalKnowledgeEntryId}-${finding.evidence}`} className="w-full rounded-lg border border-line bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base font-normal leading-8 text-ink">{finding.issue}</p>
              <p className="mt-1 text-sm leading-7 text-ink/55">{finding.legalReference} - {finding.articleTitle}</p>
            </div>
            <StatusBadge tone={toneFromRisk(finding.severity)}>{finding.severity}</StatusBadge>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ReadableBlock label="العبارة محل المراجعة">{finding.evidence}</ReadableBlock>
            <ReadableBlock label="المصدر القانوني">
              <a href={finding.sourceUrl} target="_blank" rel="noreferrer" className="font-normal text-palm underline underline-offset-4">{finding.sourceDocument}</a>
            </ReadableBlock>
            <ReadableBlock label="مقتطف المرجع النظامي">{finding.articleTextExcerpt}</ReadableBlock>
            <ReadableBlock label="الشرح القانوني">
              {finding.legalExplanation} نتيجة الفحص: {finding.reviewOutcome}. مستوى الثقة: {finding.confidenceLevel}.
            </ReadableBlock>
            <ReadableBlock label="التوصية">{finding.suggestedSaferWording}</ReadableBlock>
          </div>
        </article>
      )) : (
        <article className="w-full rounded-lg border border-line bg-white p-4">
          <div className="mb-3"><StatusBadge tone="good">منخفض</StatusBadge></div>
          <p className="text-sm leading-8 text-ink/75">{review.summary}</p>
          <p className="mt-3 text-sm leading-8 text-ink/75">استمر في الحفاظ على صياغة مهنية غير قطعية.</p>
        </article>
      )}
    </div>
  );
}

function ReferencesMobile({ review }: { review: ReviewResult }) {
  return (
    <div className="space-y-4">
      {review.referencesPanel.length > 0 ? review.referencesPanel.map((reference) => (
        <article key={`${reference.sourceDocument}-${reference.legalReference}`} className="w-full rounded-lg border border-line bg-white p-4">
          <div className="space-y-4">
            <ReadableBlock label="المصدر">{reference.sourceDocument}</ReadableBlock>
            <ReadableBlock label="المرجع النظامي">{reference.legalReference}</ReadableBlock>
            <ReadableBlock label="عنوان المرجع">{reference.articleTitle}</ReadableBlock>
            <ReadableBlock label="مقتطف النص">{reference.articleTextExcerpt}</ReadableBlock>
            <ReadableBlock label="الرابط الرسمي">
              <a href={reference.sourceUrl} target="_blank" rel="noreferrer" className="font-normal text-palm underline underline-offset-4">فتح المصدر الرسمي</a>
            </ReadableBlock>
          </div>
        </article>
      )) : (
        <article className="w-full rounded-lg border border-line bg-white p-4">
          <p className="text-sm leading-8 text-ink/75">{review.summary}</p>
        </article>
      )}
    </div>
  );
}

function RecommendationCards({ items }: { items: string[][] }) {
  return (
    <div className="space-y-4">
      {items.map(([label, value]) => (
        <article key={label} className="w-full rounded-lg border border-line bg-white p-4">
          <ReadableBlock label={label}>{value}</ReadableBlock>
        </article>
      ))}
    </div>
  );
}

export default function ContentReviewPage() {
  const [text, setText] = useState("");
  const [kind, setKind] = useState<ContentKind>("advertisement");
  const [audienceChoice, setAudienceChoice] = useState(audienceOptions[0]);
  const [audienceOther, setAudienceOther] = useState("");
  const [channel, setChannel] = useState("لينكدإن");
  const [purposeChoice, setPurposeChoice] = useState(purposeOptions[0]);
  const [purposeOther, setPurposeOther] = useState("");
  const [fileName, setFileName] = useState("");
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportMessage, setExportMessage] = useState("");

  const audience = audienceChoice === "أخرى" ? audienceOther : audienceChoice;
  const purpose = purposeChoice === "أخرى" ? purposeOther : purposeChoice;
  const selectedKind = contentTypes.find((item) => item.value === kind)?.label ?? "محتوى إعلامي";
  const context = useMemo(
    () => ({
      "نوع المحتوى": selectedKind,
      "الجمهور المستهدف": audience,
      القناة: channel,
      الغرض: purpose,
      "الملف الداعم": fileName || "لا يوجد"
    }),
    [audience, channel, fileName, purpose, selectedKind]
  );

  async function runReview() {
    setLoading(true);
    setExportMessage("");
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, kind, contentType: selectedKind, channel, audience, purpose })
    });
    const payload = await response.json();
    setReview(payload.data);
    if (payload.data?.reviewContext) saveLatestReviewSnapshot(payload.data);
    setLoading(false);
  }

  async function copyReviewPackage() {
    if (!review) return;
    await navigator.clipboard.writeText(JSON.stringify(buildExportPayload(review, context), null, 2));
    setExportMessage("تم نسخ تقرير المراجعة وبيانات التصدير.");
  }

  function downloadReviewPackage() {
    if (!review) return;
    const payload = buildExportPayload(review, context);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "حزمة-مراجعة-المحتوى.json";
    link.click();
    URL.revokeObjectURL(url);
    setExportMessage("تم تجهيز حزمة التصدير وفق نتائج المراجعة.");
  }

  const planningSuggestions = [
    ["توقيت مقترح", "بعد معالجة الملاحظات ذات الأولوية العالية ومراجعة الصياغة النهائية."],
    ["قناة مقترحة", channel],
    ["اتجاه الرسالة", "صياغة تثقيفية تركّز على الوعي والالتزامات دون وعود بنتائج."],
    ["ملاحظة تخطيطية", "يفضل ربط النشر بسياق توعوي وتجنب العبارات الترويجية المطلقة."]
  ];

  return (
    <>
      <PageHeader
        eyebrow="المراجعة"
        title="المراجعة"
        description="تجربة موحدة تعرض جودة الصياغة، ملاحظات الامتثال، مؤشرات المخاطر، فرص التحسين، المراجع الرسمية، جاهزية النشر، ودعم التصدير في تقرير تنفيذي واحد."
      />

      <ModuleTabs
        items={[
          { label: "إدخال المحتوى", href: "#input", active: !review },
          { label: "النتائج التنفيذية", href: "#results", active: Boolean(review) },
          { label: "الملاحظات", href: "#findings" },
          { label: "المخاطر", href: "#risk" },
          { label: "فرص التحسين", href: "#opportunities" },
          { label: "المراجع", href: "#references" },
          { label: "التصدير", href: "#export" }
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
        <Panel id="input">
          <SectionTitle title="بيانات المحتوى" subtitle="تساعد هذه البيانات على ضبط سياق المراجعة وملاءمة القناة والجمهور." />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-normal">
              نوع المحتوى
              <select className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 focus-ring" value={kind} onChange={(event) => setKind(event.target.value as ContentKind)}>
                {contentTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="text-sm font-normal">
              القناة
              <select className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 focus-ring" value={channel} onChange={(event) => setChannel(event.target.value)}>
                {channels.map((item) => <option key={item}>{item}</option>)}
              </select>
            </label>
            <label className="text-sm font-normal sm:col-span-2">
              الجمهور المستهدف
              <select className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 focus-ring" value={audienceChoice} onChange={(event) => setAudienceChoice(event.target.value)}>
                {audienceOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              {audienceChoice === "أخرى" ? (
                <input
                  className="mt-2 w-full rounded-md border border-line px-3 py-2.5 focus-ring"
                  placeholder="حدد الجمهور المستهدف"
                  value={audienceOther}
                  onChange={(event) => setAudienceOther(event.target.value)}
                />
              ) : null}
            </label>
            <label className="text-sm font-normal sm:col-span-2">
              الغرض من المحتوى
              <select className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 focus-ring" value={purposeChoice} onChange={(event) => setPurposeChoice(event.target.value)}>
                {purposeOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              {purposeChoice === "أخرى" ? (
                <input
                  className="mt-2 w-full rounded-md border border-line px-3 py-2.5 focus-ring"
                  placeholder="حدد الغرض من المحتوى"
                  value={purposeOther}
                  onChange={(event) => setPurposeOther(event.target.value)}
                />
              ) : null}
            </label>
            <label className="text-sm font-normal sm:col-span-2">
              ملف داعم
              <input className="mt-2 w-full rounded-md border border-line px-3 py-2.5 text-sm focus-ring" type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} />
              <span className="mt-2 block text-xs leading-6 text-ink/55">تظهر بيانات الملف ضمن تقرير المراجعة لتوثيق السياق.</span>
            </label>
          </div>

          <label className="mt-4 block text-sm font-normal">
            المحتوى محل المراجعة
            <textarea className="mt-2 min-h-56 w-full rounded-md border border-line p-3 leading-8 focus-ring" value={text} onChange={(event) => setText(event.target.value)} />
          </label>
          <button className="mt-4 inline-flex items-center gap-2 rounded-md bg-palm px-5 py-2.5 text-sm font-normal text-white focus-ring disabled:cursor-not-allowed disabled:opacity-60" type="button" onClick={runReview} disabled={loading || text.trim().length < 5}>
            <FileText size={16} />
            {loading ? "جار تحليل المحتوى..." : "تحليل المحتوى"}
          </button>
        </Panel>

        <Panel id="results">
          <SectionTitle title="تقرير المراجعة التنفيذي" subtitle="ملخص بصري سريع قبل تفاصيل الملاحظات والمراجع." />
          {review ? (
            <>
              <div className="grid gap-3 md:grid-cols-3">
                <ScoreCard label="جودة المحتوى" value={review.languageQuality.score} tone={toneFromScore(review.languageQuality.score)} detail="لغة وصياغة ومقروئية" />
                <ScoreCard label="مستوى الامتثال" value={review.complianceScore} tone={toneFromScore(review.complianceScore)} detail="محسوب من ملاحظات مرتبطة بمواد ومراجع رسمية" />
                <div className="rounded-lg border border-line bg-white p-4">
                  <p className="text-sm font-normal text-ink">جاهزية النشر</p>
                  <div className="mt-3">
                    <StatusBadge tone={review.exportAllowed ? "good" : toneFromRisk(review.riskLevel)}>
                      {review.exportAllowed ? "مناسب للتصدير وفق نتائج المراجعة" : "يتطلب معالجة الملاحظات"}
                    </StatusBadge>
                  </div>
                  <p className="mt-4 text-xs leading-6 text-ink/60">مستوى المخاطر: <span className="font-normal">{review.riskLevel}</span></p>
                </div>
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
                <div className="rounded-lg border border-line bg-paper p-4">
                  <p className="text-sm font-normal text-ink">الملخص التنفيذي</p>
                  <p className="mt-2 leading-8 text-ink/75">{review.summary}</p>
                </div>
                <BarList
                  items={[
                    { label: "جودة اللغة", value: review.languageQuality.score },
                    { label: "مستوى الامتثال", value: review.complianceScore },
                    { label: "جاهزية النشر", value: review.publishingReadinessScore }
                  ]}
                  tone={review.exportAllowed ? "good" : "neutral"}
                />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-line p-3"><span className="text-xs text-ink/55">ملاحظات الامتثال</span><p className="mt-1 text-2xl font-normal">{review.findings.length}</p></div>
                <div className="rounded-lg border border-line p-3"><span className="text-xs text-ink/55">فرص التحسين</span><p className="mt-1 text-2xl font-normal">{review.languageQuality.issues.length}</p></div>
                <div className="rounded-lg border border-line p-3"><span className="text-xs text-ink/55">مراجع ذات صلة</span><p className="mt-1 text-2xl font-normal">{review.findings.length}</p></div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-line bg-paper p-6">
              <p className="text-sm leading-7 text-ink/65">
                أدخل بيانات المحتوى ثم ابدأ التحليل لعرض تقرير تنفيذي يشمل الامتثال، المخاطر، فرص التحسين، المراجع، جاهزية النشر، والتصدير.
              </p>
            </div>
          )}
        </Panel>
      </div>

      {review ? (
        <>
          <ReviewContextHeader review={review} contentType={selectedKind} channel={channel} />
          <div className="mt-5"><WorkflowSteps steps={review.workflow.map((step) => `${step.label}: ${workflowStatusLabels[step.status]}`)} /></div>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <Panel id="language-quality">
              <SectionTitle title="جودة اللغة والصياغة" subtitle="تفصيل درجات الجودة واقتراح الصياغة المحسنة." />
              <LanguageQualityMobile review={review} />
              <div className="hidden md:block">
                <DataTable headers={["الفئة", "الدرجة"]} rows={Object.entries(review.languageQuality.categoryScores).map(([category, score]) => [categoryLabels[category as LanguageIssueCategory], `${score}%`])} />
                <div className="mt-4 rounded-lg border border-line bg-paper p-5">
                  <p className="mb-2 text-sm font-normal text-ink/70">صياغة محسنة مقترحة</p>
                  <p className="leading-8">{review.languageQuality.improvedDraft}</p>
                </div>
              </div>
            </Panel>

            <Panel id="opportunities">
              <SectionTitle title="فرص التحسين" subtitle="ملاحظات قابلة للمعالجة قبل النشر." />
              <OpportunityCards review={review} />
            </Panel>
          </div>

          <div className="mt-5">
            <Panel id="findings">
              <SectionTitle title="ملاحظات الامتثال ومؤشرات المخاطر والمراجع" subtitle="كل ملاحظة مرتبطة بمصدر رسمي ومادة أو قاعدة محددة مع سبب الرصد ومستوى الثقة." />
              <FindingCards review={review} />
            </Panel>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <Panel id="risk">
              <SectionTitle title="مؤشرات المخاطر" subtitle="تصنيف المخاطر وسبب التصنيف بناء على الملاحظات المرتبطة بالمراجع المهنية والتنظيمية." />
              <div className="rounded-lg border border-line bg-paper p-4">
                <StatusBadge tone={toneFromRisk(review.riskLevel)}>{review.riskLevel}</StatusBadge>
                <p className="mt-3 text-sm leading-8 text-ink/75">{review.legalRiskAssessment.reason}</p>
                <p className="mt-3 text-xs leading-6 text-ink/60">جاهزية النشر: {review.publishingReadinessScore}%</p>
              </div>
            </Panel>

            <Panel>
              <SectionTitle title="امتثال قواعد السلوك المهني" subtitle="الإعلان، الادعاءات المضللة، ضمان النتائج، السرية، تعارض المصالح، وكرامة المهنة." />
              <p className="leading-8 text-ink/75">{review.professionalConductCompliance.summary}</p>
              <div className="mt-3">
                <StatusBadge tone={review.professionalConductCompliance.passed ? "good" : "gold"}>
                  {review.professionalConductCompliance.passed ? "لم ترصد ملاحظة ذات صلة" : "رصدت ملاحظات مرتبطة بالمصدر"}
                </StatusBadge>
              </div>
            </Panel>

            <Panel>
              <SectionTitle title="امتثال اللائحة التنفيذية لنظام المحاماة في المملكة العربية السعودية" subtitle="ضوابط الإعلان، التواصل المهني، الألفاظ المحظورة، الصفة المهنية، ومتطلبات التواصل العام." />
              <p className="leading-8 text-ink/75">{review.executiveRegulationCompliance.summary}</p>
              <div className="mt-3">
                <StatusBadge tone={review.executiveRegulationCompliance.passed ? "good" : "gold"}>
                  {review.executiveRegulationCompliance.passed ? "لم ترصد ملاحظة ذات صلة" : "رصدت ملاحظات مرتبطة بالمصدر"}
                </StatusBadge>
              </div>
            </Panel>
          </div>

          <div className="mt-5">
            <Panel id="references">
              <SectionTitle title="المراجع ذات الصلة" subtitle="تعرض فقط المراجع الرسمية التي استندت إليها نتيجة المراجعة." />
              <ReferencesMobile review={review} />
            </Panel>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <Panel id="recommendations">
              <SectionTitle title="مقترحات التخطيط الإعلامي" subtitle="توجيهات استرشادية للقناة والتوقيت والرسالة." />
              <RecommendationCards items={planningSuggestions} />
            </Panel>

            <Panel id="export">
              <SectionTitle title="جاهزية التصدير والمشاركة" subtitle="حزمة قابلة للاستخدام بعد الاطلاع على نتيجة المراجعة." />
              <div className="rounded-lg border border-line bg-paper p-4">
                <StatusBadge tone={review.exportAllowed ? "good" : toneFromRisk(review.riskLevel)}>
                  {review.exportAllowed ? "مناسب للتصدير وفق نتائج المراجعة" : "يتطلب معالجة الملاحظات"}
                </StatusBadge>
                <p className="mt-3 text-sm leading-7 text-ink/65">
                  تتضمن الحزمة الملخص التنفيذي، درجات الجودة والامتثال، مستوى المخاطر، المراجع ذات الصلة، وملاحظات التحسين.
                </p>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" onClick={copyReviewPackage} className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2.5 text-sm font-normal focus-ring"><Link2 size={16} />نسخ التقرير</button>
                <button type="button" onClick={downloadReviewPackage} className="inline-flex items-center gap-2 rounded-md bg-palm px-4 py-2.5 text-sm font-normal text-white focus-ring"><Download size={16} />تنزيل الحزمة</button>
                <button type="button" onClick={copyReviewPackage} className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2.5 text-sm font-normal focus-ring"><Share2 size={16} />تجهيز المشاركة</button>
              </div>
              {exportMessage ? <p className="mt-3 text-sm font-normal text-palm">{exportMessage}</p> : null}
            </Panel>
          </div>

          <div className="mt-5 rounded-lg border border-line bg-white p-4 text-xs leading-6 text-ink/65">{advisoryDisclaimer}</div>
        </>
      ) : null}
    </>
  );
}
