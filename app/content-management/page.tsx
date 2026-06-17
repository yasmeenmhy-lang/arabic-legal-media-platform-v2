"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Archive, Copy, Edit3, FileClock, FolderOpen, PlayCircle, RotateCcw, Trash2 } from "lucide-react";
import { ButtonLink, DataTable, ModuleTabs, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import type { StoredReviewSnapshot } from "@/components/review-context-summary";

type ContentRecord = {
  id: string;
  excerpt: string;
  status: "مسودة" | "مكتمل" | "مؤرشف";
  complianceScore?: number;
  riskLevel?: string;
  publishingReadinessScore?: number;
  updatedAt: string;
  contentType?: string;
  channel?: string;
};

const SNAPSHOT_KEY = "lawyer-media:last-review-snapshot";

function buildRecord(snapshot: StoredReviewSnapshot): ContentRecord {
  return {
    id: snapshot.context.reviewId,
    excerpt: snapshot.context.shortExcerpt,
    status: "مكتمل",
    complianceScore: snapshot.context.complianceScore,
    riskLevel: snapshot.context.riskLevel,
    publishingReadinessScore: snapshot.context.publishingReadinessScore,
    updatedAt: snapshot.context.reviewedAt ?? new Date().toISOString(),
    contentType: snapshot.context.contentType,
    channel: snapshot.context.channel
  };
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("ar-SA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function ContentManagementPage() {
  const [records, setRecords] = useState<ContentRecord[]>([]);

  useEffect(() => {
    const raw = window.sessionStorage.getItem(SNAPSHOT_KEY);
    if (!raw) return;
    try {
      setRecords([buildRecord(JSON.parse(raw) as StoredReviewSnapshot)]);
    } catch {
      setRecords([]);
    }
  }, []);

  const counts = useMemo(() => ({
    all: records.length,
    drafts: records.filter((item) => item.status === "مسودة").length,
    completed: records.filter((item) => item.status === "مكتمل").length,
    archived: records.filter((item) => item.status === "مؤرشف").length
  }), [records]);

  function archiveRecord(id: string) {
    setRecords((current) => current.map((item) => (item.id === id ? { ...item, status: "مؤرشف" } : item)));
  }

  function deleteRecord(id: string) {
    setRecords((current) => current.filter((item) => item.id !== id));
  }

  function duplicateRecord(id: string) {
    const record = records.find((item) => item.id === id);
    if (!record) return;
    setRecords((current) => [
      {
        ...record,
        id: `${record.id}-نسخة`,
        status: "مسودة",
        updatedAt: new Date().toISOString()
      },
      ...current
    ]);
  }

  const rows = records.map((record) => [
    <div key={`${record.id}-content`}>
      <p className="font-normal text-ink">{record.excerpt || record.id}</p>
      <p className="mt-1 text-xs leading-6 text-ink/55">{record.id}</p>
    </div>,
    <StatusBadge key={`${record.id}-status`} tone={record.status === "مكتمل" ? "good" : record.status === "مؤرشف" ? "neutral" : "gold"}>{record.status}</StatusBadge>,
    typeof record.complianceScore === "number" ? `${record.complianceScore}%` : "غير متاح",
    record.riskLevel ?? "غير متاح",
    typeof record.publishingReadinessScore === "number" ? `${record.publishingReadinessScore}%` : "غير متاح",
    formatDate(record.updatedAt),
    record.contentType ?? "غير محدد",
    record.channel ?? "غير محددة",
    <div key={`${record.id}-actions`} className="flex flex-wrap gap-2">
      <Link href="/content-review#results" className="rounded-md border border-line px-2.5 py-1.5 text-xs text-palm focus-ring"><FolderOpen size={14} className="inline" /> فتح</Link>
      <Link href="/content-review#input" className="rounded-md border border-line px-2.5 py-1.5 text-xs text-palm focus-ring"><Edit3 size={14} className="inline" /> تعديل</Link>
      <button type="button" onClick={() => deleteRecord(record.id)} className="rounded-md border border-line px-2.5 py-1.5 text-xs focus-ring"><Trash2 size={14} className="inline" /> حذف</button>
      <button type="button" onClick={() => archiveRecord(record.id)} className="rounded-md border border-line px-2.5 py-1.5 text-xs focus-ring"><Archive size={14} className="inline" /> أرشفة</button>
      <button type="button" onClick={() => duplicateRecord(record.id)} className="rounded-md border border-line px-2.5 py-1.5 text-xs focus-ring"><Copy size={14} className="inline" /> تكرار</button>
      <Link href="/content-review#input" className="rounded-md border border-line px-2.5 py-1.5 text-xs text-palm focus-ring"><PlayCircle size={14} className="inline" /> متابعة</Link>
      <Link href="/content-review#input" className="rounded-md border border-line px-2.5 py-1.5 text-xs text-palm focus-ring"><RotateCcw size={14} className="inline" /> إعادة المراجعة</Link>
    </div>
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="السجل"
        title="السجل"
        description="مركز إدارة المحتوى الذي يجمع المواد التي تمت مراجعتها أو حفظها كمسودات أو أرشفتها، مع حالتها ودرجات الامتثال والمخاطر وجاهزية النشر والإجراءات التشغيلية."
        action={<ButtonLink href="/content-review">مراجعة محتوى جديد</ButtonLink>}
      />

      <ModuleTabs
        items={[
          { label: `الكل (${counts.all})`, href: "#all", active: true },
          { label: `المسودات (${counts.drafts})`, href: "#drafts" },
          { label: `المكتملة (${counts.completed})`, href: "#completed" },
          { label: `المؤرشفة (${counts.archived})`, href: "#archived" }
        ]}
      />

      <Panel id="all" className="overflow-hidden">
        <SectionTitle
          title="إدارة المحتوى"
          subtitle="تعرض القائمة السجلات المتاحة في هذه الجلسة فقط في وضع العرض دون قاعدة بيانات، ولا تعرض نتائج أو درجات غير ناتجة عن مراجعة فعلية."
        />
        {records.length > 0 ? (
          <DataTable
            headers={["المحتوى", "الحالة", "الامتثال", "المخاطر", "جاهزية النشر", "آخر تحديث", "نوع المحتوى", "القناة", "الإجراءات"]}
            rows={rows}
          />
        ) : (
          <div className="rounded-lg border border-dashed border-line bg-paper p-6 text-center">
            <FileClock className="mx-auto text-palm" size={34} />
            <p className="mt-3 font-normal text-ink">لا توجد سجلات محتوى محفوظة في هذه الجلسة</p>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-7 text-ink/65">
              بعد تشغيل مراجعة فعلية من صفحة المراجعة ستظهر هنا المادة المختصرة، الحالة، درجة الامتثال، مستوى المخاطر، جاهزية النشر، وتاريخ آخر تحديث مع إجراءات الفتح والتعديل والأرشفة والتكرار وإعادة المراجعة.
            </p>
          </div>
        )}
      </Panel>
    </div>
  );
}
