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
  // زر «التحليل التفصيلي» يفتح السجل النشط المحفوظ — إن لم تكن هذه النتيجة محفوظة
  // فعلاً (فشل حفظ محلي) يُعطَّل الزر بدل أن يفتح محتوى آخر قديماً من السجل
  detailedAnalysisAvailable?: boolean;
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

// ألوان قيم المؤشرات المصغّرة في ملخّص المركز (شبكة مرتّبة موحّدة المقاس)
const chipText: Record<Tone, string> = {
  good: "text-green-600",
  gold: "text-amber-600",
  warning: "text-orange-700",
  danger: "text-red-600",
  neutral: "text-slate-600",
};

function riskTone(review: ReviewResult): Tone {
  if (review.analysisMode === "pattern-only" || review.evaluationIncomplete) return "neutral";
  const label = riskDisplayLabel(review.riskLevel);
  if (["بالغ", "حرج", "مرتفع"].includes(label)) return "danger";
  if (label === "متوسط") return "gold";
  return "good";
}

export function StudioResultsDashboard({ review, text, visuals = [], onEdit, onSaveDraft, onPublish, actionMessage, detailedAnalysisAvailable = true }: Props) {
  const unavailable = review.analysisMode === "pattern-only" || review.evaluationIncomplete;
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

  // رقائق مصغّرة (بلا «قرار النشر» — هو العنوان) — نظرة سريعة لا شاشة كاملة
  const summaryChips: Array<{ label: string; value: string; tone: Tone }> = [
    { label: "الامتثال", value: unavailable ? "—" : review.findings.length === 0 ? "ملتزم" : "غير ملتزم", tone: complianceTone },
    { label: "المخاطر", value: unavailable ? "—" : riskDisplayLabel(review.riskLevel), tone: riskTone(review) },
    { label: "الجوانب المهنية", value: unavailable ? "—" : review.professionalismScore >= 80 ? "مستوفٍ" : "يتطلب تحسيناً", tone: professionalTone },
    { label: "اللغة", value: unavailable ? "—" : hardLanguageIssues.length > 0 || !review.languageQuality.passed ? "يحتاج تصحيحًا" : softLanguageIssues.length > 0 ? `${softLanguageIssues.length} ملاحظة أسلوبية` : "سليم لغويًا", tone: languageTone },
    { label: "الجاهزية", value: unavailable ? "—" : review.readinessDecision.level, tone: readinessTone },
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

      {/* ملخّص مصغّر — نظرة سريعة وبوابة إلى التحليل التفصيلي (لا تكرار للشاشة الكاملة) */}
      <Panel className={`relative border pt-6 ${toneCardStyles[decisionTone].border}`}>
        <span className={`absolute inset-x-0 top-0 h-1 ${toneCardStyles[decisionTone].bar}`} aria-hidden="true" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-ink/50">ملخّص المراجعة</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <h2 id="studio-results-title" className="text-base font-bold text-ink">قرار النشر</h2>
              <StatusBadge tone={decisionTone}>{unavailable ? "تعذّر التحليل" : review.publicationDecision.label}</StatusBadge>
            </div>
          </div>
          <Button variant="secondary-gray" onClick={onEdit}>تعديل النص</Button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {summaryChips.map((chip) => (
            <div key={chip.label} className="rounded-lg border border-line bg-paper px-3 py-2">
              <p className="text-[10px] text-ink/50">{chip.label}</p>
              <p className={`mt-0.5 text-xs font-bold ${chipText[chip.tone]}`}>{chip.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 border-t border-line pt-4">
          {detailedAnalysisAvailable ? (
            <ButtonLink href="/content-review?open=1" className="w-full justify-center">افتح التحليل التفصيلي ←</ButtonLink>
          ) : (
            <Button variant="secondary-gray" disabled className="w-full cursor-not-allowed opacity-60">التحليل التفصيلي غير متاح</Button>
          )}
        </div>
      </Panel>

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
