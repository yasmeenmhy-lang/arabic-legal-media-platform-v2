import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { readSessionFromCookies } from "@/lib/access-auth";

// مزامنة بيانات العمل الأخرى بالحساب عبر الأجهزة — بأمر مالكة المنصة: «لا يضيع أي عمل
// عند تبديل الجهاز». يغطّي هذا المسار المفاتيح غير السجل: الخطة الذكية، تواريخ النشر،
// وأي مفتاح عمل قابل للمزامنة. كل قيمة مقرونة بالحساب وبطابع زمني (الأحدث يغلب).

export const dynamic = "force-dynamic";

function db() {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) return null;
  try { return neon(url); } catch { return null; }
}
type Sql = NonNullable<ReturnType<typeof db>>;

let ensured = false;
async function ensureTable(sql: Sql) {
  if (ensured) return;
  await sql`CREATE TABLE IF NOT EXISTS user_kv (
    username text NOT NULL,
    kkey text NOT NULL,
    value text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (username, kkey)
  )`;
  ensured = true;
}

function sessionUser(): string | null {
  return readSessionFromCookies()?.username ?? null;
}

export async function GET() {
  const username = sessionUser();
  if (!username) return NextResponse.json({ sync: false }, { status: 401 });
  const sql = db();
  if (!sql) return NextResponse.json({ sync: false }, { status: 503 });
  try {
    await ensureTable(sql);
    const rows = (await sql`
      SELECT kkey, value, updated_at FROM user_kv WHERE username = ${username}
    `) as { kkey: string; value: string; updated_at: string }[];
    return NextResponse.json({
      sync: true,
      items: rows.map((r) => ({ key: r.kkey, value: r.value, updatedAt: new Date(r.updated_at).toISOString() })),
    });
  } catch (error) {
    console.error("[user-kv:get]", error);
    return NextResponse.json({ sync: false }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const username = sessionUser();
  if (!username) return NextResponse.json({ sync: false }, { status: 401 });
  const sql = db();
  if (!sql) return NextResponse.json({ sync: false }, { status: 503 });
  let body: { items?: { key?: unknown; value?: unknown; updatedAt?: unknown }[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }
  const items = Array.isArray(body.items) ? body.items : [];
  try {
    await ensureTable(sql);
    for (const item of items) {
      const key = typeof item?.key === "string" ? item.key : "";
      const value = typeof item?.value === "string" ? item.value : "";
      if (!key) continue;
      const updatedAt = typeof item?.updatedAt === "string" && !Number.isNaN(Date.parse(item.updatedAt))
        ? new Date(item.updatedAt).toISOString()
        : new Date().toISOString();
      await sql`
        INSERT INTO user_kv (username, kkey, value, updated_at)
        VALUES (${username}, ${key}, ${value}, ${updatedAt}::timestamptz)
        ON CONFLICT (username, kkey) DO UPDATE
        SET value = EXCLUDED.value, updated_at = EXCLUDED.updated_at
        WHERE user_kv.updated_at <= EXCLUDED.updated_at
      `;
    }
    return NextResponse.json({ sync: true, saved: items.length });
  } catch (error) {
    console.error("[user-kv:post]", error);
    return NextResponse.json({ sync: false }, { status: 503 });
  }
}
