"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  LayoutGrid,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Target,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { DgaSpinner, PageHeader, Panel } from "@/components/ui";
import { socialBrandIcons, socialBrandStyles } from "@/components/social-icons";
import { CircularStepper } from "@/components/circular-stepper";
import { SavedVisualsGallery } from "@/components/saved-visuals";
import { smartMatch } from "@/lib/arabic-search";
import { adoptLegacyKey, scopedKey } from "@/lib/user-scope";
import {
  loadContentRecords,
  saveContentRecords,
  type StoredContentRecord,
} from "@/lib/content-record-store";

// ── Types ──────────────────────────────────────────────────────────────────

type DisplayStatus = "منشورة" | "مجدولة" | "تحتاج مراجعة" | "مسودة";
type ViewTab = "calendar" | "kanban";
type SortKey = "title" | "date" | "status";

type SmartPlanItem = {
  contentId: string;
  suggestedDate: string;
  channel: string;
  reason: string;
  priority: "high" | "medium" | "low";
};

type SmartPlanResult = {
  plan: SmartPlanItem[];
  gaps: string[];
  summary: string;
  demo?: boolean;
};

// ── Status helpers ─────────────────────────────────────────────────────────

// بقرارها: المواعيد معزولة لكل حساب — لا تداخل بين الحسابات على نفس الجهاز
function getTargetDate(id: string): string {
  if (typeof window === "undefined") return "";
  adoptLegacyKey(`lawyer-media:target-publication-date:${id}`);
  return window.localStorage.getItem(scopedKey(`lawyer-media:target-publication-date:${id}`)) ?? "";
}

function saveTargetDate(id: string, date: string) {
  window.localStorage.setItem(scopedKey(`lawyer-media:target-publication-date:${id}`), date);
  try { window.dispatchEvent(new Event("lm-work-changed")); } catch { /* بيئة بلا نافذة */ }
}

function removeTargetDate(id: string) {
  // مسح = قيمة فارغة تُزامَن (لا حذف صامت) فيسري المسح على كل الأجهزة
  window.localStorage.setItem(scopedKey(`lawyer-media:target-publication-date:${id}`), "");
  try { window.dispatchEvent(new Event("lm-work-changed")); } catch { /* بيئة بلا نافذة */ }
}

function getDisplayStatus(record: StoredContentRecord, targetDate: string): DisplayStatus {
  if (record.sharingStatus === "تمت المشاركة") return "منشورة";
  if (record.status === "معتمد" && targetDate) return "مجدولة";
  if (record.status === "يحتاج إلى تعديل" || record.status === "قيد التحليل") return "تحتاج مراجعة";
  return "مسودة";
}

const STATUS_COLORS: Record<DisplayStatus, { bg: string; text: string; border: string }> = {
  "منشورة":        { bg: "bg-mint",       text: "text-palm",   border: "border-palm/30" },
  "مجدولة":        { bg: "bg-goldSoft",   text: "text-gold",   border: "border-goldBorder" },
  "تحتاج مراجعة": { bg: "bg-red-50",     text: "text-red-700", border: "border-red-200" },
  "مسودة":         { bg: "bg-violetSoft", text: "text-violet", border: "border-violetBorder" },
};

const STATUS_DOT: Record<DisplayStatus, string> = {
  "منشورة":        "bg-palm",
  "مجدولة":        "bg-gold",
  "تحتاج مراجعة": "bg-red-500",
  "مسودة":         "bg-violet",
};

// ── Feature 1: Auto date suggestion ───────────────────────────────────────

const CHANNEL_PREFERRED_DAYS: Record<string, number[]> = {
  linkedin:  [1, 2, 3],
  twitter:   [0, 4],
  instagram: [3, 4],
  snapchat:  [4, 5],
  youtube:   [2, 3],
  tiktok:    [4, 5],
};
const PROFESSIONAL_DAYS = [1, 2, 3];

function suggestPublishDate(
  record: StoredContentRecord,
  allTargetDates: Record<string, string>
): string {
  const version = record.versions.find((v) => v.version === record.currentVersion) ?? record.versions.at(-1);
  const channels = version?.analysis?.channelRecommendations?.map((c) => c.key) ?? [];
  const preferredDays = channels.length
    ? (CHANNEL_PREFERRED_DAYS[channels[0]] ?? PROFESSIONAL_DAYS)
    : PROFESSIONAL_DAYS;
  const taken = new Set(Object.values(allTargetDates).filter(Boolean));
  const base = new Date();
  for (let i = 1; i <= 60; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    if (preferredDays.includes(d.getDay()) && !taken.has(dateStr)) return dateStr;
  }
  for (let i = 1; i <= 60; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    if (!taken.has(dateStr)) return dateStr;
  }
  return "";
}

// ── Timeline ───────────────────────────────────────────────────────────────

const STAGE_LABELS = [
  "فكرة المحتوى",
  "المراجعة والامتثال",
  "الصياغة المقترحة",
  "اعتماد النسخة",
  "القنوات المقترحة",
  "موعد النشر",
  "تجهيز النشر",
  "المتابعة",
  "التحسين",
];

const STAGE_HREFS = [
  "/content-studio",            // فكرة المحتوى
  "/content-review#findings",   // المراجعة والامتثال
  "/content-review#rewrite",    // الصياغة المقترحة
  "/content-review#approval",   // اعتماد النسخة
  "/content-review#channels",   // القنوات المقترحة
  "/calendar-v2",               // موعد النشر
  "/content-management",        // تجهيز النشر
  "/content-management",        // المتابعة
  "/content-studio",            // التحسين
];

function computeStages(record: StoredContentRecord, targetDate: string) {
  const version = record.versions.find((v) => v.version === record.currentVersion);
  const review = version?.analysis;
  const approved = Boolean(record.approvedVersion);
  const hasFindings = Boolean(review?.findings.length || review?.languageQuality?.issues.length);
  const shared = record.sharingStatus === "تمت المشاركة";

  const completions = [
    true,
    Boolean(review),
    Boolean(review) && (!hasFindings || approved),
    approved,
    approved && Boolean(review?.channelRecommendations?.length),
    Boolean(targetDate),
    shared,
    false,
    false,
  ];

  const currentIndex = completions.findIndex((c) => !c);
  return STAGE_LABELS.map((label, i) => ({
    label,
    href: STAGE_HREFS[i],
    complete: completions[i],
    current: i === currentIndex,
  }));
}

// ── Hijri date helpers ─────────────────────────────────────────────────────

function hijriDayLabel(date: Date): string {
  // Returns the Hijri day number (Latin digits). On the 1st of a Hijri month
  // returns the short Arabic month name instead (like iOS Calendar).
  const dayNum = new Intl.DateTimeFormat("en-u-ca-islamic", { day: "numeric" }).format(date);
  if (dayNum === "1") {
    return new Intl.DateTimeFormat("ar-SA-u-ca-islamic", { month: "short" }).format(date);
  }
  return dayNum;
}

function hijriMonthRange(year: number, mon: number): string {
  const first = new Date(year, mon, 1);
  const last  = new Date(year, mon + 1, 0);
  const full  = (d: Date) => new Intl.DateTimeFormat("ar-SA-u-ca-islamic", { month: "long", year: "numeric" }).format(d);
  const month = (d: Date) => new Intl.DateTimeFormat("ar-SA-u-ca-islamic", { month: "long" }).format(d);
  const fl = full(first), ll = full(last);
  return fl === ll ? fl : `${month(first)} – ${ll}`;
}

// ── Calendar Tab ───────────────────────────────────────────────────────────

