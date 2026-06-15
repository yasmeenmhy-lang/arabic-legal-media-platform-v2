import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, ok } from "@/lib/api";
import { approveLegalSourceUpdate } from "@/lib/services/legal-source-update-service";

const schema = z.object({
  sourceDocumentId: z.string().min(1),
  actor: z.string().default("admin")
});

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return badRequest("بيانات مراجعة المصدر المرجعي غير مكتملة.");

  const review = await approveLegalSourceUpdate(parsed.data.sourceDocumentId, parsed.data.actor);
  if (!review) return NextResponse.json({ error: "LEGAL_SOURCE_NOT_FOUND" }, { status: 404 });

  return ok(review);
}
