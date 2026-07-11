"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ExternalLink, FileClock, Filter, FolderOpen, History, RotateCcw, Trash2 } from "lucide-react";
import { Button, ButtonLink, DgaSpinner, PageHeader, StatusBadge } from "@/components/ui";
import {
  exportContentRecords,
  importContentRecords,
  loadContentRecords,
  saveContentRecords,
  setActiveContentSelection,
  type StoredContentRecord
} from "@/lib/content-record-store";
import { riskDisplayLabel, type ReviewResult, type RiskLevel } from "@/lib/types";
import { normalizeReviewResult } from "@/lib/review-normalizer";

function formatDate(value?: string) {
  if (!value) return "غير متاح";
  const d = new Date(value);
  const hijri = new Intl.DateTimeFormat("ar-SA-u-ca-islamic", { dateStyle: "medium" }).format(d);
  const gregorian = new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(d);
  return `${hijri} / ${gregorian}`;
}

function complianceLabel(findings?: { resolved?: boolean }[]): "ملتزم" | "غير ملتزم" | null {
  if (!findings) return null;
  return findings.length === 0 ? "ملتزم" : "غير ملتزم";
}

function complianceTone(findings?: { resolved?: boolean }[]): "good" | "danger" | "neutral" {
  if (!findings) return "neutral";
  return findings.length === 0 ? "good" : "danger";
}

function displayStatus(storedStatus: string, analysis?: ReviewResult): { label: string; tone: "good" | "danger" | "neutral" } {
  if (!analysis) return { label: "مسودة", tone: "neutral" }; // لا جاهزية ولا اعتماد بلا تحليل
  const unresolved = analysis.findings.filter((f) => !f.resolved).length;
  if (unresolved > 0) return { label: "يحتاج إلى تعديل", tone: "danger" };
  return { label: storedStatus, tone: storedStatus === "معتمد" ? "good" : "neutral" };
}

function riskTone(level?: RiskLevel): "good" | "gold" | "danger" | "neutral" {
  if (!level) return "neutral";
  if (level === "منخفض") return "good";
  if (level === "متوسط") return "gold";
  return "danger";
}