function CalendarTab({
  records,
  targetDates,
  onSelect,
  onSelectDate,
}: {
  records: StoredContentRecord[];
  targetDates: Record<string, string>;
  onSelect: (id: string) => void;
  onSelectDate: (date: string, items: StoredContentRecord[]) => void;
}) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const year = month.getFullYear();
  const mon = month.getMonth();
  const monthLabel = month.toLocaleDateString("ar-SA-u-ca-gregory", { month: "long", year: "numeric" });
  const firstDay = new Date(year, mon, 1).getDay();
  const daysInMonth = new Date(year, mon + 1, 0).getDate();

  const byDate = useMemo(() => {
    const map: Record<string, StoredContentRecord[]> = {};
    records.forEach((r) => {
      const d = targetDates[r.id];
      if (d) {
        if (!map[d]) map[d] = [];
        map[d].push(r);
      }
    });
    return map;
  }, [records, targetDates]);

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  // Feature 2: gap detection — weeks with no scheduled content
  const gapWeeks = useMemo(() => {
    const weeks: number[] = [];
    const rows = Math.ceil(cells.length / 7);
    for (let w = 0; w < rows; w++) {
      const week = cells.slice(w * 7, w * 7 + 7);
      const hasContent = week.some((day) => {
        if (!day) return false;
        const dateStr = `${year}-${String(mon + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        return (byDate[dateStr]?.length ?? 0) > 0;
      });
      if (!hasContent) weeks.push(w + 1);
    }
    return weeks;
  }, [cells, byDate, year, mon]);

  const today = new Date();
  const isToday = (day: number) =>
    today.getDate() === day && today.getMonth() === mon && today.getFullYear() === year;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={() => setMonth(new Date(year, mon - 1, 1))}
          className="rounded-lg border border-line p-2 hover:bg-paper transition focus-ring"
        >
          <ChevronRight size={16} />
        </button>
        <div className="text-center">
          <p className="font-semibold">{monthLabel}</p>
          <p className="text-[11px] text-ink/45">{hijriMonthRange(year, mon)}</p>
        </div>
        <button
          onClick={() => setMonth(new Date(year, mon + 1, 1))}
          className="rounded-lg border border-line p-2 hover:bg-paper transition focus-ring"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 text-center text-xs text-ink/50">
        {["أحد", "اثن", "ثلا", "أرب", "خمي", "جمع", "سبت"].map((d) => (
          <div key={d} className="py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg bg-line">
        {cells.map((day, i) => {
          if (!day) return <div key={i} className="min-h-[64px] bg-paper" />;
          const dateStr = `${year}-${String(mon + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const items = byDate[dateStr] ?? [];
          return (
            <button
              key={i}
              onClick={() => onSelectDate(dateStr, items)}
              className={`min-h-[72px] w-full bg-white p-1 text-start transition hover:bg-paper/80 focus-ring ${items.length > 1 ? "bg-goldSoft/20" : ""}`}
            >
              <div className="mb-0.5 flex flex-col">
                <div className="flex items-center gap-0.5">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold leading-none ${
                    isToday(day) ? "bg-palm text-white" : "text-ink"
                  }`}>{day}</span>
                  {items.length > 1 && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" title="تعارض: أكثر من منشور في يوم واحد" />
                  )}
                </div>
                <p className={`ps-0.5 text-[9px] leading-3 ${isToday(day) ? "text-palm/70" : "text-ink/40"}`}>
                  {hijriDayLabel(new Date(year, mon, day))}
                </p>
              </div>
              <div className="space-y-0.5">
                {items.slice(0, 2).map((r) => {
                  const ds = getDisplayStatus(r, targetDates[r.id] ?? "");
                  const c = STATUS_COLORS[ds];
                  return (
                    <span
                      key={r.id}
                      className={`block w-full truncate rounded px-1 py-0.5 text-right text-[10px] leading-4 ${c.bg} ${c.text}`}
                    >
                      {r.title}
                    </span>
                  );
                })}
                {items.length > 2 && (
                  <p className="px-1 text-[10px] text-ink/40">+{items.length - 2}</p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Feature 2: gap warnings */}
      {gapWeeks.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {gapWeeks.map((w) => (
            <div key={w} className="flex items-center gap-2 rounded-lg bg-goldSoft px-3 py-2">
              <AlertTriangle size={12} className="shrink-0 text-gold" />
              <p className="text-xs text-gold">الأسبوع {w} من الشهر بدون محتوى مجدول</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Kanban Tab ─────────────────────────────────────────────────────────────

const KANBAN_COLS: { key: DisplayStatus; label: string }[] = [
  { key: "مسودة",        label: "مسودة" },
  { key: "تحتاج مراجعة", label: "يراجع" },
  { key: "مجدولة",       label: "مجدول" },
  { key: "منشورة",       label: "منشور" },
];

function KanbanCard({
  record,
  targetDates,
  todayStr,
  onSelect,
}: {
  record: StoredContentRecord;
  targetDates: Record<string, string>;
  todayStr: string;
  onSelect: (id: string) => void;
}) {
  const ds = getDisplayStatus(record, targetDates[record.id] ?? "");
  const c = STATUS_COLORS[ds];
  const isReadyToday = targetDates[record.id] === todayStr && Boolean(record.approvedVersion);
  return (
    <button
      onClick={() => onSelect(record.id)}
      className={`w-full rounded-lg border bg-white p-3 text-right transition hover:border-palm hover:shadow-sm focus-ring ${isReadyToday ? "border-palm ring-1 ring-palm/20" : "border-line"}`}
    >
      {isReadyToday && (
        <span className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-mint px-2 py-0.5 text-xs text-palm">
          <CheckCircle2 size={10} /> جاهز للنشر اليوم
        </span>
      )}
      <p className="line-clamp-2 text-sm font-medium leading-6">{record.title}</p>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs ${c.bg} ${c.text}`}>{ds}</span>
        {targetDates[record.id] && (
          <span className="text-xs text-ink/50">{targetDates[record.id]}</span>
        )}
      </div>
    </button>
  );
}

function KanbanTab({
  records,
  targetDates,
  onSelect,
}: {
  records: StoredContentRecord[];
  targetDates: Record<string, string>;
  onSelect: (id: string) => void;
}) {
  const [mobileCol, setMobileCol] = useState<DisplayStatus>("مسودة");
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const grouped = useMemo(() => {
    const map: Record<DisplayStatus, StoredContentRecord[]> = {
      "مسودة": [], "تحتاج مراجعة": [], "مجدولة": [], "منشورة": [],
    };
    records.forEach((r) => {
      const ds = getDisplayStatus(r, targetDates[r.id] ?? "");
      map[ds].push(r);
    });
    // Feature 3: smart sort — ready today → approved → has date → rest
    (Object.keys(map) as DisplayStatus[]).forEach((col) => {
      map[col].sort((a, b) => {
        const score = (r: StoredContentRecord) => {
          if (targetDates[r.id] === todayStr && r.approvedVersion) return 0;
          if (r.approvedVersion && targetDates[r.id]) return 1;
          if (r.approvedVersion) return 2;
          if (targetDates[r.id]) return 3;
          return 4;
        };
        const diff = score(a) - score(b);
        if (diff !== 0) return diff;
        return (targetDates[a.id] ?? "").localeCompare(targetDates[b.id] ?? "");
      });
    });
    return map;
  }, [records, targetDates, todayStr]);

  return (
    <div>
      {/* Mobile tabs */}
      <div className="mb-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
        {KANBAN_COLS.map((col) => {
          const c = STATUS_COLORS[col.key];
          return (
            <button
              key={col.key}
              onClick={() => setMobileCol(col.key)}
              className={`flex-shrink-0 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                mobileCol === col.key ? `${c.bg} ${c.text} ${c.border}` : "border-line bg-white text-ink/60"
              }`}
            >
              {col.label} ({grouped[col.key].length})
            </button>
          );
        })}
      </div>

      {/* Desktop: 4 columns */}
      <div className="hidden gap-3 lg:grid lg:grid-cols-4">
        {KANBAN_COLS.map((col) => {
          const c = STATUS_COLORS[col.key];
          return (
            <div key={col.key}>
              <div className={`mb-2 flex items-center justify-between rounded-lg px-3 py-2 ${c.bg}`}>
                <p className={`text-sm font-semibold ${c.text}`}>{col.label}</p>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${c.text}`}>
                  {grouped[col.key].length}
                </span>
              </div>
              <div className="space-y-2">
                {grouped[col.key].length === 0 ? (
                  <p className="rounded-lg border border-dashed border-line p-4 text-center text-xs text-ink/40">
                    لا يوجد
                  </p>
                ) : (
                  grouped[col.key].map((r) => (
                    <KanbanCard key={r.id} record={r} targetDates={targetDates} todayStr={todayStr} onSelect={onSelect} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile: single column */}
      <div className="space-y-2 lg:hidden">
        {grouped[mobileCol].length === 0 ? (
          <p className="rounded-lg border border-dashed border-line p-4 text-center text-xs text-ink/40">
            لا يوجد
          </p>
        ) : (
          grouped[mobileCol].map((r) => (
            <KanbanCard key={r.id} record={r} targetDates={targetDates} todayStr={todayStr} onSelect={onSelect} />
          ))
        )}
      </div>
    </div>
  );
}

// ── List Tab ───────────────────────────────────────────────────────────────

function ListTab({
  records,
  targetDates,
  onSelect,
}: {
  records: StoredContentRecord[];
  targetDates: Record<string, string>;
  onSelect: (id: string) => void;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortAsc, setSortAsc] = useState(false);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((prev) => !prev);
    else { setSortKey(key); setSortAsc(true); }
  }

  const sorted = useMemo(() => {
    return [...records].sort((a, b) => {
      let val = 0;
      if (sortKey === "title") val = a.title.localeCompare(b.title, "ar");
      else if (sortKey === "date")
        val = (targetDates[a.id] ?? "").localeCompare(targetDates[b.id] ?? "");
      else {
        const da = getDisplayStatus(a, targetDates[a.id] ?? "");
        const db = getDisplayStatus(b, targetDates[b.id] ?? "");
        val = da.localeCompare(db, "ar");
      }
      return sortAsc ? val : -val;
    });
  }, [records, targetDates, sortKey, sortAsc]);

  function SortBtn({ label, col }: { label: string; col: SortKey }) {
    const active = sortKey === col;
    return (
      <button
        onClick={() => toggleSort(col)}
        className={`flex items-center gap-1 text-xs font-semibold transition ${
          active ? "text-palm" : "text-ink/60 hover:text-ink"
        }`}
      >
        {label}
        {active && <span className="text-[10px]">{sortAsc ? "↑" : "↓"}</span>}
      </button>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-line">
      <table className="w-full min-w-[580px] text-sm">
        <thead className="bg-paper">
          <tr>
            <th className="px-3 py-2.5 text-right"><SortBtn label="الحالة" col="status" /></th>
            <th className="px-3 py-2.5 text-right"><SortBtn label="المحتوى" col="title" /></th>
            <th className="px-3 py-2.5 text-right"><SortBtn label="موعد النشر" col="date" /></th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold text-ink/60">القناة</th>
            <th className="px-3 py-2.5 text-right text-xs font-semibold text-ink/60">إجراء</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-3 py-10 text-center text-sm text-ink/40">
                لا يوجد محتوى
              </td>
            </tr>
          ) : (
            sorted.map((r) => {
              const version = r.versions.find((v) => v.version === r.currentVersion);
              const ds = getDisplayStatus(r, targetDates[r.id] ?? "");
              const c = STATUS_COLORS[ds];
              return (
                <tr key={r.id} className="transition hover:bg-paper/60">
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${c.bg} ${c.text}`}>{ds}</span>
                  </td>
                  <td className="max-w-[200px] px-3 py-2.5">
                    <p className="truncate font-medium">{r.title}</p>
                  </td>
                  <td className="px-3 py-2.5 text-ink/60">
                    {targetDates[r.id] || <span className="text-ink/30">—</span>}
                  </td>
                  <td className="px-3 py-2.5 text-ink/60">{version?.channel ?? "—"}</td>
                  <td className="px-3 py-2.5">
                    <button
                      onClick={() => onSelect(r.id)}
                      className="rounded-md border border-line px-3 py-1 text-xs transition hover:border-palm hover:text-palm"
                    >
                      فتح
                    </button>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Content Panel ──────────────────────────────────────────────────────────

function ContentPanel({
  record,
  targetDate,
  allTargetDates,
  onClose,
  onSaveDate,
  onDelete,
}: {
  record: StoredContentRecord;
  targetDate: string;
  allTargetDates: Record<string, string>;
  onClose: () => void;
  onSaveDate: (date: string) => void;
  onDelete: () => void;
}) {
  const version = record.versions.find((v) => v.version === record.currentVersion);
  const [date, setDate] = useState(targetDate);
  const [savedMsg, setSavedMsg] = useState("");
  const [postOutcome, setPostOutcome] = useState<"published" | "delayed" | "cancelled" | null>(null);

  const stages = computeStages(record, targetDate);
  const completed = stages.filter((s) => s.complete).length;
  const progressPercent = Math.round((completed / stages.length) * 100);
  const recommendations = version?.analysis?.channelRecommendations ?? [];
  const [selectedChannels, setSelectedChannels] = useState<string[]>(
    recommendations.map((r) => r.key)
  );

  const ds = getDisplayStatus(record, targetDate);
  const c = STATUS_COLORS[ds];

  function handleSave() {
    onSaveDate(date);
    setSavedMsg("تم حفظ الموعد");
    setTimeout(() => setSavedMsg(""), 2500);
  }

  function toggleChannel(key: string) {
    setSelectedChannels((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[82vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl lg:inset-x-auto lg:bottom-0 lg:end-0 lg:top-0 lg:w-[390px] lg:max-h-full lg:rounded-none lg:rounded-s-2xl lg:shadow-[-4px_0_24px_rgba(0,0,0,0.08)]">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-4 py-3">
          <p className="font-semibold">تفاصيل المحتوى</p>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-paper transition focus-ring">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 p-4">
          {/* Title & status */}
          <div>
            <p className="text-base font-semibold leading-7">{record.title}</p>
            <span className={`mt-1.5 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${c.bg} ${c.text}`}>
              {ds}
            </span>
          </div>

          {/* Timeline */}
          <div className="space-y-3">
            {(() => {
              const currentIdx = stages.findIndex((s) => s.current);
              const activeIdx  = currentIdx >= 0 ? currentIdx : completed < stages.length ? completed : stages.length - 1;
              return (
                <CircularStepper
                  current={activeIdx + 1}
                  total={stages.length}
                  title={stages[activeIdx]?.label ?? ""}
                  prev={activeIdx > 0 ? stages[activeIdx - 1].label : undefined}
                  next={activeIdx < stages.length - 1 ? stages[activeIdx + 1].label : undefined}
                  size="sm"
                />
              );
            })()}
            <div className="grid grid-cols-3 gap-1">
              {stages.map((stage) => (
                <Link
                  key={stage.label}
                  href={stage.href}
                  className={`rounded px-1.5 py-1 text-center text-[10px] leading-4 transition hover:opacity-75 focus-ring ${
                    stage.complete
                      ? "bg-mint text-palm"
                      : stage.current
                        ? "bg-goldSoft text-gold ring-1 ring-gold/30"
                        : "bg-paper text-ink/40"
                  }`}
                >
                  {stage.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Goal & audience */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-paper p-3">
              <div className="mb-1 flex items-center gap-1.5 text-palm">
                <Target size={13} />
                <p className="text-xs">الهدف</p>
              </div>
              <p className="text-xs leading-5 text-ink/70">{version?.purpose ?? "غير محدد"}</p>
            </div>
            <div className="rounded-lg bg-paper p-3">
              <div className="mb-1 flex items-center gap-1.5 text-palm">
                <Users size={13} />
                <p className="text-xs">الجمهور</p>
              </div>
              <p className="text-xs leading-5 text-ink/70">{version?.audience ?? "غير محدد"}</p>
            </div>
          </div>

          {/* Publication decision */}
          {version?.analysis?.publicationDecision && (
            <div className="rounded-lg border border-line p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-ink/70">قرار النشر</p>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  version.analysis.publicationDecision.recommended ? "bg-mint text-palm" : "bg-goldSoft text-gold"
                }`}>
                  {version.analysis.publicationDecision.label}
                </span>
              </div>
              <p className="mt-2 text-xs leading-5 text-ink/65">{version.analysis.publicationDecision.reason}</p>
            </div>
          )}

          {/* بقرار مالكة المنصة: المرئيات تنتقل مع المحتوى إلى الجدولة — تظهر مع تفاصيل كل عنصر مجدول */}
          <SavedVisualsGallery visuals={version?.visuals} title="المرئيات المرافقة" compact defaultOpen={false} />

          {/* Target date */}
          <div>
            <label className="text-xs font-semibold text-ink/70">موعد النشر المستهدف</label>
            <div className="mt-1.5 flex gap-2">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="flex-1 rounded-lg border border-line px-3 py-2 text-sm focus-ring"
              />
              <button
                onClick={handleSave}
                disabled={!date}
                className="flex items-center gap-1.5 rounded-lg border border-palm px-3 py-2 text-sm text-palm transition hover:bg-mint disabled:opacity-40"
              >
                <Save size={14} /> حفظ
              </button>
            </div>
            <button
              onClick={() => setDate(suggestPublishDate(record, allTargetDates))}
              className="mt-1.5 flex items-center gap-1 text-xs text-palm hover:underline"
            >
              <Sparkles size={11} /> اقتراح موعد تلقائي
            </button>
            {savedMsg && <p className="mt-1 text-xs text-palm">{savedMsg}</p>}
          </div>

          {/* Channels — detailed cards */}
          {recommendations.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-ink/70">القنوات المقترحة</p>
              <div className="space-y-2">
                {recommendations.map((rec) => {
                  const Icon = socialBrandIcons[rec.key];
                  const isSelected = selectedChannels.includes(rec.key);
                  return (
                    <div
                      key={rec.key}
                      className={`rounded-xl border transition ${isSelected ? "border-palm bg-mint/30" : "border-line bg-white"}`}
                    >
                      <button
                        onClick={() => toggleChannel(rec.key)}
                        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-right"
                      >
                        {Icon && <Icon size={17} className={socialBrandStyles[rec.key]?.icon ?? "text-ink/55"} />}
                        <span className={`flex-1 text-sm font-medium ${isSelected ? "text-palm" : "text-ink"}`}>{rec.channel}</span>
                        {isSelected && <CheckCircle2 size={13} className="shrink-0 text-palm" />}
                      </button>
                      {(rec.expectedBenefit || rec.reason) && (
                        <p className="border-t border-line/50 px-3 pb-2.5 pt-2 text-[11px] leading-5 text-ink/55">
                          {rec.expectedBenefit || rec.reason}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/social-media"
              className="flex items-center justify-center gap-1.5 rounded-lg bg-palm px-3 py-2.5 text-sm text-white transition hover:bg-palm/90"
            >
              <Upload size={14} /> تصدير
            </Link>
            <button
              onClick={onDelete}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-red-200 px-3 py-2.5 text-sm text-red-600 transition hover:bg-red-50"
            >
              <Trash2 size={14} /> حذف
            </button>
          </div>

          {/* Follow-up — shown for published content */}
          {ds === "منشورة" && (
            <div className="rounded-lg border border-line p-4">
              <p className="mb-3 text-sm font-semibold">هل تم النشر فعلاً؟</p>
              {postOutcome ? (
                <div className="space-y-2">
                  <p className={`rounded-lg p-3 text-sm ${
                    postOutcome === "published" ? "bg-mint text-palm"
                    : postOutcome === "delayed"   ? "bg-goldSoft text-gold"
                    : "bg-red-50 text-red-600"
                  }`}>
                    {postOutcome === "published" && "تم تأكيد النشر — أحسنت!"}
                    {postOutcome === "delayed"   && "تم تسجيل التأجيل."}
                    {postOutcome === "cancelled" && "تم تسجيل الإلغاء."}
                  </p>
                  <div className="flex items-center gap-3">
                    {postOutcome === "published" && (
                      <Link
                        href="/content-studio"
                        className="flex items-center gap-1 text-xs text-palm hover:underline"
                      >
                        <Sparkles size={11} /> إنشاء محتوى مشابه
                      </Link>
                    )}
                    <button
                      onClick={() => setPostOutcome(null)}
                      className="flex items-center gap-1 text-xs text-ink/50 hover:text-ink transition"
                    >
                      <RotateCcw size={11} /> تغيير الحالة
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setPostOutcome("published")}
                    className="rounded-lg border border-palm bg-mint px-3 py-1.5 text-xs text-palm transition hover:bg-mint/70"
                  >
                    ✅ نعم، تم النشر
                  </button>
                  <button
                    onClick={() => setPostOutcome("delayed")}
                    className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs text-amber-700 transition hover:bg-amber-100"
                  >
                    ⏸️ تأجّل
                  </button>
                  <button
                    onClick={() => setPostOutcome("cancelled")}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-600 transition hover:bg-red-100"
                  >
                    ❌ ألغيت
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Day Panel ─────────────────────────────────────────────────────────────

function DayPanel({
  date,
  records,
  targetDates,
  onClose,
  onSelectRecord,
  onSchedule,
  onUnschedule,
}: {
  date: string;
  records: StoredContentRecord[];
  targetDates: Record<string, string>;
  onClose: () => void;
  onSelectRecord: (id: string) => void;
  onSchedule: (id: string) => void;
  onUnschedule: (id: string) => void;
}) {
  const [pickerQuery, setPickerQuery] = useState("");
  // عناصر اليوم تُشتق مباشرة من تواريخ الجدولة — تتحدث فور الجدولة أو الإلغاء
  const items = records.filter((r) => (targetDates[r.id] ?? "") === date);
  const candidates = records.filter((r) =>
    (targetDates[r.id] ?? "") !== date &&
    smartMatch(pickerQuery, [r.title, r.versions.at(-1)?.body, r.versions.at(-1)?.contentTypeLabel])
  ).slice(0, 8);
  const d = new Date(date + "T12:00:00");
  const hijriLabel = d.toLocaleDateString("ar-SA-u-ca-islamic", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
  const gregorianLabel = d.toLocaleDateString("ar-SA-u-ca-gregory", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl lg:inset-x-auto lg:bottom-0 lg:end-0 lg:top-0 lg:w-[380px] lg:max-h-full lg:rounded-none lg:rounded-s-2xl lg:shadow-[-4px_0_24px_rgba(0,0,0,0.08)]">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-4 py-3">
          <div>
            <p className="font-semibold">{hijriLabel}</p>
            <p className="text-xs text-ink/60">{gregorianLabel}</p>
            <p className="text-xs text-ink/45">{items.length ? `${items.length} محتوى مجدول` : "لا يوجد محتوى مجدول"}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-paper transition focus-ring">
            <X size={18} />
          </button>
        </div>

        <div className="p-4">
          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line bg-paper py-6 text-center">
              <p className="text-sm text-ink/40">لا يوجد محتوى مجدول لهذا اليوم</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((r) => {
                const ds = getDisplayStatus(r, targetDates[r.id] ?? "");
                const c = STATUS_COLORS[ds];
                return (
                  <div key={r.id} className="rounded-lg border border-line p-3 transition hover:border-palm hover:shadow-sm">
                    <button onClick={() => { onSelectRecord(r.id); onClose(); }} className="w-full text-right focus-ring">
                      <p className="font-medium leading-6">{r.title}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${c.bg} ${c.text}`}>{ds}</span>
                        {r.approvedVersion ? (
                          <span className="flex items-center gap-1 text-xs text-palm">
                            <CheckCircle2 size={11} /> معتمد
                          </span>
                        ) : (
                          <span className="text-xs text-ink/45">بانتظار الاعتماد قبل احتسابه مجدولاً</span>
                        )}
                      </div>
                    </button>
                    <button
                      onClick={() => onUnschedule(r.id)}
                      className="mt-2 text-xs text-red-500/80 transition hover:text-red-600 focus-ring"
                    >
                      إلغاء الجدولة من هذا اليوم
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* جدولة محتوى من المستخدم — قائمة بحث سهلة من سجل المحتوى */}
          <div className="mt-5 border-t border-line pt-4">
            <p className="mb-2 text-sm font-semibold text-ink/80">جدولة محتوى لهذا اليوم</p>
            <input
              type="text"
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
              placeholder="ابحث في المحتوى (العنوان أو النص أو النوع)..."
              className="mb-2 w-full rounded-lg border border-line p-2.5 text-sm focus-ring"
            />
            {candidates.length === 0 ? (
              <p className="rounded-lg bg-paper p-3 text-xs text-ink/45">
                {records.length === 0 ? "لا يوجد محتوى في السجل بعد — أنشئ محتوى من الاستوديو أولاً." : "لا نتائج مطابقة للبحث."}
              </p>
            ) : (
              <div className="space-y-1.5">
                {candidates.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => onSchedule(r.id)}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-white p-2.5 text-right text-sm transition hover:border-palm hover:bg-mint/40 focus-ring"
                  >
                    <span className="min-w-0 flex-1 truncate">{r.title}</span>
                    <span className="shrink-0 rounded-full bg-mint px-2 py-0.5 text-xs text-palm">جدولة</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Smart Plan Panel ───────────────────────────────────────────────────────

const PRIORITY_STYLE: Record<SmartPlanItem["priority"], string> = {
  high:   "bg-mint text-palm border-palm/30",
  medium: "bg-goldSoft text-gold border-goldBorder",
  low:    "bg-paper text-ink/60 border-line",
};
const PRIORITY_LABEL: Record<SmartPlanItem["priority"], string> = {
  high: "أولوية عالية", medium: "متوسطة", low: "منخفضة",
};

function SmartPlanPanel({
  loading,
  error,
  result,
  records,
  onClose,
  onRefresh,
  onApply,
  onSelectRecord,
}: {
  loading: boolean;
  error: string;
  result: SmartPlanResult | null;
  records: StoredContentRecord[];
  onClose: () => void;
  onRefresh: () => void;
  onApply: (dates: Record<string, string>) => void;
  onSelectRecord: (id: string) => void;
}) {
  function getRecord(id: string) {
    return records.find((r) => r.id === id);
  }

  // مرشّح القائمة عبر بطاقات النظرة العامة (بطلب مالكة المنصة: الضغط يحدّد المطلوب فقط)
  const [planFilter, setPlanFilter] = useState<"all" | "ready" | "review">("all");

  function handleApply() {
    if (!result) return;
    const dates: Record<string, string> = {};
    result.plan.forEach((item) => { dates[item.contentId] = item.suggestedDate; });
    onApply(dates);
    onClose();
  }

  // ── حساب إحصائيات العرض الشامل ────────────────────────────────────────
  const stats = result ? (() => {
    const high   = result.plan.filter(p => p.priority === "high").length;
    const medium = result.plan.filter(p => p.priority === "medium").length;
    const low    = result.plan.filter(p => p.priority === "low").length;
    const total  = result.plan.length;
    const ready  = result.plan.filter(p => {
      const r = records.find(r => r.id === p.contentId);
      return Boolean(r?.approvedVersion);
    }).length;
    // توزيع القنوات
    const channelMap: Record<string, number> = {};
    result.plan.forEach(p => { channelMap[p.channel] = (channelMap[p.channel] ?? 0) + 1; });
    const channels = Object.entries(channelMap).sort((a, b) => b[1] - a[1]);
    // نطاق التواريخ
    const dates = result.plan.map(p => p.suggestedDate).sort();
    const firstDate = dates[0];
    const lastDate  = dates[dates.length - 1];
    const fmtDate = (d: string) => new Date(d + "T12:00:00").toLocaleDateString("ar-SA-u-ca-gregory", { day: "numeric", month: "short" });
    return { high, medium, low, total, ready, channels, firstDate, lastDate, fmtDate };
  })() : null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-ink/20 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white shadow-2xl lg:inset-x-auto lg:bottom-0 lg:end-0 lg:top-0 lg:w-[420px] lg:max-h-full lg:rounded-none lg:rounded-s-2xl lg:shadow-[-4px_0_24px_rgba(0,0,0,0.08)]">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-white px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-palm" />
            <p className="font-semibold text-ink">الخطة الذكية المقترحة</p>
            {result?.demo && <span className="rounded-full bg-goldSoft px-2 py-0.5 text-[10px] font-medium text-gold">تجريبي</span>}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={onRefresh} disabled={loading} title="تحديث الخطة" className="rounded-lg p-1.5 text-ink/50 hover:bg-paper hover:text-palm transition focus-ring disabled:opacity-40">
              <RotateCcw size={15} />
            </button>
            <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-paper transition focus-ring">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-ink/50">
            <DgaSpinner size="md" />
            <p className="text-sm">جاري التحليل وبناء الخطة...</p>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="m-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
            <button onClick={onRefresh} className="mt-2 flex items-center gap-1 text-xs text-red-600 underline">
              <RotateCcw size={11} /> إعادة المحاولة
            </button>
          </div>
        )}

        {/* Result */}
        {!loading && result && (
        <div className="space-y-4 p-4">
          {/* ── العرض الشامل البصري ── */}
          {stats && (
            <div className="rounded-xl border border-line bg-paper p-4 space-y-3">
              <p className="text-xs font-bold text-ink/60 tracking-wide">نظرة عامة على الخطة</p>

              {/* الأرقام الكبيرة — قابلة للنقر لتصفية القائمة أدناه */}
              <div className="grid grid-cols-3 gap-2">
                <button type="button" onClick={() => setPlanFilter("all")}
                  className={`rounded-lg border p-2.5 text-center transition focus-ring ${planFilter === "all" ? "border-ink/40 bg-white ring-2 ring-ink/15" : "border-line bg-white hover:border-ink/30"}`}>
                  <p className="text-xl font-bold text-ink">{stats.total}</p>
                  <p className="text-[10px] text-ink/50">منشور مجدول</p>
                </button>
                <button type="button" onClick={() => setPlanFilter(planFilter === "ready" ? "all" : "ready")}
                  className={`rounded-lg border p-2.5 text-center transition focus-ring ${planFilter === "ready" ? "border-palm bg-mint ring-2 ring-palm/30" : "border-palm/20 bg-mint hover:border-palm/40"}`}>
                  <p className="text-xl font-bold text-palm">{stats.ready}</p>
                  <p className="text-[10px] text-palm/70">جاهز للنشر</p>
                </button>
                <button type="button" onClick={() => setPlanFilter(planFilter === "review" ? "all" : "review")}
                  className={`rounded-lg border p-2.5 text-center transition focus-ring ${planFilter === "review" ? "border-gold bg-goldSoft ring-2 ring-gold/30" : "border-goldBorder bg-goldSoft hover:border-gold/40"}`}>
                  <p className="text-xl font-bold text-gold">{stats.total - stats.ready}</p>
                  <p className="text-[10px] text-gold/70">يحتاج مراجعة</p>
                </button>
              </div>

              {/* شريط الأولويات */}
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-ink/50">توزيع الأولوية</p>
                {[
                  { label: "عالية",   count: stats.high,   color: "bg-palm",      textColor: "text-palm" },
                  { label: "متوسطة", count: stats.medium, color: "bg-gold",      textColor: "text-gold" },
                  { label: "منخفضة", count: stats.low,    color: "bg-ink/20",    textColor: "text-ink/50" },
                ].map(({ label, count, color, textColor }) => (
                  <div key={label} className="flex items-center gap-2">
                    <span className={`w-12 text-[10px] ${textColor}`}>{label}</span>
                    <div className="flex-1 h-2 rounded-full bg-line overflow-hidden">
                      <div
                        className={`h-full rounded-full ${color} transition-all duration-500`}
                        style={{ width: stats.total > 0 ? `${(count / stats.total) * 100}%` : "0%" }}
                      />
                    </div>
                    <span className={`w-4 text-right text-[10px] font-bold ${textColor}`}>{count}</span>
                  </div>
                ))}
              </div>

              {/* القنوات */}
              {stats.channels.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-ink/50">القنوات</p>
                  <div className="flex flex-wrap gap-1.5">
                    {stats.channels.map(([ch, count]) => (
                      <span key={ch} className="flex items-center gap-1 rounded-full border border-line bg-white px-2.5 py-0.5 text-[10px] font-medium text-ink/70">
                        {ch}
                        <span className="rounded-full bg-palm/10 px-1 text-palm font-bold">{count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* نطاق التواريخ */}
              {stats.firstDate && (
                <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2">
                  <Calendar size={13} className="shrink-0 text-palm" />
                  <p className="text-xs text-ink/70">
                    فترة النشر: <span className="font-semibold text-ink">{stats.fmtDate(stats.firstDate)}</span>
                    {stats.firstDate !== stats.lastDate && <> — <span className="font-semibold text-ink">{stats.fmtDate(stats.lastDate)}</span></>}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* الملخص */}
          <div className="rounded-lg bg-mint px-4 py-3">
            <p className="text-sm leading-6 text-palm">{result.summary}</p>
          </div>

          {result.plan.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-ink/60">
                مواعيد النشر المقترحة
                {planFilter !== "all" && <span className="mr-1 text-palm">— {planFilter === "ready" ? "الجاهزة للنشر" : "التي تحتاج مراجعة"}</span>}
              </p>
              <div className="space-y-2">
                {result.plan.filter((item) => {
                  if (planFilter === "all") return true;
                  const ready = Boolean(getRecord(item.contentId)?.approvedVersion);
                  return planFilter === "ready" ? ready : !ready;
                }).map((item, i) => {
                  const rec = getRecord(item.contentId);
                  const isReady = Boolean(rec?.approvedVersion);
                  return (
                    <button
                      key={i}
                      onClick={() => { onSelectRecord(item.contentId); onClose(); }}
                      className="w-full rounded-lg border border-line p-3 text-right transition hover:border-palm hover:shadow-sm focus-ring"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-5">{rec?.title ?? item.contentId}</p>
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${PRIORITY_STYLE[item.priority]}`}>
                          {PRIORITY_LABEL[item.priority]}
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          isReady ? "bg-mint text-palm" : "bg-goldSoft text-gold"
                        }`}>
                          {isReady
                            ? <><CheckCircle2 size={10} /> معتمد — جاهز للنشر</>
                            : <><AlertTriangle size={10} /> يحتاج مراجعة</>}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-ink/55">
                        <div className="flex flex-wrap gap-3">
                          <span className="flex items-center gap-1"><Calendar size={11} />{item.suggestedDate}</span>
                          <span>{item.channel}</span>
                        </div>
                        <ChevronLeft size={13} className="text-ink/25" />
                      </div>
                      <p className="mt-1 text-[11px] leading-5 text-ink/45">{item.reason}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {result.gaps.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-ink/60">فجوات تحتاج انتباهاً</p>
              <div className="space-y-1.5">
                {result.gaps.map((gap, i) => (
                  <div key={i} className="flex items-start gap-2 rounded-lg bg-goldSoft px-3 py-2">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0 text-gold" />
                    <p className="text-xs leading-5 text-gold">{gap}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* زر التطبيق ثابت أسفل النافذة دائماً (أوضح وأسهل وصولاً) */}
          <div className="sticky bottom-0 z-10 -mx-4 -mb-4 border-t border-line bg-white/95 px-4 py-3 backdrop-blur">
            <button
              onClick={handleApply}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-palm px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-palm/90"
            >
              <Save size={14} /> تطبيق الخطة وحفظ المواعيد
            </button>
            <p className="mt-2 text-center text-[11px] text-ink/40">
              المقترحات استرشادية — يمكنك تعديل المواعيد بعد التطبيق
            </p>
          </div>
        </div>
        )}
      </div>
    </>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function CalendarV2Page() {
  const [records, setRecords] = useState<StoredContentRecord[]>([]);
  const [targetDates, setTargetDates] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<ViewTab>("calendar");
  const [search, setSearch] = useState("");
  // القائمة المنسدلة لنتائج البحث — بقرارها: اقتراحات حية والنقر يفتح تفاصيل المحتوى
  const [searchFocus, setSearchFocus] = useState(false);
  const [filterStatus, setFilterStatus] = useState<DisplayStatus | "">("");
  const [dayPanel, setDayPanel] = useState<{ date: string; items: StoredContentRecord[] } | null>(null);
  const [smartPlanOpen,    setSmartPlanOpen]    = useState(false);
  const [smartPlanLoading, setSmartPlanLoading] = useState(false);
  const [smartPlanResult,  setSmartPlanResult]  = useState<SmartPlanResult | null>(null);
  const [smartPlanError,   setSmartPlanError]   = useState("");

  // معزول لكل حساب — خطة كل مستخدم خاصة به
  const SMART_PLAN_KEY = scopedKey("lawyer-media:smart-plan-result");

  // إعادة تحميل الخطة والتواريخ من التخزين — تُستدعى عند الفتح وعند اكتمال المزامنة السحابية
  const reloadFromStorage = () => {
    const loaded = loadContentRecords();
    setRecords(loaded);
    const dates: Record<string, string> = {};
    loaded.forEach((r) => { dates[r.id] = getTargetDate(r.id); });
    setTargetDates(dates);
    try {
      const saved = window.localStorage.getItem(SMART_PLAN_KEY);
      if (saved) setSmartPlanResult(JSON.parse(saved) as SmartPlanResult);
    } catch { /* تجاهل البيانات التالفة */ }
  };

  useEffect(() => {
    reloadFromStorage();
    // عند نزول خطة/تواريخ من جهاز آخر عبر المزامنة تُحدَّث الشاشة فوراً
    const onKvSynced = () => reloadFromStorage();
    const onRecordsSynced = () => setRecords(loadContentRecords());
    window.addEventListener("lm-kv-synced", onKvSynced);
    window.addEventListener("lm-records-synced", onRecordsSynced);
    return () => {
      window.removeEventListener("lm-kv-synced", onKvSynced);
      window.removeEventListener("lm-records-synced", onRecordsSynced);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // حفظ الخطة تلقائياً عند تغيّرها ورفعها للمزامنة السحابية
  useEffect(() => {
    if (smartPlanResult) {
      window.localStorage.setItem(SMART_PLAN_KEY, JSON.stringify(smartPlanResult));
      try { window.dispatchEvent(new Event("lm-work-changed")); } catch { /* بيئة بلا نافذة */ }
    }
  }, [smartPlanResult]);

  const selectedRecord = records.find((r) => r.id === selectedId) ?? null;

  const counts = useMemo<Record<DisplayStatus, number>>(() => {
    const c: Record<DisplayStatus, number> = { "منشورة": 0, "مجدولة": 0, "تحتاج مراجعة": 0, "مسودة": 0 };
    records.forEach((r) => { c[getDisplayStatus(r, targetDates[r.id] ?? "")]++; });
    return c;
  }, [records, targetDates]);

  // بحث ذكي: تطبيع عربي + كلمات بأي ترتيب + كل حقول المحتوى (العنوان والنص والنوع والقناة والجمهور والهدف والحالة)
  const filtered = useMemo(() => {
    return records.filter((r) => {
      const ds = getDisplayStatus(r, targetDates[r.id] ?? "");
      if (filterStatus && ds !== filterStatus) return false;
      const version = r.versions.find((v) => v.version === r.currentVersion) ?? r.versions.at(-1);
      return smartMatch(search, [
        r.title,
        version?.body,
        version?.contentTypeLabel,
        version?.channel,
        version?.audience,
        version?.purpose,
        ds,
      ]);
    });
  }, [records, targetDates, search, filterStatus]);

  function handleSaveDate(id: string, date: string) {
    saveTargetDate(id, date);
    setTargetDates((prev) => ({ ...prev, [id]: date }));
  }

  function handleApplySmartPlan(dates: Record<string, string>) {
    Object.entries(dates).forEach(([id, date]) => saveTargetDate(id, date));
    setTargetDates((prev) => ({ ...prev, ...dates }));
  }

  // جلب الخطة من API (دائمًا طلب جديد)
  async function fetchSmartPlan() {
    if (records.length === 0) return;
    setSmartPlanLoading(true);
    setSmartPlanError("");
    try {
      const payload = {
        horizon: "monthly" as const,
        startDate: new Date().toISOString().slice(0, 10),
        records: records.map((r) => {
          const v = r.versions.find((ver) => ver.version === r.currentVersion) ?? r.versions.at(-1);
          return {
            id: r.id,
            title: r.title,
            status: r.status,
            sharingStatus: r.sharingStatus,
            purpose: v?.purpose,
            audience: v?.audience,
            channel: v?.channel,
            approved: Boolean(r.approvedVersion),
            publicationLabel: v?.analysis?.publicationDecision?.label,
            channels: v?.analysis?.channelRecommendations?.map((c) => c.channel) ?? [],
          };
        }),
      };
      const res = await fetch("/api/smart-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json() as SmartPlanResult & { error?: string };
      if (!res.ok || data.error) {
        setSmartPlanError(data.error ?? "تعذر إنشاء الخطة — حاول مرة أخرى.");
      } else {
        setSmartPlanResult(data);
      }
    } catch {
      setSmartPlanError("تعذّر الاتصال بخدمة التخطيط الذكي");
    } finally {
      setSmartPlanLoading(false);
    }
  }

  // فتح البانيل — إذا النتيجة موجودة يُعرض البانيل فوراً بلا إعادة تحليل
  function openSmartPlan() {
    setSmartPlanOpen(true);
    if (!smartPlanResult && !smartPlanLoading) {
      void fetchSmartPlan();
    }
  }

  // تحديث الخطة يدوياً (من زر "تحديث" داخل البانيل)
  function refreshSmartPlan() {
    setSmartPlanResult(null);
    void fetchSmartPlan();
  }

  // إنشاء خطة جديدة — يمسح المحفوظة ويجلب تحليلاً جديداً
  function createNewPlan() {
    window.localStorage.removeItem(SMART_PLAN_KEY);
    setSmartPlanOpen(true);
    setSmartPlanResult(null);
    void fetchSmartPlan();
  }

  function handleDelete(id: string) {
    const next = records.filter((r) => r.id !== id);
    saveContentRecords(next);
    setRecords(next);
    setSelectedId(null);
  }

  const TABS: { key: ViewTab; icon: React.ReactNode; label: string }[] = [
    { key: "calendar", icon: <Calendar size={15} />, label: "تقويم" },
    { key: "kanban",   icon: <LayoutGrid size={15} />, label: "مسار" },
  ];

  const SUMMARY_ORDER: DisplayStatus[] = ["منشورة", "مجدولة", "مسودة", "تحتاج مراجعة"];

  return (
    <div className="space-y-4 pb-24">
      <PageHeader
        eyebrow="التخطيط والنشر"
        title="مركز التخطيط"
        description="إدارة المحتوى وجدولته ومتابعة مراحل تنفيذه في مكان واحد."
      />

      {/* 1. Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {SUMMARY_ORDER.map((ds) => {
          const c = STATUS_COLORS[ds];
          const active = filterStatus === ds;
          return (
            <button
              key={ds}
              onClick={() => setFilterStatus(active ? "" : ds)}
              className={`rounded-xl border p-4 text-right transition hover:shadow-sm focus-ring ${
                active ? `${c.bg} ${c.border}` : "border-line bg-white"
              }`}
            >
              <span className={`block h-3 w-3 rounded-full ${STATUS_DOT[ds]}`} aria-hidden="true" />
              <p className="mt-2 text-2xl font-bold text-ink">{counts[ds]}</p>
              <p className={`mt-0.5 text-xs font-medium ${active ? c.text : "text-ink/55"}`}>{ds}</p>
            </button>
          );
        })}
      </div>

      {/* 2. Action bar */}
      <div className="flex flex-wrap items-center gap-2">
        {/* زر إنشاء/تعديل — يجلب خطة جديدة دائماً */}
        <button
          onClick={createNewPlan}
          disabled={records.length === 0}
          className="flex items-center gap-1.5 rounded-lg bg-palm px-4 py-2 text-sm font-medium text-white transition hover:bg-palm/90 disabled:opacity-50"
        >
          <Sparkles size={14} />
          {smartPlanResult ? "تعديل الخطة" : "إنشاء خطة ذكية"}
        </button>
        {/* زر عرض — يفتح الخطة المحفوظة فوراً بلا طلب */}
        <button
          onClick={() => setSmartPlanOpen(true)}
          disabled={!smartPlanResult}
          className="flex items-center gap-1.5 rounded-lg border border-palm bg-mint px-4 py-2 text-sm font-medium text-palm transition hover:bg-palm hover:text-white disabled:opacity-40"
        >
          <LayoutGrid size={14} />
          عرض الخطة المقترحة
          {smartPlanResult && <span className="rounded-full bg-palm/20 px-1.5 text-[10px] font-bold">{smartPlanResult.plan.length}</span>}
        </button>
        <div className="relative min-w-[150px] flex-1">
          <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2">
            <Search size={14} className="shrink-0 text-ink/40" />
            <input
              type="text"
              placeholder="بحث في المحتوى..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocus(true)}
              onBlur={() => setTimeout(() => setSearchFocus(false), 150)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35"
            />
            {search ? (
              <button type="button" onClick={() => setSearch("")} className="text-ink/35 transition hover:text-ink/70" aria-label="مسح البحث">
                <X size={13} />
              </button>
            ) : null}
            {/* سهم القائمة المنسدلة — بالتركيز تُعرض كل العناصر، والكتابة تصفّيها */}
            <ChevronDown size={14} className={`shrink-0 text-ink/40 transition-transform ${searchFocus ? "rotate-180" : ""}`} aria-hidden="true" />
          </div>
          {/* قائمة منسدلة كاملة: تظهر عند التركيز بكل المحتوى، وتُصفّى بالكتابة، والنقر يفتح التفاصيل */}
          {searchFocus ? (
            <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-line bg-white shadow-lg">
              {filtered.length ? (
                filtered.slice(0, 12).map((r) => {
                  const ds = getDisplayStatus(r, targetDates[r.id] ?? "");
                  const c = STATUS_COLORS[ds];
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setSelectedId(r.id);
                        setSearchFocus(false);
                      }}
                      className="flex w-full items-center gap-2.5 border-b border-line/50 px-3 py-2.5 text-right transition last:border-b-0 hover:bg-mint/30"
                    >
                      <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[ds]}`} aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate text-sm text-ink">{r.title}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${c.bg} ${c.text}`}>{ds}</span>
                    </button>
                  );
                })
              ) : (
                <p className="px-3 py-3 text-sm text-ink/50">{records.length ? "لا نتائج مطابقة." : "لا يوجد محتوى بعد."}</p>
              )}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2">
          <Filter size={14} className="shrink-0 text-ink/40" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as DisplayStatus | "")}
            className="bg-transparent text-sm text-ink/70 outline-none"
          >
            <option value="">كل الحالات</option>
            {SUMMARY_ORDER.map((ds) => (
              <option key={ds} value={ds}>{ds}</option>
            ))}
          </select>
        </div>
      </div>

      {/* بقرارها: عند اختيار لون (حالة) أو البحث تظهر قائمة المحتوى ذي العلاقة فوراً — لا تختفي المسودات غير المجدولة خلف التقويم */}
      {(filterStatus || search.trim()) ? (
        <Panel>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">
              المحتوى ذو العلاقة {filterStatus ? `— ${filterStatus}` : ""} ({filtered.length})
            </p>
            <button
              onClick={() => { setFilterStatus(""); setSearch(""); }}
              className="rounded-lg border border-line px-3 py-1.5 text-xs text-ink/60 transition hover:border-palm hover:text-palm focus-ring"
            >
              إظهار الكل
            </button>
          </div>
          {filtered.length ? (
            <ul role="list" className="divide-y divide-line">
              {filtered.slice(0, 12).map((r) => {
                const ds = getDisplayStatus(r, targetDates[r.id] ?? "");
                const c = STATUS_COLORS[ds];
                return (
                  <li key={r.id}>
                    <button
                      onClick={() => setSelectedId(r.id)}
                      className="flex w-full items-center gap-3 px-1 py-2.5 text-right transition hover:bg-mint/25 focus-ring"
                    >
                      <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[ds]}`} aria-hidden="true" />
                      <span className="min-w-0 flex-1 truncate text-sm text-ink">{r.title}</span>
                      {targetDates[r.id] ? <span className="shrink-0 text-xs text-ink/45">{targetDates[r.id]}</span> : null}
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${c.bg} ${c.text}`}>{ds}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-lg bg-paper p-4 text-sm text-ink/60">لا يوجد محتوى مطابق لهذا الاختيار.</p>
          )}
          {filtered.length > 12 ? (
            <p className="mt-2 text-xs text-ink/45">يظهر أول ١٢ — ضيّق البحث لرؤية البقية.</p>
          ) : null}
        </Panel>
      ) : null}

      {/* 3. Tabs */}
      <Panel>
        <div className="mb-4 flex gap-1 rounded-lg bg-paper p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-sm font-medium transition ${
                tab === t.key ? "bg-white text-palm shadow-sm" : "text-ink/55 hover:text-ink"
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* بقرارها: التقويم يظهر دائماً حتى بلا محتوى — تلميح مدمج بدل إخفاء الشبكة */}
        {records.length === 0 ? (
          <p className="mb-3 flex items-center justify-center gap-2 rounded-lg bg-paper px-3 py-2 text-sm text-ink/55">
            لا يوجد محتوى محفوظ بعد —
            <Link href="/content-studio" className="inline-flex items-center gap-1 text-palm hover:underline">
              <Sparkles size={13} /> ابدأ بإنشاء محتوى
            </Link>
          </p>
        ) : null}
        {tab === "calendar" ? (
          <CalendarTab records={filtered} targetDates={targetDates} onSelect={setSelectedId} onSelectDate={(date, items) => setDayPanel({ date, items })} />
        ) : (
          <KanbanTab records={filtered} targetDates={targetDates} onSelect={setSelectedId} />
        )}
      </Panel>

      {/* Day Panel */}
      {dayPanel && (
        <DayPanel
          records={records}
          onSchedule={(id) => handleSaveDate(id, dayPanel.date)}
          onUnschedule={(id) => { removeTargetDate(id); setTargetDates((prev) => ({ ...prev, [id]: "" })); }}
          date={dayPanel.date}
          targetDates={targetDates}
          onClose={() => setDayPanel(null)}
          onSelectRecord={(id) => { setSelectedId(id); setDayPanel(null); }}
        />
      )}

      {/* Smart Plan Panel */}
      {smartPlanOpen && (
        <SmartPlanPanel
          loading={smartPlanLoading}
          error={smartPlanError}
          result={smartPlanResult}
          records={records}
          onClose={() => setSmartPlanOpen(false)}
          onRefresh={refreshSmartPlan}
          onApply={handleApplySmartPlan}
          onSelectRecord={(id) => { setSmartPlanOpen(false); setSelectedId(id); }}
        />
      )}

      {/* Side panel / Bottom sheet */}
      {selectedRecord && (
        <ContentPanel
          record={selectedRecord}
          targetDate={targetDates[selectedRecord.id] ?? ""}
          allTargetDates={targetDates}
          onClose={() => setSelectedId(null)}
          onSaveDate={(date) => handleSaveDate(selectedRecord.id, date)}
          onDelete={() => handleDelete(selectedRecord.id)}
        />
      )}

      {/* 7. Disclaimer */}
      <p className="rounded-lg border border-line bg-white p-4 text-xs leading-7 text-ink/55">
        المقترحات استرشادية فقط — القرار النهائي للمحامي. يظل قرار التعديل أو الاعتماد أو النشر مسؤولية المستخدم الكاملة.
      </p>

    </div>
  );
}
