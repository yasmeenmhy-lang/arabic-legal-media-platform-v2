import { ExternalLink } from "lucide-react";
import type { ReviewFinding } from "@/lib/types";

// بطاقة واحدة: الملاحظات كلها أولاً، وتحتها الأسباب والأدلة والمراجع بأرقام مطابقة.
// لا أولويات ولا درجات بين الملاحظات — كلها واجبة المعالجة بالتساوي.
export function FindingsList({ findings }: { findings: ReviewFinding[] }) {
  return (
    <article className="space-y-6 rounded-xl border border-infoBorder bg-infoSoft p-5 shadow-sm">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-infoDark">الملاحظات</p>
        <ol className="mt-3 space-y-2">
          {findings.map((finding, index) => (
            <li key={`${finding.title}-${finding.evidence}`} className="flex items-start gap-3">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-infoBase text-xs font-semibold text-white">
                {index + 1}
              </span>
              <span className="flex-1 text-sm font-medium leading-7">{finding.title}</span>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-infoDark">الأسباب والأدلة والمراجع</p>
        <ol className="mt-3 space-y-3">
          {findings.map((finding, index) => (
            <li key={`${finding.title}-${finding.evidence}-reason`} className="text-sm leading-7">
              <span className="font-semibold text-infoDark">{index + 1}.</span>{" "}
              <span className="font-semibold text-infoDark">السبب:</span> {finding.legalExplanation}{" "}
              <span className="font-semibold text-infoDark">المرجع:</span> {finding.sourceDocument} — {finding.legalReference}{" "}
              <a
                href={finding.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-infoDark underline"
              >
                فتح المرجع الرسمي <ExternalLink size={12} aria-hidden="true" />
              </a>
            </li>
          ))}
        </ol>
      </div>
    </article>
  );
}
