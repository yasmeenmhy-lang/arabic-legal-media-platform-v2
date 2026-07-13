import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { authEnv, isAuthConfigured, isDatabaseConfigured, newSessionId } from "@/lib/access-auth";
import { countPendingUsers, createUser, findUserByEmail, findUserByUsername } from "@/lib/access-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// التسجيل الذاتي — بقرار مالكة المنصة: المستخدم يسجل لنفسه (اسم + رمز يختارهما)،
// والحساب يبقى «بانتظار الموافقة» ولا يستطيع الدخول حتى تعتمده الأدمن من لوحتها.

const attempts = new Map<string, { count: number; resetAt: number }>();
function tooMany(key: string): boolean {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + 10 * 60_000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 5;
}

const USERNAME_RE = /^[a-zA-Z0-9_؀-ۿ.-]{3,40}$/;

export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json({ error: "نظام الدخول غير مهيأ بعد." }, { status: 503 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "التسجيل غير متاح حالياً — أبلغ إدارة المنصة." }, { status: 503 });
  }

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (tooMany(ip)) {
    return NextResponse.json({ error: "محاولات كثيرة — انتظر عشر دقائق ثم أعد المحاولة." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as { username?: string; code?: string; email?: string } | null;
  const username = (body?.username ?? "").trim();
  const code = body?.code ?? "";
  const email = (body?.email ?? "").trim().toLowerCase();
  if (!USERNAME_RE.test(username)) {
    return NextResponse.json({ error: "اسم المستخدم: من ٣ إلى ٤٠ حرفاً (عربي أو لاتيني أو أرقام أو . _ -)." }, { status: 400 });
  }
  if (code.length < 8) {
    return NextResponse.json({ error: "رمز الدخول: ٨ أحرف على الأقل — احفظه جيداً، ستدخل به بعد الموافقة." }, { status: 400 });
  }
  // البريد إلزامي لتأكيد هوية طالب التسجيل — تتحقق منه إدارة المنصة قبل الموافقة
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 120) {
    return NextResponse.json({ error: "أدخل بريداً إلكترونياً صحيحاً — تتواصل معك إدارة المنصة عبره عند الحاجة." }, { status: 400 });
  }
  if (username === authEnv().adminUsername) {
    return NextResponse.json({ error: "اسم المستخدم غير متاح." }, { status: 409 });
  }

  try {
    // سقف للطلبات المعلقة — يمنع إغراق اللوحة
    if ((await countPendingUsers()) >= 50) {
      return NextResponse.json({ error: "طلبات كثيرة قيد المراجعة حالياً — أعد المحاولة لاحقاً." }, { status: 429 });
    }
    const existing = await findUserByUsername(username);
    if (existing) return NextResponse.json({ error: "اسم المستخدم مستخدم من قبل — اختر اسماً آخر." }, { status: 409 });
    const emailTaken = await findUserByEmail(email);
    if (emailTaken) return NextResponse.json({ error: "هذا البريد مسجل بطلب سابق." }, { status: 409 });
    const passwordHash = await bcrypt.hash(code, 10);
    await createUser({ id: `u_${newSessionId()}`, username, passwordHash, status: "pending", email });
    return NextResponse.json({
      ok: true,
      message: "أُرسل طلبك بنجاح. يُفعَّل حسابك بعد موافقة إدارة المنصة — جرّب الدخول لاحقاً بنفس الاسم والرمز.",
    });
  } catch {
    return NextResponse.json({ error: "تعذر إرسال الطلب — أعد المحاولة." }, { status: 500 });
  }
}
