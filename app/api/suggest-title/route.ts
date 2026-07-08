import { z } from "zod";
import { NextResponse } from "next/server";
import { badRequest } from "@/lib/api";

const schema = z.object({ text: z.string().min(20) });

// عنوان احتياطي حتمي: أول جملة مشذّبة عند حدود الكلمات
function heuristicTitle(text: string): string {
  const firstLine = text.trim().split(/[\n.!؟?]/)[0] ?? "";
  const clean = firstLine.replace(/@\S+|https?:\/\/\S+/g, "").replace(/\s+/g, " ").trim();
  if (clean.length <= 60) return clean;
  const cut = clean.slice(0, 60);
  return cut.slice(0, cut.lastIndexOf(" ")) || cut;
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return badRequest("النص قصير جداً لاقتراح عنوان");
  const { text } = parsed.data;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ title: heuristicTitle(text) });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 100,
        messages: [{
          role: "user",
          content: `اقترح عنواناً عربياً موجزاً (٤ إلى ٨ كلمات) يصف موضوع النص التالي، لأغراض الفهرسة والبحث في سجل محتوى. أخرج العنوان فقط دون علامات اقتباس أو شرح.\n\nالنص:\n${text.slice(0, 1500)}`,
        }],
      }),
    });
    if (!response.ok) throw new Error(`anthropic ${response.status}`);
    const data = (await response.json()) as { content?: { type: string; text?: string }[] };
    const title = data.content?.find((b) => b.type === "text")?.text?.trim().replace(/^["«]|["»]$/g, "").slice(0, 90);
    return NextResponse.json({ title: title || heuristicTitle(text) });
  } catch {
    return NextResponse.json({ title: heuristicTitle(text) });
  }
}
