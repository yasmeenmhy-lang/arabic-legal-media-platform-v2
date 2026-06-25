import { ok } from "@/lib/api";
import { legalKnowledgeEntries, legalSourceDocuments } from "@/lib/legal-knowledge-base";

export async function GET() {
  const total = legalKnowledgeEntries.length;
  const semanticEligible = legalKnowledgeEntries.filter((e) => e.legalReference !== null);
  const excluded = legalKnowledgeEntries.filter((e) => e.legalReference === null);

  const bySource = legalSourceDocuments.map((doc) => {
    const entries = legalKnowledgeEntries.filter((e) => e.sourceDocumentId === doc.id);
    const eligible = entries.filter((e) => e.legalReference !== null);
    return {
      sourceDocument: doc.title,
      total: entries.length,
      semanticEligible: eligible.length,
      excludedFromAnalysis: entries.length - eligible.length,
      entries: entries.map((e) => ({
        id: e.id,
        legalReference: e.legalReference,
        articleTitle: e.articleTitle ?? e.section,
        semanticEnabled: e.legalReference !== null
      }))
    };
  });

  return ok({
    summary: {
      totalEntries: total,
      semanticEligibleEntries: semanticEligible.length,
      excludedEntries: excluded.length,
      semanticEngineEnabled: process.env.SEMANTIC_ANALYSIS_ENABLED === "true",
      anthropicApiKeyPresent: !!process.env.ANTHROPIC_API_KEY,
      semanticEngineActive:
        process.env.SEMANTIC_ANALYSIS_ENABLED === "true" && !!process.env.ANTHROPIC_API_KEY
    },
    bySource,
    excludedEntries: excluded.map((e) => ({
      id: e.id,
      sourceDocument: e.sourceDocument,
      section: e.section,
      reason: "legalReference is null — pending official reference"
    }))
  });
}
