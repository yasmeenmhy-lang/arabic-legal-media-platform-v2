"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import bcrypt from "bcryptjs";
import {
  Copy,
  KeyRound,
  LogOut,
  Power,
  RefreshCw,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { Button, DgaSpinner, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";

// لوحة إدارة الوصول — للأدمن حصراً (الحماية خادمية في middleware وواجهات API).
// بيانات الأدمن لا تُوضع في الكود: تُهيّأ عبر متغيرات بيئة مع تجزئة كلمة المرور،
// والمولّد هنا يعمل داخل المتصفح فقط — الرمز لا يغادر الجهاز.

interface MeResponse {
  configured: boolean;
  authenticated?: boolean;
  username?: string;
  role?: string;
}

interface AdminUser {
  id: string;
  username: string;
  role: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  login_count: number;
}

interface AdminSession {
  id: string;
  username: string;
  created_at: string;
  last_seen_at: string;
  current_page: string | null;
  ended_at: string | null;
  ended_by: string | null;
}

function fmt(value: string | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("ar-SA", {
      timeZone: "Asia/Riyadh",
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}

function randomSecret(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// رمز دخول مقروء بلا حروف ملتبسة (0/O، 1/l)
function randomCode(length = 12): string {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => alphabet[b % alphabet.length]).join("");
}

export default function AdminAccessPage() {
  const [me, setMe] = useState<MeResponse | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [dbReady, setDbReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // نموذج إنشاء مستخدم
  const [newUsername, setNewUsername] = useState("");
  const [newCode, setNewCode] = useState("");
  const [creating, setCreating] = useState(false);

  // مولّد التهيئة (client-side بالكامل)
  const [setupPassword, setSetupPassword] = useState("");
  const [setupHash, setSetupHash] = useState("");
  const [setupSecret, setSetupSecret] = useState("");
  const [hashing, setHashing] = useState(false);

  const refresh = useCallback(async () => {
    const meRes = (await fetch("/api/auth/me").then((r) => r.json()).catch(() => null)) as MeResponse | null;
    setMe(meRes);
    if (meRes?.configured && meRes.role === "admin") {
      const [u, s] = await Promise.all([
        fetch("/api/access-admin/users").then((r) => r.json()).catch(() => null),
        fetch("/api/access-admin/sessions").then((r) => r.json()).catch(() => null),
      ]);
      setUsers(u?.users ?? []);
      setSessions(s?.sessions ?? []);
      setDbReady(Boolean(u?.dbReady && s?.dbReady));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const activeSessions = useMemo(() => sessions.filter((s) => !s.ended_at), [sessions]);

  function flash(text: string, isError = false) {
    if (isError) { setErrorMsg(text); setMessage(""); } else { setMessage(text); setErrorMsg(""); }
    setTimeout(() => { setMessage(""); setErrorMsg(""); }, 6000);
  }

  async function createUserAction(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    try {
      const response = await fetch("/api/access-admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newUsername, code: newCode }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { flash(data.error ?? "تعذر إنشاء المستخدم.", true); return; }
      flash(`أُنشئ المستخدم «${newUsername}». سلّميه الاسم والرمز بقناة آمنة — الرمز لا يُعرض مرة أخرى.`);
      setNewUsername("");
      setNewCode("");
      await refresh();
    } finally {
      setCreating(false);
    }
  }

  async function userAction(userId: string, action: "disable" | "enable" | "set-code" | "end-sessions", code?: string) {
    const response = await fetch("/api/access-admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action, code }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { flash(data.error ?? "تعذر تنفيذ الإجراء.", true); return; }
    flash(data.message ?? "تم.");
    await refresh();
  }

  async function changeCode(user: AdminUser) {
    const suggested = randomCode();
    const code = window.prompt(`رمز جديد للمستخدم «${user.username}» (٨ أحرف فأكثر):`, suggested);
    if (!code) return;
    await userAction(user.id, "set-code", code);
    flash(`غُيّر رمز «${user.username}» إلى: ${code} — انسخيه الآن وسلّميه بقناة آمنة؛ لن يُعرض مرة أخرى.`);
  }

  async function endSessionAction(sessionId: string) {
    const response = await fetch("/api/access-admin/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { flash(data.error ?? "تعذر إنهاء الجلسة.", true); return; }
    flash(data.message ?? "أُنهيت الجلسة.");
    await refresh();
  }

  async function generateHash() {
    if (setupPassword.length < 10) { flash("اختاري كلمة مرور من ١٠ أحرف على الأقل.", true); return; }
    setHashing(true);
    try {
      // التجزئة تتم داخل المتصفح — كلمة المرور لا تُرسل لأي جهة
      const hash = await bcrypt.hash(setupPassword, 10);
      setSetupHash(hash);
    } finally {
      setHashing(false);
    }
  }

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      flash(`نُسخ ${label}.`);
    } catch {
      flash("تعذر النسخ — انسخيه يدوياً.", true);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.href = "/login";
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <DgaSpinner size="lg" />
        <span className="text-sm text-ink/50">جاري التحميل...</span>
      </div>
    );
  }

  const configured = Boolean(me?.configured);
  const isAdmin = me?.role === "admin";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="إدارة المنصة"
        title="إدارة الوصول"
        description="حسابات الدخول الفردية والجلسات وسجل النشاط — هذه اللوحة لمسؤولة المنصة حصراً."
        action={
          configured && isAdmin ? (
            <Button variant="secondary-gray" onClick={() => void logout()} leadingIcon={<LogOut size={15} />}>
              تسجيل الخروج
            </Button>
          ) : undefined
        }
      />

      {/* ملاحظة الخصوصية — دائمة لا تُحذف */}
      <div className="rounded-xl border border-infoBorder bg-infoSoft p-4">
        <p className="text-sm font-semibold text-infoDark">حدود التسجيل — خصوصية المستخدمين</p>
        <p className="mt-1 text-sm leading-7 text-ink/80">
          لا تسجل المنصة أي نص أو محتوى يكتبه المستخدم. يقتصر السجل على: اسم المستخدم، وقت
          الدخول، آخر نشاط، الصفحة المفتوحة، وحالة الجلسة.
        </p>
      </div>

      {message ? <div className="rounded-lg bg-mint p-4 text-sm leading-7 text-palm">{message}</div> : null}
      {errorMsg ? <div className="rounded-lg bg-red-50 p-4 text-sm leading-7 text-red-700">{errorMsg}</div> : null}

      {!configured ? (
        <Panel>
          <SectionTitle
            title="تهيئة نظام الدخول — ثلاث خطوات"
            subtitle="بيانات الأدمن لا تُوضع في الكود: تُضبط في Vercel ← Settings ← Environment Variables، ثم يُعاد النشر."
          />
          <ol className="mt-2 list-decimal space-y-5 pr-5 text-sm leading-7">
            <li>
              <b>AUTH_SECRET</b> — سر توقيع الجلسات:
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button variant="secondary" onClick={() => setSetupSecret(randomSecret())} leadingIcon={<RefreshCw size={14} />}>
                  توليد سر عشوائي
                </Button>
                {setupSecret ? (
                  <>
                    <code dir="ltr" className="max-w-full overflow-x-auto rounded bg-paper px-2 py-1 text-xs">{setupSecret}</code>
                    <Button variant="secondary-gray" onClick={() => void copy(setupSecret, "AUTH_SECRET")} leadingIcon={<Copy size={13} />}>نسخ</Button>
                  </>
                ) : null}
              </div>
            </li>
            <li>
              <b>ADMIN_USERNAME</b> — اسم دخولك الذي تختارينه (مثال: yasmeen).
            </li>
            <li>
              <b>ADMIN_PASSWORD_HASH</b> — تجزئة كلمة مرورك، تولَّد هنا داخل متصفحك ولا تغادر جهازك:
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <input
                  type="password"
                  value={setupPassword}
                  onChange={(event) => setSetupPassword(event.target.value)}
                  placeholder="كلمة المرور (١٠ أحرف فأكثر)"
                  className="w-64 rounded border border-line px-3 py-2 text-sm focus-ring"
                />
                <Button variant="secondary" onClick={() => void generateHash()} disabled={hashing} leadingIcon={hashing ? <DgaSpinner size="sm" /> : <KeyRound size={14} />}>
                  توليد التجزئة
                </Button>
              </div>
              {setupHash ? (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <code dir="ltr" className="max-w-full overflow-x-auto rounded bg-paper px-2 py-1 text-xs">{setupHash}</code>
                  <Button variant="secondary-gray" onClick={() => void copy(setupHash, "ADMIN_PASSWORD_HASH")} leadingIcon={<Copy size={13} />}>نسخ</Button>
                </div>
              ) : null}
            </li>
          </ol>
          <p className="mt-4 rounded-lg bg-paper p-3 text-xs leading-6 text-ink/65">
            بعد إضافة المتغيرات الثلاثة وإعادة النشر يصبح الدخول إلزامياً لكل المنصة، وتفتح هذه
            اللوحة لحسابك أنت فقط. ولإدارة المستخدمين تُضاف قاعدة بيانات (الخطوة التالية داخل اللوحة).
          </p>
        </Panel>
      ) : null}

      {configured && isAdmin ? (
        <>
          {!dbReady ? (
            <Panel>
              <SectionTitle
                title="الخطوة الأخيرة: قاعدة بيانات المستخدمين"
                subtitle="حسابك (الأدمن) يعمل من متغيرات البيئة، أما إنشاء مستخدمين وسجل النشاط فيتطلبان قاعدة بيانات."
              />
              <ol className="list-decimal space-y-2 pr-5 text-sm leading-7">
                <li>من لوحة Vercel: مشروع lawyer-media-platform ← تبويب <b>Storage</b> ← <b>Create Database</b> ← اختاري <b>Neon (Postgres)</b> — الخطة المجانية تكفي.</li>
                <li>اربطيها بالمشروع (Connect) — سيُضاف متغير <code dir="ltr">DATABASE_URL</code> تلقائياً.</li>
                <li>أعيدي النشر (Deployments ← ⋯ ← Redeploy)، ثم حدّثي هذه الصفحة — الجداول تُنشأ تلقائياً.</li>
              </ol>
            </Panel>
          ) : null}

          <Panel>
            <SectionTitle
              title="المستخدمون"
              subtitle="إنشاء الحسابات وتعطيلها وتغيير رموزها — كل مستخدم يدخل باسمه ورمزه المستقل ولا يرى أي أثر إداري."
            />
            <form onSubmit={createUserAction} className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border border-line bg-paper/50 p-3">
              <label className="text-xs font-semibold text-ink/70">
                اسم المستخدم
                <input
                  value={newUsername}
                  onChange={(event) => setNewUsername(event.target.value)}
                  className="mt-1 block w-44 rounded border border-line px-3 py-2 text-sm focus-ring"
                  placeholder="مثال: sara"
                />
              </label>
              <label className="text-xs font-semibold text-ink/70">
                رمز الدخول
                <input
                  value={newCode}
                  onChange={(event) => setNewCode(event.target.value)}
                  className="mt-1 block w-44 rounded border border-line px-3 py-2 text-sm focus-ring"
                  placeholder="٨ أحرف فأكثر"
                />
              </label>
              <Button type="button" variant="secondary" onClick={() => setNewCode(randomCode())} leadingIcon={<RefreshCw size={14} />}>
                توليد رمز
              </Button>
              <Button disabled={creating || !dbReady} leadingIcon={creating ? <DgaSpinner size="sm" /> : <UserPlus size={15} />}>
                إنشاء مستخدم
              </Button>
            </form>

            {users.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-right text-xs text-ink/55">
                      <th className="px-2 py-2">اسم المستخدم</th>
                      <th className="px-2 py-2">الحالة</th>
                      <th className="px-2 py-2">آخر دخول</th>
                      <th className="px-2 py-2">مرات الدخول</th>
                      <th className="px-2 py-2">أُنشئ</th>
                      <th className="px-2 py-2">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-line/60">
                        <td className="px-2 py-2.5 font-medium">{user.username}</td>
                        <td className="px-2 py-2.5">
                          <StatusBadge tone={user.is_active ? "good" : "gold"}>{user.is_active ? "نشط" : "معطل"}</StatusBadge>
                        </td>
                        <td className="px-2 py-2.5 text-ink/70">{fmt(user.last_login_at)}</td>
                        <td className="px-2 py-2.5 text-ink/70">{user.login_count}</td>
                        <td className="px-2 py-2.5 text-ink/70">{fmt(user.created_at)}</td>
                        <td className="px-2 py-2.5">
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => void userAction(user.id, user.is_active ? "disable" : "enable")}
                              className="inline-flex items-center gap-1 rounded border border-line px-2 py-1 text-xs transition hover:border-palm hover:text-palm focus-ring"
                            >
                              <Power size={11} /> {user.is_active ? "تعطيل" : "تفعيل"}
                            </button>
                            <button
                              onClick={() => void changeCode(user)}
                              className="inline-flex items-center gap-1 rounded border border-line px-2 py-1 text-xs transition hover:border-palm hover:text-palm focus-ring"
                            >
                              <KeyRound size={11} /> تغيير الرمز
                            </button>
                            <button
                              onClick={() => void userAction(user.id, "end-sessions")}
                              className="inline-flex items-center gap-1 rounded border border-line px-2 py-1 text-xs transition hover:border-red-400 hover:text-red-600 focus-ring"
                            >
                              <LogOut size={11} /> إنهاء الجلسات
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="rounded-lg bg-paper p-4 text-sm text-ink/60">
                {dbReady ? "لا مستخدمون بعد — أنشئي أول حساب من النموذج أعلاه." : "تُعرض القائمة بعد ربط قاعدة البيانات."}
              </p>
            )}
          </Panel>

          <Panel>
            <SectionTitle
              title={`سجل الدخول والنشاط (${activeSessions.length} نشطة)`}
              subtitle="اسم المستخدم، وقت الدخول، آخر نشاط، الصفحة المفتوحة، وحالة الجلسة — لا يُسجَّل أي محتوى."
            />
            {sessions.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b border-line text-right text-xs text-ink/55">
                      <th className="px-2 py-2">المستخدم</th>
                      <th className="px-2 py-2">وقت الدخول</th>
                      <th className="px-2 py-2">آخر نشاط</th>
                      <th className="px-2 py-2">الصفحة المفتوحة</th>
                      <th className="px-2 py-2">الحالة</th>
                      <th className="px-2 py-2">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session) => (
                      <tr key={session.id} className="border-b border-line/60">
                        <td className="px-2 py-2.5 font-medium">{session.username}</td>
                        <td className="px-2 py-2.5 text-ink/70">{fmt(session.created_at)}</td>
                        <td className="px-2 py-2.5 text-ink/70">{fmt(session.last_seen_at)}</td>
                        <td className="px-2 py-2.5 text-ink/70" dir="ltr">{session.current_page ?? "—"}</td>
                        <td className="px-2 py-2.5">
                          <StatusBadge tone={session.ended_at ? "neutral" : "good"}>
                            {session.ended_at ? (session.ended_by === "admin" ? "أنهاها الأدمن" : "منتهية") : "نشطة"}
                          </StatusBadge>
                        </td>
                        <td className="px-2 py-2.5">
                          {!session.ended_at ? (
                            <button
                              onClick={() => void endSessionAction(session.id)}
                              className="inline-flex items-center gap-1 rounded border border-line px-2 py-1 text-xs transition hover:border-red-400 hover:text-red-600 focus-ring"
                            >
                              <LogOut size={11} /> إنهاء
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="rounded-lg bg-paper p-4 text-sm text-ink/60">
                {dbReady ? "لا جلسات مسجلة بعد." : "يُعرض السجل بعد ربط قاعدة البيانات."}
              </p>
            )}
          </Panel>

          <div className="flex items-center gap-2 rounded-lg border border-line bg-white p-4 text-xs leading-6 text-ink/60">
            <ShieldCheck size={15} className="shrink-0 text-palm" />
            الحماية خادمية بالكامل: middleware يمنع غير الأدمن من هذه الصفحة وواجهاتها ويعيد توجيهه،
            وواجهات API تتحقق مرة ثانية مستقلة — إخفاء الرابط ليس هو الحماية.
          </div>
        </>
      ) : null}

      {configured && !isAdmin ? (
        <Panel>
          <p className="rounded-lg bg-paper p-4 text-sm leading-7 text-ink/70">هذه الصفحة لمسؤولة المنصة.</p>
        </Panel>
      ) : null}
    </div>
  );
}
