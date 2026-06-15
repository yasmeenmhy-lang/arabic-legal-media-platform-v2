import { ok } from "@/lib/api";
import { getLegalSourceUpdateCenter } from "@/lib/services/legal-source-update-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return ok(await getLegalSourceUpdateCenter());
}
