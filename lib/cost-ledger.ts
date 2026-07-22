import { neon } from "@neondatabase/serverless";

// ─────────────────────────────────────────────────────────────────────────────
// دفتر الرصيد الداخلي (بقرار مالكة المنصة — لها وحدها): المزوّد لا يوفر نقطة
// استعلام عن الرصيد المتبقي برمجياً، فتحتفظ المنصة بدفتر خاص: المالكة تُدخل
// الرصيد عند الشحن، وكل عملية تخصم تكلفتها المحسوبة. تقديرٌ محاسبي دقيق —
// وفاتورة Console تبقى المرجع النهائي.
// ─────────────────────────────────────────────────────────────────────────────

export function ledgerDb() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  try { return neon(url); } catch { return null; }
}

type Sql = NonNullable<ReturnType<typeof ledgerDb>>;

let ensured = false;
async function ensureTable(sql: Sql) {
  if (ensured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS platform_credit (
      id integer PRIMARY KEY DEFAULT 1,
      balance_usd double precision NOT NULL DEFAULT 0,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`INSERT INTO platform_credit (id, balance_usd) VALUES (1, 0) ON CONFLICT (id) DO NOTHING`;
  ensured = true;
}

export async function getBalanceUsd(sql: Sql): Promise<number> {
  await ensureTable(sql);
  const rows = (await sql`SELECT balance_usd FROM platform_credit WHERE id = 1`) as { balance_usd: number }[];
  return rows[0]?.balance_usd ?? 0;
}

export async function setBalanceUsd(sql: Sql, usd: number): Promise<void> {
  await ensureTable(sql);
  await sql`UPDATE platform_credit SET balance_usd = ${usd}, updated_at = now() WHERE id = 1`;
}

// خصم تكلفة عملية — ذرّي على مستوى الصف، ويرجع الرصيد بعد الخصم
export async function deductUsd(sql: Sql, usd: number): Promise<number> {
  await ensureTable(sql);
  const rows = (await sql`
    UPDATE platform_credit SET balance_usd = balance_usd - ${usd}, updated_at = now()
    WHERE id = 1 RETURNING balance_usd
  `) as { balance_usd: number }[];
  return rows[0]?.balance_usd ?? 0;
}
