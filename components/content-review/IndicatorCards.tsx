import { Award, Scale, User } from "lucide-react";
import { CircularGauge, DgaBlockquote, Panel, ProgressBar, StatusBadge } from "@/components/ui";
import { riskDisplayLabel, type ReviewResult, type RiskAffectedParty, type RiskLevel } from "@/lib/types";

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

function toneBorder(tone: "good" | "gold" | "danger" | "neutral") {
  if (tone === "good") return "border-t-green-400";
  if (tone === "gold") return "border-t-amber-400";
  if (tone === "danger") return "border-t-red-400";
  return "border-t-slate-300";
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
  if (review.publicationDecision.outcome === "RECOMMENDED") return "good" as const;
  if (review.publicationDecision.outcome === "NOT_RECOMMENDED") return "danger" as const;
  if (review.publishingReadinessScore < 60) return "danger" as const;
  return "gold" as const;
}

export function professionalismKpiTone(score: number): "good" | "gold" | "danger" {
  if (score >= 80) return "good";
  if (score >= 60) return "gold";
  return "danger";
}

export function professionalismExplanation(score: number) {
  if (score >= 80) return { explanation: "الأسلوب رصين ويليق بمحامٍ مرخص.", action: "حافظ على هذا المستوى من الرصانة في جميع منشوراتك." };
  if (score >= 60) return { explanation: "الأسلوب بحاجة لتحسين ليعكس الرصانة المهنية المتوقعة من محامٍ.", action: "أعد صياغة النص بأسلوب أكاديمي رسمي يليق بالمهنة القانونية." };
  return { explanation: "الأسلوب لا يليق بمحامٍ مرخص — يحتاج إعادة كتابة كاملة.", action: "اكتب النص من جديد بلغة فصحى رصينة تخدم هدفاً مهنياً أو تثقيفياً واضحاً." };
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
        <CircularGauge value={value} label={inverse ? "كلما ارتفع المؤشر ارتفع الخطر" : "مؤشر مساند للقرار"} tone={tone} />
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

export function ComplianceIndicatorCard({ review }: { review: ReviewResult }) {
  const isCompliant = review.findings.length === 0;
  return (
    <Panel id="compliance" className={`scroll-mt-24 border-t-4 shadow-md ${toneBorder(isCompliant ? "good" : "danger")}`}>
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">الامتثال</p>
      <StatusBadge tone={isCompliant ? "good" : "danger"}>{isCompliant ? "ملتزم" : "غير ملتزم"}</StatusBadge>
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

export function RiskIndicatorCard({ review }: { review: ReviewResult }) {
  const tone = riskKpiTone(review.riskLevel);
  const parties = review.riskScoreExplanation.affectedParties ?? [];
  // ثلاثة مستويات معتمدة فقط — بعدد الجهات المتضررة
  const riskLevels = ["منخفض", "متوسط", "مرتفع"];
  const activeCount = riskLevels.indexOf(riskDisplayLabel(review.riskLevel)) + 1;
  const partyIcon = (p: RiskAffectedParty) => {
    if (p === "الموكل") return <User size={13} aria-hidden="true" />;
    if (p === "المحامي") return <Scale size={13} aria-hidden="true" />;
    return <Award size={13} aria-hidden="true" />;
  };
  return (
    <Panel id="risk" className={`scroll-mt-24 border-t-4 shadow-md ${toneBorder(tone)}`}>
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">المخاطر</p>
      <div className="flex items-center justify-between gap-3">
        <StatusBadge tone={tone}>{riskDisplayLabel(review.riskLevel)}</StatusBadge>
        <div className="flex gap-1.5">
          {riskLevels.map((_, i) => (
            <span key={i} className={`inline-block h-2.5 w-2.5 rounded-full ${i < activeCount ? (tone === "good" ? "bg-green-400" : tone === "gold" ? "bg-amber-400" : "bg-red-500") : "bg-slate-200"}`} />
          ))}
        </div>
      </div>
      <div className="mt-4">
        <p className="mb-2 text-xs text-slate-400">الجهات المتضررة</p>
        <div className="flex flex-wrap gap-2">
          {(["الموكل", "المحامي", "المهنة"] as RiskAffectedParty[]).map((p) => {
            const affected = parties.includes(p);
            return (
              <span
                key={p}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                  affected
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-line bg-paper text-ink/40"
                }`}
              >
                {partyIcon(p)}{p}
              </span>
            );
          })}
        </div>
      </div>
      {review.riskScoreExplanation.explanation ? (
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">{review.riskScoreExplanation.explanation}</p>
      ) : null}
    </Panel>
  );
}

export function ProfessionalismIndicatorCard({ review }: { review: ReviewResult }) {
  const tone = professionalismKpiTone(review.professionalismScore);
  const passed = review.professionalismScore >= 80;
  const { explanation, action } = professionalismExplanation(review.professionalismScore);
  return (
    <Panel className={`scroll-mt-24 border-t-4 shadow-md ${toneBorder(tone)}`}>
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

export function LanguageIndicatorCard({ review }: { review: ReviewResult }) {
  const passed = review.languageQuality.passed;
  const tone = languageKpiTone(review.languageQuality.score);
  const issues = review.languageQuality.issues;
  return (
    <Panel className={`scroll-mt-24 border-t-4 shadow-md ${toneBorder(passed ? "good" : tone)}`}>
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

export function ContentQualityIndicatorCard({ review }: { review: ReviewResult }) {
  const exp = review.contentQualityScoreExplanation ?? { redLine: false, factors: [] };
  const hasViolations = review.findings.length > 0;
  const statusTone = (exp.redLine || hasViolations) ? "danger" as const : review.contentQualityScore >= 80 ? "good" as const : "gold" as const;
  const statusLabel = (exp.redLine || hasViolations) ? "خط أحمر مُفعَّل" : review.contentQualityScore >= 80 ? "متوازن" : "يحتاج تحسين";
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

export function ReadinessIndicatorCard({ review }: { review: ReviewResult }) {
  const tone = readinessKpiTone(review);
  const gates = review.publishingReadinessExplanation.gates;
  return (
    <Panel className={`scroll-mt-24 border-t-4 shadow-md ${toneBorder(tone)}`}>
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
