"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BarChart2,
  BookOpen,
  Bot,
  Building2,
  CalendarDays,
  CheckCircle2,
  Edit3,
  ExternalLink,
  FileDown,
  FileText,
  Globe,
  Image as ImageIcon,
  Layers,
  Megaphone,
  MessageSquare,
  Printer,
  Save,
  Scale,
  Share2,
  ShieldAlert,
  SpellCheck,
  Sparkles,
  TrendingUp,
  User,
  Users,
  Video,
  XCircle
} from "lucide-react";
import { CircularGauge, PageHeader, Panel, ProgressBar, SectionTitle, StatusBadge } from "@/components/ui";
import {
  LinkedInIcon,
  XIcon,
  InstagramIcon,
  TikTokIcon,
  SnapchatIcon,
  YouTubeIcon,
  socialBrandIcons,
  socialBrandStyles
} from "@/components/social-icons";
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
import type { ContentKind, LanguageQualityIssue, ReviewFinding, ReviewResult, RiskAffectedParty, RiskLevel } from "@/lib/types";

const contentTypes = contentKindOptions.filter((item) =>
  (["post", "advertisement", "campaign", "article", "script", "caption", "visual_content", "infographic", "publishing_plan"] as ContentKind[]).includes(item.value)
);
const channels = ["LinkedIn", "X", "Instagram", "TikTok", "Snapchat", "YouTube", "الموقع الإلكتروني"];
const audiences = ["عملاء محتملون من الأفراد", "منشآت ورواد أعمال", "زملاء وقطاع قانوني", "الجمهور العام"];
const purposes = ["تثقيف الجمهور حول موضوع قانوني", "رفع الوعي بالخدمات المهنية", "تعزيز الحضور المهني والثقة", "حملة توعوية"];

const contentTypeIcons: Record<string, React.ReactNode> = {
  post: <FileText size={13} />,
  advertisement: <Megaphone size={13} />,
  campaign: <Layers size={13} />,
  article: <BookOpen size={13} />,
  script: <Video size={13} />,
  caption: <MessageSquare size={13} />,
  visual_content: <ImageIcon size={13} />,
  infographic: <BarChart2 size={13} />,
  publishing_plan: <CalendarDays size={13} />
};

const channelIcons: Record<string, React.ReactNode> = {
  LinkedIn: <LinkedInIcon size={13} />,
  X: <XIcon size={13} />,
  Instagram: <InstagramIcon size={13} />,
  TikTok: <TikTokIcon size={13} />,
  Snapchat: <SnapchatIcon size={13} />,
  YouTube: <YouTubeIcon size={13} />,
  "الموقع الإلكتروني": <Globe size={13} />
};

const audienceIcons: Record<string, React.ReactNode> = {
  "عملاء محتملون من الأفراد": <User size={13} />,
  "منشآت ورواد أعمال": <Building2 size={13} />,
  "زملاء وقطاع قانوني": <Scale size={13} />,
  "الجمهور العام": <Users size={13} />
};

const purposeIcons: Record<string, React.ReactNode> = {
  "تثقيف الجمهور حول موضوع قانوني": <BookOpen size={13} />,
  "رفع الوعي بالخدمات المهنية": <TrendingUp size={13} />,
  "تعزيز الحضور المهني والثقة": <Award size={13} />,
  "حملة توعوية": <Megaphone size={13} />
};

const chipBase = "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition focus-ring";
const chipIdle = "border-line bg-white text-ink/65 hover:border-palm hover:bg-mint hover:text-palm";
const chipSelected = "border-palm bg-mint text-palm shadow-[0_0_0_1px_theme(colors.palm)]";

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

type AssistantIssue = {
  id: string;
  severity: keyof typeof severityOrder;
  label: string;
  evidence: string;
  reason: string;
  action: string;
  source?: string;
};

function languageIssueSeverity(issue: LanguageQualityIssue): keyof typeof severityOrder {
  if (issue.severity === "high") return "high";
  if (issue.severity === "medium") return "medium";
  return "low";
}

