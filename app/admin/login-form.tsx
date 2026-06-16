"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";

export function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error ?? "تعذر تسجيل الدخول.");
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block text-sm font-normal">
        كلمة مرور المدير
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          className="mt-2 w-full rounded-md border border-line px-3 py-2.5 focus-ring"
        />
      </label>
      {error ? <p className="text-sm font-normal text-gold">{error}</p> : null}
      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center gap-2 rounded-md bg-palm px-4 py-2.5 text-sm font-normal text-white shadow-sm transition hover:bg-palmDark focus-ring disabled:cursor-not-allowed disabled:opacity-60"
      >
        <KeyRound size={16} />
        {loading ? "جاري التحقق..." : "دخول لوحة الإدارة"}
      </button>
    </form>
  );
}
