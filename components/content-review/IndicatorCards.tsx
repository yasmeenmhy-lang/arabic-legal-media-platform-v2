"use client";

import { useState, type ReactNode } from "react";
import { Award, ChevronDown, Scale, User } from "lucide-react";
import { CircularGauge, DgaBlockquote, Panel, ProgressBar, StatusBadge } from "@/components/ui";
import { riskDisplayLabel, type ReviewResult, type RiskAffectedParty, type RiskLevel } from "@/lib/types";

function sevTag(severity: "critical" | "high" | "medium" | "low") {
  if (severity === "critical") return { label: "حرج", cls: "bg-red-100 text-red-800" };
  if (severity === "high") return { label: "مرتفع", cls: "bg-orange-100 text-orange-800" };
  if (severity === "medium") return { label: "متوسط", cls: "bg-amber-100 text-amber-800" };
  return { label: "منخفض", cls: "bg-slate-100 text-slate-600" };
}

// تسميات معيارية قابلة للقياس — بقرار مالكة المنصة: لا أوصاف ذوقية (ممتاز/جيد/ضعيف)
function qualLabel(score: number) {
  if (score >= 85) return { label: "مستوفٍ بدرجة عالية", cls: "bg-green-100 text-green-800" };
  if (score >= 70) return { label: "مستوفٍ", cls: "bg-blue-100 text-blue-800" };
  if (score >= 50) return { label: "مستوفٍ جزئياً", cls: "bg-amber-100 text-amber-800" };
  return { label: "غير مستوفٍ", cls: "bg-red-100 text-red-800" };
}

const categoryLabel: Record<string, string> = {
  spelling: "إملاء",
  grammar: "نحو",
  style: "أسلوب",
  readability: "وضوح",
  "اتساق المصطلحات": "مصطلحات"
};

function toneBorder(tone: "good" | "gold" | "warning" | "danger" | "neutral") {
  if (tone === "good") return "border-palm/25 border-t-palm";
  if (tone === "gold") return "border-goldBorder border-t-gold";
  if (tone === "warning") return "border-[#FEDF89] border-t-[#F79009] bg-[#FFFCF5]";
  if (tone === "danger") return "border-red-200 border-t-red-600";
  return "border-warmGrayBorder border-t-warmGray";
}

