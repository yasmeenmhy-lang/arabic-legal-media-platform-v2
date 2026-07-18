"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { DgaSpinner } from "@/components/ui";

// تغيير كلمة السر الذاتي — يتطلب الرمز الحالي، ولا ينهي الجلسة الحالية.
export function ChangePasswordForm() {
  const [currentCode, setCurrentCode] = useState("");
  const [newCode, setNewCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (newCode !== confirmCode) {
      setError("الرمز الجديد وتأكيده غير متطابقين.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentCode, newCode }),
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string; error?: string };
      if (!response.ok || !data.ok) {
        setError(data.error ?? "تعذر تغيير الرمز.");
        return;
      }
      setMessage(data.message ?? "تم تغيير رمز الدخول بنجاح.");
      setCurrentCode("");
      setNewCode("");
      setConfirmCode("");
    } catch {
      setError("تعذر الاتصال — تحقق من الشبكة وأعد المحاولة.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-normal">
        الرمز الحالي
        <input
          value={currentCode}
          onChange={(event) => setCurrentCode(event.target.value)}
          type="password"
          autoComplete="current-password"
          required
          className="mt-2 w-full rounded border border-line px-3 py-2.5 focus-ring"
        />
      </label>
      <label className="block text-sm font-normal">
        الرمز الجديد (٨ أحرف فأكثر)
        <input
          value={newCode}
          onChange={(event) => setNewCode(event.target.value)}
          type="password"
          autoComplete="new-password"
          required
          className="mt-2 w-full rounded border border-line px-3 py-2.5 focus-ring"
        />
      </label>
      <label className="block text-sm font-normal">
        تأكيد الرمز الجديد
        <input
          value={confirmCode}
          onChange={(event) => setConfirmCode(event.target.value)}
          type="password"
          autoComplete="new-password"
          required
          className="mt-2 w-full rounded border border-line px-3 py-2.5 focus-ring"
        />
      </label>
      {message ? <p className="rounded-lg bg-mint p-3 text-sm leading-6 text-palm">{message}</p> : null}
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm leading-6 text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={loading || !currentCode || newCode.length < 8 || !confirmCode}
        className="flex w-full items-center justify-center gap-2 rounded bg-palm px-4 py-2.5 font-normal text-white transition hover:bg-palmDark disabled:opacity-50 focus-ring"
      >
        {loading ? <DgaSpinner size="sm" /> : <KeyRound size={17} />}
        تغيير رمز الدخول
      </button>
    </form>
  );
}