function buildAssistantIssues(review: ReviewResult, liveSpellingIssues: LanguageQualityIssue[]) {
  const findingIssues: AssistantIssue[] = review.findings.map((finding, index) => ({
    id: `finding-${index}-${finding.title}`,
    severity: finding.businessSeverity ?? "low",
    label: finding.title,
    evidence: finding.evidence,
    reason: finding.legalExplanation,
    action: finding.suggestedSaferWording,
    source: `${finding.sourceDocument} — ${finding.legalReference}`
  }));

  const mergedLanguageIssues = [...review.languageQuality.issues, ...liveSpellingIssues].filter(
    (issue, index, list) => list.findIndex((item) => `${item.category}-${item.excerpt}-${item.suggestion}` === `${issue.category}-${issue.excerpt}-${issue.suggestion}`) === index
  );

  const languageIssues: AssistantIssue[] = mergedLanguageIssues.map((issue, index) => ({
    id: `language-${index}-${issue.excerpt}`,
    severity: languageIssueSeverity(issue),
    label: issue.category === "spelling" ? "تصحيح إملائي أو لغوي" : "تحسين لغوي أو أسلوبي",
    evidence: issue.excerpt,
    reason: issue.message,
    action: issue.suggestion,
    source: "قواعد لغوية عربية معيارية للتدقيق الإملائي والتحريري"
  }));

  const riskIssue: AssistantIssue[] = ["بالغ", "حرج", "مرتفع"].includes(review.riskLevel)
    ? [{
        id: "risk-summary",
        severity: (review.riskLevel === "بالغ" || review.riskLevel === "حرج") ? "critical" : "high",
        label: `مستوى مخاطر ${review.riskLevel}`,
        evidence: review.findings[0]?.evidence ?? review.legalRiskAssessment.reason,
        reason: review.legalRiskAssessment.reason,
        action: review.readinessDecision.actions[0] ?? "عالج المخاطر قبل التفكير في النشر.",
        source: review.findings[0] ? `${review.findings[0].sourceDocument} — ${review.findings[0].legalReference}` : "نتيجة تقييم المخاطر"
      }]
    : [];

  return [...findingIssues, ...riskIssue, ...languageIssues].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );
}

function assistantSeverityText(severity: keyof typeof severityOrder) {
  if (severity === "critical") return "حرجة";
  if (severity === "high") return "عالية";
  if (severity === "medium") return "متوسطة";
  return "منخفضة";
}

function buildInternalAssistantSummary(review: ReviewResult, assistantIssues: AssistantIssue[], languagePassed: boolean) {
  const professionalIssues = assistantIssues.filter((issue) => issue.id.startsWith("finding-"));
  const riskIssues = assistantIssues.filter((issue) => issue.id === "risk-summary");
  const languageIssues = assistantIssues.filter((issue) => issue.id.startsWith("language-"));
  const topIssue = assistantIssues[0];

  if (topIssue) {
    const parts = [
      professionalIssues.length ? `${professionalIssues.length} ملاحظة مهنية أو امتثالية` : null,
      riskIssues.length ? "مؤشر مخاطر مرتفع يحتاج معالجة قبل النشر" : null,
      languageIssues.length ? `${languageIssues.length} ملاحظة لغوية أو إملائية` : null
    ].filter(Boolean);

    return `ابدأ بالأولوية ${assistantSeverityText(topIssue.severity)}: "${topIssue.label}". رصد النظام ${parts.join("، ")}. راجع الدليل والمرجع والإجراء المقترح لكل بند قبل الاعتماد أو المشاركة.`;
  }

  if (!languagePassed) {
    return "لا توجد مخالفة مهنية مرصودة، لكن توجد ملاحظات لغوية أو تحريرية يجب معالجتها قبل اعتماد النسخة النهائية.";
  }

  return review.publicationDecision.recommended
    ? "لا توجد ملاحظات مهنية أو لغوية مانعة في النص الحالي. راجع النسخة النهائية وقرار النشر قبل الاعتماد."
    : review.publicationDecision.reason;
}

function riskTone(risk: RiskLevel) {
  if (risk === "بالغ" || risk === "حرج" || risk === "مرتفع") return "gold" as const;
  if (risk === "متوسط") return "neutral" as const;
  return "good" as const;
}

function decisionTone(review: ReviewResult) {
  if (review.analysisMode === "pattern-only") return "neutral" as const;
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
  if (risk === "بالغ" || risk === "حرج" || risk === "مرتفع") return "danger" as const;
  if (risk === "متوسط") return "gold" as const;
  return "good" as const;
}

function readinessKpiTone(review: ReviewResult) {
  if (review.analysisMode === "pattern-only") return "neutral" as const;
  if (review.publicationDecision.outcome === "RECOMMENDED") return "good" as const;
  if (review.publicationDecision.outcome === "NOT_RECOMMENDED") return "danger" as const;
  if (review.publishingReadinessScore < 60) return "danger" as const;
  return "gold" as const;
}

function professionalismKpiTone(score: number): "good" | "gold" | "danger" {
  if (score >= 80) return "good";
  if (score >= 60) return "gold";
  return "danger";
}

