import { ok } from "@/lib/api";
import { getDashboardOverview } from "@/lib/services/dashboard-service";

export async function GET() {
  return ok(await getDashboardOverview());
}
