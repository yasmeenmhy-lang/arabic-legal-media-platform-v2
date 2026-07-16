"use client";

import { useMemo, useState } from "react";
import { Download, Pencil, Trash2, Check, X } from "lucide-react";
import type { StoredVisual } from "@/lib/content-record-store";

// محرر المرئي المحفوظ — بأمر مالكة المنصة: «المستخدم مسؤول عن محتواه فله كل الصلاحيات
// لتعديله». يستخرج النصوص الظاهرة داخل الـSVG ويتيح تحريرها حرفاً حرفاً ثم يعيد حقنها
// في مواضعها نفسها (تصميم ثابت، النص فقط يتغير)، مع إعادة التسمية والحذف والتنزيل.

type TextNode = { path: number[]; value: string };

// استخراج عقد النص من SVG بترتيب ثابت — كل <text>/<tspan> يحمل نصاً مباشراً
function extractTextNodes(svg: string): { doc: Document | null; nodes: TextNode[] } {
  if (typeof window === "undefined") return { doc: null, nodes: [] };
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  if (doc.querySelector("parsererror")) return { doc: null, nodes: [] };
  const nodes: TextNode[] = [];
  const walk = (el: Element, path: number[]) => {
    Array.from(el.childNodes).forEach((child, i) => {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const cel = child as Element;
        const tag = cel.tagName.toLowerCase();
        if (tag === "text" || tag === "tspan") {
          // النص المباشر فقط (بلا الأبناء) — العقدة النصية الأولى إن وُجدت
          const direct = Array.from(cel.childNodes).find(
            (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim()
          );
          if (direct) nodes.push({ path: [...path, i], value: direct.textContent ?? "" });
        }
        walk(cel, [...path, i]);
      }
    });
  };
  walk(doc.documentElement, []);
  return { doc, nodes };
}

function applyEdits(svg: string, edits: string[]): string {
  const { doc, nodes } = extractTextNodes(svg);
  if (!doc) return svg;
  const resolve = (path: number[]): Element | null => {
    let el: Element = doc.documentElement;
    for (const idx of path) {
      const child = el.childNodes[idx];
      if (!child || child.nodeType !== Node.ELEMENT_NODE) return null;
      el = child as Element;
    }
    return el;
  };
  nodes.forEach((node, i) => {
    const el = resolve(node.path);
    if (!el) return;
    const direct = Array.from(el.childNodes).find(
      (n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? "").trim()
    );
    if (direct) direct.textContent = edits[i] ?? node.value;
  });
  return new XMLSerializer().serializeToString(doc);
}

