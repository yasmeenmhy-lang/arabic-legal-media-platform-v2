import { ok } from "@/lib/api";
import { legalKnowledgeEntries, legalSourceDocuments } from "@/lib/legal-knowledge-base";
import { runSemanticAnalysis } from "@/lib/services/semantic-analysis-service";

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

  return ok({
    summary: {
      totalEntries: total,
      semanticEligibleEntries: semanticEligible.length,
      excludedEntries: excluded.length,
      anthropicApiKeyPresent
    },
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
