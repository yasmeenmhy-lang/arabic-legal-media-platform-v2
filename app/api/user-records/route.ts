import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { readSessionFromCookies } from "@/lib/access-auth";

// مزامنة سجل المحتوى بالحساب — بأمر مالكة المنصة: «نفس الحساب يرى نفس السجل على أي جهاز».
// السجل يُحفظ في قاعدة بيانات المنصة مقروناً باسم الحساب، وكل جهاز يدمج ويرفع تلقائياً.
// الخصوصية كما هي: البيانات في قاعدة المنصة الخاصة فقط، معزولة لكل حساب، ولا تطّلع عليها أي جهة.

export const dynamic = "force-dynamic";

function db() {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) return null;
  try {
    return neon(url);
  } catch {
    return null;
  }
}
type Sql = NonNullable<ReturnType<typeof db>>;

let ensured = false;
async function ensureTable(sql: Sql) {
  if (ensured) return;
  await sql`CREATE TABLE IF NOT EXISTS user_content_records (
    username text NOT NULL,
    record_id text NOT NULL,
    data jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted boolean NOT NULL DEFAULT false,
    PRIMARY KEY (username, record_id)
  )`;
  ensured = true;
}

function sessionUser(): string | null {
  const session = readSessionFromCookies();
  return session?.username ?? null;
}

export async function GET() {
  const username = sessionUser();
  if (!username) return NextResponse.json({ sync: false }, { status: 401 });
  const sql = db();
  if (!sql) return NextResponse.json({ sync: false }, { status: 503 });
  try {
    await ensureTable(sql);
    const rows = (await sql`
      SELECT record_id, data, deleted FROM user_content_records WHERE username = ${username}
    `) as { record_id: string; data: unknown; deleted: boolean }[];
    return NextResponse.json({
      sync: true,
      records: rows.filter((r) => !r.deleted).map((r) => r.data),
      deletedIds: rows.filter((r) => r.deleted).map((r) => r.record_id),
    });
  } catch (error) {
    console.error("[user-records:get]", error);
    return NextResponse.json({ sync: false }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const username = sessionUser();
  if (!username) return NextResponse.json({ sync: false }, { status: 401 });
  const sql = db();
  if (!sql) return NextResponse.json({ sync: false }, { status: 503 });
  let body: { records?: unknown[] };
  try {
    body = (await request.json()) as { records?: unknown[] };
  } catch {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }
  const records = Array.isArray(body.records) ? body.records : [];
  try {
    await ensureTable(sql);
    for (const record of records) {
      const r = record as { id?: unknown; updatedAt?: unknown };
      const id = typeof r?.id === "string" ? r.id : "";
      if (!id) continue;
      const updatedAt = typeof r?.updatedAt === "string" && !Number.isNaN(Date.parse(r.updatedAt))
        ? new Date(r.updatedAt).toISOString()
        : new Date().toISOString();
      // الأحدث يغلب: لا يُستبدل صف أحدث بنسخة أقدم قادمة من جهاز متأخر المزامنة
      await sql`
        INSERT INTO user_content_records (username, record_id, data, updated_at, deleted)
        VALUES (${username}, ${id}, ${JSON.stringify(record)}::jsonb, ${updatedAt}::timestamptz, false)
        ON CONFLICT (username, record_id) DO UPDATE
        SET data = EXCLUDED.data, updated_at = EXCLUDED.updated_at, deleted = false
        WHERE user_content_records.updated_at <= EXCLUDED.updated_at OR user_content_records.deleted = true
      `;
    }
    return NextResponse.json({ sync: true, saved: records.length });
  } catch (error) {
    console.error("[user-records:post]", error);
    return NextResponse.json({ sync: false }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const username = sessionUser();
  if (!username) return NextResponse.json({ sync: false }, { status: 401 });
  const sql = db();
  if (!sql) return NextResponse.json({ sync: false }, { status: 503 });
  const id = new URL(request.url).searchParams.get("id") ?? "";
  if (!id) return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  try {
    await ensureTable(sql);
    // شاهد حذف: يبقى الصف موسوماً حتى تعرف بقية الأجهزة أن السجل حُذف عمداً
    await sql`
      INSERT INTO user_content_records (username, record_id, data, updated_at, deleted)
      VALUES (${username}, ${id}, '{}'::jsonb, now(), true)
      ON CONFLICT (username, record_id) DO UPDATE
      SET deleted = true, data = '{}'::jsonb, updated_at = now()
    `;
    return NextResponse.json({ sync: true });
  } catch (error) {
    console.error("[user-records:delete]", error);
    return NextResponse.json({ sync: false }, { status: 503 });
  }
}
