import { neon } from "@neondatabase/serverless";
import { ok } from "@/lib/api";
import { legalSourceDocuments } from "@/lib/legal-knowledge-base";
import { OFFICIAL_CORPUS } from "@/lib/legal-official-corpus";

// فحص صحة قاعدة بيانات المزامنة (بلا كشف أي سرّ) — يوضّح سبب عدم ظهور السجل عبر الأجهزة:
// هل DATABASE_URL موجود؟ وهل صيغته Postgres صالحة لـ neon؟ وهل يصل الاستعلام فعلاً؟
async function databaseHealth() {
  const raw = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "";
  const scheme = raw.includes("://") ? raw.slice(0, raw.indexOf("://")).toLowerCase() : (raw ? "بلا-مخطط" : "غير-موجود");
  const isPostgres = scheme === "postgres" || scheme === "postgresql";
  const result: {
    present: boolean;
    scheme: string;
    looksPostgres: boolean;
    neonUsable: boolean;
    queryOk: boolean;
    syncRows: number | null;
    verdict: string;
    error?: string;
  } = { present: Boolean(raw), scheme, looksPostgres: isPostgres, neonUsable: false, queryOk: false, syncRows: null, verdict: "" };

  if (!raw) { result.verdict = "✗ لا يوجد DATABASE_URL — المزامنة عبر الأجهزة معطّلة"; return result; }
  let sql: ReturnType<typeof neon> | null = null;
  try { sql = neon(raw); result.neonUsable = true; }
  catch (e) { result.error = e instanceof Error ? e.message : String(e); result.verdict = "✗ DATABASE_URL ليس نص اتصال Postgres صالحاً — المزامنة معطّلة"; return result; }
  try {
    const rows = (await sql`SELECT count(*)::int AS n FROM user_content_records`) as { n: number }[];
    result.queryOk = true;
    result.syncRows = rows?.[0]?.n ?? 0;
    result.verdict = "✓ قاعدة المزامنة متصلة وتعمل";
  } catch (e) {
    // جدول غير موجود بعد يُنشأ تلقائياً عند أول مزامنة — نميّزه عن فشل الاتصال
    const msg = e instanceof Error ? e.message : String(e);
    result.error = msg;
    result.queryOk = false;
    result.verdict = /relation .* does not exist|user_content_records/i.test(msg)
      ? "⚠ الاتصال يعمل والجدول لم يُنشأ بعد (سيُنشأ عند أول مزامنة)"
      : "✗ تعذّر الاستعلام من قاعدة البيانات — المزامنة معطّلة";
  }
  return result;
}

export async function GET() {
  const anthropicApiKeyPresent = !!process.env.ANTHROPIC_API_KEY;

  // ★ لا يستدعي هذا الفحص النموذج إطلاقاً (بقرار مالكة المنصة): كان يمرّر نصاً
  // تجريبياً على المحرك كاملاً فيصرف رصيداً في كل فتحة للرابط، وهو رابط لا تربط
  // له صفحة. فحصُ الجاهزية يكفي: المفتاح والمتن وقاعدة البيانات.
  const engineReady = {
    apiKeyPresent: anthropicApiKeyPresent,
    officialCorpusItems: OFFICIAL_CORPUS.length,
    verdict: !anthropicApiKeyPresent
      ? "✗ ANTHROPIC_API_KEY غير موجود — المحرك لا يعمل"
      : OFFICIAL_CORPUS.length === 0
        ? "✗ المتن الرسمي فارغ — الطبقة الأولى بلا مرجع تحكم به"
        : "✓ المفتاح موجود والمتن الرسمي محمّل — المحرك جاهز"
  };

  const database = await databaseHealth();

  return ok({
    summary: {
      officialCorpusItems: OFFICIAL_CORPUS.length,
      sourceDocuments: legalSourceDocuments.length,
      anthropicApiKeyPresent
    },
    database,
    engineReady
  });
}
