"use client";

// مزامنة بيانات العمل غير السجل عبر الأجهزة — بأمر مالكة المنصة: «لا يضيع أي عمل عند
// تبديل الجهاز». يغطّي الخطة الذكية وتواريخ النشر. القاعدة الآمنة: لا يُستبدل أبداً تعديل
// محلي لم يُزامَن بعد؛ يُطبَّق ما في السحابة فقط على المفاتيح غير المتغيّرة محلياً، ويُرفع
// كل تغيير محلي. للمستخدم الواحد عبر أجهزته يتقارب هذا دائماً دون فقدان عمل.

import { getSessionUser } from "@/lib/user-scope";

// أنماط مفاتيح العمل القابلة للمزامنة (بصيغتها المنطقية قبل عزل الحساب)
const SYNC_PREFIXES = [
  "lawyer-media:smart-plan-result",
  "lawyer-media:target-publication-date",
];
const MARKS_KEY = "lawyer-media:kv-sync-marks";

type Marks = Record<string, { hash: string; ts: string }>;

function hash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return String(h >>> 0) + ":" + s.length;
}

function loadMarks(): Marks {
  try { return JSON.parse(window.localStorage.getItem(MARKS_KEY) ?? "{}") as Marks; } catch { return {}; }
}
function saveMarks(m: Marks) {
  try { window.localStorage.setItem(MARKS_KEY, JSON.stringify(m)); } catch { /* ممتلئ */ }
}

// المفتاح المنطقي (بلا لاحقة الحساب) ↔ المفتاح المخزّن الفعلي
function logicalOf(storedKey: string): string {
  return storedKey.replace(/::u:[^:]*$/, "");
}
function storedKeyFor(logical: string): string {
  const user = getSessionUser();
  return user ? `${logical}::u:${encodeURIComponent(user)}` : logical;
}
function isSyncable(logical: string): boolean {
  return SYNC_PREFIXES.some((p) => logical === p || logical.startsWith(p + ":"));
}

// كل مفاتيح العمل المخزّنة للحساب الحالي (بصيغتها المنطقية → القيمة)
function localSyncable(): Map<string, string> {
  const out = new Map<string, string>();
  const user = getSessionUser();
  const suffix = user ? `::u:${encodeURIComponent(user)}` : "";
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i);
      if (!k) continue;
      // نقبل مفاتيح هذا الحساب (المعزولة) أو العامة (قبل العزل)
      if (suffix && k.endsWith(suffix)) {
        const logical = logicalOf(k);
        if (isSyncable(logical)) out.set(logical, window.localStorage.getItem(k) ?? "");
      } else if (!k.includes("::u:")) {
        if (isSyncable(k)) out.set(k, window.localStorage.getItem(k) ?? "");
      }
    }
  } catch { /* بيئة بلا تخزين */ }
  return out;
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;
export function scheduleKvPush() {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { pushTimer = null; void pushKv(); }, 1500);
}

export async function pushKv() {
  try {
    const local = localSyncable();
    const marks = loadMarks();
    const items: { key: string; value: string; updatedAt: string }[] = [];
    const nowIso = new Date().toISOString();
    for (const [logical, value] of local) {
      const h = hash(value);
      if (!marks[logical] || marks[logical].hash !== h) {
        items.push({ key: logical, value, updatedAt: nowIso });
        marks[logical] = { hash: h, ts: nowIso };
      }
    }
    if (!items.length) return;
    const res = await fetch("/api/user-kv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    if (res.ok) saveMarks(marks);
  } catch { /* صامت — يُعاد مع الدورة التالية */ }
}

export async function pullKv() {
  try {
    const res = await fetch("/api/user-kv");
    if (!res.ok) return;
    const payload = (await res.json()) as { sync?: boolean; items?: { key: string; value: string; updatedAt: string }[] };
    if (!payload.sync || !Array.isArray(payload.items)) return;
    const local = localSyncable();
    const marks = loadMarks();
    let applied = false;
    for (const item of payload.items) {
      if (!isSyncable(item.key)) continue;
      const localValue = local.get(item.key) ?? window.localStorage.getItem(storedKeyFor(item.key)) ?? "";
      // القاعدة الآمنة: لا نطبّق السحابة إن كان المحلي متغيّراً بعد آخر مزامنة (تعديل غير مرفوع)
      const localChanged = Boolean(local.get(item.key) !== undefined && marks[item.key] && marks[item.key].hash !== hash(localValue));
      if (localChanged) continue;
      if (localValue !== item.value) {
        try {
          window.localStorage.setItem(storedKeyFor(item.key), item.value);
          marks[item.key] = { hash: hash(item.value), ts: item.updatedAt };
          applied = true;
        } catch { /* ممتلئ */ }
      } else if (!marks[item.key]) {
        marks[item.key] = { hash: hash(item.value), ts: item.updatedAt };
      }
    }
    saveMarks(marks);
    if (applied) {
      try { window.dispatchEvent(new Event("lm-kv-synced")); } catch { /* بيئة بلا نافذة */ }
    }
  } catch { /* صامت */ }
}
