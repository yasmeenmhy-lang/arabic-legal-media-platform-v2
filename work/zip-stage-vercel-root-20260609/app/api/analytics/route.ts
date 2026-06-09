import { ok } from "@/lib/api";
import { getDashboardAnalytics } from "@/lib/services/analytics-service";

export async function GET() {
  return ok(getDashboardAnalytics());
}
