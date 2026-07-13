import { NextResponse } from "next/server";
import { isAuthConfigured, isDatabaseConfigured, readSessionFromCookies } from "@/lib/access-auth";
import { endSession, listSessions, withDbTimeout } from "@/lib/access-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function requireAdmin() {
  if (!isAuthConfigured()) return { error: NextResponse.json({ error: "النظام غير مهيأ" }, { status: 503 }) };
  const session = readSessionFromCookies();
  if (!session || session.role !== "admin") {
    return { error: NextResponse.json({ error: "غير مصرح" }, { status: 403 }) };
  }
  return { session };
}

// سجل الدخول والنشاط — بالحد الذي قررته مالكة المنصة فقط:
// اسم المستخدم، وقت الدخول، آخر نشاط، الصفحة المفتوحة، حالة الجلسة. لا نصوص ولا محتوى.
export async function GET() {
  const auth = requireAdmin();
  if ("error" in auth) return auth.error;
  if (!isDatabaseConfigured()) return NextResponse.json({ dbReady: false, sessions: [] });
  try {
    const sessions = await withDbTimeout(listSessions());
    return NextResponse.json({ dbReady: true, sessions });
  } catch {
    return NextResponse.json({ dbReady: false, sessions: [], dbError: true });
  }
}

export async function POST(request: Request) {
  const auth = requireAdmin();
  if ("error" in auth) return auth.error;
  if (!isDatabaseConfigured()) return NextResponse.json({ error: "قاعدة البيانات غير مهيأة." }, { status: 503 });
  const body = (await request.json().catch(() => null)) as { sessionId?: string } | null;
  if (!body?.sessionId) return NextResponse.json({ error: "معرّف الجلسة مطلوب." }, { status: 400 });
  try {
    await endSession(body.sessionId, "admin");
    return NextResponse.json({ ok: true, message: "أُنهيت الجلسة — سيُخرَج صاحبها عند أول نشاط تالٍ." });
  } catch {
    return NextResponse.json({ error: "تعذر إنهاء الجلسة." }, { status: 500 });
  }
}
