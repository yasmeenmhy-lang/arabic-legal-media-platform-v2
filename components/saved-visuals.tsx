"use client";

import { Download } from "lucide-react";
import type { StoredVisual } from "@/lib/content-record-store";

// بقرار مالكة المنصة: «المحتوى المرئي ينتقل لا يختفي» — معرض موحد يعرض مرئيات الإصدار
// في كل محطة ينتقل إليها المحتوى (المراجعة، النشر، الجدولة، التخطيط) من مصدر واحد
export function SavedVisualsGallery({
  visuals,
  title = "المرئيات المحفوظة مع هذا الإصدار",
  compact = false,
  withDownload = false,
  defaultOpen = true,
}: {
  visuals: StoredVisual[] | undefined;
  title?: string;
  compact?: boolean;
  withDownload?: boolean;
  defaultOpen?: boolean;
}) {
  if (!visuals?.length) return null;
  const maxH = compact ? "[&_svg]:max-h-[220px]" : "[&_svg]:max-h-[360px]";
  const imgMaxH = compact ? "max-h-[220px]" : "max-h-[360px]";

  function downloadVisual(visual: StoredVisual) {
    const name = (visual.visualTypeLabel || "مرئي").replace(/\s+/g, "-");
    if (visual.svg) {
      const blob = new Blob([visual.svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${name}.svg`;
      link.click();
      URL.revokeObjectURL(url);
      return;
    }
    if (visual.imageUrl) {
      const link = document.createElement("a");
      link.href = visual.imageUrl;
      link.download = `${name}.png`;
      link.click();
    }
  }

  return (
    <details className={`rounded-xl border border-line bg-white ${compact ? "p-3" : "p-4"}`} open={defaultOpen}>
      <summary className="cursor-pointer text-sm font-semibold text-palm">
        {title} ({visuals.length})
      </summary>
      <div className={`mt-3 grid gap-3 ${compact ? "" : "md:grid-cols-2"}`}>
        {visuals.map((visual) => (
          <figure key={visual.id} className="rounded-md border border-line bg-white p-2">
            <figcaption className="mb-2 flex items-center justify-between gap-2 px-1">
              <span className="text-xs font-medium text-ink/70">{visual.visualTypeLabel}</span>
              {withDownload ? (
                <button
                  type="button"
                  onClick={() => downloadVisual(visual)}
                  className="inline-flex items-center gap-1 rounded border border-line px-2 py-1 text-[11px] text-palm transition hover:border-palm hover:bg-mint focus-ring"
                >
                  <Download size={11} /> تنزيل
                </button>
              ) : null}
            </figcaption>
            {visual.svg ? (
              // w-full (عرض محدد) لا w-auto: جذر الـSVG المولّد width="100%" بلا height —
              // والعرض غير المحدد يُنهي ارتفاعه إلى صفر في Safari/iOS فتظهر البطاقة فارغة
              <div
                className={`rounded bg-paper/40 p-2 [&_svg]:mx-auto [&_svg]:block [&_svg]:h-auto [&_svg]:w-full ${maxH}`}
                dangerouslySetInnerHTML={{ __html: visual.svg }}
              />
            ) : visual.imageUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <div className="flex justify-center rounded bg-paper/40 p-2">
                <img src={visual.imageUrl} alt={visual.visualTypeLabel} className={`w-auto max-w-full object-contain ${imgMaxH}`} />
              </div>
            ) : null}
          </figure>
        ))}
      </div>
    </details>
  );
}
