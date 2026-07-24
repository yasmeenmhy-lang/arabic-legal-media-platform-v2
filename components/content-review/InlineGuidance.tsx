"use client";

import { SpellCheck } from "lucide-react";
import { StatusBadge } from "@/components/ui";
import { riskDisplayLabel, type LanguageQualityIssue, type ReviewResult } from "@/lib/types";

const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 } as const;

const inlineSpellingRules = [
  { wrong: "هاذا", correction: "هذا", message: "صحح رسم اسم الإشارة إلى: هذا." },
  { wrong: "هاذه", correction: "هذه", message: "صحح رسم اسم الإشارة إلى: هذه." },
  { wrong: "نض", correction: "نص", message: "صحح رسم الكلمة إلى: نص." },
  { wrong: "اخطا", correction: "أخطاء", message: "أضف الهمزة والمد في كلمة: أخطاء." },
  { wrong: "اخطاء", correction: "أخطاء", message: "أضف الهمزة في كلمة: أخطاء." },
  { wrong: "لغويه", correction: "لغوية", message: "صحح التاء المربوطة في كلمة: لغوية." },
  { wrong: "واضحه", correction: "واضحة", message: "صحح التاء المربوطة في كلمة: واضحة." },
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

export function detectInlineWritingIssues(value: string): LanguageQualityIssue[] {
  return inlineSpellingRules.flatMap((rule, ruleIndex) => {
    try {
      const pattern = new RegExp(`(?<![\\u0600-\\u06FF])${escapeInlinePattern(rule.wrong)}(?![\\u0600-\\u06FF])`, "g");
      const results: LanguageQualityIssue[] = [];
      let match: RegExpExecArray | null;
      let matchIndex = 0;
      while ((match = pattern.exec(value)) !== null) {
        results.push({
          id: `inline-spelling-${ruleIndex}-${matchIndex}`,
          category: "spelling" as const,
          severity: "medium" as const,
          message: rule.message,
          excerpt: match[0],
          suggestion: `استبدل "${match[0]}" بـ "${rule.correction}".`,
          start: match.index,
          end: match.index + match[0].length
        });
        matchIndex++;
      }
      return results;
    } catch {
      return [];
    }
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

export function buildAssistantIssues(review: ReviewResult, liveSpellingIssues: LanguageQualityIssue[]) {
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
        label: `مستوى مخاطر ${riskDisplayLabel(review.riskLevel)}`,
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

export function buildInternalAssistantSummary(review: ReviewResult, assistantIssues: ReturnType<typeof buildAssistantIssues>, languagePassed: boolean) {
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

export function InlineContentGuidance({
  review, draftText, onApplyRewrite, loading
}: {
  review: ReviewResult | null; draftText: string; onApplyRewrite: () => void; loading: boolean;
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
  const languagePassed = review.languageQuality.passed && review.languageQuality.issues.length === 0 && liveSpellingIssues.length === 0;
  const assistantIssues = buildAssistantIssues(review, liveSpellingIssues);
  const internalAssistantSummary = buildInternalAssistantSummary(review, assistantIssues, languagePassed);
  const languageBadgeLabel = languagePassed
    ? review.findings.length ? "لا توجد أخطاء لغوية واضحة" : "سليم لغويًا"
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
    </div>
  );
}
