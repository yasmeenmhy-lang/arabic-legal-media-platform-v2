"use client";

import { BookMarked, FileText, Image as ImageIcon } from "lucide-react";
import { Button, ButtonLink, Panel, StatusBadge } from "@/components/ui";
import { QUOTE_INTEGRITY_NOTICE } from "@/lib/quote-notice";
import { riskDisplayLabel, type ReviewResult } from "@/lib/types";

type VisualPreview = { imageUrl?: string; svg?: string; label: string };
type Props = { review: ReviewResult; text: string; visual?: VisualPreview; onEdit: () => void };
type Tone = "good" | "gold" | "danger" | "neutral";

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

export function StudioResultsDashboard({ review, text, visual, onEdit }: Props) {
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
  const readinessTone: Tone = unavailable ? "neutral" : review.publicationDecision.outcome === "RECOMMENDED" ? "good" : review.publicationDecision.outcome === "NOT_RECOMMENDED" ? "danger" : "gold";

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-ink/50">مساعد قرار النشر للمحامي</p>
          <h2 id="studio-results-title" className="mt-1 text-xl font-semibold text-ink">المؤشرات المساندة للقرار</h2>
        </div>
        <Button variant="secondary-gray" onClick={onEdit}>تعديل النص</Button>
      </div>

      <div className={`grid gap-4 ${visual ? "lg:grid-cols-[minmax(0,2fr)_minmax(15rem,1fr)]" : ""}`}>
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

        {visual ? (
          <Panel>
            <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink"><ImageIcon size={16} aria-hidden="true" />المرئيات المحفوظة مع هذا الإصدار</p>
            <div className="overflow-hidden rounded-xl border border-line bg-paper p-2">
              {visual.svg ? <div className="mx-auto max-h-64 w-full overflow-hidden [&_svg]:h-auto [&_svg]:max-h-64 [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: visual.svg }} /> : visual.imageUrl ? <img src={visual.imageUrl} alt={visual.label} className="mx-auto max-h-64 w-full object-contain" /> : null}
            </div>
            <p className="mt-2 text-xs text-ink/50">{visual.label}</p>
          </Panel>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {indicators.map((indicator) => <Panel key={indicator.label} className="min-w-0"><p className="mb-3 text-xs font-semibold text-ink/50">{indicator.label}</p><StatusBadge tone={indicator.tone}>{indicator.value}</StatusBadge></Panel>)}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel>
          <div className="flex items-start justify-between gap-4"><div><h3 className="text-sm font-semibold text-ink">ملاحظات القواعد</h3><p className="mt-1 text-xs text-ink/50">عدد القواعد المخالفة</p></div><span className="text-3xl font-semibold text-ink">{unavailable ? "—" : conductFindings.length}</span></div>
          <div className="mt-4 border-t border-line pt-3"><p className="text-xs text-ink/50">أرقام القواعد المخالفة</p><p className="mt-1 text-sm font-semibold text-ink">{unavailable ? "التحليل غير مكتمل" : conductReferences.length > 0 ? conductReferences.join("، ") : "لا توجد"}</p></div>
        </Panel>
        <Panel>
          <div className="flex items-start justify-between gap-4"><div><h3 className="text-sm font-semibold text-ink">اللوائح المخالفة</h3><p className="mt-1 text-xs text-ink/50">عدد اللوائح المخالفة</p></div><span className="text-3xl font-semibold text-ink">{unavailable ? "—" : regulationFindings.length}</span></div>
          <div className="mt-4 border-t border-line pt-3"><p className="text-xs text-ink/50">أرقام اللوائح المخالفة</p><p className="mt-1 text-sm font-semibold text-ink">{unavailable ? "التحليل غير مكتمل" : regulationReferences.length > 0 ? regulationReferences.join("، ") : "لا توجد"}</p></div>
        </Panel>
      </div>

      <div className="flex flex-col gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm font-semibold text-ink">لمزيد من التفاصيل</p><p className="mt-1 text-xs text-ink/50">الملاحظات، الأدلة، الأثر، والإجراء الموصى به.</p></div>
        <ButtonLink href="/content-review">التحليل التفصيلي للمحتوى المهني</ButtonLink>
      </div>
    </section>
  );
}
