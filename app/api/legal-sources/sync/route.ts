import { z } from "zod";
import { ok } from "@/lib/api";
import { runManualSourceSync } from "@/lib/services/legal-source-update-service";

const schema = z.object({
  sourceDocumentId: z.string().optional(),
  observedSourceHash: z.string().optional(),
  observedVersion: z.string().optional(),
  actor: z.string().optional()
});

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = schema.parse(body);
  return ok(await runManualSourceSync(parsed));
}
