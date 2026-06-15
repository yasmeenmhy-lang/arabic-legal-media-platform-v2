import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, ok } from "@/lib/api";
import { buildExportPackage } from "@/lib/services/social-media-service";

const schema = z.object({
  contentId: z.string().min(1)
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return badRequest("Export package payload is incomplete.");

  const exportPackage = buildExportPackage(parsed.data.contentId);
  if (!exportPackage) return NextResponse.json({ error: "SHARE_CONTENT_NOT_FOUND" }, { status: 404 });

  return ok(exportPackage);
}
