import { ok } from "@/lib/api";
import { z } from "zod";
import { getRecommendations } from "@/lib/services/recommendation-service";
import { reviewContent } from "@/lib/services/review-service";

export async function GET() {
  return ok(getRecommendations());
}

const schema = z.object({
  text: z.string().min(5),
  kind: z
    .enum(["post", "advertisement", "article", "script", "campaign", "visual_content", "infographic", "title", "hashtag", "caption", "publishing_plan", "social_export"])
    .optional(),
  contentType: z.string().optional(),
  channel: z.string().optional(),
  audience: z.string().optional(),
  purpose: z.string().optional()
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return ok([]);

  const review = reviewContent(parsed.data.text, parsed.data.kind, {
    contentType: parsed.data.contentType,
    channel: parsed.data.channel,
    audience: parsed.data.audience,
    purpose: parsed.data.purpose
  });

  return ok(review.governedRewrites);
}
