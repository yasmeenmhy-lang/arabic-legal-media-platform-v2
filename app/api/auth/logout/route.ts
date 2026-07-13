import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ENV_ADMIN_SESSION_PREFIX,
  SESSION_COOKIE,
  isDatabaseConfigured,
  readSessionFromCookies,
} from "@/lib/access-auth";
import { endSession } from "@/lib/access-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function performLogout() {
  const session = readSessionFromCookies();
  if (session && isDatabaseConfigured() && !session.sessionId.startsWith(ENV_ADMIN_SESSION_PREFIX)) {
    await endSession(session.sessionId, "user").catch(() => undefined);
  }
  cookies().delete(SESSION_COOKIE);
}

export async function POST() {
  await performLogout();
  return NextResponse.json({ ok: true });
}

// خروج مضمون من أي جهاز: فتح الرابط /api/auth/logout مباشرة يسجل الخروج ويعيد لصفحة الدخول
export async function GET(request: Request) {
  await performLogout();
  return NextResponse.redirect(new URL("/login", request.url));
}
