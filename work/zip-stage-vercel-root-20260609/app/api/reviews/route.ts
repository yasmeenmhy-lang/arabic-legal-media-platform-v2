import { z } from "zod";
import { badRequest, ok } from "@/lib/api";
import { reviewContent } from "@/lib/services/review-service";

const schema = z.object({
  text: z.string().min(5)
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return badRequest("يرجى إرسال نص صالح للمراجعة");

  return ok(reviewContent(parsed.data.text));
}
