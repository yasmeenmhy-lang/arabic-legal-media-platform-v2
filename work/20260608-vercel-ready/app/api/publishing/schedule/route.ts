import { z } from "zod";
import { badRequest, ok } from "@/lib/api";
import { getPublishingProvider } from "@/lib/providers/publishing-provider";

const schema = z.object({
  contentId: z.string().min(1),
  channel: z.string().min(1),
  body: z.string().min(5),
  publishAt: z.string().datetime()
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return badRequest("بيانات الجدولة غير مكتملة");

  const result = await getPublishingProvider().schedule(parsed.data);
  return ok(result);
}
