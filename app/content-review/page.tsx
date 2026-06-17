"use client";

import { useMemo, useState } from "react";
import { Download, FileText, Link2, Share2 } from "lucide-react";
import { BarList, DataTable, PageHeader, Panel, ScoreCard, SectionTitle, StatusBadge, WorkflowSteps } from "@/components/ui";
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

function buildExportPayload(review: ReviewResult, text: string, context: Record<string, string>) {
  return {
    عنوان: "تقرير مراجعة المحتوى الإعلامي والإعلاني",
    المحتوى_محل_المراجعة: text,
    سياق_المراجعة: context,
    نتيجة_المراجعة: {
      جودة_المحتوى: review.languageQuality.score,
      مستوى_الامتثال: review.complianceScore,
      مستوى_المخاطر: review.riskLevel,
      جاهزية_النشر: review.exportAllowed ? "مناسب للتصدير وفق نتائج المراجعة" : "يتطلب معالجة الملاحظات",
      الملخص_التنفيذي: review.summary,
      عدد_ملاحظات_الامتثال: review.findings.length,
      عدد_فرص_التحسين: review.languageQuality.issues.length
    },
    المراجع_الرسمية: review.findings.map((finding) => ({
      الملاحظة: finding.issue,
      المصدر: finding.sourceDocument,
      المادة_أو_القاعدة: finding.ruleOrArticleNumber,
      عنوان_المادة: finding.articleTitle,
      مقتطف_النص: finding.articleTextExcerpt,
      مستوى_الثقة: finding.confidenceLevel,
      الرابط_الرسمي: finding.sourceUrl
    })),
    ملاحظة_استرشادية: review.advisoryDisclaimer
  };
}

export default function ContentReviewPage() {
  const [text, setText] = useState("يجب مراجعة صياغة الإعلان قبل نشره لأنه يتضمن وعداً بنتيجة مضمونة للعميل.");
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
        eyebrow="مسار المراجعة الرئيسي"
        title="مراجعة المحتوى الإعلامي والإعلاني"
        description="تجربة موحدة تعرض جودة الصياغة، ملاحظات الامتثال، مؤشرات المخاطر، فرص التحسين، المراجع الرسمية، جاهزية النشر، ودعم التصدير في تقرير تنفيذي واحد."
      />

      <div className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
        <Panel>
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

        <Panel>
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
                    { label: "جاهزية النشر", value: review.exportAllowed ? 86 : 48 }
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
          <div className="mt-5"><WorkflowSteps steps={review.workflow.map((step) => `${step.label}: ${workflowStatusLabels[step.status]}`)} /></div>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <Panel>
              <SectionTitle title="جودة اللغة والصياغة" subtitle="تفصيل درجات الجودة واقتراح الصياغة المحسنة." />
              <DataTable headers={["الفئة", "الدرجة"]} rows={Object.entries(review.languageQuality.categoryScores).map(([category, score]) => [categoryLabels[category as LanguageIssueCategory], `${score}%`])} />
              <div className="mt-4 rounded-lg border border-line bg-paper p-4">
                <p className="mb-2 text-sm font-normal text-ink/70">صياغة محسنة مقترحة</p>
                <p className="leading-8">{review.languageQuality.improvedDraft}</p>
              </div>
            </Panel>

            <Panel>
              <SectionTitle title="فرص التحسين" subtitle="ملاحظات قابلة للمعالجة قبل النشر." />
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
              <SectionTitle title="ملاحظات الامتثال ومؤشرات المخاطر والمراجع" subtitle="كل ملاحظة مرتبطة بمصدر رسمي ومادة أو قاعدة محددة مع سبب الرصد ومستوى الثقة." />
              <DataTable
                headers={["الملاحظة", "الشدة", "المصدر القانوني", "المادة", "الشرح القانوني", "التوصية"]}
                rows={review.findings.length > 0 ? review.findings.map((finding) => [
                  finding.issue,
                  <StatusBadge key={finding.evidence} tone={toneFromRisk(finding.severity)}>{finding.severity}</StatusBadge>,
                  <a key={finding.sourceUrl} href={finding.sourceUrl} target="_blank" rel="noreferrer" className="font-normal text-palm underline underline-offset-4">{finding.sourceDocument}</a>,
                  `${finding.ruleOrArticleNumber} - ${finding.articleTitle}`,
                  `${finding.legalExplanation} نتيجة الفحص: ${finding.reviewOutcome}. مستوى الثقة: ${finding.confidenceLevel}.`,
                  finding.advice
                ]) : [["لا توجد ملاحظات امتثال", <StatusBadge key="low" tone="good">منخفض</StatusBadge>, "قواعد السلوك المهني للمحامين واللائحة التنفيذية لنظام المحاماة", "-", review.summary, "استمر في الحفاظ على صياغة مهنية غير قطعية."]]}
              />
            </Panel>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
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
              <SectionTitle title="امتثال اللائحة التنفيذية لنظام المحاماة" subtitle="ضوابط الإعلان، التواصل المهني، الألفاظ المحظورة، الصفة المهنية، ومتطلبات التواصل العام." />
              <p className="leading-8 text-ink/75">{review.executiveRegulationCompliance.summary}</p>
              <div className="mt-3">
                <StatusBadge tone={review.executiveRegulationCompliance.passed ? "good" : "gold"}>
                  {review.executiveRegulationCompliance.passed ? "لم ترصد ملاحظة ذات صلة" : "رصدت ملاحظات مرتبطة بالمصدر"}
                </StatusBadge>
              </div>
            </Panel>
          </div>

          <div className="mt-5">
            <Panel>
              <SectionTitle title="المراجع ذات الصلة" subtitle="تعرض فقط المراجع الرسمية التي استندت إليها نتيجة المراجعة." />
              <DataTable
                headers={["المصدر", "المادة أو القاعدة", "عنوان المادة", "مقتطف النص", "الرابط الرسمي"]}
                rows={review.referencesPanel.length > 0 ? review.referencesPanel.map((reference) => [
                  reference.sourceDocument,
                  reference.ruleOrArticleNumber,
                  reference.articleTitle,
                  reference.articleTextExcerpt,
                  <a key={reference.sourceUrl} href={reference.sourceUrl} target="_blank" rel="noreferrer" className="font-normal text-palm underline underline-offset-4">فتح المصدر الرسمي</a>
                ]) : [["قواعد السلوك المهني للمحامين واللائحة التنفيذية لنظام المحاماة", "-", "-", review.summary, "لا توجد مادة محددة لأن المراجعة لم ترصد مخالفة ذات صلة."]]}
              />
            </Panel>
          </div>

          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <Panel>
              <SectionTitle title="مقترحات التخطيط الإعلامي" subtitle="توجيهات استرشادية للقناة والتوقيت والرسالة." />
              <DataTable headers={["البند", "المقترح"]} rows={planningSuggestions} />
            </Panel>

            <Panel>
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
