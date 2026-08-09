import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import type { ReviewResult } from "@/lib/types";

// ذاكرة الأحكام المركزية — بقرار مالكة المنصة بعد رصدها حكمين مختلفين للنص الواحد:
// «تحقق بما يحول دون وقوع المشكلة مستقبلاً». النموذج الذكي احتمالي ولا يقبل تثبيت
// الحرارة (Sonnet 5 يرفض غير 1.0)، والنتائج كانت تُحفظ في متصفح المستخدم وحده،
// فكان النص الواحد يأخذ حكماً جديداً مع كل متصفح أو إعادة تشغيل.
// الحل: الحكم الأول لأي نص هو حكمه الدائم — يُحفظ في قاعدة المنصة مقروناً ببصمة
// النص وسياقه، ويُعاد هو نفسه من أي جهاز وأي متصفح ما دام النص لم يتغيّر.
// كل أعطال هذه الطبقة مبتلَعة: فشل الذاكرة لا يمسّ التحليل ولا يمنع النتيجة أبداً.

function db() {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url || url.startsWith("file:")) return null;
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
  await sql`CREATE TABLE IF NOT EXISTS review_verdict_cache (
    text_hash text PRIMARY KEY,
    data jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`;
  ensured = true;
}

export type VerdictContext = {
  kind?: string;
  contentType?: string;
  channel?: string;
  audience?: string;
  purpose?: string;
  reviewStatus?: string;
  sourceDossier?: unknown;
};

// البصمة تشمل النص وكل ما يغيّر الحكم فعلاً — أي اختلاف فيها يعني تحليلاً جديداً مشروعاً
export function verdictKey(text: string, context: VerdictContext): string {
  const basis = JSON.stringify({
    text: text.trim(),
    kind: context.kind ?? "",
    contentType: context.contentType ?? "",
    channel: context.channel ?? "",
    audience: context.audience ?? "",
    purpose: context.purpose ?? "",
    reviewStatus: context.reviewStatus ?? "",
    dossier: context.sourceDossier ? createHash("sha256").update(JSON.stringify(context.sourceDossier)).digest("hex") : ""
  });
  return createHash("sha256").update(basis).digest("hex");
}

export async function getCachedVerdict(key: string): Promise<ReviewResult | null> {
  const sql = db();
  if (!sql) return null;
  try {
    await ensureTable(sql);
    const rows = (await sql`
      SELECT data FROM review_verdict_cache WHERE text_hash = ${key} LIMIT 1
    `) as { data: unknown }[];
    if (!rows.length) return null;
    const review = rows[0].data as ReviewResult;
    // حارس سلامة: لا يُعاد إلا حكم مكتمل فعلاً
    return review && typeof review === "object" && "publicationDecision" in review ? review : null;
  } catch (error) {
    console.error("[verdict-cache:get]", error);
    return null;
  }
}

export async function storeVerdict(key: string, review: ReviewResult): Promise<void> {
  const sql = db();
  if (!sql) return;
  try {
    await ensureTable(sql);
    // الحكم الأول يبقى هو المرجع — لا يُستبدل بتشغيل لاحق
    await sql`
      INSERT INTO review_verdict_cache (text_hash, data)
      VALUES (${key}, ${JSON.stringify(review)}::jsonb)
      ON CONFLICT (text_hash) DO NOTHING
    `;
  } catch (error) {
    console.error("[verdict-cache:store]", error);
  }
}
