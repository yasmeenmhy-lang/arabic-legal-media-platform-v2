"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, Download, FileText, Link2, Save, Share2 } from "lucide-react";
import { DataTable, PageHeader, Panel, SectionTitle, StatusBadge, WorkflowSteps } from "@/components/ui";
import { saveLatestReviewSnapshot } from "@/components/review-context-summary";
import { advisoryDisclaimer } from "@/lib/governance";
import { contentKindOptions } from "@/lib/content-types";
import {
  approveContentVersion,
  getActiveContentSelection,
  loadContentRecords,
  markContentShared,
  upsertAnalyzedVersion
} from "@/lib/content-record-store";
import type { ContentKind, GovernedRewriteSuggestion, LanguageIssueCategory, LanguageIssueSeverity, ReviewResult, RiskLevel } from "@/lib/types";

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
  "دعوة لاستشارة أو تواصل مهني",
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
      شرح_درجة_الامتثال: review.complianceScoreExplanation,
      مستوى_المخاطر: review.riskLevel,
      درجة_المخاطر: review.riskScore,
      شرح_درجة_المخاطر: review.riskScoreExplanation,
      جاهزية_النشر: review.exportAllowed ? "مناسب للتصدير وفق نتائج المراجعة" : "يتطلب معالجة الملاحظات",
      درجة_جاهزية_النشر: review.publishingReadinessScore,
      شرح_جاهزية_النشر: review.publishingReadinessExplanation,
      حالة_المراجعة: review.reviewStatus,
      الملخص_التنفيذي: review.summary,
      عدد_ملاحظات_الامتثال: review.findings.length,
      عدد_فرص_التحسين: review.languageQuality.issues.length
    },
    المراجع_الرسمية: review.findings.map((finding) => ({
      معرف_التتبع: finding.traceabilityId,
      عنوان_الملاحظة: finding.title,
      الفئة: finding.category,
      المجال: finding.domain,
      الشدة: finding.severity,
      الوزن: finding.weight,
      أثر_الدرجة: finding.scoreImpact,
      الملاحظة: finding.issue,
      المصدر: finding.sourceDocument,
      المرجع_النظامي: finding.legalReference,
      عنوان_المرجع: finding.articleTitle,
      مقتطف_النص: finding.articleTextExcerpt,
      مستوى_الثقة: finding.confidenceLevel,
      الرابط_الرسمي: finding.sourceUrl
    })),
    التتبع: review.traceability,
    مقترحات_الصياغة_المحوكمة: review.governedRewrites.map((rewrite) => ({
      النص_المقترح: rewrite.suggestedText,
      نتيجة_التحقق_القانوني: validationLabel(rewrite.validation.legalCompliance),
      نتيجة_جودة_اللغة: validationLabel(rewrite.validation.languageQuality),
      أثر_المخاطر: riskImpactLabel(rewrite.validation.riskImpact),
      مستوى_الامتثال_بعد_المقترح: rewrite.proposedComplianceScore,
      جودة_اللغة_بعد_المقترح: rewrite.proposedLanguageQuality,
      المراجع_المستخدمة: rewrite.referencesUsed
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

function OpportunityCards({ review }: { review: ReviewResult }) {
  const issues = review.languageQuality.issues;
  return (
    <div className="space-y-4">
      {issues.length > 0 ? issues.map((issue) => (
        <article key={issue.id} className="w-full rounded-2xl border border-line bg-white p-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
            <p className="text-sm font-normal leading-7 text-ink">{categoryLabels[issue.category]} — ملاحظة تحسين صياغي غير مرتبطة بمرجع نظامي محدد.</p>
            <StatusBadge tone={severityTone[issue.severity]}>{severityLabels[issue.severity]}</StatusBadge>
          </div>
          <div className="space-y-3">
            <ReadableBlock label="الموضع">{issue.excerpt || "-"}</ReadableBlock>
            <ReadableBlock label="اتجاه التحسين">{issue.suggestion}</ReadableBlock>
          </div>
        </article>
      )) : (
        <article className="w-full rounded-2xl border border-line bg-white p-4">
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
        <article
          key={`${finding.legalKnowledgeEntryId}-${finding.evidence}`}
          className="w-full p-4 sm:p-5"
          style={
            finding.severity === "حرج"
              ? { backgroundColor: '#fef2f2', border: '0.5px solid #fca5a5', borderRight: '3px solid #dc2626', borderRadius: '16px' }
              : finding.severity === "منخفض"
              ? { backgroundColor: '#f4f7f6', border: '0.5px solid #d8e1de', borderRadius: '16px' }
              : { backgroundColor: '#ffffff', border: '0.5px solid #d8e1de', borderRadius: '16px' }
          }
        >
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base font-normal leading-8 text-ink">{finding.title}</p>
              <p className="mt-1 text-sm leading-7 text-ink/55">{finding.legalReference} - {finding.articleTitle}</p>
            </div>
            {finding.severity === "حرج" ? (
              <span style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '20px', padding: '2px 8px', fontSize: '11px', fontWeight: 500 }}>حرجة</span>
            ) : (
              <StatusBadge tone={toneFromRisk(finding.severity)}>{finding.severity}</StatusBadge>
            )}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <ReadableBlock label="فئة الملاحظة">{finding.category} - {finding.domain}</ReadableBlock>
            <ReadableBlock label="الشدة والأثر المحتمل">{finding.severity} - {finding.potentialImpact}</ReadableBlock>
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
        <article className="w-full rounded-2xl border border-line bg-white p-4">
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
      {review.referencesPanel.length > 0 ? review.referencesPanel.map((reference) => {
        const finding = review.findings.find((item) =>
          item.sourceDocument === reference.sourceDocument && item.legalReference === reference.legalReference
        );
        return (
          <article key={`${reference.sourceDocument}-${reference.legalReference}`} className="w-full rounded-2xl border border-line bg-white p-4">
            <div className="space-y-4">
              <ReadableBlock label="اسم المرجع">{reference.sourceDocument}</ReadableBlock>
              <ReadableBlock label="اسم القاعدة أو اللائحة">{reference.sourceDocument}</ReadableBlock>
              <ReadableBlock label="رقم المادة أو القاعدة">{reference.legalReference}</ReadableBlock>
              <ReadableBlock label="النص أو المضمون المرتبط بالمحتوى">{reference.articleTextExcerpt}</ReadableBlock>
              <ReadableBlock label="العبارة المرتبطة من المحتوى">{finding?.evidence ?? review.reviewContext.shortExcerpt}</ReadableBlock>
              <ReadableBlock label="سبب الاستناد إلى المرجع">{finding?.legalExplanation ?? finding?.explanation ?? "ارتباط نتيجة التحليل بالمادة أو القاعدة الرسمية ذات الصلة."}</ReadableBlock>
              <ReadableBlock label="أثره على المحتوى">{finding ? `${finding.issue} — الأثر المحتمل: ${finding.potentialImpact}` : "يدعم توثيق نتيجة التحليل دون إنشاء ملاحظة إضافية."}</ReadableBlock>
              <ReadableBlock label="التوجيه التطبيقي">{finding?.suggestedSaferWording ?? finding?.advice ?? "الالتزام بصياغة مهنية واضحة ومراجعة النص قبل النشر."}</ReadableBlock>
              <ReadableBlock label="الرابط الرسمي المباشر">
                <a href={reference.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex rounded-[10px] bg-palm px-4 py-2.5 font-normal text-white no-underline focus-ring">
                  الوصول المباشر إلى المرجع الرسمي
                </a>
              </ReadableBlock>
            </div>
          </article>
        );
      }) : (
        <article className="w-full rounded-2xl border border-line bg-white p-4">
          <p className="text-sm leading-8 text-ink/75">{review.summary}</p>
        </article>
      )}
    </div>
  );
}

function complianceLevelLabel(score: number) {
  if (score >= 95) return "مرتفع جداً";
  if (score >= 85) return "مرتفع";
  if (score >= 70) return "متوسط";
  if (score >= 50) return "منخفض";
  return "غير ملتزم";
}

function complianceExplanation(review: ReviewResult) {
  if (review.findings.length === 0) {
    return "لم ترصد المراجعة ملاحظات مرتبطة بالمراجع المهنية والتنظيمية المسجلة. يعكس المحتوى صياغة مهنية ملتزمة.";
  }
  const criticalFindings = review.findings.filter(f => f.category === "الوعود بالنتائج" || f.category === "السرية والخصوصية");
  if (criticalFindings.length > 0) {
    return `انخفض مستوى الامتثال بسبب رصد ${criticalFindings.length > 1 ? `${criticalFindings.length} ملاحظات جوهرية` : "ملاحظة جوهرية"} تتعلق بـ${criticalFindings[0].category}. العبارة المؤثرة: "${criticalFindings[0].evidence}". الإجراء الموصى به: ${criticalFindings[0].suggestedSaferWording}`;
  }
  return `انخفض مستوى الامتثال بسبب رصد ${review.findings.length} ملاحظة مرتبطة بالمراجع المهنية والتنظيمية. راجع الملاحظات أدناه وطبّق الصياغة الأكثر أماناً المقترحة.`;
}

function riskExplanation(review: ReviewResult) {
  if (review.riskLevel === "منخفض") {
    return "لم ترصد المراجعة مؤشرات مخاطر تستوجب المتابعة. المحتوى يستوفي متطلبات السلامة المهنية الأساسية.";
  }
  if (review.riskLevel === "حرج") {
    const criticalFinding = review.findings.find(f => f.category === "الوعود بالنتائج" || f.category === "السرية والخصوصية");
    return `مستوى المخاطر حرج. ${criticalFinding ? `يتضمن المحتوى ${criticalFinding.category}: "${criticalFinding.evidence}". هذا قد يُعرّض المحامي لمخاطر مهنية جسيمة. الإجراء الفوري: ${criticalFinding.suggestedSaferWording}` : "يتضمن المحتوى ملاحظات جوهرية تستوجب المعالجة الفورية قبل أي نشر."}`;
  }
  return `مستوى المخاطر ${review.riskLevel}. ${review.legalRiskAssessment.reason} راجع الملاحظات المرتبطة وطبّق التوصيات قبل النشر.`;
}

function readinessExplanation(review: ReviewResult) {
  if (review.complianceScore >= 95 && review.riskLevel === "منخفض") {
    return "المحتوى مناسب للنشر وفق نتائج المراجعة. استكمل خطوة الاعتماد ثم يمكن التصدير والمشاركة.";
  }
  if (review.complianceScore >= 85 && (review.riskLevel === "منخفض" || review.riskLevel === "متوسط")) {
    return "المحتوى مناسب للنشر بعد تعديلات طفيفة. راجع الملاحظات الصياغية واعتمد الإصدار النهائي.";
  }
  if (review.complianceScore >= 70) {
    return "المحتوى يتطلب معالجة ملاحظات الامتثال والمخاطر قبل النشر. طبّق الصياغة الأكثر أماناً المقترحة وأعد التقييم.";
  }
  return "المحتوى غير مناسب للنشر حالياً. يتضمن ملاحظات جوهرية تؤثر على الامتثال والمخاطر المهنية. عالج الملاحظات الواردة في الأقسام التالية أولاً.";
}

function validationLabel(value: "passed" | "failed") {
  return value === "passed" ? "مجتاز" : "غير مجتاز";
}

function riskImpactLabel(value: GovernedRewriteSuggestion["validation"]["riskImpact"]) {
  return value === "reduced" ? "منخفض" : "دون زيادة";
}

function GovernedRewriteCards({ rewrites }: { rewrites: GovernedRewriteSuggestion[] }) {
  if (rewrites.length === 0) {
    return (
      <article className="w-full rounded-2xl border border-line bg-paper p-4">
        <p className="text-sm leading-8 text-ink/70">
          لا توجد صياغة بديلة قابلة للعرض حالياً. لا تعرض المنصة أي مقترح صياغي ما لم يجتز التحقق القانوني، وإعادة فحص الامتثال، وجودة اللغة، وأثر المخاطر.
        </p>
      </article>
    );
  }

  return (
    <div className="space-y-4">
      {rewrites.map((rewrite) => (
        <article key={rewrite.id} className="w-full rounded-2xl border border-line bg-paper p-4">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-normal leading-7 text-ink">صياغة مقترحة بعد التحقق</p>
              <p className="mt-1 text-xs leading-6 text-ink/55">{rewrite.basis}</p>
            </div>
            <StatusBadge tone="good">اجتازت بوابة الجودة</StatusBadge>
          </div>
          <div className="space-y-4">
            <ReadableBlock label="النص المقترح">{rewrite.suggestedText}</ReadableBlock>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-white p-3 text-xs leading-6">
                <span className="block text-ink/55">التحقق القانوني</span>
                <strong className="font-normal text-palm">{validationLabel(rewrite.validation.legalCompliance)}</strong>
              </div>
              <div className="rounded-xl bg-white p-3 text-xs leading-6">
                <span className="block text-ink/55">جودة اللغة</span>
                <strong className="font-normal text-palm">{validationLabel(rewrite.validation.languageQuality)} - {rewrite.proposedLanguageQuality}%</strong>
              </div>
              <div className="rounded-xl bg-white p-3 text-xs leading-6">
                <span className="block text-ink/55">أثر المخاطر</span>
                <strong className="font-normal text-palm">{riskImpactLabel(rewrite.validation.riskImpact)}</strong>
              </div>
            </div>
            <ReadableBlock label="مستوى الامتثال بعد المقترح">{rewrite.proposedComplianceScore}% مقارنة بـ {rewrite.originalComplianceScore}% قبل المعالجة</ReadableBlock>
            <ReadableBlock label="المراجع المستخدمة">
              <div className="space-y-2">
                {rewrite.referencesUsed.map((reference) => (
                  <a
                    key={`${reference.sourceDocument}-${reference.legalReference ?? reference.sourceUrl}`}
                    href={reference.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl border border-line bg-white p-3 text-palm underline underline-offset-4"
                  >
                    {reference.sourceDocument}{reference.legalReference ? ` - ${reference.legalReference}` : ""}
                  </a>
                ))}
              </div>
            </ReadableBlock>
          </div>
        </article>
      ))}
    </div>
  );
}

function RecommendationCards({ items }: { items: string[][] }) {
  return (
    <div className="space-y-4">
      {items.map(([label, value]) => (
        <article key={label} className="w-full rounded-2xl border border-line bg-white p-4">
          <ReadableBlock label={label}>{value}</ReadableBlock>
        </article>
      ))}
    </div>
  );
}

// ── chip helper ──────────────────────────────────────────────────────────────
function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 text-sm leading-6 transition-colors ${
        active
          ? "border border-palm bg-palm text-white"
          : "bg-white text-ink/60 hover:border-palm hover:text-palm"
      }`}
      style={active
        ? { borderRadius: '20px' }
        : { borderRadius: '20px', border: '0.5px solid #d8e1de' }
      }
    >
      {label}
    </button>
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
  const [contentId, setContentId] = useState<string>();
  const [versionNumber, setVersionNumber] = useState<number>();
  const [approved, setApproved] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState("");
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    const selection = getActiveContentSelection();
    if (!selection) return;
    const record = loadContentRecords().find((item) => item.id === selection.contentId);
    const version = record?.versions.find((item) => item.version === selection.version);
    if (!record || !version) return;
    setContentId(record.id);
    setVersionNumber(version.version);
    setText(version.body);
    setKind(version.contentType);
    setChannel(version.channel);
    setAudienceChoice(audienceOptions.includes(version.audience) ? version.audience : "أخرى");
    if (!audienceOptions.includes(version.audience)) setAudienceOther(version.audience);
    setPurposeChoice(purposeOptions.includes(version.purpose) ? version.purpose : "أخرى");
    if (!purposeOptions.includes(version.purpose)) setPurposeOther(version.purpose);
    setReview(version.analysis ?? null);
    setApproved(Boolean(version.approvedAt));
  }, []);

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
    if (payload.data?.reviewContext) {
      saveLatestReviewSnapshot(payload.data);
      const saved = upsertAnalyzedVersion({
        contentId,
        body: text,
        contentType: kind,
        contentTypeLabel: selectedKind,
        channel,
        audience,
        purpose,
        review: payload.data
      });
      setContentId(saved.record.id);
      setVersionNumber(saved.version.version);
      setApproved(false);
      setApprovalMessage(`تم حفظ الإصدار ${saved.version.version} وربطه بنتائج التحليل والمراجع.`);
    }
    setLoading(false);
  }

  function approveCurrentVersion() {
    if (!contentId || !versionNumber || !review) return;
    const result = approveContentVersion(contentId, versionNumber);
    if (!result) return;
    setApproved(true);
    setApprovalMessage(`تم اعتماد الإصدار ${versionNumber} مع نتائج تحليله ومراجعه المهنية والرسمية بواسطة أحمد عبدالعزيز.`);
  }

  function prepareSharing() {
    if (!approved || !contentId || !versionNumber) return;
    markContentShared(contentId, versionNumber);
    setExportMessage("تم تجهيز الإصدار المعتمد للمشاركة وتسجيل الإجراء في سجل المحتوى.");
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

  // UI-only: current step for navigator
  const activeStep = !review ? (text.trim().length > 4 ? 1 : 0) : approved ? 3 : 2;

  const steps = [
    { label: "النص", id: "step-text" },
    { label: "السياق", id: "step-context" },
    { label: "القرار", id: "step-decision" },
    { label: "الاعتماد", id: "step-approval" }
  ];

  const tabLabels = [
    { label: "الملاحظات", count: review?.findings.length },
    { label: "المؤشرات", count: undefined },
    { label: "الصياغة المقترحة", count: review?.governedRewrites.length },
    { label: "المراجع الرسمية", count: review?.referencesPanel.length },
    { label: "القنوات المقترحة", count: undefined },
    { label: "مسار التنفيذ", count: undefined }
  ];

  return (
    <div className="min-h-full -mx-3 px-3 py-0 sm:-mx-6 sm:px-6" style={{ backgroundColor: 'var(--color-background-tertiary)' }}>
      <PageHeader
        eyebrow="إعداد وتحليل المحتوى"
        title="إعداد وتحليل المحتوى الإعلامي والإعلاني"
        description="تجربة موحدة تعرض جودة الصياغة، ملاحظات الامتثال، مؤشرات المخاطر، فرص التحسين، المراجع الرسمية، جاهزية النشر، ودعم التصدير في تقرير تنفيذي واحد."
      />

      {/* ── Step Navigator ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-20 -mx-4 mb-6 border-b border-line bg-white/95 px-4 py-2.5 backdrop-blur-sm sm:-mx-6 sm:px-6">
        <div className="flex items-center overflow-x-auto">
          {steps.map((step, index) => (
            <a key={step.id} href={`#${step.id}`} className="flex shrink-0 items-center gap-2 px-2 py-1 text-sm transition-colors first:pr-3 last:pl-3">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-normal transition-colors ${
                index < activeStep ? "bg-mint text-palm" : index === activeStep ? "bg-palm text-white" : "bg-paper text-ink/40"
              }`}>
                {index < activeStep ? "✓" : index + 1}
              </span>
              <span className={index === activeStep ? "text-palm font-normal" : index < activeStep ? "text-palm/70" : "text-ink/40"}>
                {step.label}
              </span>
              {index < steps.length - 1 && <span className="mx-2 text-line select-none">›</span>}
            </a>
          ))}
        </div>
      </div>

      {/* ── Section 1: النص ──────────────────────────────────────────────── */}
      <section id="step-text" className="scroll-mt-16 space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-palm text-xs text-white">1</span>
          <h2 className="text-base font-normal text-ink">النص</h2>
        </div>
        <Panel>
          <SectionTitle title="المحتوى محل المراجعة" subtitle="أدخل النص كاملاً لتحليله وفق المراجع المهنية والتنظيمية." />
          <div className="relative">
            <textarea
              className="min-h-52 w-full rounded-[10px] border border-line p-3 leading-8 focus-ring"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="أدخل نص المحتوى الإعلامي أو الإعلاني هنا..."
            />
            <span className="pointer-events-none absolute bottom-3 left-3 text-xs text-ink/35">
              {text.length} حرف
            </span>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                className="sr-only"
                onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")}
              />
              <span className="inline-flex items-center gap-2 rounded-[10px] border border-dashed border-line bg-paper px-3 py-2 text-xs text-ink/60 transition hover:border-palm hover:text-palm">
                {fileName ? `📎 ${fileName}` : "إرفاق ملف داعم (PDF، صورة)"}
              </span>
            </label>
            <button
              className="inline-flex items-center gap-2 rounded-[10px] bg-palm px-5 py-2.5 text-sm font-normal text-white focus-ring disabled:cursor-not-allowed disabled:opacity-60"
              type="button"
              onClick={runReview}
              disabled={loading || text.trim().length < 5}
            >
              <FileText size={16} />
              {loading ? "جار تحليل المحتوى..." : "تحليل المحتوى"}
            </button>
          </div>
        </Panel>
      </section>

      {/* ── Section 2: السياق ────────────────────────────────────────────── */}
      <section id="step-context" className="mt-6 scroll-mt-16 space-y-4">
        <div className="flex items-center gap-3">
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-normal transition-colors ${activeStep >= 1 ? "bg-palm text-white" : "bg-paper text-ink/40"}`}>2</span>
          <h2 className="text-base font-normal text-ink">السياق</h2>
        </div>
        <Panel>
          <SectionTitle title="سياق المحتوى" subtitle="حدد نوع المحتوى والقناة والجمهور والغرض لضبط دقة التحليل." />

          <div className="space-y-6">
            {/* نوع المحتوى */}
            <div>
              <p className="mb-3 text-sm font-medium text-ink/60">نوع المحتوى</p>
              <div className="flex flex-wrap gap-2">
                {contentTypes.map((item) => (
                  <Chip
                    key={item.value}
                    label={item.label}
                    active={kind === item.value}
                    onClick={() => setKind(item.value as ContentKind)}
                  />
                ))}
              </div>
            </div>

            {/* القناة */}
            <div>
              <p className="mb-3 text-sm font-medium text-ink/60">القناة</p>
              <div className="flex flex-wrap gap-2">
                {channels.map((item) => (
                  <Chip
                    key={item}
                    label={item}
                    active={channel === item}
                    onClick={() => setChannel(item)}
                  />
                ))}
              </div>
            </div>

            {/* الجمهور */}
            <div>
              <p className="mb-3 text-sm font-medium text-ink/60">الجمهور المستهدف</p>
              <div className="flex flex-wrap gap-2">
                {audienceOptions.map((item) => (
                  <Chip
                    key={item}
                    label={item}
                    active={audienceChoice === item}
                    onClick={() => setAudienceChoice(item)}
                  />
                ))}
              </div>
              {audienceChoice === "أخرى" && (
                <input
                  className="mt-3 w-full rounded-[10px] border border-line px-3 py-2.5 text-sm focus-ring"
                  placeholder="حدد الجمهور المستهدف"
                  value={audienceOther}
                  onChange={(event) => setAudienceOther(event.target.value)}
                />
              )}
            </div>

            {/* الغرض */}
            <div>
              <p className="mb-3 text-sm font-medium text-ink/60">الغرض من المحتوى</p>
              <div className="flex flex-wrap gap-2">
                {purposeOptions.map((item) => (
                  <Chip
                    key={item}
                    label={item}
                    active={purposeChoice === item}
                    onClick={() => setPurposeChoice(item)}
                  />
                ))}
              </div>
              {purposeChoice === "أخرى" && (
                <input
                  className="mt-3 w-full rounded-[10px] border border-line px-3 py-2.5 text-sm focus-ring"
                  placeholder="حدد الغرض من المحتوى"
                  value={purposeOther}
                  onChange={(event) => setPurposeOther(event.target.value)}
                />
              )}
            </div>
          </div>
        </Panel>
      </section>

      {/* ── Section 3: القرار ────────────────────────────────────────────── */}
      {review && (
        <section id="step-decision" className="mt-6 scroll-mt-16 space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-palm text-xs text-white">3</span>
            <h2 className="text-base font-normal text-ink">القرار</h2>
          </div>

          {/* Decision Banner */}
          {review.exportAllowed ? (
            <div className="p-5" style={{ backgroundColor: '#e6f0ec', border: '0.5px solid #c5d8d0', borderRight: '4px solid #2d6a5a', borderRadius: '16px' }}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs" style={{ color: '#6b9e8e' }}>قرار المراجعة</p>
                  <p className="mt-1 font-medium leading-8" style={{ fontSize: '18px', color: '#2d6a5a' }}>مناسب للنشر وفق نتائج المراجعة</p>
                  <p className="mt-2 text-sm leading-7 text-ink/65">{review.summary}</p>
                </div>
                <StatusBadge tone="good">جاهز للنشر</StatusBadge>
              </div>
            </div>
          ) : (
            <div className="p-5" style={{ backgroundColor: '#fbf6ea', border: '0.5px solid #ead8ad', borderRight: '4px solid #a7782b', borderRadius: '16px' }}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-xs" style={{ color: '#a7782b' }}>قرار المراجعة</p>
                  <p className="mt-1 font-medium leading-8" style={{ fontSize: '18px', color: '#a7782b' }}>
                    {review.complianceScore >= 85 ? "مناسب بعد تعديلات طفيفة" : review.complianceScore >= 70 ? "يتطلب معالجة ملاحظات الامتثال" : "غير مناسب للنشر حالياً"}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-ink/65">{review.summary}</p>
                </div>
                <StatusBadge tone={toneFromRisk(review.riskLevel)}>يتطلب مراجعة</StatusBadge>
              </div>
            </div>
          )}

          {/* 4 Score Indicators — single card, 4-column grid */}
          <div className="bg-white p-5" style={{ border: '0.5px solid #d8e1de', borderRadius: '16px' }}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 xl:grid-cols-4 xl:divide-x xl:divide-line xl:divide-x-reverse">
              <div className="xl:pl-0 xl:pr-6">
                <p className="text-xs text-ink/50">جودة المحتوى</p>
                <p className="mt-2 text-3xl font-normal" style={{ color: '#2d6a5a' }}>{review.languageQuality.score}%</p>
                <p className="mt-1 text-xs text-ink/40">لغة وصياغة ومقروئية</p>
                <div className="mt-2.5">
                  <StatusBadge tone={toneFromScore(review.languageQuality.score)}>
                    {review.languageQuality.score >= 85 ? "مرتفع" : review.languageQuality.score >= 70 ? "متوسط" : "منخفض"}
                  </StatusBadge>
                </div>
              </div>
              <div className="xl:px-6">
                <p className="text-xs text-ink/50">مستوى الامتثال</p>
                <p className="mt-2 text-3xl font-normal" style={{ color: review.complianceScore >= 70 ? '#2d6a5a' : review.complianceScore >= 40 ? '#a7782b' : '#dc2626' }}>
                  {review.complianceScore}%
                </p>
                <p className="mt-1 text-xs text-ink/40">{complianceLevelLabel(review.complianceScore)}</p>
                <div className="mt-2.5">
                  <StatusBadge tone={toneFromScore(review.complianceScore)}>
                    {review.complianceScore >= 70 ? "ملتزم" : review.complianceScore >= 40 ? "متوسط" : "يتطلب تحسين"}
                  </StatusBadge>
                </div>
              </div>
              <div className="xl:px-6">
                <p className="text-xs text-ink/50">مستوى المخاطر</p>
                <p className="mt-2 text-2xl font-normal" style={{ color: review.riskLevel === 'منخفض' ? '#2d6a5a' : review.riskLevel === 'متوسط' ? '#a7782b' : '#dc2626' }}>
                  {review.riskLevel}
                </p>
                <p className="mt-1 text-xs text-ink/40">درجة المخاطر: {review.riskScore}%</p>
                <div className="mt-2.5">
                  <StatusBadge tone={toneFromRisk(review.riskLevel)}>{review.riskLevel}</StatusBadge>
                </div>
              </div>
              <div className="xl:pl-6">
                <p className="text-xs text-ink/50">جاهزية النشر</p>
                <p className="mt-2 text-3xl font-normal" style={{ color: review.publishingReadinessScore >= 70 ? '#2d6a5a' : '#a7782b' }}>
                  {review.publishingReadinessScore}%
                </p>
                <p className="mt-1 text-xs text-ink/40">{review.exportAllowed ? "مناسب للتصدير" : "يتطلب معالجة"}</p>
                <div className="mt-2.5">
                  <StatusBadge tone={review.exportAllowed ? "good" : toneFromRisk(review.riskLevel)}>
                    {review.exportAllowed ? "جاهز" : "معالجة مطلوبة"}
                  </StatusBadge>
                </div>
              </div>
            </div>
          </div>

          {/* Tab System */}
          <div className="overflow-hidden rounded-2xl border border-line bg-white">
            {/* Tab Bar — chips */}
            <div className="flex flex-wrap gap-2 border-b border-line bg-paper/60 px-4 py-3">
              {tabLabels.map((tab, index) => (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => setActiveTab(index)}
                  className={`inline-flex items-center gap-1.5 rounded-[8px] px-4 py-1.5 text-sm transition-colors ${
                    activeTab === index
                      ? "bg-palm font-normal text-white"
                      : "border border-line/70 bg-white text-ink/60 hover:border-palm/40 hover:text-ink"
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-xs ${
                      activeTab === index ? "bg-white/20 text-white" : index === 0 ? "bg-goldSoft text-gold" : "bg-mint text-palm"
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-5">
              {/* الملاحظات */}
              {activeTab === 0 && <FindingCards review={review} />}

              {/* المؤشرات */}
              {activeTab === 1 && (
                <div className="space-y-6">
                  <div className="grid gap-5 lg:grid-cols-3">
                    {/* Compliance */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-normal text-ink">مستوى الامتثال</p>
                        <span className="rounded-[20px] bg-mint px-2.5 py-1 text-sm font-normal text-palm">{review.complianceScore}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-paper">
                        <div className={`h-full rounded-full transition-all ${review.complianceScore >= 85 ? "bg-palm" : review.complianceScore >= 70 ? "bg-warmGray" : "bg-gold"}`} style={{ width: `${review.complianceScore}%` }} />
                      </div>
                      <p className="text-sm leading-7 text-ink/75">{complianceExplanation(review)}</p>
                      {review.complianceScoreExplanation.contributions.length > 0 && (
                        <div className="space-y-2">
                          {review.complianceScoreExplanation.contributions.map((item) => (
                            <div key={item.traceabilityId} className="rounded-xl border border-line bg-paper p-3">
                              <p className="text-sm font-normal">{item.label}</p>
                              <p className="mt-1 text-xs leading-6 text-ink/65">{item.explanation}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Risk */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-normal text-ink">مستوى المخاطر</p>
                        <StatusBadge tone={toneFromRisk(review.riskLevel)}>{review.riskLevel}</StatusBadge>
                      </div>
                      <p className="text-xs text-ink/55">درجة المخاطر: {review.riskScore}%</p>
                      <p className="text-sm leading-7 text-ink/75">{riskExplanation(review)}</p>
                      {review.riskScoreExplanation.contributions.length > 0 && (
                        <div className="space-y-2">
                          {review.riskScoreExplanation.contributions.map((item) => (
                            <div key={item.traceabilityId} className="rounded-xl border border-line bg-paper p-3">
                              <p className="text-sm font-normal">{item.label}</p>
                              <p className="mt-1 text-xs leading-6 text-ink/65">{item.explanation}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Readiness */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-normal text-ink">جاهزية النشر</p>
                        <StatusBadge tone={review.exportAllowed ? "good" : toneFromRisk(review.riskLevel)}>
                          {review.publishingReadinessScore}%
                        </StatusBadge>
                      </div>
                      <p className="text-sm leading-7 text-ink/75">{readinessExplanation(review)}</p>
                      {review.publishingReadinessExplanation.factors.map((factor) => (
                        <div key={factor.key} className="rounded-xl border border-line bg-paper p-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-normal">{factor.label}</p>
                            <StatusBadge tone={factor.sourceScore >= 85 ? "good" : factor.sourceScore >= 70 ? "neutral" : "gold"}>
                              {factor.sourceScore >= 85 ? "مناسب" : factor.sourceScore >= 70 ? "مقبول" : "يتطلب تحسين"}
                            </StatusBadge>
                          </div>
                          <p className="mt-1 text-xs leading-6 text-ink/60">{factor.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Language quality bars */}
                  <div className="border-t border-line pt-5">
                    <p className="mb-4 text-sm font-normal text-ink">جودة اللغة والصياغة</p>
                    <div className="space-y-3">
                      {Object.entries(review.languageQuality.categoryScores).map(([category, score]) => (
                        <div key={category} className="flex items-center gap-3">
                          <span className="w-36 shrink-0 text-xs text-ink/60">{categoryLabels[category as LanguageIssueCategory]}</span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-paper">
                            <div className="h-full rounded-full bg-palm/70 transition-all" style={{ width: `${score}%` }} />
                          </div>
                          <span className="w-10 shrink-0 text-left text-xs font-normal text-palm">{score}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Opportunities */}
                  <div className="border-t border-line pt-5">
                    <p className="mb-4 text-sm font-normal text-ink">فرص التحسين اللغوي</p>
                    <OpportunityCards review={review} />
                  </div>

                  {/* Professional conduct */}
                  <div className="border-t border-line pt-5">
                    <p className="mb-3 text-sm font-normal text-ink">امتثال قواعد السلوك المهني</p>
                    <p className="mb-3 text-sm leading-7 text-ink/75">{review.professionalConductCompliance.summary}</p>
                    <StatusBadge tone={review.professionalConductCompliance.passed ? "good" : "gold"}>
                      {review.professionalConductCompliance.passed ? "لم ترصد ملاحظة ذات صلة" : "رصدت ملاحظات مرتبطة بالمصدر"}
                    </StatusBadge>
                  </div>

                  <div className="border-t border-line pt-5">
                    <p className="mb-3 text-sm font-normal text-ink">امتثال اللائحة التنفيذية لنظام المحاماة</p>
                    <p className="mb-3 text-sm leading-7 text-ink/75">{review.executiveRegulationCompliance.summary}</p>
                    <StatusBadge tone={review.executiveRegulationCompliance.passed ? "good" : "gold"}>
                      {review.executiveRegulationCompliance.passed ? "لم ترصد ملاحظة ذات صلة" : "رصدت ملاحظات مرتبطة بالمصدر"}
                    </StatusBadge>
                  </div>
                </div>
              )}

              {/* الصياغة المقترحة */}
              {activeTab === 2 && <GovernedRewriteCards rewrites={review.governedRewrites} />}

              {/* المراجع الرسمية */}
              {activeTab === 3 && <ReferencesMobile review={review} />}

              {/* القنوات المقترحة */}
              {activeTab === 4 && <RecommendationCards items={planningSuggestions} />}

              {/* مسار التنفيذ */}
              {activeTab === 5 && (
                <WorkflowSteps steps={[
                  `جودة اللغة والصياغة: ${workflowStatusLabels[review.workflow[0]?.status ?? "pending"]}`,
                  `ملاحظات الامتثال: ${workflowStatusLabels[review.workflow[1]?.status ?? "pending"]}`,
                  `مؤشرات المخاطر: ${workflowStatusLabels[review.workflow[2]?.status ?? "pending"]}`,
                  `جاهزية النشر: ${workflowStatusLabels[review.workflow[3]?.status ?? "pending"]}`,
                  `التصدير والمشاركة: ${workflowStatusLabels[review.workflow[4]?.status ?? "pending"]}`
                ]} />
              )}
            </div>
          </div>
        </section>
      )}

      {/* ── Section 4: الاعتماد ──────────────────────────────────────────── */}
      {review && (
        <section id="step-approval" className="mt-6 scroll-mt-16 space-y-4">
          <div className="flex items-center gap-3">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-normal transition-colors ${approved ? "bg-palm text-white" : "bg-paper text-ink/40"}`}>4</span>
            <h2 className="text-base font-normal text-ink">الاعتماد</h2>
          </div>
          <Panel>
            <div className="grid gap-6 xl:grid-cols-2">
              {/* Approval */}
              <div>
                <SectionTitle title="اعتماد الإصدار" subtitle="اعتمد الإصدار الحالي بعد مراجعة التحليل والصياغة المقترحة والمراجع." />
                {review.findings.some((f) => f.severity === "حرج") && !approved && (
                  <div className="mb-4 rounded-xl border border-goldBorder bg-goldSoft p-3">
                    <p className="text-sm leading-7 text-gold">⚠ يتضمن المحتوى ملاحظة حرجة. يُنصح بمعالجتها قبل الاعتماد.</p>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={approveCurrentVersion}
                    disabled={approved || !review || !contentId || !versionNumber}
                    className="inline-flex items-center gap-2 rounded-[10px] bg-palm px-5 py-2.5 text-sm font-normal text-white focus-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle2 size={17} />
                    {approved ? "تم الاعتماد" : "اعتماد"}
                  </button>
                  <span className="inline-flex items-center gap-2 text-sm text-ink/65">
                    <Save size={16} />
                    يحفظ المحتوى والتحليل والمراجع معًا دون الكتابة فوق إصدار معتمد سابق.
                  </span>
                </div>
                {approvalMessage && <p className="mt-3 text-sm font-normal text-palm">{approvalMessage}</p>}
              </div>

              {/* Export */}
              <div>
                <SectionTitle title="التصدير والمشاركة" subtitle="متاحة بعد الاعتماد — تشمل الملخص والدرجات والمراجع والملاحظات." />
                <div className="mb-4 rounded-xl border border-line bg-paper p-4">
                  <StatusBadge tone={review.exportAllowed ? "good" : toneFromRisk(review.riskLevel)}>
                    {review.exportAllowed ? "مناسب للتصدير وفق نتائج المراجعة" : "يتطلب معالجة الملاحظات"}
                  </StatusBadge>
                  <p className="mt-3 text-sm leading-7 text-ink/65">
                    تتضمن الحزمة الملخص التنفيذي، درجات الجودة والامتثال، مستوى المخاطر، المراجع ذات الصلة، وملاحظات التحسين.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button type="button" disabled={!approved} onClick={copyReviewPackage} className="inline-flex items-center gap-2 rounded-[10px] border border-line bg-white px-4 py-2.5 text-sm font-normal focus-ring disabled:cursor-not-allowed disabled:opacity-50">
                    <Link2 size={16} />نسخ
                  </button>
                  <button type="button" disabled={!approved} onClick={downloadReviewPackage} className="inline-flex items-center gap-2 rounded-[10px] bg-palm px-4 py-2.5 text-sm font-normal text-white focus-ring disabled:cursor-not-allowed disabled:opacity-50">
                    <Download size={16} />تنزيل
                  </button>
                  <button type="button" disabled={!approved} onClick={prepareSharing} className="inline-flex items-center gap-2 rounded-[10px] border border-line bg-white px-4 py-2.5 text-sm font-normal focus-ring disabled:cursor-not-allowed disabled:opacity-50">
                    <Share2 size={16} />تجهيز المشاركة
                  </button>
                </div>
                {!approved && <p className="mt-3 text-sm text-gold">يجب اعتماد المخرج قبل تفعيل خيارات المشاركة.</p>}
                {exportMessage && <p className="mt-3 text-sm font-normal text-palm">{exportMessage}</p>}
              </div>
            </div>
          </Panel>
        </section>
      )}

      {review && (
        <div className="mt-6 rounded-2xl border border-line bg-white p-4 text-xs leading-6 text-ink/65">{advisoryDisclaimer}</div>
      )}
    </div>
  );
}