function professionalismExplanation(score: number) {
  if (score >= 80) return { explanation: "الأسلوب رصين ويليق بمحامٍ مرخص.", action: "حافظ على هذا المستوى من الرصانة في جميع منشوراتك." };
  if (score >= 60) return { explanation: "الأسلوب بحاجة لتحسين ليعكس الرصانة المهنية المتوقعة من محامٍ.", action: "أعد صياغة النص بأسلوب أكاديمي رسمي يليق بالمهنة القانونية." };
  return { explanation: "الأسلوب لا يليق بمحامٍ مرخص — يحتاج إعادة كتابة كاملة.", action: "اكتب النص من جديد بلغة فصحى رصينة تخدم هدفاً مهنياً أو تثقيفياً واضحاً." };
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
    const riskExp = review.riskScoreExplanation;
    const riskParties = riskExp.affectedParties?.join("، ");
    return {
      label: "المخاطر",
      value: review.riskLevel,
      explanation: review.legalRiskAssessment.reason,
      evidence: riskExp.explanation ?? (riskParties ? `الجهات المتضررة: ${riskParties}` : review.legalRiskAssessment.reason),
      action: riskExp.fix ?? "استمر في تجنب الوعود والادعاءات غير المدعومة."
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

function contentQualityExplanation(review: ReviewResult) {
  const exp = review.contentQualityScoreExplanation;
  const score = review.contentQualityScore;
  const factorLabels = exp.factors.map((f) => `${f.label} ${f.sourceScore}%`).join(" | ");
  if (exp.redLine) {
    return {
      label: "جودة المحتوى",
      value: `${score}%`,
      explanation: "رُصدت مخالفة جوهرية تحجب تقدم المحتوى في مسار المراجعة.",
      evidence: review.findings[0]?.evidence ?? review.legalRiskAssessment.reason,
      action: review.findings[0]?.suggestedSaferWording ?? "عالج الحواجز الجوهرية قبل المضي في مراحل التقييم."
    };
  }
  return {
    label: "جودة المحتوى",
    value: `${score}%`,
    explanation: score >= 80
      ? `المحتوى يجتاز المؤشرات الأربعة. (${factorLabels})`
      : score >= 60
        ? `المحتوى بحاجة إلى تحسين في بعض المؤشرات. (${factorLabels})`
        : `المحتوى يفتقر إلى معايير جودة في مؤشرات رئيسية. (${factorLabels})`,
    evidence: review.languageQuality.issues[0]?.excerpt || review.findings[0]?.evidence || "التقييم الشامل للمؤشرات الأربعة.",
    action: review.languageQuality.issues[0]?.suggestion || review.findings[0]?.suggestedSaferWording || "راجع كل مؤشر على حدة وعالج الضعف الأكبر أولاً."
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
          <p className="mt-2 leading-8">{finding.explanation}</p>
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
  id,
  label,
  value,
  displayValue,
  explanation,
  evidence,
  action,
  tone = "neutral",
  inverse = false
}: {
  id?: string;
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
    <Panel id={id} className="h-full scroll-mt-24">
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

function sevTag(severity: "critical" | "high" | "medium" | "low") {
  if (severity === "critical") return { label: "حرج", cls: "bg-red-100 text-red-800" };
  if (severity === "high") return { label: "مرتفع", cls: "bg-orange-100 text-orange-800" };
  if (severity === "medium") return { label: "متوسط", cls: "bg-amber-100 text-amber-800" };
  return { label: "منخفض", cls: "bg-slate-100 text-slate-600" };
}

function qualLabel(score: number) {
  if (score >= 85) return { label: "ممتاز", cls: "bg-green-100 text-green-800" };
  if (score >= 70) return { label: "جيد", cls: "bg-blue-100 text-blue-800" };
  if (score >= 50) return { label: "متوسط", cls: "bg-amber-100 text-amber-800" };
  return { label: "ضعيف", cls: "bg-red-100 text-red-800" };
}

const categoryLabel: Record<string, string> = {
  spelling: "إملاء",
  grammar: "نحو",
  style: "أسلوب",
  readability: "وضوح",
  "اتساق المصطلحات": "مصطلحات"
};

function ComplianceIndicatorCard({ review }: { review: ReviewResult }) {
  const isCompliant = review.findings.length === 0;
  return (
    <Panel id="compliance" className="scroll-mt-24">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">الامتثال القانوني</p>
      <StatusBadge tone={isCompliant ? "good" : "danger"}>
        {isCompliant ? "ملتزم — لا مخالفات" : `${review.findings.length} ${review.findings.length === 1 ? "مخالفة" : "مخالفات"} مرصودة`}
      </StatusBadge>
      {review.findings.length > 0 ? (
        <div className="mt-4 space-y-2">
          {review.findings.map((f) => {
            const sev = f.businessSeverity ?? "low";
            const tag = sevTag(sev);
            return (
              <div key={f.traceabilityId} className={`flex items-start gap-2.5 rounded-lg p-3 ${sev === "critical" || sev === "high" ? "border border-red-200 bg-red-50" : "border border-amber-200 bg-amber-50"}`}>
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-bold ${tag.cls}`}>{tag.label}</span>
                <span className="text-sm leading-6">{f.title}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-4 text-sm leading-7 text-slate-500">{"لم ترصد مخالفات مرتبطة بالمراجع المسجلة."}</p>
      )}
    </Panel>
  );
}

function RiskIndicatorCard({ review }: { review: ReviewResult }) {
  const tone = riskKpiTone(review.riskLevel);
  const parties = review.riskScoreExplanation.affectedParties ?? [];
  const riskLevels = ["منخفض", "متوسط", "مرتفع", "بالغ"];
  const activeCount = riskLevels.indexOf(review.riskLevel) + 1;
  const partyIcon = (p: RiskAffectedParty) => {
    if (p === "الموكل") return <User size={13} aria-hidden="true" />;
    if (p === "المحامي") return <Scale size={13} aria-hidden="true" />;
    return <Award size={13} aria-hidden="true" />;
  };
  return (
    <Panel id="risk" className="scroll-mt-24">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">المخاطر</p>
      <div className="flex items-center justify-between gap-3">
        <StatusBadge tone={tone}>{review.riskLevel}</StatusBadge>
        <div className="flex gap-1.5">
          {riskLevels.map((_, i) => (
            <span key={i} className={`inline-block h-2.5 w-2.5 rounded-full ${i < activeCount ? (tone === "good" ? "bg-green-400" : tone === "gold" ? "bg-amber-400" : "bg-red-500") : "bg-slate-200"}`} />
          ))}
        </div>
      </div>
      {parties.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs text-slate-400">الجهات المتضررة</p>
          <div className="flex flex-wrap gap-2">
            {parties.map((p) => (
              <span key={p} className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                {partyIcon(p)}{p}
              </span>
            ))}
          </div>
        </div>
      )}
      {review.riskScoreExplanation.explanation ? (
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">{review.riskScoreExplanation.explanation}</p>
      ) : null}
    </Panel>
  );
}

function ProfessionalismIndicatorCard({ review }: { review: ReviewResult }) {
  const tone = professionalismKpiTone(review.professionalismScore);
  const passed = review.professionalismScore >= 80;
  const { explanation, action } = professionalismExplanation(review.professionalismScore);
  return (
    <Panel className="scroll-mt-24">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">الكتابة المهنية</p>
      <StatusBadge tone={tone}>{passed ? "ناجح" : "يحتاج تحسين"}</StatusBadge>
      <p className="mt-4 rounded-lg border-r-2 border-amber-300 bg-amber-50 p-3 text-sm leading-6">{explanation}</p>
      <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6">
        <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">الإصلاح المقترح</span>
        {action}
      </div>
    </Panel>
  );
}

function LanguageIndicatorCard({ review }: { review: ReviewResult }) {
  const passed = review.languageQuality.passed;
  const tone = languageKpiTone(review.languageQuality.score);
  const issues = review.languageQuality.issues;
  return (
    <Panel className="scroll-mt-24">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">اللغة والإملاء</p>
      <StatusBadge tone={passed ? "good" : tone}>
        {passed
          ? issues.length === 0 ? "ناجح — لا ملاحظات" : `ناجح — ${issues.length} ملاحظة`
          : `يحتاج تصحيح — ${issues.length} ملاحظة`}
      </StatusBadge>
      {issues.length > 0 ? (
        <div className="mt-4 space-y-2">
          {issues.map((issue, i) => (
            <div key={issue.id ?? i} className="flex items-start gap-2.5 rounded-lg border border-line bg-paper p-3">
              <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-xs font-bold text-red-800">
                {categoryLabel[issue.category] ?? issue.category}
              </span>
              <span className="text-sm leading-6">{issue.message}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm leading-7 text-slate-500">{"لم ترصد ملاحظات لغوية أو إملائية."}</p>
      )}
    </Panel>
  );
}

function ContentQualityIndicatorCard({ review }: { review: ReviewResult }) {
  const exp = review.contentQualityScoreExplanation;
  const statusTone = exp.redLine ? "danger" as const : review.contentQualityScore >= 80 ? "good" as const : "gold" as const;
  const statusLabel = exp.redLine ? "خط أحمر مُفعَّل" : review.contentQualityScore >= 80 ? "متوازن" : "يحتاج تحسين";
  return (
    <Panel className="scroll-mt-24">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">جودة المحتوى</p>
      <StatusBadge tone={statusTone}>{statusLabel}</StatusBadge>
      <div className="mt-4 space-y-2.5">
        {exp.factors.map((factor) => {
          const q = qualLabel(factor.sourceScore);
          return (
            <div key={factor.key} className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-600">{factor.label}</span>
              <span className={`rounded px-2 py-0.5 text-xs font-bold ${q.cls}`}>{q.label}</span>
            </div>
          );
        })}
      </div>
      {exp.redLine && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-xs font-medium leading-6 text-red-700">
          يوجد مخالفة قانونية — النشر غير متاح حتى المعالجة
        </p>
      )}
    </Panel>
  );
}

function ReadinessIndicatorCard({ review }: { review: ReviewResult }) {
  const tone = readinessKpiTone(review);
  const gates = review.publishingReadinessExplanation.gates;
  return (
    <Panel className="scroll-mt-24">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">جاهزية النشر</p>
      <StatusBadge tone={tone}>{review.readinessDecision.level}</StatusBadge>
      <div className="mt-4 space-y-3">
        {gates.map((gate) => (
          <div key={gate.key} className="flex items-start gap-3">
            <span className={`mt-0.5 shrink-0 text-sm font-bold ${gate.passed ? "text-green-600" : "text-red-500"}`}>
              {gate.passed ? "✓" : "✗"}
            </span>
            <div>
              <p className="text-sm font-medium leading-6">{gate.label}</p>
              <p className="text-xs leading-5 text-slate-400">{gate.reason}</p>
            </div>
          </div>
        ))}
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
  const rewrite = review.governedRewrites[0];
  const enhancedRewrite = rewrite
    ? review.aiEnhancement?.rewriteSuggestions.find((item) => item.rewriteId === rewrite.id)
    : undefined;
  const languagePassed = review.languageQuality.passed && review.languageQuality.issues.length === 0 && liveSpellingIssues.length === 0;
  const assistantIssues = buildAssistantIssues(review, liveSpellingIssues);
  const internalAssistantSummary = buildInternalAssistantSummary(review, assistantIssues, languagePassed);
  const languageBadgeLabel = languagePassed
    ? review.findings.length
      ? "لا توجد أخطاء لغوية واضحة"
      : "سليم لغويًا"
    : "يحتاج تصحيحًا";

  return (
    <div className="space-y-3 rounded-lg border border-line bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-palm">
          <SpellCheck size={17} aria-hidden="true" />
          <p className="text-sm font-semibold">تدقيق مباشر داخل منطقة المحتوى</p>
        </div>
        <StatusBadge tone={languagePassed ? "good" : "gold"}>{languageBadgeLabel}</StatusBadge>
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
          {review.aiEnhancement?.assistantSummary
            ? review.aiEnhancement.assistantSummary
            : internalAssistantSummary}
        </p>
      </div>

      <div className="rounded-md border border-palm/20 bg-mint/30 p-3 text-xs leading-6">
        <div className="mb-2 flex items-center gap-2 text-palm"><Bot size={16} aria-hidden="true" /><b>توجيه المساعد حسب نتيجة التحليل</b></div>
        {assistantIssues.length ? (
          <ol className="space-y-2 pr-5">
            {assistantIssues.map((item, index) => (
              <li key={item.id} className="rounded-md border border-line bg-white p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={item.severity === "critical" || item.severity === "high" ? "gold" : "neutral"}>{index + 1}. {item.label}</StatusBadge>
                  <span className="text-ink/55">الأولوية: {item.severity === "critical" ? "حرجة" : item.severity === "high" ? "عالية" : item.severity === "medium" ? "متوسطة" : "منخفضة"}</span>
                </div>
                <p className="mt-2"><b>المشكلة:</b> {item.label}</p>
                <p><b>العبارة المرتبطة:</b> {item.evidence}</p>
                <p><b>سبب المخالفة أو الملاحظة:</b> {item.reason}</p>
                {item.source ? <p><b>المرجع:</b> {item.source}</p> : null}
                <p><b>الإجراء المقترح:</b> {item.action}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p>{review.publicationDecision.reason}</p>
        )}
      </div>

      {rewrite ? (
        <div className="rounded-md border border-palm/20 bg-paper p-3 text-xs leading-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <b>مسار التعديل المقترح</b>
            <button type="button" onClick={onApplyRewrite} disabled={loading} className="inline-flex items-center gap-1 rounded-md bg-palm px-3 py-1.5 text-xs text-white disabled:opacity-50">
              <Sparkles size={14} />استخدام الصياغة المقترحة
            </button>
          </div>
          {enhancedRewrite?.explanation ? <p className="mt-2 text-ink/70">{enhancedRewrite.explanation}</p> : null}
          <p className="mt-2 text-ink/70">{enhancedRewrite?.suggestedText ?? rewrite.suggestedText}</p>
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
  const [kind, setKind] = useState<ContentKind | "">("");
  const [channel, setChannel] = useState("");
  const [audience, setAudience] = useState("");
  const [purpose, setPurpose] = useState("");
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
    kind: ContentKind | "";
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

  const hasReviewContext = Boolean(kind && channel && audience && purpose);
  const contentTypeLabel = kind ? contentTypes.find((item) => item.value === kind)?.label ?? "محتوى مهني" : "";
  const sortedFindings = useMemo(
    () => [...(review?.findings ?? [])].sort((a, b) => severityOrder[a.businessSeverity ?? "low"] - severityOrder[b.businessSeverity ?? "low"]),
    [review]
  );

  async function requestReview(reviewStatus?: "READY_FOR_PUBLISHING") {
    if (!kind || !channel || !audience || !purpose) {
      throw new Error("اختر نوع المحتوى والقناة والجمهور والهدف قبل التحليل حتى ترتبط النتائج بالسياق الصحيح.");
    }
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, kind, contentType: contentTypeLabel, channel, audience, purpose, reviewStatus })
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(payload.error ?? "تعذر إكمال المراجعة.");
    }
    return (await response.json()).data as ReviewResult;
  }

  async function runReview() {
    if (!kind || !channel || !audience || !purpose) {
      setMessage("اختر نوع المحتوى والقناة والجمهور والهدف قبل التحليل حتى ترتبط النتائج بالسياق الصحيح.");
      return;
    }
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
    if (!rewrite || !kind || !channel || !audience || !purpose) return;
    const enhancedRewrite = review.aiEnhancement?.rewriteSuggestions.find((item) => item.rewriteId === rewrite.id);
    const rewriteText = enhancedRewrite?.suggestedText ?? rewrite.suggestedText;
    setText(rewriteText);
    setMessage("تم تطبيق الصياغة المقترحة. جار إعادة التقييم للتحقق من النتيجة الفعلية.");
    setLoading(true);
    try {
      const result = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rewriteText, kind, contentType: contentTypeLabel, channel, audience, purpose })
      }).then((response) => response.json()).then((payload) => payload.data as ReviewResult);
      setReview(result);
      saveLatestReviewSnapshot(result);
      const saved = upsertAnalyzedVersion({
        contentId,
        body: rewriteText,
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
    if (!contentId || text.trim().length < 5 || !kind || !channel || !audience || !purpose) {
      setMessage("تعذر الحفظ: أدخل نصًا من خمسة أحرف على الأقل واختر نوع المحتوى والقناة والجمهور والهدف.");
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

        {/* شريط اكتمال السياق */}
        <div className="mb-5">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-ink/55">اكتمال السياق</span>
            <span className="font-semibold text-palm">4 من 4</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-paper">
            <div className="h-full rounded-full bg-palm opacity-80" style={{ width: "100%" }} />
          </div>
        </div>

        {/* نوع المحتوى */}
        <div className={`mb-4 ${Boolean(review) && !isEditing ? "pointer-events-none opacity-60" : ""}`}>
          <p className="mb-2 text-sm text-ink/65">نوع المحتوى</p>
          <div className="flex flex-wrap gap-2">
            {contentTypes.map((item) => (
              <button key={item.value} type="button" onClick={() => setKind(item.value as ContentKind)} className={`${chipBase} ${kind === item.value ? chipSelected : chipIdle}`}>
                {contentTypeIcons[item.value]}{item.label}
              </button>
            ))}
          </div>
        </div>

        {/* القناة */}
        <div className={`mb-4 ${Boolean(review) && !isEditing ? "pointer-events-none opacity-60" : ""}`}>
          <p className="mb-2 text-sm text-ink/65">القناة</p>
          <div className="flex flex-wrap gap-2">
            {channels.map((item) => (
              <button key={item} type="button" onClick={() => setChannel(item)} className={`${chipBase} ${channel === item ? chipSelected : chipIdle}`}>
                {channelIcons[item]}{item}
              </button>
            ))}
          </div>
        </div>

        {/* الجمهور */}
        <div className={`mb-4 ${Boolean(review) && !isEditing ? "pointer-events-none opacity-60" : ""}`}>
          <p className="mb-2 text-sm text-ink/65">الجمهور</p>
          <div className="flex flex-wrap gap-2">
            {audiences.map((item) => (
              <button key={item} type="button" onClick={() => setAudience(item)} className={`${chipBase} ${audience === item ? chipSelected : chipIdle}`}>
                {audienceIcons[item]}{item}
              </button>
            ))}
          </div>
        </div>

        {/* الهدف */}
        <div className={`mb-4 ${Boolean(review) && !isEditing ? "pointer-events-none opacity-60" : ""}`}>
          <p className="mb-2 text-sm text-ink/65">الهدف</p>
          <div className="flex flex-wrap gap-2">
            {purposes.map((item) => (
              <button key={item} type="button" onClick={() => setPurpose(item)} className={`${chipBase} ${purpose === item ? chipSelected : chipIdle}`}>
                {purposeIcons[item]}{item}
              </button>
            ))}
          </div>
        </div>
        {!hasReviewContext ? (
          <p className="mt-2 text-xs leading-6 text-ink/60">اختر نوع المحتوى والقناة والجمهور والهدف حتى يكون التحليل مرتبطًا بالسياق الصحيح.</p>
        ) : null}
        <label className="mt-4 block text-sm">
          <span className="flex flex-wrap items-center justify-between gap-2">
            <span>النص محل المراجعة</span>
            <button type="button" onClick={clearContentInput} disabled={loading || text.length === 0} className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-xs text-ink/70 transition hover:border-palm hover:bg-mint hover:text-palm disabled:cursor-not-allowed disabled:opacity-40">
              <XCircle size={14} aria-hidden="true" />مسح المحتوى
            </button>
          </span>
          <textarea value={text} disabled={Boolean(review) && !isEditing} onChange={(event) => setText(event.target.value)} className="mt-2 min-h-44 w-full rounded-lg border border-line p-4 leading-8 disabled:bg-paper disabled:text-ink/65" />
        </label>
        <div className="mt-3">
          <InlineContentGuidance review={review} draftText={text} onApplyRewrite={applyRewrite} loading={loading} />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {!review || isEditing ? <button type="button" onClick={runReview} disabled={loading || text.trim().length < 5 || !hasReviewContext} className="inline-flex items-center gap-2 rounded-md bg-palm px-5 py-2.5 text-white disabled:opacity-50"><FileText size={17} />{loading ? "جار التحليل..." : contentId ? "إعادة التحليل" : "تحليل المحتوى"}</button> : null}
          {review && !isEditing ? <button type="button" onClick={beginEditing} className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5"><Edit3 size={16} />تعديل</button> : null}
          {isEditing && contentId ? <button type="button" onClick={saveEdits} disabled={loading || text.trim().length < 5 || !hasReviewContext} className="inline-flex items-center gap-2 rounded-md border border-palm px-4 py-2.5 text-palm disabled:opacity-50"><Save size={16} />حفظ التعديلات</button> : null}
          {isEditing ? <button type="button" onClick={cancelEditing} disabled={loading} className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5 disabled:opacity-50"><AlertTriangle size={16} />إلغاء</button> : null}
        </div>
        {message ? <p className="mt-3 text-sm text-palm">{message}</p> : null}
      </Panel>

      {review ? (
        <>
          {review.analysisMode === "pattern-only" ? (
            <div
              dir="rtl"
              role="alert"
              className="sticky top-0 z-20 flex items-start gap-3 rounded-b-lg border border-amber-300 bg-amber-50 px-5 py-3 text-sm text-amber-900 shadow-sm"
            >
              <span aria-hidden="true" className="mt-0.5 shrink-0">⚠️</span>
              <span>{"تنبيه: يوجد عطل، والتحليل غير مكتمل حالياً، وقد لا تشمل النتيجة كل المخالفات."}</span>
            </div>
          ) : null}
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

          <section id="analysis-summary" aria-labelledby="supporting-indicators-title" className="space-y-4 scroll-mt-24">
            <SectionTitle
              title="المؤشرات المساندة للقرار"
              subtitle="توضح الرسوم مستوى كل جانب، بينما تبقى الملاحظات والأدلة والأثر والإجراء الموصى به هي أساس القرار."
            />
            <div className="grid gap-4 xl:grid-cols-2">
              <ComplianceIndicatorCard review={review} />
              <RiskIndicatorCard review={review} />
              <ProfessionalismIndicatorCard review={review} />
              <LanguageIndicatorCard review={review} />
              <ContentQualityIndicatorCard review={review} />
              <ReadinessIndicatorCard review={review} />
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

          <section id="improvements" className="space-y-5 scroll-mt-24">
          <Panel id="rewrite">
            <SectionTitle title="4. الصياغة المقترحة وأثر التحسين" subtitle="الأثر المتوقع توجيهي، وتُعاد المراجعة فعلياً بعد تطبيق الصياغة." />
            {review.governedRewrites.length ? review.governedRewrites.map((rewrite) => {
              const enhancedRewrite = review.aiEnhancement?.rewriteSuggestions.find((item) => item.rewriteId === rewrite.id);
              return (
              <div key={rewrite.id} className="rounded-xl border border-line p-5">
                {enhancedRewrite?.explanation ? <p className="mb-3 rounded-lg bg-mint/50 p-3 text-xs leading-6 text-palm">{enhancedRewrite.explanation}</p> : null}
                <p className="leading-8">{enhancedRewrite?.suggestedText ?? rewrite.suggestedText}</p>
                <p className="mt-3 rounded-lg bg-paper p-3 text-xs leading-6 text-ink/65">النص المقترح لغرض التعليم والمساعدة فقط، وتظل مسؤولية النشر والمشاركة والاعتماد على المستخدم.</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg bg-paper p-4"><p className="text-xs text-ink/55">قبل التوصية</p><p className="mt-2">الامتثال {rewrite.originalComplianceScore}% — المخاطر {rewrite.originalRiskLevel}</p></div>
                  <div className="rounded-lg bg-mint p-4"><p className="text-xs text-palm">الأثر المتوقع بعد التطبيق</p><p className="mt-2">الامتثال المتوقع {rewrite.proposedComplianceScore}% — المخاطر المتوقعة {rewrite.proposedRiskLevel}</p></div>
                </div>
                <button type="button" onClick={applyRewrite} disabled={loading} className="mt-4 inline-flex items-center gap-2 rounded-md bg-palm px-4 py-2.5 text-white"><Sparkles size={16} />تطبيق الصياغة وإعادة التقييم</button>
              </div>
            );
            }) : <p className="rounded-lg bg-paper p-4 leading-7">لا توجد صياغة بديلة مطلوبة بعد التقييم الحالي.</p>}
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
                const enhancedChannel = review.aiEnhancement?.channelRationales.find((rationale) => rationale.key === item.key);
                return (
                  <article key={item.key} className="rounded-xl border border-line bg-white p-5">
                    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3">{Icon ? <Icon size={28} className={socialBrandStyles[item.key]?.icon} /> : null}<h3 className="text-base font-semibold">{item.channel}</h3></div><StatusBadge tone={item.suitability === "عالية" ? "good" : "neutral"}>الملاءمة {item.suitability}</StatusBadge></div>
                    <p className="mt-4 leading-7">{enhancedChannel?.reason ?? item.reason}</p>
                    <dl className="mt-4 space-y-3 text-sm leading-7">
                      <div><dt className="text-ink/55">الجمهور</dt><dd>{item.targetAudience}</dd></div>
                      <div><dt className="text-ink/55">الصيغة</dt><dd>{item.format}</dd></div>
                      <div><dt className="text-ink/55">الفائدة المتوقعة</dt><dd>{enhancedChannel?.expectedBenefit ?? item.expectedBenefit}</dd></div>
                      <div><dt className="text-ink/55">المخاطر أو القيود</dt><dd>{enhancedChannel?.risks ?? item.risks}</dd></div>
                      <div><dt className="text-ink/55">التوقيت المقترح</dt><dd>{item.timing}</dd></div>
                    </dl>
                  </article>
                );
              })}
            </div>
          </Panel>

          <Panel id="approval">
            <SectionTitle title="7. اعتماد النسخة" subtitle="لا تتاح المشاركة أو التصدير إلا للنسخة النهائية التي تمت مراجعتها واعتمادها." />
            <button type="button" onClick={approveCurrentVersion} disabled={approved || approving || review.findings.some((finding) => !finding.resolved) || !review.languageQuality.passed || ["بالغ", "حرج", "مرتفع"].includes(review.riskLevel)} className="inline-flex items-center gap-2 rounded-md bg-palm px-5 py-2.5 text-white disabled:cursor-not-allowed disabled:opacity-50"><Save size={16} />{approved ? "تم اعتماد النسخة" : approving ? "جار الاعتماد..." : "اعتماد النسخة الحالية"}</button>
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
