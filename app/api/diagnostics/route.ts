import { ok } from "@/lib/api";
import { legalKnowledgeEntries, legalSourceDocuments } from "@/lib/legal-knowledge-base";
import { runLegalComplianceReview } from "@/lib/services/legal-compliance-service";

// Known-violating text — Layer 1 must detect at least 2 findings
const TEST_TEXT = "نضمن لك أفضل محامٍ يساعدك على كسب قضيتك";

export async function GET() {
  const total = legalKnowledgeEntries.length;
  const semanticEligible = legalKnowledgeEntries.filter((e) => e.legalReference !== null);
  const excluded = legalKnowledgeEntries.filter((e) => e.legalReference === null);

  const semanticEngineEnabled = process.env.SEMANTIC_ANALYSIS_ENABLED === "true";
  const anthropicApiKeyPresent = !!process.env.ANTHROPIC_API_KEY;
  const semanticEngineActive = semanticEngineEnabled && anthropicApiKeyPresent;

  // Layer 1 functional test — no API key needed
  const layer1Test = runLegalComplianceReview(TEST_TEXT, {}, undefined);

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
    layer1FunctionalTest: {
      testText: TEST_TEXT,
      findingsDetected: layer1Test.findings.length,
      complianceScore: layer1Test.complianceScore,
      passed: layer1Test.findings.length >= 2 ? "✓ Layer 1 يعمل" : "✗ Layer 1 لا يكتشف المخالفات"
    },
    bySource,
    excludedEntries: excluded.map((e) => ({
      id: e.id,
      sourceDocument: e.sourceDocument,
      section: e.section,
      reason: "legalReference: null — يحتاج مرجع رسمي"
    }))
  });
}
