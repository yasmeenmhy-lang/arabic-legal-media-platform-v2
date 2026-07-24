"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { CalendarDays, CheckCircle2, ChevronDown, ChevronLeft, ExternalLink, FileCheck2, FileClock, FileText, Filter, FolderOpen, History, Image as ImageIcon, Megaphone, MessageCircle, PenLine, RotateCcw, Search, Send, Share2, ShieldCheck, Tag, Trash2, Video, X } from "lucide-react";
import { InstagramIcon, LinkedInIcon, SnapchatIcon, TikTokIcon, XIcon, YouTubeIcon, socialBrandStyles } from "@/components/social-icons";
import { Button, DgaSpinner, PageHeader, StatusBadge } from "@/components/ui";
import {
  deriveContentTitle,
  exportContentRecords,
  importContentRecords,
  loadContentRecords,
  saveContentRecords,
  setActiveContentSelection,
  type StoredContentRecord
} from "@/lib/content-record-store";
import { updateVersionVisual, deleteVersionVisual } from "@/lib/content-record-store";
import { deleteRecordFromCloud, scheduleCloudPush } from "@/lib/records-cloud-sync";
import { EditableSavedVisual } from "@/components/editable-visual";
import { riskDisplayLabel, type ReviewResult, type RiskLevel } from "@/lib/types";
import { normalizeReviewResult } from "@/lib/review-normalizer";
import { smartMatch } from "@/lib/arabic-search";

function formatDate(value?: string) {
  if (!value) return "غير متاح";
  const d = new Date(value);
  const hijri = new Intl.DateTimeFormat("ar-SA-u-ca-islamic", { dateStyle: "medium" }).format(d);
  const gregorian = new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(d);
  return `${hijri} / ${gregorian}`;
}

// تاريخ موجز لصفوف السجل (يوم شهر سنة) بلا فاصلة — أخفّ وأنظف من التاريخ الكامل
function formatShortDate(value?: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const day = new Intl.DateTimeFormat("ar-EG", { day: "numeric" }).format(d);
  const month = new Intl.DateTimeFormat("ar-EG", { month: "long" }).format(d);
  const year = new Intl.DateTimeFormat("ar-EG", { year: "numeric" }).format(d);
  return `${day} ${month} ${year}`;
}

// عنوان الصفّ = موضوع قصير كامل مشتقّ من نص الإصدار الحالي (يصلح المحتوى القديم المخزّن بعنوان مقصوص)
function recordDisplayTitle(record: StoredContentRecord): string {
  const v = record.versions.find((x) => x.version === record.currentVersion) ?? record.versions.at(-1);
  return deriveContentTitle(v?.body ?? "") || record.title;
}

function complianceLabel(findings?: { resolved?: boolean }[]): "ملتزم" | "غير ملتزم" | null {
  if (!findings) return null;
  return findings.length === 0 ? "ملتزم" : "غير ملتزم";
}

function complianceTone(findings?: { resolved?: boolean }[]): "good" | "danger" | "neutral" {
  if (!findings) return "neutral";
  return findings.length === 0 ? "good" : "danger";
}

// توحيد نص الحالة المعروض — يعالج السجلات القديمة المخزّنة بالمسمّى السابق
function statusLabel(status: string): string {
  return status === "يحتاج إلى تعديل" ? "بحاجة إلى معالجة" : status;
}

function displayStatus(storedStatus: string, analysis?: ReviewResult): { label: string; tone: "good" | "danger" | "neutral" } {
  if (!analysis) return { label: "مسودة", tone: "neutral" }; // لا جاهزية ولا اعتماد بلا تحليل
  const unresolved = analysis.findings.filter((f) => !f.resolved).length;
  if (unresolved > 0) return { label: "بحاجة إلى معالجة", tone: "danger" };
  return { label: statusLabel(storedStatus), tone: storedStatus === "معتمد" ? "good" : "neutral" };
}

function riskTone(level?: RiskLevel): "good" | "gold" | "danger" | "neutral" {
  if (!level) return "neutral";
  if (level === "منخفض") return "good";
  if (level === "متوسط") return "gold";
  return "danger";
}

