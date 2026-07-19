import { neon } from "@neondatabase/serverless";

// مهام الإنشاء الخلفية — بقرار مالكة المنصة: «ما يحتاج أبقى بالصفحة عشان إنشاء المحتوى ما يوقف».
// الطلب يُسجَّل مهمة، الخادم يكملها ولو أُغلقت الصفحة، والنتيجة تُسترجع عند العودة.
// خصوصية: الجدول مؤقت بطبيعته — الصف يُحذف فور تسليم النتيجة (إقرار من الواجهة)،
// وأي صف أقدم من يوم يُنظَّف تلقائياً؛ لا أرشفة دائمة لأي نص هنا.

export type ContentJob = {
  id: string;
  status: "pending" | "done" | "error";
  result_text: string | null;
  // مسودة فورية: النص لحظة اكتمال كتابته وقبل انتهاء الفحص — تُعرض للمستخدم فوراً
  partial_text: string | null;
  error: string | null;
  truncated: boolean;
  // تقرير مراجعة كامل (JSON) محسوب من نفس حكم الإنشاء نفسه دون ذكاء ثانٍ مستقل —
  // يوحّد قرار «ممتثل عند الإنشاء» مع تقرير المراجعة المعروض لاحقاً. اختياري تماماً:
  // عمود إضافي صرف لا يمسّ أي عميل قائم لا يقرأه.
  review_json: string | null;
};

export function jobsDb() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  try {
    return neon(url);
  } catch {
    // قيمة غير صالحة — نعود للوضع الاحتياطي (بث مباشر) بدل إسقاط الطلب
    return null;
  }
}

type Sql = NonNullable<ReturnType<typeof jobsDb>>;

let ensured = false;
export async function ensureJobsTable(sql: Sql) {
  if (ensured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS content_jobs (
      id text PRIMARY KEY,
      status text NOT NULL DEFAULT 'pending',
      result_text text,
      partial_text text,
      error text,
      truncated boolean NOT NULL DEFAULT false,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `;
  await sql`ALTER TABLE content_jobs ADD COLUMN IF NOT EXISTS partial_text text`;
  await sql`ALTER TABLE content_jobs ADD COLUMN IF NOT EXISTS review_json text`;
  ensured = true;
}

export async function setJobPartial(sql: Sql, id: string, text: string) {
  await sql`UPDATE content_jobs SET partial_text = ${text}, updated_at = now() WHERE id = ${id}`;
}

export async function createJob(sql: Sql, id: string) {
  await ensureJobsTable(sql);
  await sql`INSERT INTO content_jobs (id, status) VALUES (${id}, 'pending')`;
  // تنظيف انتهازي: أي مهمة أقدم من يوم تُحذف — الجدول ممر تسليم لا مخزن
  await sql`DELETE FROM content_jobs WHERE created_at < now() - interval '1 day'`;
}

export async function completeJob(sql: Sql, id: string, text: string, truncated: boolean, reviewJson?: string) {
  await sql`UPDATE content_jobs SET status = 'done', result_text = ${text}, truncated = ${truncated}, review_json = ${reviewJson ?? null}, updated_at = now() WHERE id = ${id}`;
}

export async function failJob(sql: Sql, id: string, error: string) {
  await sql`UPDATE content_jobs SET status = 'error', error = ${error}, updated_at = now() WHERE id = ${id}`;
}

export async function getJob(sql: Sql, id: string): Promise<ContentJob | null> {
  await ensureJobsTable(sql);
  const rows = (await sql`SELECT id, status, result_text, partial_text, error, truncated, review_json FROM content_jobs WHERE id = ${id}`) as ContentJob[];
  return rows[0] ?? null;
}

export async function deleteJob(sql: Sql, id: string) {
  await sql`DELETE FROM content_jobs WHERE id = ${id}`;
}
