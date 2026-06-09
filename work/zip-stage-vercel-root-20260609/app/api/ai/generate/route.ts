import { z } from "zod";
import { badRequest, ok } from "@/lib/api";
import { getAIService } from "@/lib/services/ai-service";

const schema = z.object({
  topic: z.string().min(2),
  audience: z.string().min(2),
  practiceArea: z.string().min(2),
  channel: z.string().min(1),
  objective: z.string().min(2)
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return badRequest("المدخلات غير مكتملة");

  const output = await getAIService().generateContent(parsed.data);
  return ok(output);
}
