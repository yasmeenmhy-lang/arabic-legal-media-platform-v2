"use client";

// طبقة المزامنة السحابية لسجل المحتوى — بأمر مالكة المنصة: الحساب الواحد يرى سجله
// نفسه على كل الأجهزة. التخزين المحلي يبقى ذاكرة العمل السريعة، وهذه الطبقة تدمج
// وترفع بصمت في الخلفية: عند فتح المنصة تُسحب سجلات الحساب من الخادم وتُدمج
// (الأحدث يغلب لكل سجل)، وعند أي حفظ يُرفع التغيير تلقائياً. فشل الشبكة لا يعطل
// شيئاً — المحلي يعمل كما هو وتُعاد المحاولة مع التغيير التالي.

import { loadContentRecords, saveContentRecords } from "@/lib/content-record-store";
import type { StoredContentRecord } from "@/lib/content-record-store";

const CHUNK_LIMIT = 700_000; // حد حجم الدفعة الواحدة (حدود جسم الطلب في الاستضافة)

let pushTimer: ReturnType<typeof setTimeout> | null = null;
let suppressPush = false;

export function scheduleCloudPush() {
  if (suppressPush) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushAllToCloud();
  }, 1500);
}

export async function pushAllToCloud() {
  try {
    const records = loadContentRecords();
    let batch: StoredContentRecord[] = [];
    let size = 0;
    const flush = async () => {
      if (!batch.length) return;
      await fetch("/api/user-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: batch }),
      }).catch(() => {});
      batch = [];
      size = 0;
    };
    for (const record of records) {
      const s = JSON.stringify(record).length;
      if (size + s > CHUNK_LIMIT && batch.length) await flush();
      batch.push(record);
      size += s;
    }
    await flush();
  } catch {
    /* بلا شبكة أو قاعدة — المحلي يعمل والمحاولة تتكرر مع التغيير التالي */
  }
}

type SyncState = "synced" | "offline" | "signedout";
let lastSyncStatus: SyncState | null = null;

// آخر حالة مزامنة معروفة — تُقرأ عند تركيب أي واجهة حتى لو صدر الحدث قبل اشتراكها (سباق تركيب)
export function getLastSyncStatus(): SyncState | null {
  return lastSyncStatus;
}

function broadcastStatus(state: SyncState) {
  lastSyncStatus = state;
  try {
    window.dispatchEvent(new CustomEvent("lm-sync-status", { detail: state }));
  } catch {
    /* بيئة بلا نافذة */
  }
}

export async function pullAndMergeFromCloud() {
  try {
    const res = await fetch("/api/user-records");
    if (res.status === 401) { broadcastStatus("signedout"); return; }
    if (!res.ok) { broadcastStatus("offline"); return; }
    const payload = (await res.json()) as {
      sync?: boolean;
      records?: StoredContentRecord[];
      deletedIds?: string[];
    };
    if (!payload.sync || !Array.isArray(payload.records)) { broadcastStatus("offline"); return; }
    broadcastStatus("synced");

    const local = loadContentRecords();
    const merged = new Map<string, StoredContentRecord>(local.map((r) => [r.id, r]));
    for (const remote of payload.records) {
      if (!remote || typeof remote.id !== "string") continue;
      const mine = merged.get(remote.id);
      if (!mine || String(remote.updatedAt ?? "") > String(mine.updatedAt ?? "")) {
        merged.set(remote.id, remote);
      }
    }
    for (const deletedId of payload.deletedIds ?? []) merged.delete(deletedId);

    // الحفظ المدموج دون إطلاق دفعة رفع من حدث الحفظ نفسه (منع الدوران)
    suppressPush = true;
    try {
      saveContentRecords([...merged.values()]);
    } finally {
      suppressPush = false;
    }
    // رفع فوري واحد: يوصل للسحابة ما كان موجوداً محلياً فقط
    void pushAllToCloud();
    try {
      window.dispatchEvent(new Event("lm-records-synced"));
    } catch {
      /* بيئة بلا نافذة */
    }
  } catch {
    /* صامت — التخزين المحلي هو الأصل عند تعذر المزامنة */
  }
}

export function deleteRecordFromCloud(id: string) {
  void fetch(`/api/user-records?id=${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
}
