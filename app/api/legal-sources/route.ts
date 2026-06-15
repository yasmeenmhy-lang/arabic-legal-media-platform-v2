import { ok } from "@/lib/api";
import { getLegalSourceUpdateCenter } from "@/lib/services/legal-source-update-service";

export async function GET() {
  return ok(await getLegalSourceUpdateCenter());
}
