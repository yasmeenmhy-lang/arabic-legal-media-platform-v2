import { ExternalLink } from "lucide-react";
import { StatusBadge } from "@/components/ui";
import type { ReviewFinding } from "@/lib/types";

const severityLabel = { critical: "حرجة", high: "عالية", medium: "متوسطة", low: "منخفضة" } as const;

function severityTone(severity: keyof typeof severityLabel) {
  return severity === "critical" || severity === "high" ? "gold" : severity === "medium" ? "neutral" : "good";
}

// بطاقة واحدة شاملة: المشكلة ثم السبب المتكامل ثم المرجع — بلا تكرار ولا تعدد بطاقات
export function FindingsList({ findings }: { findings: ReviewFinding[] }) {
  return (
    <article className="rounded-xl border border-line bg-white p-5 shadow-sm">
      <div className="space-y-5">
        {findings.map((finding, index) => {
          const severity = finding.businessSeverity ?? "low";
          return (
            <div key={`${finding.title}-${finding.evidence}`} className={index > 0 ? "border-t border-line pt-4" : ""}>
              <div className="flex items-start gap-3">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-paper text-xs font-semibold text-ink/60">
                  {index + 1}
                </span>
                <p className="flex-1 text-sm font-semibold leading-7">{finding.title}</p>
                <StatusBadge tone={severityTone(severity)}>{severityLabel[severity]}</StatusBadge>
              </div>
              <ul className="mt-2 list-disc space-y-1.5 pr-9 text-sm leading-7">
                <li><span className="text-ink/55">السبب:</span> {finding.legalExplanation}</li>
                <li>
                  <span className="text-ink/55">المرجع:</span> {finding.sourceDocument} — {finding.legalReference}{" "}
                  <a
                    href={finding.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-palm underline"
                  >
                    فتح المرجع الرسمي <ExternalLink size={12} aria-hidden="true" />
                  </a>
                </li>
              </ul>
            </div>
          );
        })}
      </div>
    </article>
  );
}
