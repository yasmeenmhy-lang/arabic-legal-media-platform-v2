import { ExternalLink } from "lucide-react";
import { StatusBadge } from "@/components/ui";
import { OfficialLogo, officialEntityFromUrl } from "@/components/official-logos";
import type { ReviewFinding } from "@/lib/types";

const severityLabel = { critical: "حرجة", high: "عالية", medium: "متوسطة", low: "منخفضة" } as const;

export function FindingCard({ finding, index }: { finding: ReviewFinding; index: number }) {
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
        <div className="rounded-lg bg-paper p-4"><p className="text-xs text-ink/55">ما الخطأ؟</p><p className="mt-2 leading-7 text-sm">{finding.issue}</p></div>
        <div className="rounded-lg bg-paper p-4"><p className="text-xs text-ink/55">الدليل من المحتوى</p><p className="mt-2 leading-7 text-sm">{finding.evidence}</p></div>
        <div className="rounded-lg bg-paper p-4"><p className="text-xs text-ink/55">القاعدة القانونية</p><p className="mt-2 leading-7 text-sm">{finding.legalExplanation}</p></div>
        <div className="rounded-lg bg-paper p-4">
          <p className="text-xs text-ink/55">المرجع المتأثر</p>
          <div className="mt-2 flex items-start gap-3 leading-7">
            <OfficialLogo entity={officialEntityFromUrl(finding.sourceUrl)} />
            <span className="pt-1 text-sm">{finding.sourceDocument} — {finding.legalReference}</span>
          </div>
          <a href={finding.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm text-palm underline">
            فتح المرجع الرسمي <ExternalLink size={14} aria-hidden="true" />
          </a>
        </div>
        <div className="rounded-lg bg-paper p-4"><p className="text-xs text-ink/55">الأثر والمخاطر</p><p className="mt-2 leading-7 text-sm">{finding.explanation}</p></div>
        <div className="rounded-lg border border-palm/20 bg-mint/50 p-4"><p className="text-xs text-palm">الإجراء الموصى به</p><p className="mt-2 leading-7 text-sm">{finding.suggestedSaferWording}</p></div>
      </div>
    </article>
  );
}