export default function ContentManagementPage() {
  const [records, setRecords] = useState<StoredContentRecord[]>([]);
  const [expanded, setExpanded] = useState<string>();
  const [detailsId, setDetailsId] = useState<string>();
  const [filter, setFilter] = useState<"all" | "drafts" | "approved">("all");
  const [confirmDelete, setConfirmDelete] = useState<string>();
  const [loaded, setLoaded] = useState(false);
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
      if (!result) { setTransferMsg("الملف غير صالح — اختاري ملف تصدير سجل صادراً من المنصة."); return; }
      setRecords(loadContentRecords());
      setTransferMsg(`اكتمل الاستيراد: ${result.added} أُضيف، ${result.updated} حُدّث، ${result.skipped} كان أحدث محلياً فبقي.`);
    } catch {
      setTransferMsg("تعذر قراءة الملف — تأكدي أنه ملف تصدير السجل نفسه دون تعديل.");
    }
  }

  useEffect(() => {
    setRecords(loadContentRecords());
    setLoaded(true);
  }, []);

  const counts = useMemo(() => ({
    all: records.length,
    approved: records.filter((item) => item.approvedVersion).length,
    drafts: records.filter((item) => item.status !== "معتمد").length
  }), [records]);

  const filteredRecords = useMemo(() => records.filter((record) => {
    if (filter === "approved") return Boolean(record.approvedVersion);
    if (filter === "drafts") return record.status !== "معتمد";
    return true;
  }), [filter, records]);

  function deleteRecord(id: string) {
    const next = records.filter((item) => item.id !== id);
    setRecords(next);
    saveContentRecords(next);
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
                  <Link onClick={() => openVersion(record.id, version.version)} href="/content-review"
                    className="inline-flex items-center gap-2 rounded-md border border-palm px-3 py-2 text-sm text-palm focus-ring">
                    <RotateCcw size={14} /> فتح
                  </Link>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-ink/80">{version.body}</p>
                <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
                  <div className="rounded bg-paper p-2">الحالة: {version.status}</div>
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
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm text-palm">المرئيات المحفوظة مع هذا الإصدار ({version.visuals.length})</summary>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {version.visuals.map((visual) => (
                        <figure key={visual.id} className="rounded-md border border-line bg-white p-2">
                          <figcaption className="mb-2 flex items-center justify-between gap-2 px-1 text-xs text-ink/60">
                            <span className="font-medium text-ink/80">{visual.visualTypeLabel}</span>
                            <span>{formatDate(visual.createdAt)}</span>
                          </figcaption>
                          {visual.svg ? (
                            <div className="flex justify-center rounded bg-paper/40 p-2 [&_svg]:h-auto [&_svg]:max-h-[360px] [&_svg]:w-auto [&_svg]:max-w-full"
                              dangerouslySetInnerHTML={{ __html: visual.svg }} />
                          ) : visual.imageUrl ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <div className="flex justify-center rounded bg-paper/40 p-2">
                              <img src={visual.imageUrl} alt={visual.visualTypeLabel} className="max-h-[360px] w-auto max-w-full object-contain" />
                            </div>
                          ) : null}
                        </figure>
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
        <PageHeader
          eyebrow="سجل المحتوى المهني"
          title="سجل المحتوى المهني"
          description="السجل الدائم لكل محتوى وإصداراته وتحليلاته ومراجعه واعتماداته وتحركاته."
          action={<ButtonLink href="/content-review">إعداد محتوى جديد</ButtonLink>}
        />

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
      <PageHeader
        eyebrow="سجل المحتوى المهني"
        title="سجل المحتوى المهني"
        description="السجل الدائم لكل محتوى وإصداراته وتحليلاته ومراجعه واعتماداته وتحركاته."
        action={<ButtonLink href="/content-review">إعداد محتوى جديد</ButtonLink>}
      />

      {/* رسالة طمأنة: السجل وسيلة وقائية داخلية — لا استخدام تأديبياً وسرية تامة */}
      <div className="rounded-xl border border-infoBorder bg-infoSoft p-4">
        <p className="text-sm font-semibold text-infoDark">المراجعة وسيلة وقائية لا رقابية</p>
        <p className="mt-1 text-sm leading-7 text-ink/80">
          الغرض من هذا السجل التثبّت من سلامة المحتوى قبل نشره ودعم الامتثال الذاتي. لا تُوظَّف نتائج
          الفحص لأي إجراء تأديبي أو مساءلة، وتظل بياناتك ومحتواك في سرية تامة دون اطلاع أي جهة عليها.
        </p>
      </div>

      {/* بقرار مالكة المنصة: تصدير/استيراد السجل — نقل آمن بين المتصفحات والعناوين بلا فقدان */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-white p-4 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-ink">نسخة احتياطية من السجل</p>
          <p className="mt-1 text-xs leading-6 text-ink/60">
            السجل محفوظ في هذا المتصفح. صدّريه ملفاً قبل تغيير رابط المنصة أو الانتقال لجهاز آخر، ثم استوردي الملف هناك — الاستيراد يضيف ويحدّث ولا يحذف شيئاً.
          </p>
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
                    className={`w-full flex items-center justify-between gap-3 px-4 py-4 text-right transition focus-ring ${isOpen ? "bg-paper" : "hover:bg-paper/60"}`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-mint text-xs font-bold text-palm">{index + 1}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-ink leading-6">{record.title}</p>
                        {current && <p className="mt-0.5 text-xs text-ink/50">{current.contentTypeLabel} · {current.channel}</p>}
                      </div>
                    </div>
                    <ChevronDown size={16} className={`shrink-0 text-ink/40 transition-transform ${isOpen ? "rotate-180" : ""}`} />
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
                              href="/content-review"
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
                        <td className="whitespace-nowrap px-4 py-4 text-xs font-bold tabular-nums text-ink/40">{index + 1}</td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-ink">{record.title}</p>
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
                                href="/content-review"
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
