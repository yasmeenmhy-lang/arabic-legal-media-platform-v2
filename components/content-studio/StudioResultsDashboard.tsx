"use client";

import { BookMarked, FileText, Image as ImageIcon } from "lucide-react";
import { Button, ButtonLink, Panel, StatusBadge } from "@/components/ui";
import { QUOTE_INTEGRITY_NOTICE } from "@/lib/quote-notice";
import { riskDisplayLabel, type ReviewResult } from "@/lib/types";

type VisualPreview = { imageUrl?: string; svg?: string; label: string };
type Props = {
  review: ReviewResult;
  text: string;
  visuals?: VisualPreview[];
  onEdit: () => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  actionMessage?: string;
};
type Tone = "good" | "gold" | "warning" | "danger" | "neutral";

const toneCardStyles: Record<Tone, { border: string; bar: string; value: string }> = {
  good: { border: "border-palm/25", bar: "bg-palm", value: "text-palm" },
  gold: { border: "border-goldBorder", bar: "bg-gold", value: "text-gold" },
  // تحذيري برتقالي وفق كود المنصات — لحالات «غير جاهز للنشر» ونحوها؛ ليست مخالفة صريحة
  // فلا تستحق الأحمر المحجوز لذلك، وليست سليمة فتبقى تحذيرية لا خضراء.
  warning: { border: "border-[#FEDF89]", bar: "bg-[#F79009]", value: "text-[#93370D]" },
  danger: { border: "border-red-200", bar: "bg-red-600", value: "text-red-700" },
  neutral: { border: "border-warmGrayBorder", bar: "bg-warmGray", value: "text-warmGrayText" },
};

function uniqueReferences(findings: ReviewResult["findings"]) {
  return Array.from(new Set(findings.map((finding) => finding.legalReference.trim()).filter(Boolean)));
}

function riskTone(review: ReviewResult): Tone {
  if (review.analysisMode === "pattern-only" || review.evaluationIncomplete) return "neutral";
  const label = riskDisplayLabel(review.riskLevel);
  if (["بالغ", "حرج", "مرتفع"].includes(label)) return "danger";
  if (label === "متوسط") return "gold";
  return "good";
}

