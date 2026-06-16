import { z } from "zod";
import { badRequest, ok } from "@/lib/api";
import { reviewLanguageQuality } from "@/lib/services/language-quality-service";

const schema = z.object({
  text: z.string().min(1),
  kind: z.enum(["post", "advertisement", "article", "script", "campaign", "visual_content", "infographic", "title", "hashtag", "caption", "publishing_plan", "social_export"]),
  platform: z.string().optional(),
  requiredTerms: z.array(z.string()).optional(),
  terminologyMap: z.record(z.array(z.string())).optional()
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return badRequest("بيانات مراجعة جودة اللغة والصياغة غير مكتملة.");

  return ok(reviewLanguageQuality(parsed.data));
}