// ── لوحة السجل (سنابشوت) — بطاقات مصغّرة بدرجات هادئة من كود المنصات (أيقونات ناعمة لا مملوءة صارخة) ──
type DashTone = "sa" | "sky" | "success" | "gold" | "lavender" | "rose" | "warn";
const TONE: Record<DashTone, { card: string; iconBg: string; icon: string; num: string; bar: string; track: string }> = {
  // الأخضر السعودي — بطاقة الإجمالي المميّزة بالوسط
  sa:       { card: "border-palm/25 bg-mint/50",  iconBg: "bg-white",       icon: "text-palm",       num: "text-palmDeep",    bar: "bg-palm",       track: "bg-palm/15" },
  sky:      { card: "border-line bg-white",       iconBg: "bg-infoSoft",    icon: "text-infoBase",   num: "text-infoDark",    bar: "bg-infoBase",   track: "bg-infoBase/12" },
  success:  { card: "border-line bg-white",       iconBg: "bg-successSoft",  icon: "text-successBase", num: "text-successDark", bar: "bg-successBase", track: "bg-successBase/12" },
  gold:     { card: "border-line bg-white",       iconBg: "bg-goldSoft",    icon: "text-gold",       num: "text-goldDark",    bar: "bg-gold",       track: "bg-gold/15" },
  lavender: { card: "border-line bg-white",       iconBg: "bg-violetSoft",  icon: "text-violet",     num: "text-violetDark",  bar: "bg-violet",     track: "bg-violet/12" },
  // الورد المخفّف — الدرجة الهادئة (300/400) لا الأحمر الصارخ
  rose:     { card: "border-line bg-white",       iconBg: "bg-errorSoft",   icon: "text-[#F97066]",  num: "text-[#B42318]",   bar: "bg-[#FDA29B]",  track: "bg-errorBorder" },
  // تحذيري — المسودة حالة تحذيرية (كود المنصات: Warning 100/200)
  warn:     { card: "border-line bg-white",       iconBg: "bg-[#FEF0C7]",   icon: "text-[#B54708]",  num: "text-[#B54708]",   bar: "bg-[#FEDF89]",  track: "bg-[#FEF0C7]" }
};

