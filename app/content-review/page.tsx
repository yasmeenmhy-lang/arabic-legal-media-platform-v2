"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Edit3,
  ExternalLink,
  FileDown,
  FileText,
  Save,
  Share2,
  ShieldAlert,
  SpellCheck,
  Sparkles,
  XCircle
} from "lucide-react";
import { CircularGauge, PageHeader, Panel, ProgressBar, SectionTitle, StatusBadge } from "@/components/ui";
import { socialBrandIcons, socialBrandStyles } from "@/components/social-icons";
import { OfficialLogo, officialEntityFromUrl } from "@/components/official-logos";
import { contentKindOptions } from "@/lib/content-types";
import {
  approveContentVersion,
  clearActiveContentSelection,
  getActiveContentSelection,
  loadContentRecords,
  markContentShared,
  saveContentDraft,
  upsertAnalyzedVersion
} from "@/lib/content-record-store";
import { saveLatestReviewSnapshot } from "@/components/review-context-summary";
import type { ContentKind, LanguageQualityIssue, ReviewFinding, ReviewResult, RiskLevel } from "@/lib/types";

const contentTypes = contentKindOptions.filter((item) =>
  (["post", "advertisement", "campaign", "article", "script", "caption", "visual_content", "infographic", "publishing_plan"] as ContentKind[]).includes(item.value)
);
const channels = ["LinkedIn", "X", "Instagram", "TikTok", "Snapchat", "YouTube", "الموقع الإلكتروني"];
const audiences = ["عملاء محتملون من الأفراد", "منشآت ورواد أعمال", "زملاء وقطاع قانوني", "الجمهور العام"];
const purposes = ["تثقيف الجمهور حول موضوع قانوني", "رفع الوعي بالخدمات المهنية", "تعزيز الحضور المهني والثقة", "حملة توعوية"];

const severityLabel = { critical: "حرجة", high: "عالية", medium: "متوسطة", low: "منخفضة" } as const;
const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 } as const;
const reviewTabs = [
  { key: "findings", label: "الملاحظات" },
  { key: "compliance", label: "الامتثال" },
  { key: "risk", label: "المخاطر" },
  { key: "improvements", label: "فرص التحسين" },
  { key: "references", label: "المراجع المهنية والرسمية" },
  { key: "sharing", label: "المشاركة" }
] as const;
type ReviewTab = (typeof reviewTabs)[number]["key"];

const inlineSpellingRules = [
  { wrong: "هاذا", correction: "هذا", message: "صحح رسم اسم الإشارة إلى: هذا." },
  { wrong: "هاذه", correction: "هذه", message: "صحح رسم اسم الإشارة إلى: هذه." },
  { wrong: "نض", correction: "نص", message: "صحح رسم الكلمة إلى: نص." },
  { wrong: "اخطا", correction: "أخطاء", message: "أضف الهمزة والمد في كلمة: أخطاء." },
  { wrong: "اخطاء", correction: "أخطاء", message: "أضف الهمزة في كلمة: أخطاء." },
  { wrong: "لغويه", correction: "لغوية", message: "صحح التاء المربوطة في كلمة: لغوية." },
  { wrong: "واضحه", correction: "واضحة", message: "صحح التاء المربوطة في كلمة: واضحة." },
  { wrong: "قانونيه", correction: "قانونية", message: "صحح التاء المربوطة في كلمة: قانونية." },
  { wrong: "مهنيه", correction: "مهنية", message: "صحح التاء المربوطة في كلمة: مهنية." },
  { wrong: "اعلانيه", correction: "إعلانية", message: "أضف الهمزة وصحح التاء المربوطة في كلمة: إعلانية." },
  { wrong: "اعلاني", correction: "إعلاني", message: "أضف الهمزة في كلمة: إعلاني." },
  { wrong: "استشاره", correction: "استشارة", message: "صحح التاء المربوطة في كلمة: استشارة." },
  { wrong: "العملا", correction: "العملاء", message: "صحح رسم الكلمة إلى: العملاء." },
  { wrong: "المحكمه", correction: "المحكمة", message: "صحح التاء المربوطة في كلمة: المحكمة." },
  { wrong: "النتيجه", correction: "النتيجة", message: "صحح التاء المربوطة في كلمة: النتيجة." },
  { wrong: "الاجراءات", correction: "الإجراءات", message: "أضف الهمزة في المصطلح المهني: الإجراءات." },
  { wrong: "والاجراءات", correction: "والإجراءات", message: "أضف الهمزة في المصطلح المهني: والإجراءات." },
  { wrong: "القضيه", correction: "القضية", message: "صحح التاء المربوطة في كلمة: القضية." },
  { wrong: "السعوديه", correction: "السعودية", message: "صحح التاء المربوطة في كلمة: السعودية." },
  { wrong: "اجراءات", correction: "إجراءات", message: "أضف الهمزة في المصطلح المهني: إجراءات." },
  { wrong: "الاجراء", correction: "الإجراء", message: "أضف الهمزة في المصطلح المهني: الإجراء." },
  { wrong: "والاجراء", correction: "والإجراء", message: "أضف الهمزة في المصطلح المهني: والإجراء." },
  { wrong: "اجراء", correction: "إجراء", message: "أضف الهمزة في المصطلح المهني: إجراء." },
  { wrong: "اللائحه", correction: "اللائحة", message: "صحح التاء المربوطة في كلمة: اللائحة." },
  { wrong: "الانظمه", correction: "الأنظمة", message: "أضف الهمزة وصحح التاء المربوطة في كلمة: الأنظمة." }
];

