import { ok } from "@/lib/api";
import { getRecommendations } from "@/lib/services/recommendation-service";

export async function GET() {
  return ok(getRecommendations());
}
