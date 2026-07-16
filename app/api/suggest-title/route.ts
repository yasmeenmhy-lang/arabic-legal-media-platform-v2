import { z } from "zod";
import { NextResponse } from "next/server";
import { badRequest } from "@/lib/api";
import { scanProhibited } from "@/lib/services/governor-gate";

const schema = z.object({ text: z.string().min(20) });

// عنوان احتياطي حتمي: أول جملة مشذّبة عند حدود الكلمات
function heuristicTitle(text: string): string {
  const firstLine = text.trim().split(/[\n.!؟?]/)[0] ?? "";
  const clean = firstLine.replace(/@\S+|https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
  if (clean.length <= 60) return clean;
  const cut = clean.slice(0, 60);
  return cut.slice(0, cut.lastIndexOf(" ")) || cut;
}

// طلب عنوان من النموذج (مع تصحيح اختياري إذا خالف العنوان السابق الحاكم)
async function requestTitle(apiKey: string, text: string, correction: string): Promise<string> {
  const response = await fetch(`${process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com"}/v1/messages`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 100,
      messages: [{
        role: "user",
        content: `اقترح عنواناً عربياً موجزاً (٤ إلى ٨ كلمات) يصف موضوع النص التالي، لأغراض الفهرسة والبحث في سجل محتوى. أخرج العنوان فقط دون علامات اقتباس أو شرح.${correction}\n\nالنص:\n${text.slice(0, 1500)}`,
      }],
    }),
  });
  if (!response.ok) throw new Error(`anthropic ${response.status}`);
  const data = (await response.json()) as { content?: { type: string; text?: string }[] };
  return data.content?.find((b) => b.type === "text")?.text?.trim().replace(/^["«]|["»]$/g, "").slice(0, 90) ?? "";
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return badRequest("النص قصير جداً لاقتراح عنوان");
  const { text } = parsed.data;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ title: heuristicTitle(text) });

  try {
    // حصن الحاكم الحتمي على العنوان المقترح: إن حمل عبارة محظورة صريحة يُعاد طلبه
    // خالياً منها؛ وإن تعذّر خرج العنوان الاحتياطي الحتمي المشتقّ من نص المستخدم نفسه.
    let correction = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      const title = await requestTitle(apiKey, text, correction);
      if (!title) break;
      const hits = scanProhibited(title);
      if (hits.length === 0) return NextResponse.json({ title });
      correction = ` تجنّب تماماً هذه العبارات المحظورة نظاماً: ${hits.map((h) => `«${h.pattern}»`).join("، ")}.`;
    }
    return NextResponse.json({ title: heuristicTitle(text) });
  } catch {
    return NextResponse.json({ title: heuristicTitle(text) });
  }
}
