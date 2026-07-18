import { neon } from "@neondatabase/serverless";
import { ok } from "@/lib/api";
import { legalKnowledgeEntries, legalSourceDocuments } from "@/lib/legal-knowledge-base";
import { runSemanticAnalysis } from "@/lib/services/semantic-analysis-service";

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

// نص مضمون الانتهاك — يجب أن يرصده كلا المحركَين
const TEST_TEXT = "نضمن لك أفضل محامٍ يساعدك على كسب قضيتك";

export async function GET() {
  const total = legalKnowledgeEntries.length;
  const semanticEligible = legalKnowledgeEntries.filter((e) => e.legalReference !== null);
  const excluded = legalKnowledgeEntries.filter((e) => e.legalReference === null);

  const anthropicApiKeyPresent = !!process.env.ANTHROPIC_API_KEY;

  // اختبار المحرك الدلالي — يستدعي Claude فعلاً
  let engineTest: {
    ran: boolean;
    findingsDetected: number;
    passed: string;
    error?: string;
    durationMs?: number;
  };

  if (anthropicApiKeyPresent) {
    const start = Date.now();
    try {
      const semanticResult = await runSemanticAnalysis(TEST_TEXT, { contentType: "إعلان مهني", channel: "LinkedIn" }, "advertisement");
      const duration = Date.now() - start;
      engineTest = {
        ran: true,
        findingsDetected: semanticResult.findings.length,
        durationMs: duration,
        passed: semanticResult.findings.length >= 1 ? "✓ المحرك الدلالي (Claude) يعمل ويرصد المخالفات" : "⚠ المحرك يعمل لكن لم يرصد مخالفات على النص التجريبي"
      };
    } catch (err) {
      engineTest = {
        ran: false,
        findingsDetected: 0,
        passed: "✗ المحرك الدلالي فشل",
        error: err instanceof Error ? err.message : String(err)
      };
    }
  } else {
    engineTest = {
      ran: false,
      findingsDetected: 0,
      passed: "✗ ANTHROPIC_API_KEY غير موجود"
    };
  }

  const bySource = legalSourceDocuments.map((doc) => {
    const entries = legalKnowledgeEntries.filter((e) => e.sourceDocumentId === doc.id);
    const eligible = entries.filter((e) => e.legalReference !== null);
    return {
      sourceDocument: doc.title,
      totalEntries: entries.length,
      semanticEligible: eligible.length,
      excludedFromAnalysis: entries.length - eligible.length
    };
  });

  const database = await databaseHealth();

  return ok({
    summary: {
      totalEntries: total,
      semanticEligibleEntries: semanticEligible.length,
      excludedEntries: excluded.length,
      anthropicApiKeyPresent
    },
    database,
    testText: TEST_TEXT,
    engineTest,
    bySource,
    excludedEntries: excluded.map((e) => ({
      id: e.id,
      sourceDocument: e.sourceDocument,
      section: e.section,
      reason: "legalReference: null"
    }))
  });
}
