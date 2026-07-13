"use client";

import { useState } from "react";
import { LogIn, UserPlus } from "lucide-react";
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

// التسجيل الذاتي — بقرار مالكة المنصة: المستخدم يسجل لنفسه (اسم ورمز يختارهما)
// ويبقى حسابه بانتظار موافقة إدارة المنصة قبل أول دخول
export function RegisterRequestForm() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, code, email }),
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string; error?: string };
      if (!response.ok || !data.ok) {
        setError(data.error ?? "تعذر إرسال الطلب — أعد المحاولة.");
        return;
      }
      setMessage(data.message ?? "أُرسل طلبك — يُفعَّل بعد موافقة إدارة المنصة.");
      setUsername("");
      setEmail("");
      setCode("");
    } catch {
      setError("تعذر الاتصال — تحقق من الشبكة وأعد المحاولة.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <details className="rounded-xl border border-line bg-paper/50 p-4">
      <summary className="cursor-pointer text-sm font-semibold text-palm">ليس لديك حساب؟ سجّل طلبك بنفسك</summary>
      <form onSubmit={submit} className="mt-3 space-y-3">
        <p className="rounded-lg bg-infoSoft p-3 text-xs leading-6 text-ink/70">
          اختر اسم مستخدم ورمز دخول خاصين بك. يُرسل طلبك لإدارة المنصة، وبعد الموافقة تدخل
          بنفس الاسم والرمز — فاحفظ الرمز جيداً.
        </p>
        <label className="block text-sm font-normal">
          اسم المستخدم
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            autoComplete="off"
            required
            className="mt-2 w-full rounded border border-line px-3 py-2.5 focus-ring"
          />
        </label>
        <label className="block text-sm font-normal">
          البريد الإلكتروني
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            dir="ltr"
            autoComplete="email"
            required
            className="mt-2 w-full rounded border border-line px-3 py-2.5 text-left focus-ring"
          />
        </label>
        <label className="block text-sm font-normal">
          رمز الدخول (٨ أحرف فأكثر)
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
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
          disabled={loading || username.trim().length < 3 || code.length < 8 || !email.includes("@")}
          className="flex w-full items-center justify-center gap-2 rounded border border-palm px-4 py-2.5 font-normal text-palm transition hover:bg-mint disabled:opacity-50 focus-ring"
        >
          {loading ? <DgaSpinner size="sm" /> : <UserPlus size={16} />}
          إرسال طلب الحساب
        </button>
      </form>
    </details>
  );
}
