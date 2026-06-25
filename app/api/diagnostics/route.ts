import { ok } from "@/lib/api";
import { legalKnowledgeEntries, legalSourceDocuments } from "@/lib/legal-knowledge-base";
import { runLegalComplianceReview } from "@/lib/services/legal-compliance-service";
import { runSemanticAnalysis } from "@/lib/services/semantic-analysis-service";

// نص مضمون الانتهاك — يجب أن يرصده كلا المحركَين
const TEST_TEXT = "نضمن لك أفضل محامٍ يساعدك على كسب قضيتك";

export async function GET() {
  const total = legalKnowledgeEntries.length;
  const semanticEligible = legalKnowledgeEntries.filter((e) => e.legalReference !== null);
  const excluded = legalKnowledgeEntries.filter((e) => e.legalReference === null);

  const semanticEngineEnabled = process.env.SEMANTIC_ANALYSIS_ENABLED === "true";
  const anthropicApiKeyPresent = !!process.env.ANTHROPIC_API_KEY;
  const semanticEngineActive = semanticEngineEnabled && anthropicApiKeyPresent;

  // اختبار Layer 1 — لا يحتاج API key
  const layer1Result = runLegalComplianceReview(TEST_TEXT, {}, undefined);

  // اختبار Layer 2 — يستدعي Claude فعلاً (إذا كان المفتاح موجوداً)
  let layer2Result: {
    ran: boolean;
    findingsDetected: number;
    passed: string;
    error?: string;
    durationMs?: number;
  };

  if (semanticEngineActive) {
    const start = Date.now();
    try {
      const findings = await runSemanticAnalysis(TEST_TEXT, { contentType: "إعلان مهني", channel: "LinkedIn" }, "advertisement");
      const duration = Date.now() - start;
      layer2Result = {
        ran: true,
        findingsDetected: findings.length,
        durationMs: duration,
        passed: findings.length >= 1 ? "✓ Layer 2 (Claude) يعمل ويرصد المخالفات" : "⚠ Layer 2 يعمل لكن لم يرصد مخالفات على النص التجريبي"
      };
    } catch (err) {
      layer2Result = {
        ran: false,
        findingsDetected: 0,
        passed: "✗ Layer 2 فشل",
        error: err instanceof Error ? err.message : String(err)
      };
    }
  } else {
    layer2Result = {
      ran: false,
      findingsDetected: 0,
      passed: "✗ Layer 2 معطّل — SEMANTIC_ANALYSIS_ENABLED أو ANTHROPIC_API_KEY غير موجود"
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
      semanticEngineEnabled,
      anthropicApiKeyPresent,
      semanticEngineActive
    },
    testText: TEST_TEXT,
    layer1Test: {
      findingsDetected: layer1Result.findings.length,
      complianceScore: layer1Result.complianceScore,
      passed: layer1Result.findings.length >= 2 ? "✓ يعمل" : "✗ لا يكتشف المخالفات"
    },
    layer2Test: layer2Result,
    bySource,
    excludedEntries: excluded.map((e) => ({
      id: e.id,
      sourceDocument: e.sourceDocument,
      section: e.section,
      reason: "legalReference: null"
    }))
  });
}
