"use client";

import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";

// شارة الجلسة في الترويسة — بقرار مالكة المنصة: تعرض اسم المستخدم الداخل فعلاً فقط
// (بلا مسمى وظيفي)، ولا تعرض شيئاً قبل تسجيل الدخول. الاسم الثابت التجريبي أُلغي.
export function SessionChip() {
  const [session, setSession] = useState<{ username: string } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { authenticated?: boolean; username?: string }) => {
        if (d?.authenticated && d.username) setSession({ username: d.username });
      })
      .catch(() => undefined);
  }, []);

  if (!session) return null;

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.href = "/login";
  }

  return (
    <div className="hidden items-center gap-3 rounded-lg border border-line bg-paper px-3 py-2 sm:flex">
      <p className="text-sm font-normal">{session.username}</p>
      <button
        type="button"
        onClick={() => void logout()}
        title="تسجيل الخروج"
        className="grid h-7 w-7 place-items-center rounded-md border border-line text-ink/50 transition hover:border-palm hover:text-palm focus-ring"
      >
        <LogOut size={13} />
      </button>
    </div>
  );
}
