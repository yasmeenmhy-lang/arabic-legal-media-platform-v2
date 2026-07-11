import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

// نظام الدخول الفردي — بقرار مالكة المنصة:
// - بيانات الأدمن لا تُوضع في الكود أبداً: تُهيّأ عبر متغيرات بيئة آمنة مع تجزئة كلمة المرور (bcrypt)
// - الجلسات موقعة بHMAC-SHA256 بسر AUTH_SECRET — أي عبث بالكوكي يبطلها
// - الخصوصية: لا يُسجَّل أي نص أو محتوى يكتبه المستخدم؛ فقط اسم المستخدم وأوقات الدخول
//   والنشاط والصفحة المفتوحة وحالة الجلسة

export const SESSION_COOKIE = "lm_session";
export const SESSION_MAX_AGE_SECONDS = 7 * 24 * 3600; // أسبوع بجلسة منزلقة عبر النبض

export type SessionRole = "admin" | "user";

export interface SessionPayload {
  sessionId: string;
  role: SessionRole;
  username: string;
  expiresAt: number; // epoch ms
}

export function authEnv() {
  return {
    secret: process.env.AUTH_SECRET ?? "",
    adminUsername: process.env.ADMIN_USERNAME ?? "",
    adminPasswordHash: process.env.ADMIN_PASSWORD_HASH ?? "",
    databaseUrl: process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "",
  };
}

// النظام لا يُفعَّل إلا باكتمال المتغيرات الثلاثة — قبلها تعمل المنصة كما هي (سلّم تهيئة آمن)
export function isAuthConfigured(): boolean {
  const env = authEnv();
  return Boolean(env.secret && env.adminUsername && env.adminPasswordHash);
}

export function isDatabaseConfigured(): boolean {
  // Postgres فقط — DATABASE_URL القديم لـSQLite (بيئة التطوير) ليس قاعدة نظام الدخول
  const url = authEnv().databaseUrl;
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

function hmacHex(secret: string, data: string): string {
  return createHmac("sha256", secret).update(data).digest("hex");
}

// صيغة الكوكي: v1|sessionId|role|username-base64|expiresAt|hmac
export function signSession(payload: SessionPayload): string {
  const { secret } = authEnv();
  const usernameB64 = Buffer.from(payload.username, "utf8").toString("base64url");
  const body = `v1|${payload.sessionId}|${payload.role}|${usernameB64}|${payload.expiresAt}`;
  return `${body}|${hmacHex(secret, body)}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const { secret } = authEnv();
  if (!secret) return null;
  const parts = token.split("|");
  if (parts.length !== 6 || parts[0] !== "v1") return null;
  const [v, sessionId, role, usernameB64, expiresAtStr, sig] = parts;
  const body = `${v}|${sessionId}|${role}|${usernameB64}|${expiresAtStr}`;
  const expected = hmacHex(secret, body);
  const sigBuf = Buffer.from(sig, "hex");
  const expBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;
  if (role !== "admin" && role !== "user") return null;
  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return null;
  let username = "";
  try {
    username = Buffer.from(usernameB64, "base64url").toString("utf8");
  } catch {
    return null;
  }
  if (!username) return null;
  return { sessionId, role, username, expiresAt };
}

export function readSessionFromCookies(): SessionPayload | null {
  const token = cookies().get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

export function newSessionId(): string {
  return randomBytes(18).toString("base64url");
}

// جلسة أدمن بلا قاعدة بيانات (مرحلة التهيئة): معرّف بسابقة مميزة حتى يعرفها النبض والإدارة
export const ENV_ADMIN_SESSION_PREFIX = "envadm_";

export function sessionCookieOptions(expiresAt: number) {
  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt),
  };
}
