import { ok } from "@/lib/api";
import { getAggregatedSectorAnalytics } from "@/lib/services/analytics-service";

export async function GET() {
  return ok(getAggregatedSectorAnalytics());
}
