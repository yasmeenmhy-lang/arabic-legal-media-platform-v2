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
  // المصادر الموثوقة المجلوبة من البحث الحي (JSON: [{title,url}]) — لعرضها كأدلة
  // مرئية للمستخدم في لوحة «المصادر المعتمدة». عرضٌ صرف لا علاقة له بالفحص.
  sources_json: string | null;
  // إشعار المصارحة: طُلب مصدر ولم يُعثر عليه — يُعرض للمستخدم صراحةً في الواجهة
  source_note: string | null;
  // تكلفة العملية بالدولار (عدّاد داخلي لمالكة المنصة وحدها — لا يُعرض لغيرها)
  cost_usd: number | null;
  // ملخص إنفاذ المادة (١٠) المعقَّم (تسميات الفئات بلا مقتطفات) — يعود للواجهة
  // فيُحفظ مع النسخة في السجل ويظهر تصريحها عند الفتح والمراجعة والتصدير
  enforcement_json: string | null;
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
  await sql`ALTER TABLE content_jobs ADD COLUMN IF NOT EXISTS sources_json text`;
  await sql`ALTER TABLE content_jobs ADD COLUMN IF NOT EXISTS source_note text`;
  await sql`ALTER TABLE content_jobs ADD COLUMN IF NOT EXISTS cost_usd double precision`;
  await sql`ALTER TABLE content_jobs ADD COLUMN IF NOT EXISTS enforcement_json text`;
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

export async function completeJob(sql: Sql, id: string, text: string, truncated: boolean, reviewJson?: string, sourcesJson?: string, sourceNote?: string, costUsd?: number, enforcementJson?: string) {
  await sql`UPDATE content_jobs SET status = 'done', result_text = ${text}, truncated = ${truncated}, review_json = ${reviewJson ?? null}, sources_json = ${sourcesJson ?? null}, source_note = ${sourceNote ?? null}, cost_usd = ${costUsd ?? null}, enforcement_json = ${enforcementJson ?? null}, updated_at = now() WHERE id = ${id}`;
}

export async function failJob(sql: Sql, id: string, error: string, costUsd?: number) {
  await sql`UPDATE content_jobs SET status = 'error', error = ${error}, cost_usd = ${costUsd ?? null}, updated_at = now() WHERE id = ${id}`;
}

export async function getJob(sql: Sql, id: string): Promise<ContentJob | null> {
  await ensureJobsTable(sql);
  // حارس المهمة العالقة (بقرار مالكة المنصة لمنع تعليق الصفحة): مهمة بقيت «pending»
  // أطول من حدّ الخادم (٣٠٠ ثانية) بهامش أمان ⇒ قُتلت في منتصفها ولن تكتمل أبداً.
  // نُعلّمها فاشلة عند أول استعلام بعد ذلك، فتُنهي الواجهة انتظارها بدل التعليق الأبدي.
  await sql`UPDATE content_jobs SET status = 'error', error = ${"تعذّر إكمال الإنشاء في الوقت المتاح — أعد المحاولة."}, updated_at = now() WHERE id = ${id} AND status = 'pending' AND created_at < now() - interval '6 minutes'`;
  const rows = (await sql`SELECT id, status, result_text, partial_text, error, truncated, review_json, sources_json, source_note, cost_usd, enforcement_json FROM content_jobs WHERE id = ${id}`) as ContentJob[];
  return rows[0] ?? null;
}

export async function deleteJob(sql: Sql, id: string) {
  await sql`DELETE FROM content_jobs WHERE id = ${id}`;
}

// ─── السجل الدائم للتكلفة والإنفاذ (بقرار مالكة المنصة النهائي الملزم) ───────
// «أضيف سجلاً دائماً لكل مهمة»: معرف المهمة، وقت التنفيذ، عدد الاستدعاءات،
// النموذج والتوكنز والكاش وتكلفة كل استدعاء (call_log_json)، التكلفة الإجمالية،
// زمن التنفيذ — بحيث تكون التكلفة الفعلية قابلة للقياس بعد الإطلاق.
// ويُلحق به سجل إنفاذ المادة (١٠) — «يجب تسجيل نتيجة الإنفاذ في السجل».
//
// جدول مستقل دائم (لا يُنظَّف): أرقامٌ ومقتطفات رصدٍ قصيرة فقط، لا نص محتوى —
// فمبدأ «لا أرشفة دائمة لأي نص» في جدول المهام أعلاه يبقى قائماً.

let logEnsured = false;
async function ensureJobLogTable(sql: Sql) {
  if (logEnsured) return;
  await sql`
    CREATE TABLE IF NOT EXISTS job_cost_log (
      job_id text PRIMARY KEY,
      kind text NOT NULL,
      executed_at timestamptz NOT NULL DEFAULT now(),
      duration_ms integer,
      calls integer,
      input_tokens integer,
      output_tokens integer,
      cache_read_tokens integer,
      cache_write_tokens integer,
      searches integer,
      cost_usd double precision,
      call_log_json text,
      enforcement_json text
    )
  `;
  logEnsured = true;
}

export async function recordJobLog(sql: Sql, entry: {
  jobId: string;
  kind: "generate" | "reformulate";
  durationMs: number;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  searches: number;
  costUsd: number;
  callLogJson?: string;
  enforcementJson?: string;
}) {
  await ensureJobLogTable(sql);
  // سياسة الاحتفاظ (بقرار المالكة في المراجعة قبل النشر): تسعون يوماً — تنظيف
  // انتهازي عند كل إدراج يمنع النمو غير المحدود، والقياس التشغيلي لا يحتاج أقدم.
  await sql`DELETE FROM job_cost_log WHERE executed_at < now() - interval '90 days'`;
  await sql`
    INSERT INTO job_cost_log (job_id, kind, duration_ms, calls, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens, searches, cost_usd, call_log_json, enforcement_json)
    VALUES (${entry.jobId}, ${entry.kind}, ${entry.durationMs}, ${entry.calls}, ${entry.inputTokens}, ${entry.outputTokens}, ${entry.cacheReadTokens}, ${entry.cacheWriteTokens}, ${entry.searches}, ${entry.costUsd}, ${entry.callLogJson ?? null}, ${entry.enforcementJson ?? null})
    ON CONFLICT (job_id) DO UPDATE SET
      duration_ms = EXCLUDED.duration_ms, calls = EXCLUDED.calls,
      input_tokens = EXCLUDED.input_tokens, output_tokens = EXCLUDED.output_tokens,
      cache_read_tokens = EXCLUDED.cache_read_tokens, cache_write_tokens = EXCLUDED.cache_write_tokens,
      searches = EXCLUDED.searches, cost_usd = EXCLUDED.cost_usd,
      call_log_json = EXCLUDED.call_log_json, enforcement_json = EXCLUDED.enforcement_json
  `;
}