// غلاف أكورديون موحّد لكل مؤشر — الملخّص (العنوان + الحالة) ظاهر دائماً،
// والتفاصيل تُطوى وتُفتح بالنقر. يُفتح تلقائياً عند وجود ما يستدعي الانتباه.
function IndicatorShell({ id, title, tone, badge, defaultOpen = false, staticSummary = false, children }: {
  id?: string; title: string; tone: "good" | "gold" | "warning" | "danger" | "neutral";
  badge: ReactNode; defaultOpen?: boolean; staticSummary?: boolean; children?: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const hasDetails = Boolean(children);
  // وضع الملخّص الثابت (يُستخدم في رَيل الحاسب): العنوان والحالة واضحان دائماً بلا سهم طيّ.
  if (staticSummary) {
    return (
      <Panel id={id} className={`scroll-mt-24 border-t-4 shadow-md ${toneBorder(tone)}`}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</span>
          {badge}
        </div>
        {children ? <div className="mt-3 border-t border-line pt-3">{children}</div> : null}
      </Panel>
    );
  }
  return (
    <Panel id={id} className={`scroll-mt-24 border-t-4 shadow-md ${toneBorder(tone)}`}>
      <button
        type="button"
        onClick={() => hasDetails && setOpen((o) => !o)}
        disabled={!hasDetails}
        aria-expanded={hasDetails ? open : undefined}
        className="flex w-full items-start justify-between gap-3 text-right focus-ring disabled:cursor-default"
      >
        <span className="min-w-0">
          <span className="mb-3 block text-xs font-bold uppercase tracking-wider text-slate-400">{title}</span>
          {badge}
        </span>
        {hasDetails ? (
          <ChevronDown size={18} className={`mt-1 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        ) : null}
      </button>
      {hasDetails && open ? <div className="mt-4">{children}</div> : null}
    </Panel>
  );
}

export function riskKpiTone(risk: RiskLevel) {
  if (risk === "بالغ" || risk === "حرج" || risk === "مرتفع") return "danger" as const;
  if (risk === "متوسط") return "gold" as const;
  return "good" as const;
}

export function languageKpiTone(value: number) {
  if (value >= 80) return "good" as const;
  if (value >= 60) return "neutral" as const;
  return "gold" as const;
}

export function readinessKpiTone(review: ReviewResult) {
  if (review.analysisMode === "pattern-only") return "neutral" as const;
  const level = review.readinessDecision.level.trim();
  if (level.includes("تعذّر")) return "neutral" as const;
  // «غير جاهز للنشر» تحذيري برتقالي وفق كود المنصات — ليس أحمر (الأحمر محجوز لحالات
  // أخرى كمخالفة مفتوحة صراحةً)؛ يُعرض بنفس تنسيق «gold» المؤدي لتلوين warning أدناه.
  if (level.includes("غير جاهز")) return "gold" as const;
  if (level.includes("بعد") || level.includes("تعديل")) return "gold" as const;
  if (level.includes("جاهز")) return "good" as const;
  if (review.publicationDecision.outcome === "RECOMMENDED") return "good" as const;
  if (review.publicationDecision.outcome === "NOT_RECOMMENDED") return "gold" as const;
  if (review.publishingReadinessScore < 60) return "gold" as const;
  return "gold" as const;
}

export function professionalismKpiTone(score: number): "good" | "gold" | "danger" {
  if (score >= 80) return "good";
  if (score >= 60) return "gold";
  return "danger";
}

export function professionalismExplanation(score: number) {
  // عند الاستيفاء لا يُعرض «إصلاح مقترح» — بقرار مالكة المنصة: لا حاجة لتوجيه على نتيجة سليمة
  if (score >= 80) return { explanation: "الأسلوب يعكس الرصانة والوقار المهني وفق المعايير المهنية المعتمدة.", action: "" };
  // بقاعدة معادلة السياق التأسيسية: نوع المحتوى يحدد مقاييسه — لا يُطلب «أسلوب
  // أكاديمي» من منشور توعوي لجمهور عام؛ الإصلاح يوجَّه لمعايير النوع نفسه
  if (score >= 60) return { explanation: "الأسلوب بحاجة لتحسين ليعكس الرصانة والوقار المهني وفق المعايير المهنية المعتمدة.", action: "ارتقِ بالأسلوب ليعكس رصانة المهنة ووقارها بما يناسب نوع المحتوى وجمهوره وقناته — دون تغيير طبيعة النوع." };
  return { explanation: "الأسلوب لا يعكس الرصانة والوقار المهني اللائقين بمن يمثّل المهنة القانونية وفق المعايير المهنية المعتمدة.", action: "ارتقِ بالأسلوب ليعكس رصانة المهنة ووقارها وما يليق بمن يمثّل العدالة، بما يناسب نوع المحتوى وجمهوره وقناته." };
}

export function MetricExplanation({
  id, label, value, displayValue, explanation, evidence, action, tone = "neutral", inverse = false
}: {
  id?: string; label: string; value: number; displayValue: string;
  explanation: string; evidence: string; action: string;
  tone?: "neutral" | "good" | "gold" | "danger"; inverse?: boolean;
}) {
  return (
    <Panel id={id} className="h-full scroll-mt-24">
      <div className="grid gap-5 sm:grid-cols-[132px_1fr] sm:items-center">
        <CircularGauge value={value} label={inverse ? "كلما ارتفع المؤشر ارتفع الخطر" : "مؤشر مساند للتوصية"} tone={tone} />
        <div>
          <p className="text-xs text-ink/55">مؤشر مساند — لا يحل محل التفسير</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold">{label}</h3>
            <StatusBadge tone={tone}>{displayValue}</StatusBadge>
          </div>
          <p className="mt-3 leading-7">{explanation}</p>
          <div className="mt-3"><ProgressBar value={value} tone={tone} /></div>
        </div>
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <DgaBlockquote title="الدليل" text={evidence} transparent />
        <DgaBlockquote title="الإجراء الموصى به" text={action} transparent />
      </div>
    </Panel>
  );
}

export function ComplianceIndicatorCard({ review, staticSummary }: { review: ReviewResult; staticSummary?: boolean }) {
  const isCompliant = review.findings.length === 0;
  // عطل التحليل + لا مخالفات مرصودة ⇒ لا يجوز ادعاء "ملتزم" — تظهر محايدة
  const degraded = review.analysisMode === "pattern-only" && isCompliant;
  const tone = degraded ? ("neutral" as const) : isCompliant ? ("good" as const) : ("danger" as const);
  return (
    <IndicatorShell
      staticSummary={staticSummary}
      id="compliance"
      title="الامتثال"
      tone={tone}
      badge={<StatusBadge tone={tone}>{degraded ? "تعذّر التحليل" : isCompliant ? "ملتزم" : "غير ملتزم"}</StatusBadge>}
    >
      {degraded ? (
        <p className="text-sm leading-7 text-slate-500">التحليل غير مكتمل بسبب عطل — أعد التحليل قبل الاعتماد على نتيجة الامتثال.</p>
      ) : review.findings.length > 0 ? (
        <div className="space-y-2">
          {review.findings.map((f) => (
            <div key={f.traceabilityId} className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3">
              <span className="text-sm leading-6">{f.title}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm leading-7 text-slate-500">{"لم ترصد مخالفات مرتبطة بالمراجع المسجلة."}</p>
      )}
    </IndicatorShell>
  );
}

// بطاقة موحدة لحالة العطل — العطل يؤثر على كل النتائج
function DegradedNotice({ id, title }: { id?: string; title: string }) {
  return (
    <Panel id={id} className={`scroll-mt-24 border-t-4 shadow-md ${toneBorder("neutral")}`}>
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">{title}</p>
      <StatusBadge tone="neutral">تعذّر التحليل</StatusBadge>
      <p className="mt-4 text-sm leading-7 text-slate-500">التحليل غير مكتمل بسبب عطل — أعد التحليل قبل الاعتماد على هذه النتيجة.</p>
    </Panel>
  );
}

export function RiskIndicatorCard({ review, staticSummary }: { review: ReviewResult; staticSummary?: boolean }) {
  if (review.analysisMode === "pattern-only") return <DegradedNotice id="risk" title="المخاطر" />;
  // تقييم متعذر ≠ منخفض: يُعرض محايداً رمادياً لا أخضر
  const assessmentFailed = (review.riskScoreExplanation.explanation ?? "").includes("تعذّر");
  const tone = assessmentFailed ? ("neutral" as const) : riskKpiTone(review.riskLevel);
  const parties = review.riskScoreExplanation.affectedParties ?? [];
  // بقرار مالكة المنصة: انعدام المخاطر يُسمى «لا توجد مخاطر» لا «منخفضة»
  const noRisks = !assessmentFailed && riskDisplayLabel(review.riskLevel) === "منخفض" && parties.length === 0 && review.findings.length === 0;
  // ثلاثة مستويات معتمدة فقط — بعدد الجهات المتضررة
  const riskLevels = ["منخفض", "متوسط", "مرتفع"];
  const activeCount = assessmentFailed || noRisks ? 0 : riskLevels.indexOf(riskDisplayLabel(review.riskLevel)) + 1;
  const partyIcon = (p: RiskAffectedParty) => {
    if (p === "الموكل") return <User size={13} aria-hidden="true" />;
    if (p === "المحامي") return <Scale size={13} aria-hidden="true" />;
    return <Award size={13} aria-hidden="true" />;
  };
  return (
    <IndicatorShell
      staticSummary={staticSummary}
      id="risk"
      title="المخاطر"
      tone={tone}
      badge={
        <span className="flex items-center gap-2.5">
          <StatusBadge tone={tone}>{assessmentFailed ? "تعذّر التقييم" : noRisks ? "لا توجد مخاطر" : riskDisplayLabel(review.riskLevel)}</StatusBadge>
          <span className="flex gap-1.5">
            {riskLevels.map((_, i) => (
              <span key={i} className={`inline-block h-2.5 w-2.5 rounded-full ${i < activeCount ? (tone === "good" ? "bg-green-400" : tone === "gold" ? "bg-amber-400" : "bg-red-500") : "bg-slate-200"}`} />
            ))}
          </span>
        </span>
      }
    >
      <div>
        <p className="mb-2 text-xs text-slate-400">الجهات المتضررة</p>
        <div className="flex flex-wrap gap-2">
          {(["الموكل", "المحامي", "المهنة"] as RiskAffectedParty[]).map((p) => {
            const affected = parties.includes(p);
            const label = p === "الموكل" ? "المستفيد" : p;
            return (
              <span
                key={p}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                  affected
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-line bg-paper text-ink/40"
                }`}
              >
                {partyIcon(p)}{label}
              </span>
            );
          })}
        </div>
      </div>
      {review.riskScoreExplanation.explanation ? (
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">{review.riskScoreExplanation.explanation}</p>
      ) : null}
    </IndicatorShell>
  );
}

