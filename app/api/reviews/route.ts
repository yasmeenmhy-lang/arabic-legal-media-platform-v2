import { z } from "zod";
import { NextResponse } from "next/server";
import { badRequest, ok } from "@/lib/api";
import { enhanceReviewOutput } from "@/lib/services/ai-enhancement-service";
import { reviewContent } from "@/lib/services/review-service";
import { persistReviewResult } from "@/lib/services/review-persistence-service";

const schema = z.object({
  contentId: z.string().min(1).optional(),
  text: z.string().min(5),
  kind: z
    .enum(["post", "advertisement", "article", "script", "campaign", "visual_content", "infographic", "title", "hashtag", "caption", "publishing_plan", "social_export", "statement", "diary"])
    .optional(),
  contentType: z.string().optional(),
  channel: z.string().optional(),
  audience: z.string().optional(),
  purpose: z.string().optional(),
  reviewStatus: z.enum(["DRAFT", "REVIEW_REQUIRED", "NEEDS_CORRECTION", "READY_FOR_PUBLISHING", "EXPORTED", "SHARED"]).optional()
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return badRequest("يرجى إرسال نص صالح للمراجعة");

  const context = {
    contentType: parsed.data.contentType,
    channel: parsed.data.channel,
    audience: parsed.data.audience,
    purpose: parsed.data.purpose,
    reviewStatus: parsed.data.reviewStatus
  };

  try {
    const baseReview = await reviewContent(parsed.data.text, parsed.data.kind, context);
    const review = await enhanceReviewOutput({
      text: parsed.data.text,
      kind: parsed.data.kind,
      context,
      review: baseReview
    });

    if (parsed.data.contentId) await persistReviewResult(parsed.data.contentId, review);

    return ok(review);
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطأ غير متوقع في معالجة المراجعة";
    const isConfigError = message.includes("ANTHROPIC_API_KEY") || message.includes("غير مهيأ");
    return NextResponse.json(
      { error: isConfigError ? "خدمة التحليل غير متاحة حالياً — تواصل مع مسؤول المنصة." : message },
      { status: 503 }
    );
  }
}
