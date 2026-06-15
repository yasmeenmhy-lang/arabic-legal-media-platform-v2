import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, ok } from "@/lib/api";
import { prepareExportContent } from "@/lib/services/export-center-service";

const schema = z.object({
  body: z.string().min(5),
  platform: z.string().min(1),
  format: z.enum(["post", "article", "script", "caption", "publishing_plan", "social_export"]).default("social_export")
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return badRequest("بيانات التصدير غير مكتملة.");

  const exportContent = prepareExportContent(parsed.data.body);
  if (!exportContent.allowed) {
    return NextResponse.json(
      {
        error: "EXPORT_REQUIRES_REVIEW_OBSERVATIONS",
        message: exportContent.message,
        advisoryDisclaimer: exportContent.advisoryDisclaimer,
        data: exportContent.review
      },
      { status: 422 }
    );
  }

  return ok({
    platform: parsed.data.platform,
    format: parsed.data.format,
    body: exportContent.content,
    languageQualityScore: exportContent.review.languageQuality.score,
    complianceScore: exportContent.review.complianceScore,
    readyForExport: true,
    publishingReadiness: "مناسب للتصدير وفق نتائج المراجعة",
    advisoryDisclaimer: exportContent.advisoryDisclaimer
  });
}
