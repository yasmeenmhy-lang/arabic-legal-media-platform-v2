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

export async function POST() {
  const session = readSessionFromCookies();
  if (session && isDatabaseConfigured() && !session.sessionId.startsWith(ENV_ADMIN_SESSION_PREFIX)) {
    await endSession(session.sessionId, "user").catch(() => undefined);
  }
  cookies().delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