export function EditableSavedVisual({
  visual,
  onSaveSvg,
  onRename,
  onDelete,
  maxH = "[&_svg]:max-h-[360px]",
}: {
  visual: StoredVisual;
  onSaveSvg: (svg: string) => void;
  onRename: (label: string) => void;
  onDelete: () => void;
  maxH?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [label, setLabel] = useState(visual.visualTypeLabel);
  const [confirmDel, setConfirmDel] = useState(false);
  const initial = useMemo(() => (visual.svg ? extractTextNodes(visual.svg).nodes.map((n) => n.value) : []), [visual.svg]);
  const [edits, setEdits] = useState<string[]>(initial);

  function download() {
    const name = (visual.visualTypeLabel || "مرئي").replace(/\s+/g, "-");
    if (visual.svg) {
      const blob = new Blob([visual.svg], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${name}.svg`; a.click();
      URL.revokeObjectURL(url);
    } else if (visual.imageUrl) {
      const a = document.createElement("a");
      a.href = visual.imageUrl; a.download = `${name}.png`; a.click();
    }
  }

  function saveEdits() {
    if (!visual.svg) return;
    onSaveSvg(applyEdits(visual.svg, edits));
    setEditing(false);
  }

  const canEditText = Boolean(visual.svg) && initial.length > 0;

  return (
    <figure className="rounded-md border border-line bg-white p-2">
      <figcaption className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
        {renaming ? (
          <span className="flex items-center gap-1">
            <input value={label} onChange={(e) => setLabel(e.target.value)}
              className="w-40 rounded border border-line px-2 py-1 text-xs focus-ring" />
            <button type="button" onClick={() => { onRename(label); setRenaming(false); }}
              className="rounded border border-palm p-1 text-palm" title="حفظ التسمية"><Check size={12} /></button>
            <button type="button" onClick={() => { setLabel(visual.visualTypeLabel); setRenaming(false); }}
              className="rounded border border-line p-1 text-ink/50" title="إلغاء"><X size={12} /></button>
          </span>
        ) : (
          <span className="text-xs font-medium text-ink/80">{visual.visualTypeLabel}</span>
        )}
        <span className="flex items-center gap-1">
          {canEditText && !editing && (
            <button type="button" onClick={() => { setEdits(initial); setEditing(true); }}
              className="inline-flex items-center gap-1 rounded border border-line px-2 py-1 text-[11px] text-palm transition hover:border-palm hover:bg-mint focus-ring">
              <Pencil size={11} /> تعديل النصوص
            </button>
          )}
          {!renaming && (
            <button type="button" onClick={() => setRenaming(true)}
              className="rounded border border-line px-2 py-1 text-[11px] text-ink/60 transition hover:border-palm hover:text-palm focus-ring">
              تسمية
            </button>
          )}
          <button type="button" onClick={download}
            className="inline-flex items-center gap-1 rounded border border-line px-2 py-1 text-[11px] text-palm transition hover:border-palm hover:bg-mint focus-ring">
            <Download size={11} /> تنزيل
          </button>
          <button type="button" onClick={() => setConfirmDel(true)}
            className="rounded border border-line px-2 py-1 text-[11px] text-red-600 transition hover:border-red-400 hover:bg-red-50 focus-ring" title="حذف المرئي">
            <Trash2 size={11} />
          </button>
        </span>
      </figcaption>

      {confirmDel && (
        <div className="mb-2 flex items-center justify-between gap-2 rounded border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700">
          <span>حذف هذا المرئي نهائياً من الإصدار؟</span>
          <span className="flex gap-1">
            <button type="button" onClick={() => { onDelete(); setConfirmDel(false); }}
              className="rounded bg-red-600 px-2 py-1 text-white">حذف</button>
            <button type="button" onClick={() => setConfirmDel(false)}
              className="rounded border border-red-300 px-2 py-1">إلغاء</button>
          </span>
        </div>
      )}

      {visual.svg ? (
        <div className={`rounded bg-paper/40 p-2 [&_svg]:mx-auto [&_svg]:block [&_svg]:h-auto [&_svg]:w-full ${maxH}`}
          dangerouslySetInnerHTML={{ __html: visual.svg }} />
      ) : visual.imageUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <div className="flex justify-center rounded bg-paper/40 p-2">
          <img src={visual.imageUrl} alt={visual.visualTypeLabel} className={`w-auto max-w-full object-contain ${maxH.includes("220") ? "max-h-[220px]" : "max-h-[360px]"}`} />
        </div>
      ) : null}

      {editing && (
        <div className="mt-2 space-y-2 rounded-lg border border-palm/30 bg-mint/40 p-3">
          <p className="text-xs font-semibold text-palm">حرّر نصوص المرئي — التصميم يبقى كما هو والنص فقط يتغيّر</p>
          <div className="max-h-[300px] space-y-2 overflow-y-auto">
            {edits.map((value, i) => (
              <input key={i} value={value} onChange={(e) => setEdits((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))}
                dir="rtl" className="w-full rounded border border-line bg-white px-2 py-1.5 text-sm focus-ring" />
            ))}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={saveEdits}
              className="inline-flex items-center gap-1 rounded-md bg-palm px-3 py-1.5 text-xs font-medium text-white focus-ring">
              <Check size={12} /> حفظ التعديلات
            </button>
            <button type="button" onClick={() => setEditing(false)}
              className="rounded-md border border-line px-3 py-1.5 text-xs text-ink/60 focus-ring">إلغاء</button>
          </div>
        </div>
      )}

      {visual.imageUrl && !visual.svg && (
        <p className="mt-2 px-1 text-[11px] leading-5 text-ink/50">
          الصورة الاحترافية نقطية — يمكنك تسميتها وتنزيلها وحذفها. لتحرير نصوصها استخدم شريحة النصوص المرافقة في ملف PowerPoint.
        </p>
      )}
    </figure>
  );
}
