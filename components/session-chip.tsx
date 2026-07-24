"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { KeyRound, LogIn, LogOut } from "lucide-react";
import { setSessionUser } from "@/lib/user-scope";
import { clearActiveContentSelection } from "@/lib/content-record-store";

// شارة الجلسة في الترويسة — بقرار مالكة المنصة:
// غير الداخل يرى زر «تسجيل الدخول» دائماً، والداخل يرى اسمه الحقيقي وزر «تسجيل الخروج».
// لا اسم تجريبياً ثابتاً ولا مسمى وظيفياً.
type ChipState =
  | { kind: "loading" }
  | { kind: "unconfigured" }
  | { kind: "guest" }
  | { kind: "user"; username: string; role: string };

export function SessionChip() {
  const [state, setState] = useState<ChipState>({ kind: "loading" });

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { configured?: boolean; authenticated?: boolean; username?: string; role?: string }) => {
        if (!d?.configured) setState({ kind: "unconfigured" });
        else if (d.authenticated && d.username) {
          setState({ kind: "user", username: d.username, role: d.role ?? "user" });
          // مزامنة عزل التخزين مع الجلسة الفعلية (يغطي الدخول من جهاز آخر أو جلسة قائمة)
          setSessionUser(d.username);
        } else setState({ kind: "guest" });
      })
      .catch(() => setState({ kind: "unconfigured" }));
  }, []);

  if (state.kind === "loading" || state.kind === "unconfigured") return null;

  if (state.kind === "guest") {
    return (
      <a
        href="/login"
        className="flex shrink-0 items-center gap-2 rounded-lg border border-palm bg-mint px-2.5 py-2 text-sm font-medium text-palm transition hover:bg-palm hover:text-white focus-ring sm:px-3"
      >
        <LogIn size={15} />
        <span className="whitespace-nowrap">تسجيل الدخول</span>
      </a>
    );
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    // تسجيل الخروج يمسح «المحتوى النشط» — فلا يبقى نص جلسة سابقة معلّقاً بعد دخول جديد
    clearActiveContentSelection();
    setSessionUser(null);
    window.location.href = "/login";
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
      {/* اسم المستخدم يُعرض في درج القائمة لا هنا — فلا يزاحم عنوان الشريط مهما طال */}
      {state.role !== "admin" ? (
        <Link
          href="/account"
          title="تغيير الرمز"
          aria-label="تغيير الرمز"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-line text-ink/60 transition hover:border-palm hover:text-palm focus-ring"
        >
          <KeyRound size={16} />
        </Link>
      ) : null}
      <button
        type="button"
        onClick={() => void logout()}
        title="تسجيل الخروج"
        aria-label="تسجيل الخروج"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-red-200 text-red-500 transition hover:border-red-400 hover:bg-red-50 focus-ring"
      >
        <LogOut size={16} />
      </button>
    </div>
  );
}
