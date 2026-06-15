import { ok } from "@/lib/api";
import { getDashboardOverview } from "@/lib/services/dashboard-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return ok(await getDashboardOverview());
}
