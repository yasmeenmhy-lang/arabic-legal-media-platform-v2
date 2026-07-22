import { neon } from "@neondatabase/serverless";

// ─────────────────────────────────────────────────────────────────────────────
// سجلّ الإقرار قبل النشر (بقرار مالكة المنصة) — سند إثباتي دائم يحمي المنصة قانونياً.
// خلافاً لجدول المهام المؤقت: هذا الجدول **لا يُحذف تلقائياً** — واقعة الإقرار دليلٌ
// يُحفظ: مَن أقرّ (الحساب المُوثَّق من الجلسة، لا قيمة يرسلها العميل)، ومتى، وعلى أي
// محتوى ومستوى مخاطر، وبأيّ نصّ إقرار حرفي. لا يمسّ منطق الفحص إطلاقاً.
// ─────────────────────────────────────────────────────────────────────────────

export type AcknowledgmentRecord = {
  id: string;
  username: string | null;
  content_id: string | null;
  version: number | null;
  risk_level: string | null;
  tier: string | null;
  affected_parties: string | null;
  ack_text: string;
  created_at: string;
};

export function ackDb() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  try {
    return neon(url);
  } catch {
    return null;
  }
}

type Sql = NonNullable<ReturnType<typeof ackDb>>;

let ensured = false;
async function ensureTable(sql: Sql) {
  if (ensured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS publish_acknowledgments (
      id text PRIMARY KEY,
      username text,
      content_id text,
      version integer,
      risk_level text,
      tier text,
      affected_parties text,
      ack_text text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  ensured = true;
}

export async function recordAcknowledgment(
  sql: Sql,
  rec: {
    id: string;
    username: string | null;
    contentId: string | null;
    version: number | null;
    riskLevel: string | null;
    tier: string | null;
    affectedParties: string | null;
    ackText: string;
  }
) {
  await ensureTable(sql);
  await sql`
    INSERT INTO publish_acknowledgments
      (id, username, content_id, version, risk_level, tier, affected_parties, ack_text)
    VALUES
      (${rec.id}, ${rec.username}, ${rec.contentId}, ${rec.version}, ${rec.riskLevel}, ${rec.tier}, ${rec.affectedParties}, ${rec.ackText})
  `;
}
