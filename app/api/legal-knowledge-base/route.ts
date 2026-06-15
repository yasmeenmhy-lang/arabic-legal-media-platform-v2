import { ok } from "@/lib/api";
import { getLegalKnowledgeBase } from "@/lib/services/legal-knowledge-service";

export async function GET() {
  return ok(getLegalKnowledgeBase());
}
