import { ExternalLink } from "lucide-react";
import { StatusBadge } from "@/components/ui";
import type { ReviewFinding } from "@/lib/types";

const severityLabel = { critical: "حرجة", high: "عالية", medium: "متوسطة", low: "منخفضة" } as const;

function severityTone(severity: keyof typeof severityLabel) {
  return severity === "critical" || severity === "high" ? "gold" : severity === "medium" ? "neutral" : "good";
}

// الملاحظات دفعة واحدة أولاً، ثم الأسباب والقاعدة والرابط كنقاط موجزة
export function FindingsList({ findings }: { findings: ReviewFinding[] }) {
  return (
    <div className="space-y-4">
      {/* ١ — قائمة الملاحظات دفعة واحدة */}
      <article className="rounded-xl border border-line bg-white p-5 shadow-sm">
        <ol className="space-y-2.5">
          {findings.map((finding, index) => {
            const severity = finding.businessSeverity ?? "low";
            return (
              <li key={`${finding.title}-${finding.evidence}`} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-paper text-xs font-semibold text-ink/60">
                  {index + 1}
                </span>
                <span className="flex-1 text-sm font-medium leading-7">{finding.title}</span>
                <StatusBadge tone={severityTone(severity)}>{severityLabel[severity]}</StatusBadge>
              </li>
            );
          })}
        </ol>
      </article>

      {/* ٢ — الأسباب والقاعدة والرابط لكل ملاحظة */}
      <article className="rounded-xl border border-line bg-white p-5 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">الأسباب والقواعد والمراجع</p>
        <div className="mt-4 space-y-5">
          {findings.map((finding, index) => (
            <div key={`${finding.title}-${finding.evidence}-details`} className={index > 0 ? "border-t border-line pt-4" : ""}>
              <p className="text-sm font-semibold leading-7">{index + 1}. {finding.title}</p>
              <ul className="mt-2 list-disc space-y-1.5 pr-5 text-sm leading-7">
                <li><span className="text-ink/55">السبب:</span> {finding.issue}</li>
                <li><span className="text-ink/55">الشرح:</span> {finding.legalExplanation}</li>
                <li><span className="text-ink/55">الدليل من المحتوى:</span> «{finding.evidence}»</li>
                <li><span className="text-ink/55">القاعدة:</span> {finding.sourceDocument} — {finding.legalReference}</li>
                <li>
                  <a
                    href={finding.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-palm underline"
                  >
                    فتح المرجع الرسمي <ExternalLink size={13} aria-hidden="true" />
                  </a>
                </li>
              </ul>
            </div>
          ))}
        </div>
      </article>
    </div>
  );
}
