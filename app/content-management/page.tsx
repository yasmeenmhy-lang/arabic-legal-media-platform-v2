"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Archive, ExternalLink, FileClock, FolderOpen, History, RotateCcw } from "lucide-react";
import { ButtonLink, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import {
  loadContentRecords,
  saveContentRecords,
  setActiveContentSelection,
  type StoredContentRecord
} from "@/lib/content-record-store";

function formatDate(value?: string) {
  if (!value) return "غير متاح";
  return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function ContentManagementPage() {
  const [records, setRecords] = useState<StoredContentRecord[]>([]);
  const [expanded, setExpanded] = useState<string>();
  const [filter, setFilter] = useState<"all" | "drafts" | "approved" | "archived">("all");

  useEffect(() => {
    setRecords(loadContentRecords());
  }, []);

  const counts = useMemo(() => ({
    all: records.length,
    approved: records.filter((item) => item.approvedVersion).length,
    drafts: records.filter((item) => item.status !== "معتمد").length,
    archived: records.filter((item) => item.archived).length
  }), [records]);
  const filteredRecords = useMemo(() => records.filter((record) => {
    if (filter === "approved") return Boolean(record.approvedVersion) && !record.archived;
    if (filter === "drafts") return record.status !== "معتمد" && !record.archived;
    if (filter === "archived") return Boolean(record.archived);
    return true;
  }), [filter, records]);

  function archiveRecord(id: string) {
    const next = records.map((item) => item.id === id ? { ...item, archived: true } : item);
    setRecords(next);
    saveContentRecords(next);
  }

  function openVersion(contentId: string, version: number) {
    setActiveContentSelection(contentId, version);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="سجل المحتوى الإعلامي والإعلاني"
        title="سجل المحتوى الإعلامي والإعلاني"
        description="السجل الدائم لكل محتوى وإصداراته وتحليلاته ومراجعه واعتماداته وتحركاته، مع إبقاء المعلومات المهنية مرتبطة بالنسخة الصحيحة."
        action={<ButtonLink href="/content-review">إعداد محتوى جديد</ButtonLink>}
      />

      <nav aria-label="تصفية سجل المحتوى" className="flex w-full gap-2 overflow-x-auto rounded-lg border border-line bg-white p-2 shadow-sm">
        {([
          ["all", `الكل (${counts.all})`],
          ["drafts", `المسودات والحالية (${counts.drafts})`],
          ["approved", `المعتمدة (${counts.approved})`],
          ["archived", `المؤرشفة (${counts.archived})`]
        ] as const).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setFilter(key)} aria-pressed={filter === key} className={`shrink-0 rounded-md px-4 py-2.5 text-sm transition focus-ring ${filter === key ? "bg-mint text-palm" : "text-ink/70 hover:bg-paper hover:text-ink"}`}>
            {label}
          </button>
        ))}
      </nav>

      <Panel id="all">
        <SectionTitle title="المحتوى والإصدارات المحفوظة" subtitle="يمكن فتح أي إصدار مستقل والرجوع إلى بياناته دون الكتابة فوق إصدار معتمد سابق." />
        {filteredRecords.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-paper p-6 text-center">
            <FileClock className="mx-auto text-palm" size={34} />
            <p className="mt-3 font-normal">لا توجد سجلات محفوظة بعد</p>
            <p className="mt-2 text-sm leading-7 text-ink/65">يُنشأ السجل عند تحليل أول محتوى، ثم تُحفظ إصداراته واعتماداته ومراجعه وتحركاته تباعًا.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRecords.map((record) => {
              const current = record.versions.find((item) => item.version === record.currentVersion);
              const approved = record.versions.find((item) => item.version === record.approvedVersion);
              return (
                <article key={record.id} className="rounded-lg border border-line bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs text-palm">سجل محتوى محفوظ</p>
                      <h2 className="mt-1 text-base font-normal leading-8">{record.title}</h2>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <StatusBadge tone={record.status === "معتمد" ? "good" : "neutral"}>{record.status}</StatusBadge>
                        <StatusBadge tone={record.approvedVersion ? "good" : "neutral"}>الإصدار المعتمد: {record.approvedVersion ?? "لا يوجد"}</StatusBadge>
                        <StatusBadge>{record.sharingStatus}</StatusBadge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {current ? (
                        <Link onClick={() => openVersion(record.id, current.version)} href="/content-review" className="inline-flex items-center gap-2 rounded-md bg-palm px-3 py-2 text-sm text-white focus-ring">
                          <FolderOpen size={15} /> فتح الإصدار الحالي
                        </Link>
                      ) : null}
                      <button type="button" onClick={() => setExpanded(expanded === record.id ? undefined : record.id)} className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm focus-ring">
                        <History size={15} /> {expanded === record.id ? "إخفاء التفاصيل" : "كل التفاصيل"}
                      </button>
                      <button type="button" onClick={() => archiveRecord(record.id)} className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm focus-ring">
                        <Archive size={15} /> أرشفة
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 text-sm">
                    <div className="rounded-md bg-paper p-3">الإصدارات: {record.versions.length}</div>
                    <div className="rounded-md bg-paper p-3">الامتثال: {current?.analysis?.complianceScore ?? "—"}{current?.analysis ? "%" : ""}</div>
                    <div className="rounded-md bg-paper p-3">المخاطر: {current?.analysis?.riskLevel ?? "—"}</div>
                    <div className="rounded-md bg-paper p-3">المراجع: {current?.references.length ?? 0}</div>
                    <div className="rounded-md bg-paper p-3">آخر تحديث: {formatDate(record.updatedAt)}</div>
                  </div>

                  {expanded === record.id ? (
                    <div className="mt-5 space-y-5 border-t border-line pt-5">
                      <div>
                        <h3 className="mb-3 font-normal">الإصدارات المحفوظة</h3>
                        <div className="space-y-3">
                          {[...record.versions].sort((a, b) => b.version - a.version).map((version) => (
                            <div key={version.id} className="rounded-lg border border-line bg-paper p-4">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="font-normal">الإصدار {version.version} {record.approvedVersion === version.version ? "— المعتمد" : ""}</p>
                                  <p className="mt-1 text-xs text-ink/55">{formatDate(version.updatedAt)} — {version.contentTypeLabel} — {version.channel}</p>
                                </div>
                                <Link onClick={() => openVersion(record.id, version.version)} href="/content-review" className="inline-flex items-center gap-2 rounded-md border border-palm px-3 py-2 text-sm text-palm focus-ring">
                                  <RotateCcw size={14} /> فتح
                                </Link>
                              </div>
                              <p className="mt-3 whitespace-pre-wrap text-sm leading-7">{version.body}</p>
                              <div className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
                                <div className="rounded bg-white p-2">الحالة: {version.status}</div>
                                <div className="rounded bg-white p-2">الامتثال: {version.analysis?.complianceScore ?? "—"}</div>
                                <div className="rounded bg-white p-2">المخاطر: {version.analysis?.riskLevel ?? "—"}</div>
                                <div className="rounded bg-white p-2">فرص التحسين: {version.analysis?.languageQuality.issues.length ?? 0}</div>
                              </div>
                              {version.approvedAt ? <p className="mt-3 text-xs text-palm">اعتمده {version.approvedBy} في {formatDate(version.approvedAt)}</p> : null}
                              <details className="mt-3">
                                <summary className="cursor-pointer text-sm text-palm">التحليل والمراجع المهنية والرسمية ({version.references.length})</summary>
                                <div className="mt-3 space-y-3">
                                  <p className="text-sm leading-7">{version.analysis?.summary ?? "لا يوجد تحليل محفوظ."}</p>
                                  {version.references.map((reference) => (
                                    <div key={reference.id} className="rounded-md bg-white p-3 text-sm leading-7">
                                      <p className="font-normal">{reference.referenceName} — {reference.articleOrRuleNumber}</p>
                                      <p>{reference.relatedContentPhrase}</p>
                                      <a href={reference.officialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-palm underline">الوصول المباشر إلى المرجع الرسمي <ExternalLink size={14} aria-hidden="true" /></a>
                                    </div>
                                  ))}
                                </div>
                              </details>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <h3 className="mb-3 font-normal">سجل الإجراءات والتغييرات</h3>
                        <div className="space-y-2">
                          {record.actions.map((action) => (
                            <div key={action.id} className="rounded-md bg-paper p-3 text-sm leading-7">
                              <p className="font-normal">{action.label}</p>
                              <p className="text-xs text-ink/60">{action.actor} — {formatDate(action.at)} — {action.fromStatus ? `${action.fromStatus} ← ` : ""}{action.toStatus ?? ""}</p>
                              {action.details ? <p className="mt-1 text-xs text-ink/70">{action.details}</p> : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
