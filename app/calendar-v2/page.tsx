"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Filter,
  LayoutGrid,
  List,
  Save,
  Search,
  Sparkles,
  Target,
  Trash2,
  Upload,
  Users,
  X,
} from "lucide-react";
import { PageHeader, Panel } from "@/components/ui";
import { socialBrandIcons } from "@/components/social-icons";
import {
  loadContentRecords,
  saveContentRecords,
  type StoredContentRecord,
} from "@/lib/content-record-store";

// ── Types ──────────────────────────────────────────────────────────────────

type DisplayStatus = "منشورة" | "مجدولة" | "تحتاج مراجعة" | "مسودة";
type ViewTab = "calendar" | "kanban" | "list";
type SortKey = "title" | "date" | "status";

// ── Status helpers ─────────────────────────────────────────────────────────

function getTargetDate(id: string): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(`lawyer-media:target-publication-date:${id}`) ?? "";
}

function saveTargetDate(id: string, date: string) {
  window.localStorage.setItem(`lawyer-media:target-publication-date:${id}`, date);
}

function getDisplayStatus(record: StoredContentRecord, targetDate: string): DisplayStatus {
  if (record.sharingStatus === "تمت المشاركة") return "منشورة";
  if (record.status === "معتمد" && targetDate) return "مجدولة";
  if (record.status === "يحتاج إلى تعديل" || record.status === "قيد التحليل") return "تحتاج مراجعة";
  return "مسودة";
}

const STATUS_COLORS: Record<DisplayStatus, { bg: string; text: string; border: string }> = {
  "منشورة":        { bg: "bg-mint",       text: "text-palm",        border: "border-palm/30" },
  "مجدولة":        { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200" },
  "تحتاج مراجعة": { bg: "bg-red-50",     text: "text-red-700",     border: "border-red-200" },
  "مسودة":         { bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200" },
};

const STATUS_ICONS: Record<DisplayStatus, string> = {
  "منشورة": "🟢",
  "مجدولة": "⏳",
  "تحتاج مراجعة": "🔴",
  "مسودة": "🔵",
};

// ── Timeline ───────────────────────────────────────────────────────────────

const STAGE_LABELS = [
  "فكرة المحتوى",
  "المراجعة والامتثال",
  "الصياغة الآمنة",
  "الاعتماد",
  "إعداد الحملة",
  "الجدولة",
  "تجهيز النشر",
  "المتابعة",
  "التحسين",
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
    complete: completions[i],
    current: i === currentIndex,
  }));
}

// ── Calendar Tab ───────────────────────────────────────────────────────────

