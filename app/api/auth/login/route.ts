import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import {
  ENV_ADMIN_SESSION_PREFIX,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  authEnv,
  isAuthConfigured,
  isDatabaseConfigured,
  newSessionId,
  sessionCookieOptions,
  signSession,
} from "@/lib/access-auth";
import { createSessionRow, findUserByUsername, recordLogin } from "@/lib/access-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// تخفيف محاولات التخمين — عدّاد بالذاكرة لكل مثيل (أفضل جهد على serverless) + تأخير ثابت
const attempts = new Map<string, { count: number; resetAt: number }>();
function tooManyAttempts(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + 10 * 60_000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 20;
}

export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json({ error: "نظام الدخول غير مهيأ بعد — تُضبط متغيرات البيئة أولاً." }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as { username?: string; code?: string } | null;
  const username = (body?.username ?? "").trim();
  const code = body?.code ?? "";
  if (!username || !code) {
    return NextResponse.json({ error: "أدخل اسم المستخدم ورمز الدخول." }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (tooManyAttempts(`${ip}:${username}`)) {
    return NextResponse.json({ error: "محاولات كثيرة — انتظر عشر دقائق ثم أعد المحاولة." }, { status: 429 });
  }

  const env = authEnv();
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;

  // مسار الأدمن: بيانات من متغيرات البيئة حصراً — لا وجود لها في الكود أو قاعدة البيانات
  if (username === env.adminUsername) {
    const ok = await bcrypt.compare(code, env.adminPasswordHash).catch(() => false);
    if (!ok) return NextResponse.json({ error: "اسم المستخدم أو رمز الدخول غير صحيح." }, { status: 401 });

    let sessionId = `${ENV_ADMIN_SESSION_PREFIX}${newSessionId()}`;
    if (isDatabaseConfigured()) {
      // مع قاعدة البيانات: جلسة الأدمن تُسجَّل كغيرها ليكتمل سجل النشاط
      sessionId = newSessionId();
      try {
        await createSessionRow({ id: sessionId, userId: "admin-env", username, page: "/login" });
      } catch {
        sessionId = `${ENV_ADMIN_SESSION_PREFIX}${newSessionId()}`;
      }
    }
    const token = signSession({ sessionId, role: "admin", username, expiresAt });
    cookies().set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
    return NextResponse.json({ ok: true, role: "admin" });
  }

  // مسار المستخدم العادي: من قاعدة البيانات بمقارنة bcrypt
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "اسم المستخدم أو رمز الدخول غير صحيح." }, { status: 401 });
  }
  try {
    const user = await findUserByUsername(username);
    if (!user) {
      return NextResponse.json({ error: "اسم المستخدم أو رمز الدخول غير صحيح." }, { status: 401 });
    }
    const ok = await bcrypt.compare(code, user.password_hash);
    if (!ok) return NextResponse.json({ error: "اسم المستخدم أو رمز الدخول غير صحيح." }, { status: 401 });
    // التسجيل الذاتي: صاحب الرمز الصحيح يُخبر بحالته الحقيقية — طلبه ما زال قيد الموافقة
    if (user.status === "pending") {
      return NextResponse.json({ error: "طلبك قيد المراجعة — يُفعَّل حسابك بعد موافقة إدارة المنصة." }, { status: 403 });
    }
    if (!user.is_active) {
      return NextResponse.json({ error: "اسم المستخدم أو رمز الدخول غير صحيح." }, { status: 401 });
    }

    const sessionId = newSessionId();
    await createSessionRow({ id: sessionId, userId: user.id, username: user.username, page: "/login" });
    await recordLogin(user.id);
    const role = user.role === "admin" ? "admin" : "user";
    const token = signSession({ sessionId, role, username: user.username, expiresAt });
    cookies().set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
    return NextResponse.json({ ok: true, role });
  } catch {
    return NextResponse.json({ error: "تعذر الاتصال بقاعدة البيانات — أبلغ مسؤول المنصة." }, { status: 503 });
  }
}
