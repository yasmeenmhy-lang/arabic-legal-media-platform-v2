import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest, ok } from "@/lib/api";
import { getPublishingProvider } from "@/lib/providers/publishing-provider";
import { assertContentCanExport } from "@/lib/services/review-service";

const schema = z.object({
  contentId: z.string().min(1),
  channel: z.string().min(1),
  body: z.string().min(5),
  publishAt: z.string().datetime()
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return badRequest("بيانات الجدولة غير مكتملة");

  const exportGate = await assertContentCanExport(parsed.data.body, "social_export");
  if (!exportGate.allowed) {
    return NextResponse.json(
      {
        error: "LANGUAGE_QUALITY_REVIEW_REQUIRED",
        message: exportGate.message,
        data: exportGate.review
      },
      { status: 422 }
    );
  }

  const result = await getPublishingProvider().schedule(parsed.data);
  return ok({ ...result, languageQualityScore: exportGate.review.languageQuality.score });
}
