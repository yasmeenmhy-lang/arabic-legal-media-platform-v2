import { NextResponse } from "next/server";
import { isAuthConfigured, readSessionFromCookies } from "@/lib/access-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// حالة الجلسة الحالية للواجهة — لا يكشف شيئاً عن مستخدمين آخرين أو الإعدادات
export async function GET() {
  const configured = isAuthConfigured();
  if (!configured) return NextResponse.json({ configured: false, authenticated: false });
  const session = readSessionFromCookies();
  if (!session) return NextResponse.json({ configured: true, authenticated: false });
  return NextResponse.json({
    configured: true,
    authenticated: true,
    username: session.username,
    role: session.role,
  });
}
