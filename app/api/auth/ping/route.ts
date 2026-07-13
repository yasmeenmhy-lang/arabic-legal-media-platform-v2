import { NextResponse } from "next/server";
import {
  ENV_ADMIN_SESSION_PREFIX,
  isAuthConfigured,
  isDatabaseConfigured,
  readSessionFromCookies,
} from "@/lib/access-auth";
import { touchSession, withDbTimeout } from "@/lib/access-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// نبض النشاط — الخصوصية بقرار مالكة المنصة: يُسجَّل مسار الصفحة فقط (بلا معاملات استعلام)
// ولا يُرسَل أو يُخزَّن أي نص أو محتوى يكتبه المستخدم إطلاقاً
export async function POST(request: Request) {
  if (!isAuthConfigured()) return NextResponse.json({ ok: true });
  const session = readSessionFromCookies();
  if (!session) return NextResponse.json({ error: "انتهت الجلسة" }, { status: 401 });

  // جلسة أدمن بلا قاعدة بيانات (مرحلة التهيئة): صالحة بتوقيعها
  if (session.sessionId.startsWith(ENV_ADMIN_SESSION_PREFIX) || !isDatabaseConfigured()) {
    return NextResponse.json({ ok: true });
  }

  const body = (await request.json().catch(() => null)) as { page?: string } | null;
  const page = (body?.page ?? "/").split("?")[0].slice(0, 120);
  try {
    const alive = await withDbTimeout(touchSession(session.sessionId, page));
    if (!alive) return NextResponse.json({ error: "أُنهيت الجلسة" }, { status: 401 });
    return NextResponse.json({ ok: true });
  } catch {
    // تعطل مؤقت في قاعدة البيانات لا يطرد المستخدم — التوقيع ما زال صحيحاً
    return NextResponse.json({ ok: true });
  }
}