export function StudioResultsDashboard({ review, text, visuals = [], onEdit, onSaveDraft, onPublish, actionMessage }: Props) {
  const unavailable = review.analysisMode === "pattern-only" || review.evaluationIncomplete;
  const conductFindings = review.professionalConductCompliance.findings;
  const regulationFindings = review.executiveRegulationCompliance.findings;
  const conductReferences = uniqueReferences(conductFindings);
  const regulationReferences = uniqueReferences(regulationFindings);
  const languageIssues = review.languageQuality.issues;
  const hardLanguageIssues = languageIssues.filter((issue) => issue.category === "spelling" || issue.category === "grammar");
  const softLanguageIssues = languageIssues.filter((issue) => issue.category !== "spelling" && issue.category !== "grammar");

  const decisionTone: Tone = unavailable ? "neutral" : review.publicationDecision.outcome === "RECOMMENDED" ? "good" : review.publicationDecision.outcome === "NOT_RECOMMENDED" || review.publicationDecision.outcome === "LEGAL_REVIEW_REQUIRED" ? "danger" : "gold";
  const complianceTone: Tone = unavailable ? "neutral" : review.findings.length === 0 ? "good" : "danger";
  const professionalTone: Tone = unavailable ? "neutral" : review.professionalismScore >= 80 ? "good" : "gold";
  const languageTone: Tone = unavailable ? "neutral" : hardLanguageIssues.length > 0 || !review.languageQuality.passed ? "danger" : softLanguageIssues.length > 0 ? "gold" : "good";
  // مصدر لون «جاهزية النشر» هو نص الجاهزية نفسه — لا قرار النشر المنفصل — فلا يتناقض
  // اللون مع النص المعروض في نفس البطاقة (كانا مصدرين مختلفين فيتناقضان أحياناً).
  const readinessLevel = review.readinessDecision.level.trim();
  const readinessTone: Tone = unavailable
    ? "neutral"
    : readinessLevel.includes("جاهز") && !readinessLevel.includes("غير") && !readinessLevel.includes("بعد")
      ? "good"
      : "warning";

  const indicators: Array<{ label: string; value: string; tone: Tone }> = [
    { label: "قرار النشر", value: unavailable ? "تعذّر التحليل" : review.publicationDecision.label, tone: decisionTone },
    { label: "الامتثال", value: unavailable ? "تعذّر التحليل" : review.findings.length === 0 ? "ملتزم" : "غير ملتزم", tone: complianceTone },
    { label: "المخاطر", value: unavailable ? "تعذّر التحليل" : riskDisplayLabel(review.riskLevel), tone: riskTone(review) },
    { label: "الجوانب المهنية", value: unavailable ? "تعذّر التحليل" : review.professionalismScore >= 80 ? "مستوفٍ للمعايير" : "يتطلب تحسيناً", tone: professionalTone },
    { label: "اللغة والإملاء", value: unavailable ? "تعذّر التحليل" : hardLanguageIssues.length > 0 || !review.languageQuality.passed ? "يحتاج تصحيحًا" : softLanguageIssues.length > 0 ? `سليم إملائياً ونحوياً — ${softLanguageIssues.length} ملاحظة أسلوبية` : "سليم لغويًا", tone: languageTone },
    { label: "جاهزية النشر", value: unavailable ? "تعذّر التحليل" : review.readinessDecision.level, tone: readinessTone },
  ];

  return (
    <section aria-labelledby="studio-results-title" className="space-y-5">
      <div className={`grid items-stretch gap-4 ${visuals.length ? "lg:grid-cols-2" : ""}`}>
        <Panel>
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><FileText size={16} aria-hidden="true" />النص محل المراجعة</p>
          <div className="max-h-40 overflow-y-auto rounded-xl border border-line bg-paper p-4 text-sm leading-8 text-ink/80">
            <p className="whitespace-pre-wrap">{text}</p>
          </div>
          <details className="mt-3 border-t border-line pt-3">
            <summary className="flex cursor-pointer list-none flex-wrap items-center gap-2 text-sm font-semibold text-infoDark focus-ring">
              <BookMarked size={16} aria-hidden="true" /><span>{QUOTE_INTEGRITY_NOTICE.title}</span><span className="text-xs font-normal text-ink/50">عرض الملاحظة كاملة</span>
            </summary>
            <div className="mt-2 rounded-lg bg-infoSoft p-3 text-xs leading-6 text-ink/70"><p>{QUOTE_INTEGRITY_NOTICE.body}</p><p className="mt-1 text-ink/50">{QUOTE_INTEGRITY_NOTICE.disclaimer}</p></div>
          </details>
        </Panel>

        {visuals.length ? (
          <Panel className="h-full">
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><ImageIcon size={16} aria-hidden="true" />المرئيات المحفوظة مع هذا الإصدار</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {visuals.map((visual, index) => (
                <figure key={`${visual.label}-${index}`} className="overflow-hidden rounded-xl border border-line bg-paper p-2">
                  {visual.svg ? <div className="mx-auto max-h-64 w-full overflow-hidden [&_svg]:h-auto [&_svg]:max-h-64 [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: visual.svg }} /> : visual.imageUrl ? <img src={visual.imageUrl} alt={visual.label} className="mx-auto max-h-64 w-full object-contain" /> : null}
                  <figcaption className="mt-2 text-xs text-ink/50">{visual.label}</figcaption>
                </figure>
              ))}
            </div>
          </Panel>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-ink/50">مساعد قرار النشر للمحامي</p>
          <h2 id="studio-results-title" className="mt-1 text-xl font-semibold text-ink">المؤشرات المساندة للقرار</h2>
        </div>
        <Button variant="secondary-gray" onClick={onEdit}>تعديل النص</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        {indicators.map((indicator) => {
          const colors = toneCardStyles[indicator.tone];
          return (
            <Panel key={indicator.label} className={`relative min-h-28 min-w-0 border ${colors.border} px-3 pt-6 sm:px-5`}>
              <span className={`absolute inset-x-0 top-0 h-1 ${colors.bar}`} aria-hidden="true" />
              <p className="mb-3 text-xs font-semibold text-ink/50">{indicator.label}</p>
              <StatusBadge tone={indicator.tone}>{indicator.value}</StatusBadge>
            </Panel>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel className={`relative border pt-6 ${unavailable ? toneCardStyles.neutral.border : conductFindings.length > 0 ? toneCardStyles.danger.border : toneCardStyles.good.border}`}>
          <span className={`absolute inset-x-0 top-0 h-1 ${unavailable ? toneCardStyles.neutral.bar : conductFindings.length > 0 ? toneCardStyles.danger.bar : toneCardStyles.good.bar}`} aria-hidden="true" />
          <div className="flex items-start justify-between gap-4"><div><h3 className="text-sm font-semibold text-ink">مخالفات قواعد السلوك المهني للمحامين</h3><p className="mt-1 text-xs text-ink/50">عدد القواعد المخالفة</p></div><span className={`text-3xl font-semibold ${unavailable ? toneCardStyles.neutral.value : conductFindings.length > 0 ? toneCardStyles.danger.value : toneCardStyles.good.value}`}>{unavailable ? "—" : conductFindings.length}</span></div>
          <div className="mt-4 border-t border-line pt-3"><p className="text-xs text-ink/50">القواعد المخالفة (بأرقامها)</p><p className="mt-1 text-sm font-semibold text-ink">{unavailable ? "التحليل غير مكتمل" : conductReferences.length > 0 ? conductReferences.join("، ") : "لا توجد"}</p></div>
        </Panel>
        <Panel className={`relative border pt-6 ${unavailable ? toneCardStyles.neutral.border : regulationFindings.length > 0 ? toneCardStyles.danger.border : toneCardStyles.good.border}`}>
          <span className={`absolute inset-x-0 top-0 h-1 ${unavailable ? toneCardStyles.neutral.bar : regulationFindings.length > 0 ? toneCardStyles.danger.bar : toneCardStyles.good.bar}`} aria-hidden="true" />
          <div className="flex items-start justify-between gap-4"><div><h3 className="text-sm font-semibold text-ink">مخالفات اللائحة التنفيذية لنظام المحاماة</h3><p className="mt-1 text-xs text-ink/50">عدد مواد اللائحة المخالفة</p></div><span className={`text-3xl font-semibold ${unavailable ? toneCardStyles.neutral.value : regulationFindings.length > 0 ? toneCardStyles.danger.value : toneCardStyles.good.value}`}>{unavailable ? "—" : regulationFindings.length}</span></div>
          <div className="mt-4 border-t border-line pt-3"><p className="text-xs text-ink/50">المواد المخالفة من اللائحة (بأرقامها)</p><p className="mt-1 text-sm font-semibold text-ink">{unavailable ? "التحليل غير مكتمل" : regulationReferences.length > 0 ? regulationReferences.join("، ") : "لا توجد"}</p></div>
        </Panel>
      </div>

      <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm font-semibold text-ink">لمزيد من التفاصيل</p><p className="mt-1 text-xs text-ink/50">الملاحظات، الأدلة، الأثر، والإجراء الموصى به.</p></div>
        <ButtonLink href="/content-review?open=1">التحليل التفصيلي للمحتوى المهني</ButtonLink>
      </div>

      <Panel>
        <p className="mb-4 text-sm font-semibold text-ink">ماذا تريد؟</p>
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
          <Button onClick={onPublish} className="w-full sm:w-auto">📤 نشر مباشرة</Button>
          <ButtonLink href="/calendar" variant="secondary" className="w-full sm:w-auto">📅 جدولة</ButtonLink>
          <Button variant="secondary-gray" onClick={onSaveDraft} className="w-full sm:w-auto">حفظ مسودة</Button>
          <Button variant="secondary-gray" onClick={onEdit} className="w-full sm:w-auto">تعديل</Button>
        </div>
        {actionMessage ? <p className="mt-3 text-sm text-palm">{actionMessage}</p> : null}
      </Panel>
    </section>
  );
}
