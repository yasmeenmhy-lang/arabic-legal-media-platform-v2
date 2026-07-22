"use client";

// ─────────────────────────────────────────────────────────────────────────────
// إشعار التكلفة الداخلي (لمالكة المنصة وحدها): بعد كل عملية يعرض تكلفتها الفعلية
// والرصيد المتبقي، مع تحديث الرصيد عند الشحن. الخادم لا يُرسل هذه الحقول أصلاً
// لغير دور admin — فالمكوّن لا يعرض شيئاً لبقية المستخدمين بحكم غياب البيانات.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { Wallet } from "lucide-react";

function fmt(usd: number): string {
  return `$${usd.toFixed(usd < 0.1 ? 4 : 2)}`;
}

export function CostNotice({ costUsd, balanceUsd }: { costUsd?: number; balanceUsd?: number }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");
  const [localBalance, setLocalBalance] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  if (costUsd === undefined && balanceUsd === undefined) return null;
  const balance = localBalance ?? balanceUsd;

  async function saveBalance() {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/cost/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ balanceUsd: n }),
      });
      if (res.ok) {
        setLocalBalance(n);
        setEditing(false);
        setValue("");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-line bg-paper/60 px-3 py-2 text-xs text-ink/60">
      <span className="inline-flex items-center gap-1.5">
        <Wallet size={13} className="text-ink/40" aria-hidden="true" />
        {costUsd !== undefined && <span>تكلفة هذه العملية: <b className="tabular-nums text-ink/80">{fmt(costUsd)}</b></span>}
      </span>
      {balance !== undefined && (
        <span>الرصيد المتبقي: <b className={`tabular-nums ${balance < 3 ? "text-red-600" : "text-ink/80"}`}>{fmt(balance)}</b></span>
      )}
      {editing ? (
        <span className="inline-flex items-center gap-1.5">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="الرصيد بعد الشحن ($)"
            className="w-32 rounded border border-line px-2 py-1 text-xs focus:border-palm focus:outline-none"
          />
          <button type="button" onClick={() => void saveBalance()} disabled={saving} className="rounded bg-palm px-2 py-1 text-[11px] font-medium text-white disabled:opacity-50">حفظ</button>
          <button type="button" onClick={() => { setEditing(false); setValue(""); }} className="text-[11px] text-ink/45 hover:text-ink">إلغاء</button>
        </span>
      ) : (
        <button type="button" onClick={() => setEditing(true)} className="text-[11px] text-ink/40 underline-offset-2 hover:text-palm hover:underline">
          تحديث الرصيد
        </button>
      )}
      <span className="text-[10px] text-ink/30">تقدير محاسبي — فاتورة المزوّد هي المرجع</span>
    </div>
  );
}
