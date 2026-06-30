"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ExternalLink, FileClock, Filter, FolderOpen, History, RotateCcw, Trash2 } from "lucide-react";
import { Button, ButtonLink, PageHeader, StatusBadge } from "@/components/ui";
import {
  loadContentRecords,
  saveContentRecords,
  setActiveContentSelection,
  type StoredContentRecord
} from "@/lib/content-record-store";
import type { RiskLevel } from "@/lib/types";

function formatDate(value?: string) {
  if (!value) return "غير متاح";
  return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium" }).format(new Date(value));
}

function complianceTone(score?: number): "good" | "gold" | "danger" | "neutral" {
  if (score == null) return "neutral";
  if (score >= 80) return "good";
  if (score >= 60) return "gold";
  return "danger";
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
  const [filter, setFilter] = useState<"all" | "drafts" | "approved">("all");
  const [confirmDelete, setConfirmDelete] = useState<string>();

  useEffect(() => {
    setRecords(loadContentRecords());
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
          {[...record.versions].sort((a, b) => b.version - a.version).map((version) => (
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
                <div className="rounded bg-paper p-2">الامتثال: {version.analysis?.complianceScore ?? "—"}</div>
                <div className="rounded bg-paper p-2">المخاطر: {version.analysis?.riskLevel ?? "—"}</div>
                <div className="rounded bg-paper p-2">فرص التحسين: {version.analysis?.languageQuality.issues.length ?? 0}</div>
              </div>
              {version.approvedAt && (
                <p className="mt-3 text-xs text-palm">اعتمده {version.approvedBy} في {formatDate(version.approvedAt)}</p>
              )}
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
          ))}
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="سجل المحتوى المهني"
        title="سجل المحتوى المهني"
        description="السجل الدائم لكل محتوى وإصداراته وتحليلاته ومراجعه واعتماداته وتحركاته."
        action={<ButtonLink href="/content-review">إعداد محتوى جديد</ButtonLink>}
      />

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
            {filteredRecords.map((record) => {
              const current = record.versions.find((v) => v.version === record.currentVersion);
              const compliance = current?.analysis?.complianceScore;
              const risk = current?.analysis?.riskLevel;
              const isOpen = expanded === record.id;

              return (
                <div key={record.id} className="border-b border-line last:border-none">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`acc-panel-${record.id}`}
                    onClick={() => setExpanded(isOpen ? undefined : record.id)}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-4 text-right transition focus-ring ${isOpen ? "bg-paper" : "hover:bg-paper/60"}`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink leading-6">{record.title}</p>
                      {current && <p className="mt-0.5 text-xs text-ink/50">{current.contentTypeLabel} · {current.channel}</p>}
                    </div>
                    <ChevronDown size={16} className={`shrink-0 text-ink/40 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </button>

                  {isOpen && (
                    <div id={`acc-panel-${record.id}`} role="region">
                      <div className="px-4 pb-4 bg-paper/60">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-4">
                          <div>
                            <p className="text-[10px] font-semibold text-ink/40 mb-1">الحالة</p>
                            <StatusBadge tone={record.status === "معتمد" ? "good" : "neutral"}>{record.status}</StatusBadge>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-ink/40 mb-1">الامتثال</p>
                            {compliance != null
                              ? <StatusBadge tone={complianceTone(compliance)}>{compliance}%</StatusBadge>
                              : <span className="text-xs text-ink/40">—</span>}
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold text-ink/40 mb-1">المخاطر</p>
                            {risk
                              ? <StatusBadge tone={riskTone(risk)}>{risk}</StatusBadge>
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
                            <Button size="sm" onClick={() => openVersion(record.id, current.version)} leadingIcon={<FolderOpen size={14} />}>فتح</Button>
                          )}
                          <button
                            type="button"
                            onClick={() => setExpanded(`details-${record.id}`)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-ink/60 hover:border-palm hover:text-palm transition focus-ring"
                          >
                            <History size={13} /> التفاصيل
                          </button>
                          {deleteControls(record)}
                        </div>
                      </div>
                      {expanded === `details-${record.id}` && expandedDetails(record)}
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
                {filteredRecords.map((record) => {
                  const current = record.versions.find((v) => v.version === record.currentVersion);
                  const isExpanded = expanded === record.id;
                  const compliance = current?.analysis?.complianceScore;
                  const risk = current?.analysis?.riskLevel;

                  return (
                    <>
                      <tr key={record.id} className="border-b border-line/60 transition hover:bg-paper last:border-none">
                        <td className="px-4 py-4">
                          <p className="font-medium text-ink">{record.title}</p>
                          {current && <p className="mt-0.5 text-xs text-ink/50">{current.contentTypeLabel} · {current.channel}</p>}
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge tone={record.status === "معتمد" ? "good" : "neutral"}>{record.status}</StatusBadge>
                        </td>
                        <td className="px-4 py-4">
                          {compliance != null
                            ? <StatusBadge tone={complianceTone(compliance)}>{compliance}%</StatusBadge>
                            : <span className="text-ink/40">—</span>}
                        </td>
                        <td className="px-4 py-4">
                          {risk
                            ? <StatusBadge tone={riskTone(risk)}>{risk}</StatusBadge>
                            : <span className="text-ink/40">—</span>}
                        </td>
                        <td className="px-4 py-4 text-ink/70">{record.versions.length}</td>
                        <td className="px-4 py-4 text-xs text-ink/50 whitespace-nowrap">{formatDate(record.updatedAt)}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            {current && (
                              <Button size="sm" onClick={() => openVersion(record.id, current.version)} leadingIcon={<FolderOpen size={14} />}>فتح</Button>
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
                          <td colSpan={7} className="p-0">
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
