import { neon } from "@neondatabase/serverless";
import { authEnv } from "@/lib/access-auth";

// تخزين نظام الدخول — جداول مستقلة تماماً عن أي بنية قائمة (نضيف ولا نحذف):
// access_users: المستخدمون ورموزهم المجزأة وحالتهم
// access_sessions: الجلسات — اسم المستخدم، وقت الدخول، آخر نشاط، الصفحة المفتوحة، حالة الجلسة
// الخصوصية بقرار مالكة المنصة: لا يُخزَّن أي نص أو محتوى يكتبه المستخدم في هذه الجداول إطلاقاً

export interface AccessUser {
  id: string;
  username: string;
  role: "admin" | "user";
  is_active: boolean;
  // بقرارها: التسجيل الذاتي متاح لكن الدخول لا يعمل إلا بعد موافقتها — pending حتى تعتمد
  status: "active" | "pending";
  created_at: string;
  last_login_at: string | null;
  login_count: number;
}

export interface AccessSession {
  id: string;
  user_id: string;
  username: string;
  created_at: string;
  last_seen_at: string;
  current_page: string | null;
  ended_at: string | null;
  ended_by: string | null;
}

function sql() {
  const { databaseUrl } = authEnv();
  if (!databaseUrl) throw new Error("DATABASE_NOT_CONFIGURED");
  return neon(databaseUrl);
}

let tablesReady = false;

export async function ensureAccessTables() {
  if (tablesReady) return;
  const q = sql();
  await q`CREATE TABLE IF NOT EXISTS access_users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ,
    login_count INTEGER NOT NULL DEFAULT 0
  )`;
  await q`CREATE TABLE IF NOT EXISTS access_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    current_page TEXT,
    ended_at TIMESTAMPTZ,
    ended_by TEXT
  )`;
  await q`CREATE INDEX IF NOT EXISTS access_sessions_user_idx ON access_sessions (user_id, created_at DESC)`;
  // التسجيل الذاتي بموافقة الأدمن: عمود الحالة يُضاف للجداول القائمة دون مساس ببياناتها
  await q`ALTER TABLE access_users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'`;
  tablesReady = true;
}

export async function findUserByUsername(username: string): Promise<(AccessUser & { password_hash: string }) | null> {
  await ensureAccessTables();
  const rows = await sql()`SELECT * FROM access_users WHERE username = ${username} LIMIT 1`;
  return (rows[0] as (AccessUser & { password_hash: string }) | undefined) ?? null;
}

export async function listUsers(): Promise<AccessUser[]> {
  await ensureAccessTables();
  const rows = await sql()`
    SELECT id, username, role, is_active, status, created_at, last_login_at, login_count
    FROM access_users ORDER BY (status = 'pending') DESC, created_at DESC`;
  return rows as AccessUser[];
}

export async function createUser(input: { id: string; username: string; passwordHash: string; role?: "admin" | "user"; status?: "active" | "pending" }) {
  await ensureAccessTables();
  await sql()`INSERT INTO access_users (id, username, password_hash, role, status, is_active)
    VALUES (${input.id}, ${input.username}, ${input.passwordHash}, ${input.role ?? "user"}, ${input.status ?? "active"}, ${(input.status ?? "active") === "active"})`;
}

// اعتماد طلب تسجيل ذاتي: يتحول الحساب نشطاً ويستطيع صاحبه الدخول برمزه الذي اختاره
export async function approveUser(userId: string) {
  await ensureAccessTables();
  await sql()`UPDATE access_users SET status = 'active', is_active = TRUE WHERE id = ${userId}`;
}

// رفض الطلب: يُحذف نهائياً ويتحرر الاسم
export async function deletePendingUser(userId: string) {
  await ensureAccessTables();
  await sql()`DELETE FROM access_users WHERE id = ${userId} AND status = 'pending'`;
}

export async function countPendingUsers(): Promise<number> {
  await ensureAccessTables();
  const rows = await sql()`SELECT COUNT(*)::int AS n FROM access_users WHERE status = 'pending'`;
  return (rows[0] as { n: number } | undefined)?.n ?? 0;
}

export async function setUserActive(userId: string, isActive: boolean) {
  await ensureAccessTables();
  await sql()`UPDATE access_users SET is_active = ${isActive} WHERE id = ${userId}`;
  if (!isActive) {
    // التعطيل يُنهي كل جلسات المستخدم فوراً
    await sql()`UPDATE access_sessions SET ended_at = now(), ended_by = 'admin'
      WHERE user_id = ${userId} AND ended_at IS NULL`;
  }
}

export async function setUserPasswordHash(userId: string, passwordHash: string, endSessions: boolean) {
  await ensureAccessTables();
  await sql()`UPDATE access_users SET password_hash = ${passwordHash} WHERE id = ${userId}`;
  if (endSessions) {
    await sql()`UPDATE access_sessions SET ended_at = now(), ended_by = 'admin'
      WHERE user_id = ${userId} AND ended_at IS NULL`;
  }
}

export async function recordLogin(userId: string) {
  await ensureAccessTables();
  await sql()`UPDATE access_users SET last_login_at = now(), login_count = login_count + 1 WHERE id = ${userId}`;
}

export async function createSessionRow(input: { id: string; userId: string; username: string; page?: string }) {
  await ensureAccessTables();
  await sql()`INSERT INTO access_sessions (id, user_id, username, current_page)
    VALUES (${input.id}, ${input.userId}, ${input.username}, ${input.page ?? null})`;
}

// نبض النشاط: يحدّث آخر نشاط والصفحة المفتوحة فقط — يعيد false إن كانت الجلسة منتهية أو المستخدم معطلاً
export async function touchSession(sessionId: string, page: string): Promise<boolean> {
  await ensureAccessTables();
  const rows = await sql()`
    UPDATE access_sessions s SET last_seen_at = now(), current_page = ${page}
    FROM access_users u
    WHERE s.id = ${sessionId} AND s.ended_at IS NULL AND u.id = s.user_id AND u.is_active = TRUE
    RETURNING s.id`;
  return rows.length > 0;
}

export async function endSession(sessionId: string, endedBy: "user" | "admin") {
  await ensureAccessTables();
  await sql()`UPDATE access_sessions SET ended_at = now(), ended_by = ${endedBy}
    WHERE id = ${sessionId} AND ended_at IS NULL`;
}

export async function endAllUserSessions(userId: string) {
  await ensureAccessTables();
  await sql()`UPDATE access_sessions SET ended_at = now(), ended_by = 'admin'
    WHERE user_id = ${userId} AND ended_at IS NULL`;
}

export async function listSessions(limit = 80): Promise<AccessSession[]> {
  await ensureAccessTables();
  const rows = await sql()`
    SELECT id, user_id, username, created_at, last_seen_at, current_page, ended_at, ended_by
    FROM access_sessions ORDER BY created_at DESC LIMIT ${limit}`;
  return rows as AccessSession[];
}

export async function isSessionAlive(sessionId: string): Promise<boolean> {
  await ensureAccessTables();
  const rows = await sql()`
    SELECT s.id FROM access_sessions s
    JOIN access_users u ON u.id = s.user_id
    WHERE s.id = ${sessionId} AND s.ended_at IS NULL AND u.is_active = TRUE LIMIT 1`;
  return rows.length > 0;
}
