"use client";

import { useState } from "react";
import { LogIn } from "lucide-react";
import { DgaSpinner } from "@/components/ui";

// نموذج الدخول الفردي — اسم مستخدم ورمز دخول، والتحقق كله من جهة الخادم
export function LoginForm() {
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, code }),
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; role?: string; error?: string };
      if (!response.ok || !data.ok) {
        setError(data.error ?? "تعذر الدخول — أعد المحاولة.");
        return;
      }
      window.location.href = data.role === "admin" ? "/admin/access" : "/";
    } catch {
      setError("تعذر الاتصال — تحقق من الشبكة وأعد المحاولة.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-normal">
        اسم المستخدم
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          required
          className="mt-2 w-full rounded border border-line px-3 py-2.5 focus-ring"
        />
      </label>
      <label className="block text-sm font-normal">
        رمز الدخول
        <input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          type="password"
          autoComplete="current-password"
          required
          className="mt-2 w-full rounded border border-line px-3 py-2.5 focus-ring"
        />
      </label>
      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm leading-6 text-red-700">{error}</p> : null}
      <button
        type="submit"
        disabled={loading || !username.trim() || !code}
        className="flex w-full items-center justify-center gap-2 rounded bg-palm px-4 py-2.5 font-normal text-white transition hover:bg-palmDark disabled:opacity-50 focus-ring"
      >
        {loading ? <DgaSpinner size="sm" /> : <LogIn size={17} />}
        دخول
      </button>
    </form>
  );
}
