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

// ترشيد استهلاك القاعدة (بأمر مالكة المنصة): الرفع تفاضلي — بصمة آخر رفع ناجح لكل
// سجل (updatedAt)، فلا يُرفع إلا ما تغيّر فعلاً بدل إعادة رفع السجل كاملاً في كل
// حفظ وتركيز وعودة للتبويب (كان هذا هو مستنزف حصة نقل قاعدة البيانات).
// أول رفع بعد فتح الصفحة كامل دوماً (تسوية) لأن البصمات تبدأ فارغة.
const lastPushedStamp = new Map<string, string>();

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
    const records = loadContentRecords().filter(
      (record) => lastPushedStamp.get(record.id) !== String(record.updatedAt ?? "")
    );
    if (!records.length) return; // لا تغيير — لا طلب أصلاً
    let batch: StoredContentRecord[] = [];
    let size = 0;
    const flush = async () => {
      if (!batch.length) return;
      const sent = batch;
      const res = await fetch("/api/user-records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records: sent }),
      }).catch(() => null);
      // تُحدَّث البصمات فقط بعد قبول الخادم — فشل الرفع يُبقي السجل «متغيراً» ليُعاد
      if (res?.ok) for (const r of sent) lastPushedStamp.set(r.id, String(r.updatedAt ?? ""));
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

// خانق السحب: السحب يجلب السجل كاملاً من الخادم، وتكراره مع كل تركيز/عودة للتبويب
// كان يستهلك حصة النقل بلا جديد — يكفي سحب واحد كل دقيقة كحد أقصى، وضمانة
// «الجهاز المفتوح حديثاً يجد كل شيء» باقية (أول سحب دوماً ينفذ فوراً).
let lastPullAt = 0;
const PULL_MIN_INTERVAL_MS = 60_000;

export async function pullAndMergeFromCloud() {
  try {
    if (Date.now() - lastPullAt < PULL_MIN_INTERVAL_MS) return;
    lastPullAt = Date.now();
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
      } else if (String(remote.updatedAt ?? "") === String(mine.updatedAt ?? "")) {
        // شفاء الأحكام: نسخة محلية جُرّدت من تحليلها (ضيق مساحة سابق) ونظيرتها
        // السحابية تحمله بنفس التاريخ ⟵ تُعتمد السحابية — الحكم يعود مع نصه
        // فلا يُعاد الحكم على نص لم يتغير
        const mineCurrent = mine.versions?.find((v) => v.version === mine.currentVersion);
        const remoteCurrent = remote.versions?.find((v) => v.version === remote.currentVersion);
        if (mineCurrent && !mineCurrent.analysis && remoteCurrent?.analysis) merged.set(remote.id, remote);
      }
      // ما هو موجود لدى الخادم أصلاً بهذه النسخة لا يُعاد رفعه إليه (منع الصدى):
      // تُختم بصمته كأنه مرفوع — فيبقى للرفع فقط ما هو أحدث محلياً أو غير موجود سحابياً
      const applied = merged.get(remote.id);
      if (applied && String(applied.updatedAt ?? "") === String(remote.updatedAt ?? "")) {
        lastPushedStamp.set(remote.id, String(remote.updatedAt ?? ""));
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
