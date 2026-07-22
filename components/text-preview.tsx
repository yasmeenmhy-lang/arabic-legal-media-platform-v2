"use client";

// ─────────────────────────────────────────────────────────────────────────────
// معاينة النص (بطلب مالكة المنصة): زر يبدّل بين صندوق التحرير وعرض قراءة نظيف —
// مكوّن مشترك واحد يُركَّب على كل موضع نص طويل (المحتوى المقترح، النص محل المراجعة،
// الصياغة المقترحة/التحسينية) فيتوحّد الشكل والسلوك في المنصة كلها.
// ─────────────────────────────────────────────────────────────────────────────
import { Eye } from "lucide-react";

export function PreviewToggleButton({ preview, onToggle }: { preview: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition ${
        preview ? "border-palm bg-mint/30 text-palm" : "border-line text-ink/60 hover:border-palm hover:text-palm"
      }`}
    >
      <Eye size={13} aria-hidden="true" />
      {preview ? "تحرير" : "معاينة"}
    </button>
  );
}

export function ReadingPreview({ text }: { text: string }) {
  return (
    <div className="whitespace-pre-wrap rounded-xl border border-line bg-white p-5 text-[15px] leading-9 text-ink shadow-sm">
      {text}
    </div>
  );
}
