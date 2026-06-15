import { legalKnowledgeEntries, legalSourceDocuments } from "@/lib/legal-knowledge-base";

export function getLegalKnowledgeBase() {
  return {
    documents: legalSourceDocuments,
    entries: legalKnowledgeEntries
  };
}

export function getKnowledgeEntriesByRiskCategory(riskCategory: string) {
  return legalKnowledgeEntries.filter((entry) => entry.riskCategories.includes(riskCategory));
}

export function getKnowledgeEntry(id: string) {
  return legalKnowledgeEntries.find((entry) => entry.id === id);
}