// بطاقة إحصائية مصغّرة: أيقونة ناعمة + رقم + تسمية ووصف خفيف + شريط نسبة. خط صغير هادئ.
function StatCard({ value, label, sub, icon, tone, pct, suffix }: {
  value: number; label: string; sub: string; icon: ReactNode; tone: DashTone; pct: number; suffix?: string;
}) {
  const t = TONE[tone];
  return (
    <div className={`rounded-xl border ${t.card} p-2.5`}>
      <div className="flex items-center justify-between gap-1">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${t.iconBg} ${t.icon}`}>{icon}</span>
        <span className={`text-lg font-bold leading-none tabular-nums ${t.num}`}>{value}{suffix ? <span className="text-xs font-semibold">{suffix}</span> : null}</span>
      </div>
      <p className="mt-1.5 truncate text-[11px] font-semibold text-ink">{label}</p>
      <p className="truncate text-[9px] font-normal text-ink/45">{sub}</p>
      <div className={`mt-1.5 h-1 overflow-hidden rounded-full ${t.track}`}>
        <div className={`h-full rounded-full ${t.bar}`} style={{ width: `${Math.max(4, Math.min(100, pct))}%` }} />
      </div>
    </div>
  );
}

// رحلة المحتوى — الترتيب المنطقي (يمين→يسار): إنشاء ← مراجعة ← اعتماد ← نشر. أيقونات ناعمة صغيرة.
function JourneyStepper({ steps }: { steps: Array<{ label: string; value: number; sub: string; icon: ReactNode; tone: DashTone }> }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-3.5 shadow-xs">
      <p className="mb-3 flex items-center gap-2 text-xs font-semibold text-ink"><FileClock size={14} className="text-palm" />رحلة المحتوى</p>
      <div className="flex items-start justify-between gap-1">
        {steps.map((st) => (
          <div key={st.label} className="flex flex-1 flex-col items-center text-center">
            <span className={`grid h-9 w-9 place-items-center rounded-full ${TONE[st.tone].iconBg} ${TONE[st.tone].icon}`}>{st.icon}</span>
            <span className="mt-1.5 text-[10px] font-medium text-ink">{st.label}</span>
            <span className={`text-sm font-bold tabular-nums ${TONE[st.tone].num}`}>{st.value}</span>
            <span className="text-[9px] font-normal text-ink/45">{st.sub}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// قنوات النشر المعتمدة في المنصّة (مطابقة لقائمة مركز المحتوى) — تُعرَض كلها ولو بلا محتوى (صفر)
const PUBLISH_CHANNELS = ["LinkedIn", "X", "Instagram", "TikTok", "Snapchat", "YouTube", "الموقع الإلكتروني"];

// درجات هادئة متناوبة لبطاقات «أنواع المحتوى»
const CALM = [
  { bg: "bg-infoSoft", fg: "text-infoDark" },
  { bg: "bg-violetSoft", fg: "text-violetDark" },
  { bg: "bg-successSoft", fg: "text-successDark" },
  { bg: "bg-goldSoft", fg: "text-goldDark" },
  { bg: "bg-mint", fg: "text-palm" }
];

// أيقونة صغيرة مناسبة لنوع المحتوى — من رموز المنصّة المعتمدة.
function typeIcon(label: string): ReactNode {
  if (label.includes("مقال")) return <PenLine size={13} />;
  if (label.includes("توعو") || label.includes("توعية")) return <Megaphone size={13} />;
  if (label.includes("فيديو")) return <Video size={13} />;
  if (label.includes("مرئي") || label.includes("إعلان") || label.includes("اعلان")) return <ImageIcon size={13} />;
  if (label.includes("تصريح")) return <MessageCircle size={13} />;
  if (label.includes("يومي")) return <CalendarDays size={13} />;
  return <Tag size={13} />;
}

// القناة بلونها وأيقونتها الرسمية (من مكوّنات المنصّة)، وإلا أيقونة عامة بلون المنصّة.
function channelBrand(name: string): { node: ReactNode; icon: string; surface: string } {
  const n = name.toLowerCase();
  if (n.includes("linkedin") || name.includes("لينكد")) return { node: <LinkedInIcon size={14} />, ...socialBrandStyles.linkedin };
  if (n === "x" || n.includes("twitter") || name.includes("إكس") || name.includes("اكس")) return { node: <XIcon size={14} />, ...socialBrandStyles.x };
  if (n.includes("insta") || name.includes("انستقرام") || name.includes("إنستغرام")) return { node: <InstagramIcon size={14} />, ...socialBrandStyles.instagram };
  if (n.includes("tiktok") || name.includes("تيك")) return { node: <TikTokIcon size={14} />, ...socialBrandStyles.tiktok };
  if (n.includes("snap") || name.includes("سناب")) return { node: <SnapchatIcon size={14} />, ...socialBrandStyles.snapchat };
  if (n.includes("youtube") || name.includes("يوتيوب")) return { node: <YouTubeIcon size={14} />, ...socialBrandStyles.youtube_shorts };
  return { node: <Share2 size={13} />, icon: "text-palm", surface: "bg-mint" };
}

export default function ContentManagementPage() {
  const [records, setRecords] = useState<StoredContentRecord[]>([]);
  const [expanded, setExpanded] = useState<string>();
  const [detailsId, setDetailsId] = useState<string>();
  const [filter, setFilter] = useState<"all" | "drafts" | "approved">("all");
  // بحث بقائمة منسدلة في السجل — متوائم مع مركز التخطيط
  const [search, setSearch] = useState("");
  const [searchFocus, setSearchFocus] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string>();
  const [loaded, setLoaded] = useState(false);
  // حالة المزامنة السحابية — يراها المستخدم فيعرف أن سجله محفوظ ومتاح على أجهزته
  const [syncState, setSyncState] = useState<"synced" | "offline" | "signedout" | "unknown">("unknown");
  // تصدير/استيراد السجل — بقرار مالكة المنصة: النقل الآمن بين المتصفحات والعناوين
  const importInputRef = useRef<HTMLInputElement>(null);
  const [transferMsg, setTransferMsg] = useState("");

  function exportRecordsToFile() {
    const payload = exportContentRecords();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lawyer-media-records-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setTransferMsg(`صُدّر السجل (${payload.records.length} سجلاً) — احتفظي بالملف في مكان آمن.`);
  }

  async function importRecordsFromFile(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const result = importContentRecords(parsed);
      if (!result) { setTransferMsg("الملف غير صالح — اختر ملف تصدير سجل صادراً من المنصة."); return; }
      setRecords(loadContentRecords());
      setTransferMsg(`اكتمل الاستيراد: ${result.added} أُضيف، ${result.updated} حُدّث، ${result.skipped} كان أحدث محلياً فبقي.`);
    } catch {
      setTransferMsg("تعذر قراءة الملف — تأكد أنه ملف تصدير السجل نفسه دون تعديل.");
    }
  }

  useEffect(() => {
    setRecords(loadContentRecords());
    setLoaded(true);
    // عند اكتمال المزامنة السحابية (سجلات من أجهزة أخرى) تُحدَّث القائمة فوراً
    const onSynced = () => setRecords(loadContentRecords());
    const onStatus = (e: Event) => setSyncState((e as CustomEvent).detail);
    window.addEventListener("lm-records-synced", onSynced);
    window.addEventListener("lm-sync-status", onStatus);
    return () => {
      window.removeEventListener("lm-records-synced", onSynced);
      window.removeEventListener("lm-sync-status", onStatus);
    };
  }, []);

  const counts = useMemo(() => ({
    all: records.length,
    approved: records.filter((item) => item.approvedVersion).length,
    drafts: records.filter((item) => item.status !== "معتمد").length
  }), [records]);

  // أُنشئت خلال آخر سبعة أيام — من تاريخ الإنشاء الفعلي لكل محتوى
  const thisWeekCount = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return records.filter((item) => item.createdAt && new Date(item.createdAt).getTime() >= weekAgo).length;
  }, [records]);

  // سنابشوت أوسع: عدد المُراجَع (له تحليل)، وتوزيع المحتوى حسب النوع وحسب القناة
  const snapshot = useMemo(() => {
    const cur = (r: StoredContentRecord) => r.versions.find((v) => v.version === r.currentVersion) ?? r.versions.at(-1);
    const reviewed = records.filter((r) => cur(r)?.analysis).length;
    const tally = (pick: (r: StoredContentRecord) => string | undefined) => {
      const map = new Map<string, number>();
      for (const r of records) {
        const key = (pick(r) ?? "").trim();
        if (key) map.set(key, (map.get(key) ?? 0) + 1);
      }
      return [...map.entries()].sort((a, b) => b[1] - a[1]);
    };
    const byType = tally((r) => cur(r)?.contentTypeLabel);
    const usedByChannel = tally((r) => cur(r)?.channel);
    // نعرض كل قنوات المنصّة — المستخدمة بأعدادها، وغير المستخدمة بصفر — بترتيب الأكثر أولاً
    const usedMap = new Map(usedByChannel);
    const allChannelNames = [...PUBLISH_CHANNELS];
    for (const [label] of usedByChannel) if (!allChannelNames.includes(label)) allChannelNames.push(label);
    const byChannel = allChannelNames
      .map((label) => [label, usedMap.get(label) ?? 0] as [string, number])
      .sort((a, b) => b[1] - a[1]);
    return { reviewed, channelsUsed: usedByChannel.length, byType, byChannel };
  }, [records]);
  const acceptance = counts.all ? Math.round((counts.approved / counts.all) * 100) : 0;


  const filteredRecords = useMemo(() => records.filter((record) => {
    if (filter === "approved" && !record.approvedVersion) return false;
    if (filter === "drafts" && record.status === "معتمد") return false;
    if (search.trim()) {
      const version = record.versions.find((v) => v.version === record.currentVersion) ?? record.versions.at(-1);
      return smartMatch(search, [record.title, version?.body, version?.contentTypeLabel, version?.channel, version?.audience, version?.purpose]);
    }
    return true;
  })
    // ترتيب ثابت بالأحدث تحديثاً — نفس الترتيب على كل الأجهزة بعد المزامنة (لا يتبع ترتيب المصفوفة المحلي)
    .sort((a, b) => {
      const byUpdated = String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? ""));
      return byUpdated !== 0 ? byUpdated : String(a.id).localeCompare(String(b.id));
    }), [filter, records, search]);

  // نتائج القائمة المنسدلة — كل السجل بالتركيز، ويُصفّى بالكتابة
  const searchMatches = useMemo(() => records.filter((record) => {
    if (!search.trim()) return true;
    const version = record.versions.find((v) => v.version === record.currentVersion) ?? record.versions.at(-1);
    return smartMatch(search, [record.title, version?.body, version?.contentTypeLabel, version?.channel, version?.audience, version?.purpose]);
  }).sort((a, b) => {
    const byUpdated = String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? ""));
    return byUpdated !== 0 ? byUpdated : String(a.id).localeCompare(String(b.id));
  }), [records, search]);

  // رقم ثابت لكل محتوى بترتيب الإنشاء — لا يتغيّر بالفلترة أو الترتيب أو الجهاز (createdAt مُزامَن)
  const serialById = useMemo(() => {
    const ordered = [...records].sort((a, b) => {
      const byCreated = String(a.createdAt ?? "").localeCompare(String(b.createdAt ?? ""));
      return byCreated !== 0 ? byCreated : String(a.id).localeCompare(String(b.id));
    });
    const map = new Map<string, number>();
    ordered.forEach((r, i) => map.set(r.id, i + 1));
    return map;
  }, [records]);


  function deleteRecord(id: string) {
    const next = records.filter((item) => item.id !== id);
    setRecords(next);
    saveContentRecords(next);
    deleteRecordFromCloud(id); // الحذف يسري على كل الأجهزة لا هذا الجهاز فقط
    setConfirmDelete(undefined);
    if (expanded === id) setExpanded(undefined);
    if (detailsId === id) setDetailsId(undefined);
  }

  function openVersion(contentId: string, version: number) {
    setActiveContentSelection(contentId, version);
  }

  const empty = (
    <div className="rounded-xl border border-dashed border-line bg-white p-8 text-center">
      <FileClock className="mx-auto text-palm" size={34} />
      <p className="mt-3 font-normal">لا توجد سجلات محفوظة بعد</p>
      <p className="mt-2 text-sm leading-7 text-ink/65">يُنشأ السجل عند تحليل أول محتوى، ثم تُحفظ إصداراته واعتماداته ومراجعه تباعًا.</p>
    </div>
  );

  const expandedDetails = (record: StoredContentRecord) => (
    <div className="space-y-5 border-t border-line bg-paper/60 px-4 py-5 md:px-6">
      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
          <History size={14} className="text-palm" /> الإصدارات المحفوظة
        </h3>
        <div className="space-y-2">
          {[...record.versions].sort((a, b) => b.version - a.version).map((version) => {
            const findings = version.analysis?.findings;
            const cLabel = complianceLabel(findings);
            const cTone = complianceTone(findings);
            return (
              <div key={version.id} className="rounded-lg border border-line bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">
                      الإصدار {version.version}
                      {record.approvedVersion === version.version && <span className="mr-2 text-palm">— المعتمد</span>}
                    </p>
                    <p className="mt-1 text-xs text-ink/55">{formatDate(version.updatedAt)} — {version.contentTypeLabel} — {version.channel}</p>
                  </div>
                  <Link onClick={() => openVersion(record.id, version.version)} href="/content-review?open=1"
                    className="inline-flex items-center gap-2 rounded-md border border-palm px-3 py-2 text-sm text-palm focus-ring">
                    <RotateCcw size={14} /> فتح
                  </Link>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-ink/80">{version.body}</p>
                <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
                  <div className="rounded bg-paper p-2">الحالة: {statusLabel(version.status)}</div>
                  <div className="rounded bg-paper p-2">
                    الامتثال: {cLabel
                      ? <span className={cTone === "good" ? "text-green-700" : "text-red-600"}>{cLabel}</span>
                      : "—"}
                  </div>
                  <div className="rounded bg-paper p-2">المخاطر: {riskDisplayLabel(version.analysis?.riskLevel)}</div>
                  <div className="rounded bg-paper p-2">فرص التحسين: {version.analysis?.languageQuality.issues.length ?? 0}</div>
                </div>
                {version.approvedAt && (
                  <p className="mt-3 text-xs text-palm">اعتمده {version.approvedBy} في {formatDate(version.approvedAt)}</p>
                )}
                {version.visuals?.length ? (
                  <details className="mt-3" open>
                    <summary className="cursor-pointer text-sm text-palm">المرئيات المحفوظة مع هذا الإصدار ({version.visuals.length}) — قابلة للتعديل</summary>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {version.visuals.map((visual) => (
                        <EditableSavedVisual
                          key={visual.id}
                          visual={visual}
                          onSaveSvg={(svg) => {
                            if (updateVersionVisual(record.id, version.version, visual.id, { svg })) {
                              setRecords(loadContentRecords());
                              scheduleCloudPush();
                            }
                          }}
                          onRename={(label) => {
                            if (updateVersionVisual(record.id, version.version, visual.id, { visualTypeLabel: label })) {
                              setRecords(loadContentRecords());
                              scheduleCloudPush();
                            }
                          }}
                          onDelete={() => {
                            if (deleteVersionVisual(record.id, version.version, visual.id)) {
                              setRecords(loadContentRecords());
                              scheduleCloudPush();
                            }
                          }}
                        />
                      ))}
                    </div>
                  </details>
                ) : null}
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm text-palm">التحليل والمراجع المهنية والرسمية ({version.references.length})</summary>
                  <div className="mt-3 space-y-3">
                    <p className="text-sm leading-7">{version.analysis?.summary ?? "لا يوجد تحليل محفوظ."}</p>
                    {version.references.map((reference) => (
                      <div key={reference.id} className="rounded-md bg-white p-3 text-sm leading-7">
                        <p className="font-medium">{reference.referenceName} — {reference.articleOrRuleNumber}</p>
                        <p>{reference.relatedContentPhrase}</p>
                        <a href={reference.officialUrl} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-palm underline">
                          الوصول المباشر إلى المرجع الرسمي <ExternalLink size={14} aria-hidden="true" />
                        </a>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold text-ink">سجل الإجراءات والتغييرات</h3>
        <div className="space-y-2">
          {record.actions.map((action) => (
            <div key={action.id} className="rounded-md bg-white p-3 text-sm leading-7">
              <p className="font-medium">{action.label}</p>
              <p className="text-xs text-ink/60">{action.actor} — {formatDate(action.at)}{action.fromStatus ? ` — ${action.fromStatus} ← ${action.toStatus ?? ""}` : ""}</p>
              {action.details && <p className="mt-1 text-xs text-ink/70">{action.details}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const deleteControls = (record: StoredContentRecord) =>
    confirmDelete === record.id ? (
      <div className="flex items-center gap-1.5">
        <Button size="sm" variant="destructive" onClick={() => deleteRecord(record.id)} leadingIcon={<Trash2 size={13} />}>تأكيد</Button>
        <Button size="sm" variant="secondary-gray" onClick={() => setConfirmDelete(undefined)}>إلغاء</Button>
      </div>
    ) : (
      <button
        type="button"
        onClick={() => setConfirmDelete(record.id)}
        className="grid h-8 w-8 place-items-center rounded-md border border-line text-red-400 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 focus-ring"
        title="حذف"
      >
        <Trash2 size={14} />
      </button>
    );

  if (!loaded) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="أرشيف المحتوى واعتماداته" title="سجل المحتوى المهني" />

        {/* رسالة طمأنة: السجل وسيلة وقائية داخلية — لا استخدام تأديبياً وسرية تامة */}
        <div className="rounded-xl border border-infoBorder bg-infoSoft p-4">
          <p className="text-sm font-semibold text-infoDark">المراجعة وسيلة وقائية لا رقابية</p>
          <p className="mt-1 text-sm leading-7 text-ink/80">
            الغرض من هذا السجل التثبّت من سلامة المحتوى قبل نشره ودعم الامتثال الذاتي. لا تُوظَّف نتائج
            الفحص لأي إجراء تأديبي أو مساءلة، وتظل بياناتك ومحتواك في سرية تامة دون اطلاع أي جهة عليها.
          </p>
        </div>
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-line bg-white py-16 shadow-sm">
          <DgaSpinner size="lg" />
          <span className="text-sm text-ink/50">جاري تحميل السجل...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="أرشيف المحتوى واعتماداته" title="سجل المحتوى المهني" />

      {/* لوحة السجل — بطاقات مصغّرة هادئة: الإجمالي مميّز بالوسط، رحلة المحتوى، ثم حسب النوع والقناة */}
      {records.length > 0 ? (
        <div className="space-y-3">
          {/* الإجمالي بارز بلون المنصّة الأخضر العميق، ومعه مؤشّران موجزان لا يكرّران مراحل رحلة المحتوى */}
          <div className="space-y-2">
            <div className="rounded-2xl border border-palmDeep bg-palmDeep p-4 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 text-white"><FolderOpen size={22} /></span>
                <span className="text-4xl font-bold leading-none tabular-nums text-white">{counts.all}</span>
              </div>
              <p className="mt-2.5 text-sm font-semibold text-white">إجمالي المحتوى</p>
              <p className="text-[11px] font-normal text-white/60">جميع المحتويات المحفوظة في السجل</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <StatCard value={acceptance} suffix="%" label="نسبة الاعتماد" sub="من إجمالي المحتوى" icon={<CheckCircle2 size={16} />} tone="success" pct={acceptance} />
              <StatCard value={thisWeekCount} label="هذا الأسبوع" sub={`أُنشئت من إجمالي المحتوى (${counts.all})`} icon={<CalendarDays size={16} />} tone="lavender" pct={counts.all ? (thisWeekCount / counts.all) * 100 : 0} />
            </div>
          </div>

          <JourneyStepper steps={[
            { label: "إنشاء المحتوى", value: counts.drafts, sub: "مسودة", icon: <PenLine size={16} />, tone: "warn" },
            { label: "المراجعة والتحليل", value: snapshot.reviewed, sub: "قيد التحليل", icon: <Search size={16} />, tone: "sky" },
            { label: "الاعتماد", value: counts.approved, sub: "معتمد", icon: <ShieldCheck size={16} />, tone: "success" },
            { label: "النشر", value: snapshot.channelsUsed, sub: "قنوات نشطة", icon: <Send size={16} />, tone: "lavender" }
          ]} />

          {snapshot.byType.length ? (
            <div className="rounded-2xl border border-line bg-white p-3.5 shadow-xs">
              <p className="mb-2.5 flex items-center gap-2 text-xs font-semibold text-ink"><Tag size={14} className="text-palm" />أنواع المحتوى</p>
              <div className="flex flex-wrap gap-1.5">
                {snapshot.byType.map(([label, count], i) => {
                  const c = CALM[i % CALM.length];
                  return (
                    <span key={label} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-paper py-0.5 pl-2.5 pr-0.5">
                      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${c.bg} ${c.fg}`}>{typeIcon(label)}</span>
                      <span className={`text-xs font-bold tabular-nums ${c.fg}`}>{count}</span>
                      <span className="text-[10px] font-medium text-ink/60">{label}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          ) : null}

          {snapshot.byChannel.length ? (
            <div className="rounded-2xl border border-line bg-white p-3.5 shadow-xs">
              <p className="mb-2.5 flex items-center gap-2 text-xs font-semibold text-ink"><Share2 size={14} className="text-palm" />قنوات النشر</p>
              <div className="flex flex-wrap gap-1.5">
                {snapshot.byChannel.map(([label, count]) => {
                  const b = channelBrand(label);
                  const idle = count === 0; // قناة معتمدة بلا محتوى بعد — تُعرَض بصفر بهيئة هادئة
                  return (
                    <span key={label} className={`inline-flex items-center gap-1.5 rounded-full border py-0.5 pl-2.5 pr-0.5 ${idle ? "border-line/70 bg-paper/50" : "border-line bg-paper"}`}>
                      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${b.surface} ${b.icon} ${idle ? "opacity-45" : ""}`}>{b.node}</span>
                      <span className={`text-xs font-bold tabular-nums ${idle ? "text-ink/35" : "text-ink"}`}>{count}</span>
                      <span className={`text-[10px] font-medium ${idle ? "text-ink/40" : "text-ink/60"}`}>{label}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* رسالة طمأنة: السجل وسيلة وقائية داخلية — لا استخدام تأديبياً وسرية تامة */}
      <div className="rounded-xl border border-infoBorder bg-infoSoft p-4">
        <p className="text-sm font-semibold text-infoDark">المراجعة وسيلة وقائية لا رقابية</p>
        <p className="mt-1 text-sm leading-7 text-ink/80">
          الغرض من هذا السجل التثبّت من سلامة المحتوى قبل نشره ودعم الامتثال الذاتي. لا تُوظَّف نتائج
          الفحص لأي إجراء تأديبي أو مساءلة، وتظل بياناتك ومحتواك في سرية تامة دون اطلاع أي جهة عليها.
        </p>
      </div>

      {/* تنبيه تسجيل الدخول فقط (إجراء مهم لحفظ السجل عبر الأجهزة) — أُزيلت رسائل الطمأنة المكرّرة */}
      {syncState === "signedout" && (
        <div className="flex items-center gap-2 rounded-xl border border-goldBorder bg-goldSoft p-3 text-sm text-goldDark">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-gold" />
          سجّل الدخول بحسابك لتُزامَن سجلاتك عبر أجهزتك؛ وإلا تبقى على هذا الجهاز فقط.
        </div>
      )}

      {/* بقرار مالكة المنصة: تصدير/استيراد السجل — نقل آمن بين المتصفحات والعناوين بلا فقدان */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-4 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-ink">نسخة احتياطية من السجل</p>
          <p className="mt-1 text-xs leading-6 text-ink/60">صدّر نسخة من سجلك أو استورد نسخة سابقة دون حذف الحالي.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportRecordsToFile} disabled={records.length === 0}
            title={records.length === 0 ? "لا سجلات للتصدير" : undefined}>
            تصدير السجل ({records.length})
          </Button>
          <Button variant="secondary" onClick={() => importInputRef.current?.click()}>استيراد السجل</Button>
          <input ref={importInputRef} type="file" accept="application/json,.json" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void importRecordsFromFile(f); e.target.value = ""; }} />
        </div>
        {transferMsg ? <p className="w-full text-sm text-palm">{transferMsg}</p> : null}
      </div>

      {/* بحث بقائمة منسدلة في السجل — يظهر فقط عند وجود محتوى */}
      {records.length > 0 ? (
        <div className="relative">
          <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2.5 shadow-sm">
            <Search size={15} className="shrink-0 text-ink/40" />
            <input
              type="text"
              placeholder="بحث"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onFocus={() => setSearchFocus(true)}
              onBlur={() => setTimeout(() => setSearchFocus(false), 150)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35"
            />
            {search ? (
              <button type="button" onClick={() => setSearch("")} className="text-ink/35 transition hover:text-ink/70" aria-label="مسح البحث">
                <X size={14} />
              </button>
            ) : null}
            <ChevronDown size={15} className={`shrink-0 text-ink/40 transition-transform ${searchFocus ? "rotate-180" : ""}`} aria-hidden="true" />
          </div>
          {searchFocus ? (
            <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-line bg-white shadow-lg">
              {searchMatches.length ? (
                searchMatches.slice(0, 12).map((record) => (
                  <button
                    key={record.id}
                    type="button"
                    onMouseDown={(e) => { e.preventDefault(); setExpanded(record.id); setSearchFocus(false); setSearch(""); }}
                    className="flex w-full items-center gap-2.5 border-b border-line/50 px-3 py-2.5 text-right transition last:border-b-0 hover:bg-mint/30"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-ink">{recordDisplayTitle(record)}</span>
                    <StatusBadge tone={record.approvedVersion ? "good" : "gold"}>{record.approvedVersion ? "معتمد" : "مسودة"}</StatusBadge>
                  </button>
                ))
              ) : (
                <p className="px-3 py-3 text-sm text-ink/50">لا نتائج مطابقة.</p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      <nav aria-label="تصفية سجل المحتوى" className="flex w-full gap-2 overflow-x-auto rounded-lg border border-line bg-white p-2 shadow-sm">
        {([
          ["all", `الكل (${counts.all})`],
          ["drafts", `المسودات والحالية (${counts.drafts})`],
          ["approved", `المعتمدة (${counts.approved})`]
        ] as const).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setFilter(key)} aria-pressed={filter === key}
            className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-medium transition focus-ring ${filter === key ? "bg-mint text-palm" : "text-ink/70 hover:bg-paper hover:text-ink"}`}>
            {label}
          </button>
        ))}
      </nav>

      {filteredRecords.length === 0 ? empty : (
        <>
          {/* ── موبايل: أكورديون DGA (< md) ── */}
          <div className="md:hidden rounded-xl border border-line bg-white overflow-hidden">
            {filteredRecords.map((record, index) => {
              const current = record.versions.find((v) => v.version === record.currentVersion);
              const analysis = current?.analysis ? normalizeReviewResult(current.analysis) : undefined;
              const findings = analysis?.findings;
              const cLabel = complianceLabel(findings);
              const cTone = complianceTone(findings);
              const risk = analysis?.riskLevel;
              const st = displayStatus(record.status, analysis);
              const isOpen = expanded === record.id;
              const showDetails = detailsId === record.id;

              return (
                <div key={record.id} className="border-b border-line last:border-none">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`acc-panel-${record.id}`}
                    onClick={() => {
                      setExpanded(isOpen ? undefined : record.id);
                      if (isOpen) setDetailsId(undefined);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-right transition focus-ring ${isOpen ? "bg-paper" : "hover:bg-paper/60"}`}
                  >
                    <span className="shrink-0 grid h-7 w-7 place-items-center rounded-full bg-mint text-[11px] font-bold text-palm tabular-nums">{serialById.get(record.id) ?? index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink leading-6 line-clamp-2">{recordDisplayTitle(record)}</p>
                      {current && <p className="mt-1 truncate text-[11px] text-ink/45">{current.contentTypeLabel}{current.channel ? ` · ${current.channel}` : ""}{record.createdAt ? ` · ${formatShortDate(record.createdAt)}` : ""}</p>}
                    </div>
                    <div className="shrink-0"><StatusBadge tone={st.tone}>{st.label}</StatusBadge></div>
                    <ChevronDown size={16} className={`shrink-0 text-ink/35 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                  </button>

                  {isOpen && (
                    <div id={`acc-panel-${record.id}`} role="region">
                      <div className="px-4 pb-4 bg-paper/60">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
                          <div>
                            <p className="text-[10px] font-semibold text-ink/40 mb-1">الحالة</p>
                            <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-ink/40 mb-1">الامتثال</p>
                            {cLabel
                              ? <StatusBadge tone={cTone}>{cLabel}</StatusBadge>
                              : <span className="text-xs text-ink/40">—</span>}
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-ink/40 mb-1">المخاطر</p>
                            {risk
                              ? <StatusBadge tone={riskTone(risk)}>{riskDisplayLabel(risk)}</StatusBadge>
                              : <span className="text-xs text-ink/40">—</span>}
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-ink/40 mb-1">الإصدارات</p>
                            <span className="text-sm text-ink/70">{record.versions.length}</span>
                          </div>
                          <div className="col-span-2">
                            <p className="text-[10px] font-semibold text-ink/40 mb-1">آخر تحديث</p>
                            <span className="text-xs text-ink/50">{formatDate(record.updatedAt)}</span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {current && (
                            <Link
                              href="/content-review?open=1"
                              onClick={() => openVersion(record.id, current.version)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-palm px-3 py-1.5 text-xs font-medium text-white transition hover:bg-palmDark focus-ring"
                            >
                              <FolderOpen size={14} /> فتح
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => setDetailsId(showDetails ? undefined : record.id)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-ink/60 hover:border-palm hover:text-palm transition focus-ring"
                          >
                            <History size={13} /> {showDetails ? "إخفاء التفاصيل" : "التفاصيل"}
                          </button>
                          {deleteControls(record)}
                        </div>
                      </div>
                      {showDetails && expandedDetails(record)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── سطح المكتب: جدول كامل (md+) ── */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-line bg-white shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-paper text-right text-xs text-inkTertiary">
                  <th className="px-4 py-3 font-semibold w-10">#</th>
                  <th className="px-4 py-3 font-semibold">العنوان</th>
                  <th className="px-4 py-3 font-semibold">
                    <span className="inline-flex items-center gap-1">الحالة <Filter size={11} className="opacity-40" /></span>
                  </th>
                  <th className="px-4 py-3 font-semibold">الامتثال</th>
                  <th className="px-4 py-3 font-semibold">
                    <span className="inline-flex items-center gap-1">المخاطر <Filter size={11} className="opacity-40" /></span>
                  </th>
                  <th className="px-4 py-3 font-semibold">الإصدارات</th>
                  <th className="px-4 py-3 font-semibold">آخر تحديث</th>
                  <th className="px-4 py-3 font-semibold">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record, index) => {
                  const current = record.versions.find((v) => v.version === record.currentVersion);
                  const isExpanded = expanded === record.id;
                  const analysis = current?.analysis ? normalizeReviewResult(current.analysis) : undefined;
                  const findings = analysis?.findings;
                  const cLabel = complianceLabel(findings);
                  const cTone = complianceTone(findings);
                  const risk = analysis?.riskLevel;
                  const st = displayStatus(record.status, analysis);

                  return (
                    <>
                      <tr key={record.id} className="border-b border-line/60 transition hover:bg-paper last:border-none">
                        <td className="whitespace-nowrap px-4 py-4 text-xs font-bold tabular-nums text-ink/40">{serialById.get(record.id) ?? index + 1}</td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-ink line-clamp-2">{recordDisplayTitle(record)}</p>
                          {current && <p className="mt-0.5 text-xs text-ink/50">{current.contentTypeLabel} · {current.channel}</p>}
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge tone={st.tone}>{st.label}</StatusBadge>
                        </td>
                        <td className="px-4 py-4">
                          {cLabel
                            ? <StatusBadge tone={cTone}>{cLabel}</StatusBadge>
                            : <span className="text-ink/40">—</span>}
                        </td>
                        <td className="px-4 py-4">
                          {risk
                            ? <StatusBadge tone={riskTone(risk)}>{riskDisplayLabel(risk)}</StatusBadge>
                            : <span className="text-ink/40">—</span>}
                        </td>
                        <td className="px-4 py-4 text-ink/70">{record.versions.length}</td>
                        <td className="px-4 py-4 text-xs text-ink/50">{formatDate(record.updatedAt)}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            {current && (
                              <Link
                                href="/content-review?open=1"
                                onClick={() => openVersion(record.id, current.version)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-palm px-3 py-1.5 text-xs font-medium text-white transition hover:bg-palmDark focus-ring"
                              >
                                <FolderOpen size={14} /> فتح
                              </Link>
                            )}
                            <button
                              type="button"
                              onClick={() => setExpanded(isExpanded ? undefined : record.id)}
                              aria-expanded={isExpanded}
                              className="grid h-8 w-8 place-items-center rounded-md border border-line text-ink/50 transition hover:border-palm hover:text-palm focus-ring"
                              title="التفاصيل"
                            >
                              <ChevronLeft size={15} className={`transition-transform ${isExpanded ? "-rotate-90" : ""}`} />
                            </button>
                            {deleteControls(record)}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${record.id}-expanded`}>
                          <td colSpan={8} className="p-0">
                            {expandedDetails(record)}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