export function ProfessionalismIndicatorCard({ review, staticSummary }: { review: ReviewResult; staticSummary?: boolean }) {
  if (review.analysisMode === "pattern-only") return <DegradedNotice title="الجوانب المهنية" />;
  const tone = professionalismKpiTone(review.professionalismScore);
  const passed = review.professionalismScore >= 80;
  const { explanation, action } = professionalismExplanation(review.professionalismScore);
  return (
    <IndicatorShell
      staticSummary={staticSummary}
      title="الجوانب المهنية"
      tone={tone}
      badge={<StatusBadge tone={tone}>{passed ? "مستوفٍ للمعايير" : "يتطلب تحسيناً"}</StatusBadge>}
    >
      <p className="rounded-lg border-r-2 border-amber-300 bg-amber-50 p-3 text-sm leading-6">{explanation}</p>
      {action ? (
        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6">
          <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">الإصلاح المقترح</span>
          {action}
        </div>
      ) : null}
    </IndicatorShell>
  );
}

export function LanguageIndicatorCard({ review, staticSummary }: { review: ReviewResult; staticSummary?: boolean }) {
  if (review.analysisMode === "pattern-only") return <DegradedNotice title="اللغة والإملاء" />;
  const issues = review.languageQuality.issues;
  // تمييز صادق: الإملاء والنحو أخطاء تُصحّح (أحمر)؛ الأسلوب والوضوح والمصطلحات
  // ملاحظات تحسينية (كهرماني) — فلا يوحي العرض بخطأ إملائي غير موجود
  const hardIssues = issues.filter((i) => i.category === "spelling" || i.category === "grammar");
  const softIssues = issues.filter((i) => i.category !== "spelling" && i.category !== "grammar");
  const hasHard = hardIssues.length > 0 || !review.languageQuality.passed;
  const tone = hasHard ? ("danger" as const) : softIssues.length > 0 ? ("gold" as const) : ("good" as const);
  const label = hasHard
    ? `يحتاج تصحيح — ${hardIssues.length || issues.length} ملاحظة`
    : softIssues.length > 0
      ? `سليم إملائياً ونحوياً — ${softIssues.length} ملاحظة أسلوبية`
      : "سليم لغوياً";
  return (
    <IndicatorShell
      staticSummary={staticSummary}
      title="اللغة والإملاء"
      tone={tone}
      badge={<StatusBadge tone={tone}>{label}</StatusBadge>}
    >
      {issues.length > 0 ? (
        <div className="space-y-2">
          {issues.map((issue, i) => {
            const isHard = issue.category === "spelling" || issue.category === "grammar";
            return (
              <div key={issue.id ?? i} className="flex items-start gap-2.5 rounded-lg border border-line bg-paper p-3">
                <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-bold ${isHard ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                  {categoryLabel[issue.category] ?? issue.category}
                </span>
                <span className="text-sm leading-6">{issue.message}</span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm leading-7 text-slate-500">{"لم ترصد ملاحظات لغوية أو إملائية."}</p>
      )}
    </IndicatorShell>
  );
}

export function ContentQualityIndicatorCard({ review, staticSummary }: { review: ReviewResult; staticSummary?: boolean }) {
  // تعذّر تقييم أي مؤشر ينعكس هنا: لا تُعرض جودة محسوبة من قيم افتراضية
  if (review.analysisMode === "pattern-only" || review.evaluationIncomplete) return <DegradedNotice title="جودة المحتوى" />;
  const exp = review.contentQualityScoreExplanation ?? { redLine: false, factors: [] };
  const hasViolations = review.findings.length > 0;
  const statusTone = (exp.redLine || hasViolations) ? "danger" as const : review.contentQualityScore >= 80 ? "good" as const : "gold" as const;
  const statusLabel = (exp.redLine || hasViolations) ? "خط أحمر مُفعَّل" : review.contentQualityScore >= 80 ? "متوازن" : "يتطلب تحسيناً";
  return (
    <Panel className={`scroll-mt-24 border-t-4 shadow-md ${toneBorder(statusTone)}`}>
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">جودة المحتوى</p>
      <StatusBadge tone={statusTone}>{statusLabel}</StatusBadge>
      <div className="mt-4 space-y-2.5">
        {exp.factors.map((factor) => {
          const isCompliance = factor.key === "compliance";
          const q = isCompliance
            ? (review.findings.length === 0
                ? { label: "ملتزم", cls: "bg-green-100 text-green-800" }
                : { label: "غير ملتزم", cls: "bg-red-100 text-red-800" })
            : qualLabel(factor.sourceScore);
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

export function ReadinessIndicatorCard({ review, staticSummary, title = "جاهزية النشر" }: { review: ReviewResult; staticSummary?: boolean; title?: string }) {
  // تعذّر تقييم أي مؤشر ينعكس هنا: لا تُعرض جاهزية محسوبة من قيم افتراضية
  if (review.analysisMode === "pattern-only" || review.evaluationIncomplete) return <DegradedNotice title={title} />;
  const tone = readinessKpiTone(review);
  const shellTone = tone === "gold" ? "warning" as const : tone;
  const gates = review.publishingReadinessExplanation.gates;
  return (
    <IndicatorShell
      staticSummary={staticSummary}
      title={title}
      tone={shellTone}
      badge={tone === "gold"
        ? <span className="inline-flex min-h-7 items-center rounded-full border border-[#FEDF89] bg-[#FFFAEB] px-3 py-1 text-xs font-semibold text-[#93370D]">{review.readinessDecision.level}</span>
        : <StatusBadge tone={tone}>{review.readinessDecision.level}</StatusBadge>}
    >
      <div className="space-y-3">
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
    </IndicatorShell>
  );
}
