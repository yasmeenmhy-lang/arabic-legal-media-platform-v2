import { z } from "zod";
import { badRequest, ok } from "@/lib/api";
import { registerLegalSource } from "@/lib/services/legal-source-update-service";

const schema = z.object({
  title: z.string().min(2),
  sourceUrl: z.string().url(),
  version: z.string().min(1),
  actor: z.string().optional()
});

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return badRequest("بيانات تسجيل المصدر المرجعي غير مكتملة.");

  return ok(await registerLegalSource(parsed.data));
}
