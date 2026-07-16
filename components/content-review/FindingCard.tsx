"use client";

import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import type { ReviewFinding } from "@/lib/types";

// كل ملاحظة أكورديون: العنوان ملخّص ظاهر، وتُفتح بالنقر لعرض السبب والمرجع.
// لا أولويات ولا درجات بين الملاحظات — كلها واجبة المعالجة بالتساوي.
function FindingItem({ finding, index }: { finding: ReviewFinding; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <li className="overflow-hidden rounded-lg border border-infoBorder bg-white/60">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-start gap-3 p-3 text-right focus-ring"
      >
        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-infoBase text-xs font-semibold text-white">
          {index + 1}
        </span>
        <span className="flex-1 text-sm font-medium leading-7">{finding.title}</span>
        <ChevronDown size={16} className={`mt-1 shrink-0 text-infoDark transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>
      {open ? (
        <div className="border-t border-infoBorder/60 px-3 pb-3 pt-3 text-sm leading-7">
          <p><span className="font-semibold text-infoDark">السبب:</span> {finding.legalExplanation}</p>
          <p className="mt-2"><span className="font-semibold text-infoDark">المرجع:</span> {finding.sourceDocument} — {finding.legalReference}</p>
          <a
            href={finding.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-infoDark underline"
          >
            فتح المرجع الرسمي <ExternalLink size={12} aria-hidden="true" />
          </a>
        </div>
      ) : null}
    </li>
  );
}

export function FindingsList({ findings }: { findings: ReviewFinding[] }) {
  return (
    <article className="space-y-3 rounded-xl border border-infoBorder bg-infoSoft p-5 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-infoDark">الملاحظات</p>
      <ol className="space-y-2">
        {findings.map((finding, index) => (
          <FindingItem key={`${finding.title}-${finding.evidence}`} finding={finding} index={index} />
        ))}
      </ol>
    </article>
  );
}
