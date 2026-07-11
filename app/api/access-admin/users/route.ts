import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { isAuthConfigured, isDatabaseConfigured, newSessionId, readSessionFromCookies } from "@/lib/access-auth";
import {
  createUser,
  endAllUserSessions,
  findUserByUsername,
  listUsers,
  setUserActive,
  setUserPasswordHash,
} from "@/lib/access-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// حماية خادمية مزدوجة: middleware يمنع غير الأدمن، وهنا تحقق ثانٍ مستقل — لا يكفي إخفاء الرابط
function requireAdmin() {
  if (!isAuthConfigured()) return { error: NextResponse.json({ error: "النظام غير مهيأ" }, { status: 503 }) };
  const session = readSessionFromCookies();
  if (!session || session.role !== "admin") {
    return { error: NextResponse.json({ error: "غير مصرح" }, { status: 403 }) };
  }
  return { session };
}

export async function GET() {
  const auth = requireAdmin();
  if ("error" in auth) return auth.error;
  if (!isDatabaseConfigured()) return NextResponse.json({ dbReady: false, users: [] });
  try {
    const users = await listUsers();
    return NextResponse.json({ dbReady: true, users });
  } catch {
    return NextResponse.json({ dbReady: false, users: [], dbError: true });
  }
}

const USERNAME_RE = /^[a-zA-Z0-9_؀-ۿ.-]{3,40}$/;

export async function POST(request: Request) {
  const auth = requireAdmin();
  if ("error" in auth) return auth.error;
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "أضيفي قاعدة البيانات أولاً (Neon) لتفعيل إدارة المستخدمين." }, { status: 503 });
  }
  const body = (await request.json().catch(() => null)) as { username?: string; code?: string } | null;
  const username = (body?.username ?? "").trim();
  const code = body?.code ?? "";
  if (!USERNAME_RE.test(username)) {
    return NextResponse.json({ error: "اسم المستخدم: من ٣ إلى ٤٠ حرفاً (عربي أو لاتيني أو أرقام أو . _ -)." }, { status: 400 });
  }
  if (code.length < 8) {
    return NextResponse.json({ error: "رمز الدخول: ٨ أحرف على الأقل." }, { status: 400 });
  }
  try {
    const existing = await findUserByUsername(username);
    if (existing) return NextResponse.json({ error: "اسم المستخدم مستخدم من قبل." }, { status: 409 });
    const passwordHash = await bcrypt.hash(code, 10);
    await createUser({ id: `u_${newSessionId()}`, username, passwordHash });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "تعذر إنشاء المستخدم — تحقق من قاعدة البيانات." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = requireAdmin();
  if ("error" in auth) return auth.error;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "قاعدة البيانات غير مهيأة." }, { status: 503 });
  const body = (await request.json().catch(() => null)) as
    | { userId?: string; action?: "disable" | "enable" | "set-code" | "end-sessions"; code?: string }
    | null;
  const userId = body?.userId ?? "";
  if (!userId) return NextResponse.json({ error: "معرّف المستخدم مطلوب." }, { status: 400 });
  try {
    switch (body?.action) {
      case "disable":
        await setUserActive(userId, false);
        return NextResponse.json({ ok: true, message: "عُطّل المستخدم وأُنهيت جلساته." });
      case "enable":
        await setUserActive(userId, true);
        return NextResponse.json({ ok: true, message: "فُعّل المستخدم." });
      case "set-code": {
        const code = body?.code ?? "";
        if (code.length < 8) return NextResponse.json({ error: "رمز الدخول: ٨ أحرف على الأقل." }, { status: 400 });
        const passwordHash = await bcrypt.hash(code, 10);
        await setUserPasswordHash(userId, passwordHash, true);
        return NextResponse.json({ ok: true, message: "غُيّر الرمز وأُنهيت الجلسات القائمة." });
      }
      case "end-sessions":
        await endAllUserSessions(userId);
        return NextResponse.json({ ok: true, message: "أُنهيت كل جلسات المستخدم." });
      default:
        return NextResponse.json({ error: "إجراء غير معروف." }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "تعذر تنفيذ الإجراء — تحقق من قاعدة البيانات." }, { status: 500 });
  }
}