function CalendarTab({
  records,
  targetDates,
  onSelect,
}: {
  records: StoredContentRecord[];
  targetDates: Record<string, string>;
  onSelect: (id: string) => void;
}) {
  const [month, setMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const year = month.getFullYear();
  const mon = month.getMonth();
  const monthLabel = month.toLocaleDateString("ar-SA", { month: "long", year: "numeric" });
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
        <p className="font-semibold">{monthLabel}</p>
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
            <div
              key={i}
              className={`min-h-[64px] bg-white p-1 ${isToday(day) ? "ring-2 ring-inset ring-palm" : ""}`}
            >
              <p className={`mb-0.5 text-xs font-medium ${isToday(day) ? "text-palm" : "text-ink/60"}`}>
                {day}
              </p>
              <div className="space-y-0.5">
                {items.slice(0, 2).map((r) => {
                  const ds = getDisplayStatus(r, targetDates[r.id] ?? "");
                  const c = STATUS_COLORS[ds];
                  return (
                    <button
                      key={r.id}
                      onClick={() => onSelect(r.id)}
                      className={`w-full truncate rounded px-1 py-0.5 text-right text-[10px] leading-4 ${c.bg} ${c.text} hover:opacity-80`}
                    >
                      {r.title}
                    </button>
                  );
                })}
                {items.length > 2 && (
                  <p className="px-1 text-[10px] text-ink/40">+{items.length - 2}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
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
  onSelect,
}: {
  record: StoredContentRecord;
  targetDates: Record<string, string>;
  onSelect: (id: string) => void;
}) {
  const ds = getDisplayStatus(record, targetDates[record.id] ?? "");
  const c = STATUS_COLORS[ds];
  return (
    <button
      onClick={() => onSelect(record.id)}
      className="w-full rounded-lg border border-line bg-white p-3 text-right transition hover:border-palm hover:shadow-sm focus-ring"
    >
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

  const grouped = useMemo(() => {
    const map: Record<DisplayStatus, StoredContentRecord[]> = {
      "مسودة": [], "تحتاج مراجعة": [], "مجدولة": [], "منشورة": [],
    };
    records.forEach((r) => {
      const ds = getDisplayStatus(r, targetDates[r.id] ?? "");
      map[ds].push(r);
    });
    return map;
  }, [records, targetDates]);

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
                    <KanbanCard key={r.id} record={r} targetDates={targetDates} onSelect={onSelect} />
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
            <KanbanCard key={r.id} record={r} targetDates={targetDates} onSelect={onSelect} />
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
  onClose,
  onSaveDate,
  onDelete,
}: {
  record: StoredContentRecord;
  targetDate: string;
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
              {STATUS_ICONS[ds]} {ds}
            </span>
          </div>

          {/* Timeline */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-ink/60">الخط الزمني</p>
              <p className="text-xs text-ink/50">{completed} من {stages.length}</p>
            </div>
            <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-palm transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-1">
              {stages.map((stage) => (
                <div
                  key={stage.label}
                  className={`rounded px-1.5 py-1 text-center text-[10px] leading-4 ${
                    stage.complete
                      ? "bg-mint text-palm"
                      : stage.current
                        ? "bg-amber-50 text-amber-700"
                        : "bg-paper text-ink/40"
                  }`}
                >
                  {stage.label}
                </div>
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
            {savedMsg && <p className="mt-1 text-xs text-palm">{savedMsg}</p>}
          </div>

          {/* Channels */}
          {recommendations.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-ink/70">القنوات المقترحة</p>
              <div className="space-y-1.5">
                {recommendations.map((rec) => {
                  const Icon = socialBrandIcons[rec.key];
                  const selected = selectedChannels.includes(rec.key);
                  return (
                    <button
                      key={rec.key}
                      onClick={() => toggleChannel(rec.key)}
                      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-sm transition ${
                        selected
                          ? "border-palm bg-mint text-palm"
                          : "border-line bg-white text-ink/70 hover:border-palm/40"
                      }`}
                    >
                      {Icon && <Icon size={16} />}
                      <span className="flex-1 text-right">{rec.channel}</span>
                      {selected && <CheckCircle2 size={14} className="text-palm shrink-0" />}
                    </button>
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
                <div className="space-y-3">
                  <p className="rounded-lg bg-mint p-3 text-sm text-palm">
                    {postOutcome === "published" && "✅ تم تأكيد النشر — أحسنت!"}
                    {postOutcome === "delayed" && "⏸️ تم تسجيل التأجيل."}
                    {postOutcome === "cancelled" && "❌ تم تسجيل الإلغاء."}
                  </p>
                  {postOutcome === "published" && (
                    <Link
                      href="/content-studio"
                      className="flex items-center gap-1.5 text-sm text-palm hover:underline"
                    >
                      <Sparkles size={13} /> إنشاء محتوى مشابه
                    </Link>
                  )}
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

// ── Page ───────────────────────────────────────────────────────────────────

export default function CalendarV2Page() {
  const [records, setRecords] = useState<StoredContentRecord[]>([]);
  const [targetDates, setTargetDates] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<ViewTab>("calendar");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<DisplayStatus | "">("");

  useEffect(() => {
    const loaded = loadContentRecords();
    setRecords(loaded);
    const dates: Record<string, string> = {};
    loaded.forEach((r) => { dates[r.id] = getTargetDate(r.id); });
    setTargetDates(dates);
  }, []);

  const selectedRecord = records.find((r) => r.id === selectedId) ?? null;

  const counts = useMemo<Record<DisplayStatus, number>>(() => {
    const c: Record<DisplayStatus, number> = { "منشورة": 0, "مجدولة": 0, "تحتاج مراجعة": 0, "مسودة": 0 };
    records.forEach((r) => { c[getDisplayStatus(r, targetDates[r.id] ?? "")]++; });
    return c;
  }, [records, targetDates]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const ds = getDisplayStatus(r, targetDates[r.id] ?? "");
      return (!filterStatus || ds === filterStatus) && (!search || r.title.includes(search));
    });
  }, [records, targetDates, search, filterStatus]);

  function handleSaveDate(id: string, date: string) {
    saveTargetDate(id, date);
    setTargetDates((prev) => ({ ...prev, [id]: date }));
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
    { key: "list",     icon: <List size={15} />, label: "قائمة" },
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
              <p className="text-xl leading-none">{STATUS_ICONS[ds]}</p>
              <p className="mt-2 text-2xl font-bold text-ink">{counts[ds]}</p>
              <p className={`mt-0.5 text-xs font-medium ${active ? c.text : "text-ink/55"}`}>{ds}</p>
            </button>
          );
        })}
      </div>

      {/* 2. Action bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/content-studio"
          className="flex items-center gap-1.5 rounded-lg bg-palm px-4 py-2 text-sm font-medium text-white transition hover:bg-palm/90"
        >
          <Sparkles size={14} /> إنشاء محتوى
        </Link>
        <Link
          href="/content-review"
          className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-palm hover:text-palm"
        >
          <FileText size={14} /> مراجعة
        </Link>
        <div className="flex min-w-[150px] flex-1 items-center gap-2 rounded-lg border border-line bg-white px-3 py-2">
          <Search size={14} className="shrink-0 text-ink/40" />
          <input
            type="text"
            placeholder="بحث في المحتوى..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35"
          />
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

        {records.length === 0 ? (
          <div className="py-14 text-center">
            <p className="text-ink/40">لا يوجد محتوى محفوظ بعد.</p>
            <Link
              href="/content-studio"
              className="mt-3 inline-flex items-center gap-1.5 text-sm text-palm hover:underline"
            >
              <Sparkles size={14} /> ابدأ بإنشاء محتوى
            </Link>
          </div>
        ) : tab === "calendar" ? (
          <CalendarTab records={filtered} targetDates={targetDates} onSelect={setSelectedId} />
        ) : tab === "kanban" ? (
          <KanbanTab records={filtered} targetDates={targetDates} onSelect={setSelectedId} />
        ) : (
          <ListTab records={filtered} targetDates={targetDates} onSelect={setSelectedId} />
        )}
      </Panel>

      {/* Side panel / Bottom sheet */}
      {selectedRecord && (
        <ContentPanel
          record={selectedRecord}
          targetDate={targetDates[selectedRecord.id] ?? ""}
          onClose={() => setSelectedId(null)}
          onSaveDate={(date) => handleSaveDate(selectedRecord.id, date)}
          onDelete={() => handleDelete(selectedRecord.id)}
        />
      )}

      {/* 7. Disclaimer */}
      <p className="rounded-lg border border-line bg-white p-4 text-xs leading-7 text-ink/55">
        المقترحات استرشادية فقط — القرار النهائي للمحامي. يظل قرار التعديل أو الاعتماد أو النشر مسؤولية المستخدم الكاملة.
      </p>

      {/* 6. Sticky bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 flex gap-3 border-t border-line bg-white px-4 py-3 shadow-lg">
        <Link
          href="/content-studio"
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-palm px-4 py-2.5 text-sm font-medium text-white transition hover:bg-palm/90"
        >
          <Sparkles size={15} /> إنشاء محتوى
        </Link>
        <Link
          href="/content-review"
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-medium text-ink transition hover:border-palm hover:text-palm"
        >
          <FileText size={15} /> مراجعة محتوى
        </Link>
      </div>
    </div>
  );
}