function escapeInlinePattern(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function detectInlineWritingIssues(value: string): LanguageQualityIssue[] {
  return inlineSpellingRules.flatMap((rule, ruleIndex) => {
    const pattern = new RegExp(`(?<![\\u0600-\\u06FF])${escapeInlinePattern(rule.wrong)}(?![\\u0600-\\u06FF])`, "g");
    return Array.from(value.matchAll(pattern)).map((match, matchIndex) => ({
      id: `inline-spelling-${ruleIndex}-${matchIndex}`,
      category: "spelling" as const,
      severity: "medium" as const,
      message: rule.message,
      excerpt: match[0],
      suggestion: `استبدل "${match[0]}" بـ "${rule.correction}".`,
      start: match.index,
      end: (match.index ?? 0) + match[0].length
    }));
  });
}

function riskTone(risk: RiskLevel) {
  if (risk === "حرج" || risk === "مرتفع") return "gold" as const;
  if (risk === "متوسط") return "neutral" as const;
  return "good" as const;
}

function decisionTone(review: ReviewResult) {
  return review.publicationDecision.outcome === "RECOMMENDED"
    ? "good" as const
    : review.publicationDecision.outcome === "RECOMMENDED_AFTER_FINDINGS"
      ? "neutral" as const
      : "gold" as const;
}

function complianceKpiTone(value: number) {
  if (value >= 80) return "good" as const;
  if (value >= 60) return "gold" as const;
  return "danger" as const;
}

function languageKpiTone(value: number) {
  if (value >= 80) return "good" as const;
  if (value >= 60) return "neutral" as const;
  return "gold" as const;
}

function riskKpiTone(risk: RiskLevel) {
  if (risk === "حرج" || risk === "مرتفع") return "danger" as const;
  if (risk === "متوسط") return "gold" as const;
  return "good" as const;
}

function readinessKpiTone(review: ReviewResult) {
  if (review.publicationDecision.outcome === "RECOMMENDED") return "good" as const;
  if (review.publicationDecision.outcome === "NOT_RECOMMENDED") return "danger" as const;
  if (review.publishingReadinessScore < 60) return "danger" as const;
  return "gold" as const;
}

function businessScoreExplanation(kind: "compliance" | "risk" | "language", review: ReviewResult) {
  if (kind === "compliance") {
    return {
      label: "الامتثال",
      value: `${review.complianceScore}%`,
      explanation: review.findings.length
        ? `تأثر المستوى بسبب ${review.findings.length} ملاحظة غير معالجة مرتبطة بمراجع مهنية أو رسمية.`
        : "لم ترصد ملاحظات مخالفة مرتبطة بالمراجع المسجلة.",
      evidence: review.findings[0]?.evidence ?? "صياغة مهنية غير قطعية.",
      action: review.findings[0]?.suggestedSaferWording ?? "حافظ على الصياغة الحالية وراجع النسخة النهائية."
    };
  }
  if (kind === "risk") {
    return {
      label: "المخاطر",
      value: review.riskLevel,
      explanation: review.legalRiskAssessment.reason,
      evidence: review.findings[0]?.evidence ?? "لا توجد عبارة عالية المخاطر مرصودة.",
      action: review.findings[0]?.suggestedSaferWording ?? "استمر في تجنب الوعود والادعاءات غير المدعومة."
    };
  }
  return {
    label: "جودة اللغة",
    value: `${review.languageQuality.score}%`,
    explanation: review.languageQuality.issues.length
      ? `توجد ${review.languageQuality.issues.length} فرصة لتحسين الوضوح والصياغة المهنية.`
      : "الصياغة واضحة ومناسبة للمراجعة المهنية.",
    evidence: review.languageQuality.issues[0]?.excerpt || "النص الحالي",
    action: review.languageQuality.issues[0]?.suggestion || "لا يلزم تعديل لغوي جوهري."
  };
}

function downloadBlob(name: string, type: string, body: string) {
  const blob = new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

function FindingCard({ finding, index }: { finding: ReviewFinding; index: number }) {
  const severity = finding.businessSeverity ?? "low";
  return (
    <article className={`rounded-xl border bg-white p-5 shadow-sm ${severity === "critical" ? "border-red-300 ring-2 ring-red-100" : "border-line"}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs text-ink/50">الأولوية {index + 1}</p>
          <h3 className="mt-1 text-base font-semibold leading-8">{finding.title}</h3>
        </div>
        <StatusBadge tone={severity === "critical" || severity === "high" ? "gold" : severity === "medium" ? "neutral" : "good"}>
          {severityLabel[severity]}
        </StatusBadge>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg bg-paper p-4">
          <p className="text-xs text-ink/55">ما الخطأ؟</p>
          <p className="mt-2 leading-8">{finding.issue}</p>
        </div>
        <div className="rounded-lg bg-paper p-4">
          <p className="text-xs text-ink/55">الدليل من المحتوى</p>
          <p className="mt-2 leading-8 font-medium">“{finding.evidence}”</p>
        </div>
        <div className="rounded-lg bg-paper p-4">
          <p className="text-xs text-ink/55">لماذا يمثل مشكلة؟</p>
          <p className="mt-2 leading-8">{finding.legalExplanation}</p>
        </div>
        <div className="rounded-lg bg-paper p-4">
          <p className="text-xs text-ink/55">المرجع المتأثر</p>
          <div className="mt-2 flex items-start gap-3 leading-7"><OfficialLogo entity={officialEntityFromUrl(finding.sourceUrl)} /><span className="pt-1">{finding.sourceDocument} — {finding.legalReference}</span></div>
          <a href={finding.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm text-palm underline">
            فتح المرجع الرسمي <ExternalLink size={14} aria-hidden="true" />
          </a>
        </div>
        <div className="rounded-lg bg-paper p-4">
          <p className="text-xs text-ink/55">الأثر والمخاطر</p>
          <p className="mt-2 leading-8">قد ينشئ أثراً {finding.potentialImpact} ضمن {finding.riskDimensions?.map((item) => ({
            legal: "المخاطر القانونية",
            reputational: "مخاطر السمعة",
            confidentiality: "مخاطر السرية",
            misleadingCommunication: "مخاطر التواصل المضلل"
          }[item])).join("، ")}.</p>
        </div>
        <div className="rounded-lg border border-palm/20 bg-mint/50 p-4">
          <p className="text-xs text-palm">الإجراء الموصى به</p>
          <p className="mt-2 leading-8">{finding.suggestedSaferWording}</p>
        </div>
      </div>
    </article>
  );
}

function MetricExplanation({
  label,
  value,
  displayValue,
  explanation,
  evidence,
  action,
  tone = "neutral",
  inverse = false
}: {
  label: string;
  value: number;
  displayValue: string;
  explanation: string;
  evidence: string;
  action: string;
  tone?: "neutral" | "good" | "gold" | "danger";
  inverse?: boolean;
}) {
  const visualValue = value;
  return (
    <Panel className="h-full">
      <div className="grid gap-5 sm:grid-cols-[132px_1fr] sm:items-center">
        <CircularGauge value={visualValue} label={inverse ? "كلما ارتفع المؤشر ارتفع الخطر" : "مؤشر مساند للقرار"} tone={tone} />
        <div>
          <p className="text-xs text-ink/55">مؤشر مساند — لا يحل محل التفسير</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold">{label}</h3>
            <StatusBadge tone={tone}>{displayValue}</StatusBadge>
          </div>
          <p className="mt-3 leading-7">{explanation}</p>
          <div className="mt-3"><ProgressBar value={visualValue} tone={tone} /></div>
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-md bg-paper p-3 text-sm leading-7"><b>الدليل:</b> {evidence}</div>
        <div className="rounded-md bg-mint/50 p-3 text-sm leading-7"><b>الإجراء الموصى به:</b> {action}</div>
      </div>
    </Panel>
  );
}

function SpellingCheckerPanel({ issues }: { issues: LanguageQualityIssue[] }) {
  const spellingIssues = issues.filter((issue) => issue.category === "spelling");
  return (
    <Panel id="smart-spelling-checker">
      <SectionTitle
        title="المدقق الإملائي الذكي"
        subtitle="يعرض الكلمات أو العبارات ذات الأخطاء الإملائية الواضحة، ولا يعتبر النص صحيحًا عند وجود خطأ إملائي ظاهر."
      />
      {spellingIssues.length ? (
        <div className="grid gap-3">
          {spellingIssues.map((issue) => (
            <article key={issue.id} className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <SpellCheck size={18} className="text-red-700" aria-hidden="true" />
                <span className="rounded-md bg-white px-2.5 py-1 text-sm font-semibold text-red-700">{issue.excerpt}</span>
                <span className="text-sm text-ink/65">←</span>
                <span className="rounded-md bg-mint px-2.5 py-1 text-sm text-palm">{issue.suggestion}</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-red-800">{issue.message}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-lg bg-paper p-4 text-sm leading-7">لم يرصد المدقق الإملائي أخطاء واضحة في النص الحالي.</p>
      )}
    </Panel>
  );
}

function InlineContentGuidance({
  review,
  draftText,
  onApplyRewrite,
  loading
}: {
  review: ReviewResult | null;
  draftText: string;
  onApplyRewrite: () => void;
  loading: boolean;
}) {
  const liveSpellingIssues = detectInlineWritingIssues(draftText);

  if (!review && draftText.trim().length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-paper p-3 text-xs leading-6 text-ink/65">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-palm">
            <SpellCheck size={16} aria-hidden="true" />
            <b>لا يوجد محتوى محل مراجعة حاليًا</b>
          </div>
          <StatusBadge tone="neutral">لا توجد نتائج</StatusBadge>
        </div>
        <p className="mt-2">أدخل نصًا جديدًا لبدء التدقيق والتحليل. لن تظهر مؤشرات أو نتائج مرتبطة بمحتوى سابق بعد مسح النص.</p>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="space-y-3 rounded-lg border border-dashed border-line bg-paper p-3 text-xs leading-6 text-ink/65">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-palm">
            <SpellCheck size={16} aria-hidden="true" />
            <b>تدقيق مباشر أثناء الكتابة داخل منطقة المحتوى</b>
          </div>
          <StatusBadge tone={liveSpellingIssues.length ? "gold" : "neutral"}>{liveSpellingIssues.length ? "يحتاج تصحيحًا" : "بانتظار التحليل"}</StatusBadge>
        </div>
        {liveSpellingIssues.length ? (
          <div className="flex flex-wrap gap-2">
            {liveSpellingIssues.map((issue) => (
              <span key={issue.id} className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs leading-5 text-red-800">
                <b>{issue.excerpt}</b> ← {issue.suggestion}
              </span>
            ))}
          </div>
        ) : (
          <p>سيظهر التدقيق الإملائي واللغوي، والمساعد الذكي، ومسار التعديل المقترح داخل منطقة المحتوى بعد التحليل.</p>
        )}
      </div>
    );
  }

  const reviewSpellingIssues = review.languageQuality.issues.filter((issue) => issue.category === "spelling");
  const spellingIssues = reviewSpellingIssues.length ? reviewSpellingIssues : liveSpellingIssues;
  const firstFinding = review.findings[0];
  const firstLanguageIssue = review.languageQuality.issues[0] ?? liveSpellingIssues[0];
  const rewrite = review.governedRewrites[0];
  const languagePassed = review.languageQuality.passed && liveSpellingIssues.length === 0;
  const assistantGuidance = firstFinding
    ? [
        `ما الذي يحتاج انتباهك: ${firstFinding.title}.`,
        `الدليل من النص: "${firstFinding.evidence}".`,
        `سبب الملاحظة: ${firstFinding.legalExplanation}`,
        `الأثر المتوقع: ${firstFinding.issue} — مستوى الأثر ${firstFinding.potentialImpact}.`,
        `المرجع الرسمي: ${firstFinding.sourceDocument} — ${firstFinding.legalReference}.`,
        `الإجراء العملي: ${firstFinding.suggestedSaferWording}`
      ]
    : firstLanguageIssue
      ? [
          `ما الذي يحتاج تصحيحًا: "${firstLanguageIssue.excerpt}".`,
          `سبب التنبيه: ${firstLanguageIssue.message}`,
          `التصحيح المقترح: ${firstLanguageIssue.suggestion}`,
          "بعد التصحيح، أعد التحليل حتى ترتبط النتائج والمؤشرات بالنص الحالي فقط."
        ]
      : [
          review.publicationDecision.reason,
          review.readinessDecision.actions[0] ?? "راجع النص والسياق قبل الاعتماد أو المشاركة."
        ];

  return (
    <div className="space-y-3 rounded-lg border border-line bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-palm">
          <SpellCheck size={17} aria-hidden="true" />
          <p className="text-sm font-semibold">تدقيق مباشر داخل منطقة المحتوى</p>
        </div>
        <StatusBadge tone={languagePassed ? "good" : "gold"}>{languagePassed ? "سليم لغويًا" : "يحتاج تصحيحًا"}</StatusBadge>
      </div>

      {spellingIssues.length ? (
        <div className="flex flex-wrap gap-2">
          {spellingIssues.map((issue) => (
            <span key={issue.id} className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs leading-5 text-red-800">
              <b>{issue.excerpt}</b> ← {issue.suggestion}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs leading-6 text-ink/60">لم يرصد المدقق أخطاء إملائية واضحة داخل النص الحالي.</p>
      )}

      <div className="rounded-md bg-mint/50 p-3 text-xs leading-6">
        <div className="mb-1 flex items-center gap-2 text-palm"><Bot size={16} aria-hidden="true" /><b>المساعد الذكي</b></div>
        <p>
          {firstFinding
            ? `ابدأ بمعالجة "${firstFinding.title}" لأن العبارة المرتبطة هي "${firstFinding.evidence}". الإجراء المقترح: ${firstFinding.suggestedSaferWording}`
            : firstLanguageIssue
              ? `ابدأ بتصحيح "${firstLanguageIssue.excerpt}". ${firstLanguageIssue.suggestion}`
              : "لم تظهر ملاحظة مهنية أو لغوية مانعة. راجع النسخة النهائية قبل الاعتماد."}
        </p>
      </div>

      <div className="rounded-md border border-palm/20 bg-mint/30 p-3 text-xs leading-6">
        <div className="mb-2 flex items-center gap-2 text-palm"><Bot size={16} aria-hidden="true" /><b>توجيه المساعد حسب نتيجة التحليل</b></div>
        <ul className="list-disc space-y-1 pr-5">
          {assistantGuidance.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>

      {rewrite ? (
        <div className="rounded-md border border-palm/20 bg-paper p-3 text-xs leading-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <b>مسار التعديل المقترح</b>
            <button type="button" onClick={onApplyRewrite} disabled={loading} className="inline-flex items-center gap-1 rounded-md bg-palm px-3 py-1.5 text-xs text-white disabled:opacity-50">
              <Sparkles size={14} />استخدام الصياغة المقترحة
            </button>
          </div>
          <p className="mt-2 text-ink/70">{rewrite.suggestedText}</p>
        </div>
      ) : null}
    </div>
  );
}

function SmartAssistantPanel({ review }: { review: ReviewResult }) {
  const firstFinding = review.findings[0];
  const firstLanguageIssue = review.languageQuality.issues[0];
  const guidance = firstFinding
    ? [
        `ابدأ بمعالجة: ${firstFinding.title}.`,
        `سبب الملاحظة: ${firstFinding.legalExplanation}`,
        `العبارة المرتبطة داخل المحتوى: "${firstFinding.evidence}".`,
        `المرجع: ${firstFinding.sourceDocument} — ${firstFinding.legalReference}.`,
        `اقتراح التعديل: ${firstFinding.suggestedSaferWording}`
      ]
    : firstLanguageIssue
      ? [
          `ابدأ بتحسين اللغة: ${firstLanguageIssue.message}`,
          `العبارة المرتبطة: "${firstLanguageIssue.excerpt}".`,
          `التصحيح أو التحسين المقترح: ${firstLanguageIssue.suggestion}`,
          "بعد التصحيح، أعد التحليل للتأكد من أثر التعديل على جاهزية النشر."
        ]
      : [
          "لم تظهر ملاحظة مهنية أو إملائية واضحة في التحليل الحالي.",
          "راجع السياق والجمهور والقناة قبل النشر، ثم اعتمد النسخة النهائية عند اكتمال المراجعة."
        ];

  return (
    <Panel id="smart-assistant">
      <SectionTitle
        title="المساعد الذكي داخل النافذة"
        subtitle="يساعدك على فهم الملاحظة وسببها والقاعدة المرتبطة بها وطريقة تعديل النص، دون أن يحل محل مسؤولية المستخدم في النشر."
      />
      <div className="rounded-xl border border-palm/20 bg-mint/40 p-4">
        <div className="flex items-center gap-2 text-palm"><Bot size={20} aria-hidden="true" /><h3 className="font-semibold">توجيه عملي للمراجعة الحالية</h3></div>
        <ul className="mt-3 list-disc space-y-2 pr-5 text-sm leading-7">
          {guidance.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>
    </Panel>
  );
}

export default function ContentReviewPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [kind, setKind] = useState<ContentKind>("advertisement");
  const [channel, setChannel] = useState("LinkedIn");
  const [audience, setAudience] = useState(audiences[0]);
  const [purpose, setPurpose] = useState(purposes[0]);
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [contentId, setContentId] = useState<string>();
  const [versionNumber, setVersionNumber] = useState<number>();
  const [approved, setApproved] = useState(false);
  const [approving, setApproving] = useState(false);
  const [activeTab, setActiveTab] = useState<ReviewTab>("findings");
  const [isEditing, setIsEditing] = useState(false);
  const [editSnapshot, setEditSnapshot] = useState<{
    text: string;
    kind: ContentKind;
    channel: string;
    audience: string;
    purpose: string;
  } | null>(null);

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
    setAudience(version.audience);
    setPurpose(version.purpose);
    setReview(version.analysis ?? null);
    setApproved(Boolean(version.approvedAt));
    if (!version.analysis) {
      setMessage("تم فتح محتوى محفوظ من إصدار سابق. أعد تحليل المحتوى لعرض قرار النشر والنتائج بصيغتها الحالية.");
    }
  }, []);

  const contentTypeLabel = contentTypes.find((item) => item.value === kind)?.label ?? "محتوى مهني";
  const sortedFindings = useMemo(
    () => [...(review?.findings ?? [])].sort((a, b) => severityOrder[a.businessSeverity ?? "low"] - severityOrder[b.businessSeverity ?? "low"]),
    [review]
  );

  async function requestReview(reviewStatus?: "READY_FOR_PUBLISHING") {
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, kind, contentType: contentTypeLabel, channel, audience, purpose, reviewStatus })
    });
    if (!response.ok) throw new Error("تعذر إكمال المراجعة.");
    return (await response.json()).data as ReviewResult;
  }

  async function runReview() {
    setLoading(true);
    setMessage("");
    try {
      const result = await requestReview();
      setReview(result);
      saveLatestReviewSnapshot(result);
      const saved = upsertAnalyzedVersion({
        contentId,
        body: text,
        contentType: kind,
        contentTypeLabel,
        channel,
        audience,
        purpose,
        review: result
      });
      setContentId(saved.record.id);
      setVersionNumber(saved.version.version);
      setApproved(false);
      setIsEditing(false);
      setEditSnapshot(null);
      setMessage("اكتمل التحليل. ابدأ بقرار النشر ثم عالج الملاحظات حسب الأولوية.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر إكمال المراجعة.");
    } finally {
      setLoading(false);
    }
  }

  async function applyRewrite() {
    const rewrite = review?.governedRewrites[0];
    if (!rewrite) return;
    setText(rewrite.suggestedText);
    setMessage("تم تطبيق الصياغة المقترحة. جار إعادة التقييم للتحقق من النتيجة الفعلية.");
    setLoading(true);
    try {
      const result = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rewrite.suggestedText, kind, contentType: contentTypeLabel, channel, audience, purpose })
      }).then((response) => response.json()).then((payload) => payload.data as ReviewResult);
      setReview(result);
      saveLatestReviewSnapshot(result);
      const saved = upsertAnalyzedVersion({
        contentId,
        body: rewrite.suggestedText,
        contentType: kind,
        contentTypeLabel,
        channel,
        audience,
        purpose,
        review: result
      });
      setVersionNumber(saved.version.version);
      setApproved(false);
      setMessage("تم تطبيق الصياغة وإعادة تقييمها. راجع قرار النشر الجديد قبل الاعتماد.");
    } finally {
      setLoading(false);
    }
  }

  function beginEditing() {
    setEditSnapshot({ text, kind, channel, audience, purpose });
    setIsEditing(true);
    setMessage("يمكنك الآن تعديل المحتوى والسياق. احفظ المسودة أو أعد التحليل مباشرة.");
    document.getElementById("input")?.scrollIntoView({ behavior: "smooth" });
  }

  function cancelEditing() {
    if (editSnapshot) {
      setText(editSnapshot.text);
      setKind(editSnapshot.kind);
      setChannel(editSnapshot.channel);
      setAudience(editSnapshot.audience);
      setPurpose(editSnapshot.purpose);
    }
    setEditSnapshot(null);
    setIsEditing(false);
    setMessage("تم إلغاء التعديلات غير المحفوظة.");
  }

  function saveEdits() {
    if (!contentId || text.trim().length < 5) {
      setMessage("تعذر الحفظ: يجب أن يحتوي النص على خمسة أحرف على الأقل.");
      return;
    }
    const saved = saveContentDraft({
      contentId,
      body: text,
      contentType: kind,
      contentTypeLabel,
      channel,
      audience,
      purpose
    });
    if (!saved) {
      setMessage("تعذر حفظ التعديلات لأن سجل المحتوى غير متاح.");
      return;
    }
    setVersionNumber(saved.version.version);
    setReview(null);
    setApproved(false);
    setEditSnapshot(null);
    setIsEditing(false);
    setMessage("تم حفظ التعديلات كمسودة. أعد التحليل لعرض قرار النشر المحدث.");
  }

  async function approveCurrentVersion() {
    if (!contentId || !versionNumber || !review || approving) return;
    setApproving(true);
    setMessage("");
    try {
      const saved = approveContentVersion(contentId, versionNumber);
      if (!saved) {
        setMessage("تعذر الاعتماد: عالج الملاحظات والحواجز الظاهرة أولاً.");
        return;
      }
      const approvedReview = await requestReview("READY_FOR_PUBLISHING");
      saved.version.analysis = approvedReview;
      setReview(approvedReview);
      saveLatestReviewSnapshot(approvedReview);
      setApproved(true);
      setMessage("تم اعتماد الإصدار النهائي. أصبحت خيارات المشاركة والتصدير متاحة.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر إكمال الاعتماد.");
    } finally {
      setApproving(false);
    }
  }

  const report = review ? {
    "قرار النشر": review.publicationDecision.label,
    "سبب القرار": review.publicationDecision.reason,
    "مستوى الثقة": review.confidence.label,
    "الملاحظات": sortedFindings.map((finding) => ({
      "الملاحظة": finding.issue,
      "الدليل": finding.evidence,
      "المرجع": `${finding.sourceDocument} — ${finding.legalReference}`,
      "المخاطر": finding.potentialImpact,
      "الإجراء": finding.suggestedSaferWording
    })),
    "متطلبات ما قبل النشر": review.readinessDecision.blockers,
    "القنوات المقترحة": review.channelRecommendations.map((item) => ({
      "القناة": item.channel,
      "السبب": item.reason,
      "الجمهور": item.targetAudience,
      "الفائدة المتوقعة": item.expectedBenefit,
      "القيود": item.risks
    }))
  } : null;

  async function copyReport() {
    if (!report) return;
    await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setMessage("تم نسخ التقرير المهني.");
  }

  function downloadAnalysis() {
    if (!report) return;
    downloadBlob("تحليل-المحتوى.json", "application/json;charset=utf-8", JSON.stringify(report, null, 2));
    setMessage("تم تنزيل حزمة التحليل.");
  }

  function downloadWord() {
    if (!report) return;
    const findings = sortedFindings.map((item) => `<h3>${item.title}</h3><p><b>الدليل:</b> ${item.evidence}</p><p><b>المرجع:</b> ${item.sourceDocument} — ${item.legalReference}</p><p><b>الإجراء:</b> ${item.suggestedSaferWording}</p>`).join("");
    const html = `<html dir="rtl"><meta charset="utf-8"><body><h1>تقرير قرار النشر</h1><h2>${review?.publicationDecision.label}</h2><p>${review?.publicationDecision.reason}</p>${findings}</body></html>`;
    downloadBlob("تقرير-قرار-النشر.doc", "application/msword;charset=utf-8", html);
    setMessage("تم تنزيل تقرير Word.");
  }

  function prepareSharing() {
    if (!approved || !contentId || !versionNumber) return;
    const shared = markContentShared(contentId, versionNumber);
    if (!shared) return;
    setMessage("تم تجهيز النسخة المعتمدة للمشاركة وتسجيل الإجراء.");
    router.push("/social-media");
  }

  function clearContentInput() {
    clearActiveContentSelection();
    setText("");
    setReview(null);
    setApproved(false);
    setVersionNumber(undefined);
    setContentId(undefined);
    setIsEditing(false);
    setEditSnapshot(null);
    setMessage("تم مسح محتوى مربع النص فقط. لم تتغير بقية الحقول أو السجلات المحفوظة.");
  }

  function navigateToReviewSection(tab: ReviewTab) {
    setActiveTab(tab);
    window.requestAnimationFrame(() => {
      document.getElementById(tab)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <div className="content-review-window space-y-6">
      <PageHeader
        eyebrow="مساعد قرار النشر للمحامي"
        title="إدارة المحتوى الإعلامي والإعلاني للمحامين"
        description="ابدأ بما يحتاج إلى قرار: الملاحظات، الأدلة، الأثر، والإجراء الموصى به. الدرجات مؤشرات مساندة وليست النتيجة الأساسية."
        action={<button type="button" onClick={() => router.back()} className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5 text-sm transition hover:bg-paper focus-ring"><ArrowRight size={16} />رجوع</button>}
      />

      <Panel id="input">
        <SectionTitle title="1. إدخال المحتوى والسياق" subtitle="كلما اكتمل السياق ارتفعت موثوقية التوصية." />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="text-sm">نوع المحتوى<select value={kind} disabled={Boolean(review) && !isEditing} onChange={(event) => setKind(event.target.value as ContentKind)} className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 disabled:bg-paper disabled:text-ink/60">{contentTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label className="text-sm">القناة<select value={channel} disabled={Boolean(review) && !isEditing} onChange={(event) => setChannel(event.target.value)} className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 disabled:bg-paper disabled:text-ink/60">{channels.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="text-sm">الجمهور<select value={audience} disabled={Boolean(review) && !isEditing} onChange={(event) => setAudience(event.target.value)} className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 disabled:bg-paper disabled:text-ink/60">{audiences.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="text-sm">الهدف<select value={purpose} disabled={Boolean(review) && !isEditing} onChange={(event) => setPurpose(event.target.value)} className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2.5 disabled:bg-paper disabled:text-ink/60">{purposes.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
        <label className="mt-4 block text-sm">
          <span className="flex flex-wrap items-center justify-between gap-2">
            <span>النص محل المراجعة</span>
            <button
              type="button"
              onClick={clearContentInput}
              disabled={loading || text.length === 0}
              className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-xs text-ink/70 transition hover:border-palm hover:bg-mint hover:text-palm disabled:cursor-not-allowed disabled:opacity-40"
            >
              <XCircle size={14} aria-hidden="true" />
              مسح المحتوى
            </button>
          </span>
          <textarea value={text} disabled={Boolean(review) && !isEditing} onChange={(event) => setText(event.target.value)} className="mt-2 min-h-44 w-full rounded-lg border border-line p-4 leading-8 disabled:bg-paper disabled:text-ink/65" />
        </label>
        <div className="mt-3">
          <InlineContentGuidance review={review} draftText={text} onApplyRewrite={applyRewrite} loading={loading} />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {!review || isEditing ? <button type="button" onClick={runReview} disabled={loading || text.trim().length < 5} className="inline-flex items-center gap-2 rounded-md bg-palm px-5 py-2.5 text-white disabled:opacity-50"><FileText size={17} />{loading ? "جار التحليل..." : contentId ? "إعادة التحليل" : "تحليل المحتوى"}</button> : null}
          {review && !isEditing ? <button type="button" onClick={beginEditing} className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5"><Edit3 size={16} />تعديل</button> : null}
          {isEditing && contentId ? <button type="button" onClick={saveEdits} disabled={loading || text.trim().length < 5} className="inline-flex items-center gap-2 rounded-md border border-palm px-4 py-2.5 text-palm disabled:opacity-50"><Save size={16} />حفظ التعديلات</button> : null}
          {isEditing ? <button type="button" onClick={cancelEditing} disabled={loading} className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5 disabled:opacity-50"><AlertTriangle size={16} />إلغاء</button> : null}
        </div>
        {message ? <p className="mt-3 text-sm text-palm">{message}</p> : null}
      </Panel>

      {review ? (
        <>
          <Panel id="decision" className="border-2 border-palm/20">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs text-palm">2. قرار النشر</p>
                <h2 className="mt-2 text-lg font-semibold">{review.publicationDecision.label}</h2>
                <p className="mt-3 max-w-4xl leading-8 text-ink/75">{review.publicationDecision.reason}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone={decisionTone(review)}>{review.publicationDecision.label}</StatusBadge>
                <StatusBadge tone={review.confidence.level === "High" ? "good" : review.confidence.level === "Medium" ? "neutral" : "gold"}>الثقة {review.confidence.label}</StatusBadge>
              </div>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg bg-paper p-4"><p className="text-xs text-ink/55">لماذا هذه التوصية؟</p><p className="mt-2 leading-8">{review.confidence.reason}</p></div>
              <div className="rounded-lg bg-paper p-4"><p className="text-xs text-ink/55">ما المطلوب قبل النشر؟</p><ul className="mt-2 list-disc space-y-2 pr-5 leading-7">{review.readinessDecision.blockers.length ? review.readinessDecision.blockers.map((item) => <li key={item}>{item}</li>) : <li>لا توجد متطلبات مانعة متبقية.</li>}</ul></div>
            </div>
          </Panel>

          <nav aria-label="أقسام نتيجة مراجعة المحتوى" className="sticky top-2 z-10 flex gap-2 overflow-x-auto rounded-lg border border-line bg-white/95 p-2 shadow-sm backdrop-blur">
            {reviewTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => navigateToReviewSection(tab.key)}
                aria-current={activeTab === tab.key ? "page" : undefined}
                className={`shrink-0 rounded-md px-4 py-2 text-xs transition focus-ring sm:text-sm ${activeTab === tab.key ? "bg-palm text-white" : "text-ink/70 hover:bg-paper hover:text-ink"}`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <section aria-labelledby="supporting-indicators-title" className="space-y-4">
            <SectionTitle
              title="المؤشرات المساندة للقرار"
              subtitle="توضح الرسوم مستوى كل جانب، بينما تبقى الملاحظات والأدلة والأثر والإجراء الموصى به هي أساس القرار."
            />
            <div className="grid gap-4 xl:grid-cols-2">
              {(["compliance", "language"] as const).map((kindName) => {
                const metric = businessScoreExplanation(kindName, review);
                const value = kindName === "compliance" ? review.complianceScore : review.languageQuality.score;
                return (
                  <MetricExplanation
                    key={kindName}
                    label={kindName === "language" ? "جودة المحتوى" : metric.label}
                    value={value}
                    displayValue={metric.value}
                    explanation={metric.explanation}
                    evidence={metric.evidence}
                    action={metric.action}
                    tone={kindName === "language" ? languageKpiTone(value) : complianceKpiTone(value)}
                  />
                );
              })}
              {(() => {
                const metric = businessScoreExplanation("risk", review);
                return (
                  <MetricExplanation
                    label={metric.label}
                    value={review.riskScore}
                    displayValue={`${metric.value} — ${review.riskScore}%`}
                    explanation={metric.explanation}
                    evidence={metric.evidence}
                    action={metric.action}
                    tone={riskKpiTone(review.riskLevel)}
                    inverse
                  />
                );
              })()}
              <MetricExplanation
                label="جاهزية النشر"
                value={review.publishingReadinessScore}
                displayValue={`${review.readinessDecision.level} — ${review.publishingReadinessScore}%`}
                explanation={review.readinessDecision.reasons.join(" ")}
                evidence={review.readinessDecision.blockers.join("، ") || "لا توجد حواجز مانعة متبقية وفق نتائج المراجعة الحالية."}
                action={review.readinessDecision.actions.join("، ") || "راجع النسخة النهائية واعتمدها قبل تجهيز المشاركة."}
                tone={readinessKpiTone(review)}
              />
            </div>
          </section>

          <>
          {sortedFindings.some((item) => item.businessSeverity === "critical") ? (
            <div className="rounded-xl border-2 border-red-300 bg-red-50 p-5">
              <div className="flex items-center gap-2 text-red-800"><ShieldAlert size={22} /><h2 className="text-lg font-bold">ملاحظات حرجة تتطلب إجراءً فورياً</h2></div>
              <p className="mt-2 leading-7 text-red-800/80">هذه الملاحظات ظاهرة دائماً لأنها تمنع التوصية بالنشر حتى معالجتها وإعادة التقييم.</p>
            </div>
          ) : null}

          <section id="findings" className="space-y-4 scroll-mt-24">
            <SectionTitle title="3. الملاحظات حسب الأولوية" subtitle="الملاحظات الحرجة أولاً، ثم العالية والمتوسطة والمنخفضة. لا يعتمد العرض على ترتيب الاكتشاف." />
            {sortedFindings.length ? sortedFindings.map((finding, index) => <FindingCard key={`${finding.title}-${finding.evidence}`} finding={finding} index={index} />) : (
              <Panel><div className="flex items-start gap-3"><CheckCircle2 className="mt-1 text-palm" /><div><h3 className="font-semibold">لم ترصد مخالفة مهنية مرتبطة بالمراجع المسجلة</h3><p className="mt-2 leading-7 text-ink/70">راجع متطلبات الاعتماد وجودة اللغة قبل تجهيز النشر.</p></div></div></Panel>
            )}
          </section>
          </>

          <section id="compliance" className="scroll-mt-24">
            {(() => {
              const metric = businessScoreExplanation("compliance", review);
              return (
                <MetricExplanation
                  label={metric.label}
                  value={review.complianceScore}
                  displayValue={metric.value}
                  explanation={metric.explanation}
                  evidence={metric.evidence}
                  action={metric.action}
                  tone={complianceKpiTone(review.complianceScore)}
                />
              );
            })()}
          </section>

          <section id="risk" className="scroll-mt-24">
            {(() => {
              const metric = businessScoreExplanation("risk", review);
              return (
                <MetricExplanation
                  label={metric.label}
                  value={review.riskScore}
                  displayValue={`${metric.value} — ${review.riskScore}%`}
                  explanation={metric.explanation}
                  evidence={metric.evidence}
                  action={metric.action}
                  tone={riskKpiTone(review.riskLevel)}
                  inverse
                />
              );
            })()}
          </section>

          <section id="improvements" className="space-y-5 scroll-mt-24">
          {(() => {
            const metric = businessScoreExplanation("language", review);
            return (
              <MetricExplanation
                label={metric.label}
                value={review.languageQuality.score}
                displayValue={metric.value}
                explanation={metric.explanation}
                evidence={metric.evidence}
                action={metric.action}
                tone={languageKpiTone(review.languageQuality.score)}
              />
            );
          })()}
          <Panel id="rewrite">
            <SectionTitle title="4. الصياغة المقترحة وأثر التحسين" subtitle="الأثر المتوقع توجيهي، وتُعاد المراجعة فعلياً بعد تطبيق الصياغة." />
            {review.governedRewrites.length ? review.governedRewrites.map((rewrite) => (
              <div key={rewrite.id} className="rounded-xl border border-line p-5">
                <p className="leading-8">{rewrite.suggestedText}</p>
                <p className="mt-3 rounded-lg bg-paper p-3 text-xs leading-6 text-ink/65">النص المقترح لغرض التعليم والمساعدة فقط، وتظل مسؤولية النشر والمشاركة والاعتماد على المستخدم.</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg bg-paper p-4"><p className="text-xs text-ink/55">قبل التوصية</p><p className="mt-2">الامتثال {rewrite.originalComplianceScore}% — المخاطر {rewrite.originalRiskLevel}</p></div>
                  <div className="rounded-lg bg-mint p-4"><p className="text-xs text-palm">الأثر المتوقع بعد التطبيق</p><p className="mt-2">الامتثال المتوقع {rewrite.proposedComplianceScore}% — المخاطر المتوقعة {rewrite.proposedRiskLevel}</p></div>
                </div>
                <button type="button" onClick={applyRewrite} disabled={loading} className="mt-4 inline-flex items-center gap-2 rounded-md bg-palm px-4 py-2.5 text-white"><Sparkles size={16} />تطبيق الصياغة وإعادة التقييم</button>
              </div>
            )) : <p className="rounded-lg bg-paper p-4 leading-7">لا توجد صياغة بديلة مطلوبة بعد التقييم الحالي.</p>}
          </Panel>
          </section>

            <Panel id="references" className="scroll-mt-24">
              <SectionTitle title="المراجع المهنية والرسمية" subtitle="المصادر الرسمية المرتبطة مباشرة بالملاحظات، مع بيان القاعدة المتأثرة." />
              {sortedFindings.length ? (
                <div className="grid gap-3">
                  {sortedFindings.map((finding) => (
                    <article key={`${finding.sourceUrl}-${finding.legalReference}`} className="rounded-lg border border-line bg-paper p-4">
                      <div className="flex items-start gap-3"><OfficialLogo entity={officialEntityFromUrl(finding.sourceUrl)} /><h3 className="pt-1 font-semibold">{finding.sourceDocument}</h3></div>
                      <p className="mt-2 text-sm leading-7">{finding.legalReference}</p>
                      <p className="mt-2 text-sm leading-7 text-ink/65">{finding.legalExplanation}</p>
                      <a href={finding.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm text-palm underline">
                        فتح المرجع الرسمي <ExternalLink size={14} aria-hidden="true" />
                      </a>
                    </article>
                  ))}
                </div>
              ) : <p className="rounded-lg bg-paper p-4 leading-7">لم تُرصد ملاحظة تستدعي إظهار مرجع متأثر في هذه المراجعة.</p>}
            </Panel>

          <>
          <Panel id="channels">
            <SectionTitle title="5. القنوات المقترحة" subtitle="كل توصية مبنية على نوع المحتوى والجمهور والهدف ونتائج المراجعة." />
            <div className="grid gap-4 lg:grid-cols-3">
              {review.channelRecommendations.map((item) => {
                const Icon = socialBrandIcons[item.key];
                return (
                  <article key={item.key} className="rounded-xl border border-line bg-white p-5">
                    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3">{Icon ? <Icon size={28} className={socialBrandStyles[item.key]?.icon} /> : null}<h3 className="text-base font-semibold">{item.channel}</h3></div><StatusBadge tone={item.suitability === "عالية" ? "good" : "neutral"}>الملاءمة {item.suitability}</StatusBadge></div>
                    <p className="mt-4 leading-7">{item.reason}</p>
                    <dl className="mt-4 space-y-3 text-sm leading-7">
                      <div><dt className="text-ink/55">الجمهور</dt><dd>{item.targetAudience}</dd></div>
                      <div><dt className="text-ink/55">الصيغة</dt><dd>{item.format}</dd></div>
                      <div><dt className="text-ink/55">الفائدة المتوقعة</dt><dd>{item.expectedBenefit}</dd></div>
                      <div><dt className="text-ink/55">المخاطر أو القيود</dt><dd>{item.risks}</dd></div>
                      <div><dt className="text-ink/55">التوقيت المقترح</dt><dd>{item.timing}</dd></div>
                    </dl>
                  </article>
                );
              })}
            </div>
          </Panel>

          <Panel id="workflow">
            <SectionTitle title="6. مسار القرار والتنفيذ" subtitle="يوضح المرحلة الحالية، سببها، وما يجب فعله للانتقال إلى الخطوة التالية." />
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              {review.decisionWorkflow.map((stage, index) => (
                <div key={stage.key} className={`rounded-xl border p-4 ${stage.status === "الحالي" ? "border-palm bg-mint" : stage.status === "قيد الانتظار" ? "border-line bg-paper opacity-70" : "border-line bg-white"}`}>
                  <div className="flex items-center justify-between"><span className="grid h-7 w-7 place-items-center rounded-full bg-palm text-xs text-white">{index + 1}</span><StatusBadge tone={stage.status === "مكتمل" ? "good" : stage.status === "الحالي" ? "neutral" : "gold"}>{stage.status}</StatusBadge></div>
                  <h3 className="mt-3 font-semibold">{stage.label}</h3>
                  <p className="mt-2 text-xs leading-6 text-ink/65">{stage.reason}</p>
                  <p className="mt-3 text-xs leading-6 text-palm">{stage.action}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel id="approval">
            <SectionTitle title="7. اعتماد النسخة" subtitle="لا تتاح المشاركة أو التصدير إلا للنسخة النهائية التي تمت مراجعتها واعتمادها." />
            <button type="button" onClick={approveCurrentVersion} disabled={approved || approving || review.findings.some((finding) => !finding.resolved) || !review.languageQuality.passed || ["حرج", "مرتفع"].includes(review.riskLevel)} className="inline-flex items-center gap-2 rounded-md bg-palm px-5 py-2.5 text-white disabled:cursor-not-allowed disabled:opacity-50"><Save size={16} />{approved ? "تم اعتماد النسخة" : approving ? "جار الاعتماد..." : "اعتماد النسخة الحالية"}</button>
            {!approved ? <p className="mt-3 text-sm text-ink/65">عالج الحواجز الظاهرة أولاً. لن يؤدي الاعتماد إلى إخفاء ملاحظة حرجة أو تجاوزها.</p> : null}
          </Panel>

          <Panel id="sharing" className="scroll-mt-24">
            <SectionTitle title="8. المشاركة والتصدير" subtitle="وحدة واحدة تحفظ النسخ والتنزيل والتقارير والمشاركة دون ادعاء نشر تلقائي." />
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={downloadWord} disabled={!approved} className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5 disabled:opacity-40"><FileDown size={16} />تقرير Word</button>
              <button type="button" onClick={prepareSharing} disabled={!approved} className="inline-flex items-center gap-2 rounded-md bg-palm px-4 py-2.5 text-white disabled:opacity-40"><Share2 size={16} />المشاركة</button>
            </div>
            {!approved ? <div className="mt-4 flex items-center gap-2 rounded-lg bg-gold/10 p-4 text-sm"><AlertTriangle size={17} className="text-gold" />يجب اعتماد المخرج قبل إتاحة المشاركة والتصدير.</div> : null}
          </Panel>
          </>

          <p className="rounded-lg border border-line bg-white p-4 text-xs leading-7 text-ink/60">
            هذا المقترح استرشادي، تم إنشاؤه بناءً على البيانات المدخلة ونتائج المراجعة والمراجع المهنية المسجلة في المنصة. يظل قرار التعديل أو الاعتماد أو النشر مسؤولية المستخدم.
          </p>
        </>
      ) : null}
    </div>
  );
}
