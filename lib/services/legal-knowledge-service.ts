import { legalSourceDocuments } from "@/lib/legal-knowledge-base";

export function getLegalKnowledgeBase() {
  return {
    documents: legalSourceDocuments
  };
}
