import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest } from "@/lib/api";

const schema = z.object({
  description: z.string().min(5),
  style: z.string().optional(),
  dimensions: z.string().optional(),
  channel: z.string().optional(),
});

function getDimensions(dim?: string): [number, number] {
  if (dim === "16:9") return [1280, 720];
  if (dim === "9:16") return [720, 1280];
  if (dim === "4:5") return [820, 1024];
  return [1024, 1024];
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return badRequest("المدخلات غير مكتملة");

  const { description, style, dimensions, channel } = parsed.data;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "خدمة الإنشاء غير مهيأة — تأكد من ضبط ANTHROPIC_API_KEY" },
      { status: 503 }
    );
  }

  // Step 1: Use Claude to craft a professional English image generation prompt
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 250,
      messages: [
        {
          role: "user",
          content: `You are an expert at writing image generation prompts for professional legal content in Arabic media.

Convert this Arabic visual description into a concise, professional English image generation prompt:

Description: ${description}
Style: ${style ?? "professional, clean, corporate"}
Platform: ${channel ?? "social media"}
Format: ${dimensions ?? "square"}

Rules:
- Photorealistic or clean vector illustration style
- Professional corporate aesthetic, legal/law theme
- NO human faces (avoid rights issues)
- Soft neutral background colors (white, light grey, pale navy)
- Include subtle Arabic/Islamic geometric design elements if fitting
- Maximum 120 words
- Output ONLY the English prompt, nothing else`,
        },
      ],
    }),
  });

  let promptEn = description;
  if (response.ok) {
    const payload = (await response.json()) as {
      content?: { type: string; text: string }[];
    };
    const generated = payload.content?.find((c) => c.type === "text")?.text?.trim();
    if (generated) promptEn = generated;
  }

  // Step 2: Build Pollinations.ai URL (free, no key required)
  const [w, h] = getDimensions(dimensions);
  const seed = Date.now() % 99999;
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptEn)}?width=${w}&height=${h}&model=flux&nologo=true&safe=true&seed=${seed}`;

  return NextResponse.json({ prompt: promptEn, imageUrl });
}
