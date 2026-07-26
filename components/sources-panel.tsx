"use client";

// ─────────────────────────────────────────────────────────────────────────────
// لوحة الأدلة «المصادر المعتمدة» (بقرار مالكة المنصة، الحل «ج») — تعرض المصادر
// الموثوقة التي جلبها البحث الحي كأدلة مرئية قابلة للنقر، منفصلةً عن النص المنشور:
// - النص يبقى نظيفاً جاهزاً للنشر دون روابط مقحمة.
// - المحامي يرى الأدلة بروابطها الرسمية فيثق بالمحتوى ويتحقق بنفسه.
// - شارة نوع الجهة (حكومي/دولي/أكاديمي) تعزّز معنى «معتمدة» بصرياً.
// - زر «إدراج المصادر في نهاية النص» اختياري — لمن أراد نشرها مع المنشور.
//
// ★ عرضٌ صرف لا يمسّ منطق الفحص إطلاقاً.
// ─────────────────────────────────────────────────────────────────────────────
import { BookMarked, ExternalLink, ListPlus } from "lucide-react";
import { classifySourceUrl, type SourceCategory } from "@/lib/services/trusted-sources";

export type Source = { title: string; url: string };

const BADGE: Record<SourceCategory, string> = {
  "حكومي": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "حكومي أجنبي": "bg-teal-50 text-teal-700 border-teal-200",
  "منظمة دولية": "bg-sky-50 text-sky-700 border-sky-200",
  "منظمة": "bg-cyan-50 text-cyan-700 border-cyan-200",
  "أكاديمي": "bg-violet-50 text-violet-700 border-violet-200",
  "موثّق": "bg-slate-50 text-slate-600 border-slate-200",
};

function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

// النص المُدرَج عند اختيار «إدراج المصادر في نهاية النص»
export function formatSourcesForInsertion(sources: Source[]): string {
  const lines = sources.map((s) => `- ${s.title} (${s.url})`).join("\n");
  return `\n\nالمصادر:\n${lines}`;
}

export function SourcesPanel({
  sources,
  onInsert,
}: {
  sources: Source[];
  onInsert?: (block: string) => void;
}) {
  if (!sources || sources.length === 0) return null;
  return (
    <div className="mt-5 rounded-xl border border-line bg-white/70 p-4">
      <div className="mb-1 flex items-center gap-2">
        <BookMarked size={16} className="text-palm" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-ink">المصادر المعتمدة</h3>
        <span className="rounded-full bg-palm/10 px-2 py-0.5 text-xs font-medium text-palm">{sources.length}</span>
      </div>
      <p className="mb-3 text-xs leading-6 text-ink/50">
        مصادر موثوقة استند إليها المحتوى — من جهات رسمية ودولية وأكاديمية معتمدة. راجعها للتحقق.
      </p>

      <ul className="space-y-2">
        {sources.map((s) => {
          const cat = classifySourceUrl(s.url);
          return (
            <li key={s.url}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-2.5 rounded-lg border border-line bg-white p-2.5 transition hover:border-palm hover:bg-palm/[0.03] focus-ring"
              >
                <span className={`mt-0.5 shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium ${BADGE[cat]}`}>
                  {cat}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-ink group-hover:text-palm">{s.title}</span>
                  <span className="block truncate text-xs text-ink/40" dir="ltr">{hostOf(s.url)}</span>
                </span>
                <ExternalLink size={14} className="mt-0.5 shrink-0 text-ink/30 group-hover:text-palm" aria-hidden="true" />
              </a>
            </li>
          );
        })}
      </ul>

      {onInsert && (
        <button
          type="button"
          onClick={() => onInsert(formatSourcesForInsertion(sources))}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-ink/70 transition hover:border-palm hover:text-palm focus-ring"
        >
          <ListPlus size={14} aria-hidden="true" />
          إدراج المصادر في نهاية النص
        </button>
      )}
    </div>
  );
}
