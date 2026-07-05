import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest } from "@/lib/api";

const schema = z.object({
  description: z.string().min(5),
  visualType: z.enum(["image", "chart", "mindmap", "infographic"]).default("image"),
  chartType: z.string().optional(),
  style: z.string().optional(),
  dimensions: z.string().optional(),
  channel: z.string().optional(),
});

// ── SVG generation prompts ────────────────────────────────────────────────

function buildChartPrompt(description: string, chartType: string): string {
  const kind = chartType || "أعمدة";
  return `You are an expert SVG developer. Generate a clean, professional SVG ${kind} chart for Arabic legal content.

Context (Arabic): ${description}

STRICT SVG REQUIREMENTS:
- Opening: <svg width="100%" viewBox="0 0 800 520" xmlns="http://www.w3.org/2000/svg">
- Background: <rect width="800" height="520" fill="#ffffff"/>
- Font everywhere: font-family="Tahoma, Arial, sans-serif"
- Arabic title at top center (x=400), font-size="17", font-weight="bold", fill="#1a1a2e", text-anchor="middle"
- Chart area: x=80 y=60 width=640 height=360
- Colors: bars/lines use #1a6b4a, secondary bars #4a9b7f, grid lines #e8e8e8
- Generate 5-6 realistic data points in Arabic relevant to the legal context
- Label every bar/point with its value clearly (font-size="12")
- X-axis category labels in Arabic, text-anchor="middle", font-size="11", fill="#555"
- Y-axis numeric labels on right side if RTL, font-size="11", fill="#555"
- Light horizontal grid lines every major step
- All Arabic text must be short and clear — no text longer than 10 chars per label
- NO decorative elements, shadows, gradients, or blur — flat clean design only

Chart type specifics:
- أعمدة / Bar: vertical bars, equal width, rounded top (rx="3"), value above each bar
- خطي / Line: smooth polyline, dots at data points, fill area below with opacity 0.1
- دائري / Pie: centered circle r=130, slices with white separator lines 2px, legend on left
- حلقي / Donut: same as pie but with r=80 inner cutout, percentage in center
- مساحة / Area: line chart with filled area below (opacity 0.15)
- أعمدة أفقية / H-Bar: horizontal bars from right axis, Arabic labels on right

Return ONLY the complete SVG code starting with <svg and ending with </svg>. No markdown fences. No explanation.`;
}

function buildMindMapPrompt(description: string, style: string): string {
  return `You are an expert SVG developer. Generate a clean professional SVG mind map for Arabic legal content.

Topic (Arabic): ${description}
Style hint: ${style || "إشعاعي من المركز"}

STRICT SVG REQUIREMENTS:
- Opening: <svg width="100%" viewBox="0 0 900 680" xmlns="http://www.w3.org/2000/svg">
- Background: <rect width="900" height="680" fill="#f8fdf9"/>
- Font everywhere: font-family="Tahoma, Arial, sans-serif"

LAYOUT — radial from center (450, 340):
Central node: rounded rect ~140×44 centered at (450,340), fill="#1a6b4a", rx="22", text white font-size="14" bold

Generate exactly 5 main branches placed at these angles:
  Top (450,160), Top-right (680,220), Bottom-right (680,460), Bottom-left (220,460), Top-left (220,220)

Each main branch node:
- Rounded rect ~120×36 rx="18"
- Fill: rotate through ["#e8f5f0","#d4ede4","#c0e5d8","#acdccc","#98d4c0"]
- Border: stroke="#1a6b4a" stroke-width="1.5"
- Arabic text fill="#1a1a2e" font-size="12" text-anchor="middle" — max 8 chars

Connectors from center to each main node:
- Curved <path> with stroke="#1a6b4a" stroke-width="2" fill="none" opacity="0.6"

Each main node has 2 sub-nodes (smaller, ~90×28 rx="14"):
- Placed logically further from center
- Fill="#f0fbf7" stroke="#4a9b7f" stroke-width="1"
- Thin connector lines stroke="#4a9b7f" opacity="0.5"
- Arabic text font-size="10"

NO arrows, NO shadows, NO blur, NO icons — clean vector lines and shapes only.
Keep all text inside node boundaries. All Arabic text must fit visually.

Return ONLY the complete SVG starting with <svg and ending with </svg>. No markdown. No explanation.`;
}

function buildInfographicPrompt(description: string): string {
  return `You are an expert SVG developer. Generate a clean professional SVG infographic for Arabic legal content.

Content (Arabic): ${description}

STRICT SVG REQUIREMENTS:
- Opening: <svg width="100%" viewBox="0 0 700 900" xmlns="http://www.w3.org/2000/svg">
- Background: <rect width="700" height="900" fill="#ffffff"/>
- Font everywhere: font-family="Tahoma, Arial, sans-serif"
- Direction: RTL — all text right-aligned or centered

LAYOUT (portrait, top to bottom):
1. Header bar (y=0 h=90): fill="#1a6b4a", Arabic title centered in white font-size="20" bold
2. Subtitle (y=100): Arabic subtitle, fill="#555", font-size="13", text-anchor="middle" x=350
3. Divider line y=130: stroke="#e0e0e0"
4. Generate 4 content sections from y=150, each ~160px tall:
   - Section has a numbered circle on the right (r=22, fill="#e8f5f0", text="#1a6b4a")
   - Short Arabic heading font-size="15" bold fill="#1a1a2e"
   - 2 lines of Arabic body text font-size="12" fill="#444" line-height emulated via dy
   - Light separator line at bottom of each section stroke="#f0f0f0"
5. Footer bar (bottom 60px): fill="#f8fdf9", Arabic source note font-size="10" fill="#888"

Key numbers/stats should appear in large font (#1a6b4a, font-size="28" bold) where relevant.
Use simple geometric shapes (rectangles, circles) as icons — no complex SVG paths.
All text must fit within section width (max 580px). Wrap long text using multiple <text> elements with dy offsets.
NO shadows, NO gradients, NO blur — flat clean professional design.

Return ONLY the complete SVG starting with <svg and ending with </svg>. No markdown. No explanation.`;
}

// ── Route ─────────────────────────────────────────────────────────────────

function getDimensions(dim?: string): [number, number] {
  if (dim === "16:9") return [1280, 720];
  if (dim === "9:16") return [720, 1280];
  if (dim === "4:5") return [820, 1024];
  return [1024, 1024];
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return badRequest("المدخلات غير مكتملة");

  const { description, visualType, chartType, style, dimensions, channel } = parsed.data;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "خدمة الإنشاء غير مهيأة — تأكد من ضبط ANTHROPIC_API_KEY" },
      { status: 503 }
    );
  }

  // ── SVG generation for charts, mind maps, infographics ──────────────────
  if (visualType !== "image") {
    const svgPrompt =
      visualType === "chart"
        ? buildChartPrompt(description, chartType ?? "")
        : visualType === "mindmap"
        ? buildMindMapPrompt(description, style ?? "")
        : buildInfographicPrompt(description);

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
        max_tokens: 8000,
        messages: [{ role: "user", content: svgPrompt }],
      }),
    });

    if (!response.ok) {
      console.error("[generate-image svg]", response.status);
      return NextResponse.json({ error: "فشل إنشاء الرسم المتجه" }, { status: 503 });
    }

    const payload = (await response.json()) as {
      content?: { type: string; text: string }[];
    };
    let svgCode = payload.content?.find((c) => c.type === "text")?.text?.trim() ?? "";

    // Strip markdown fences if model adds them
    svgCode = svgCode
      .replace(/^```svg\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    if (!svgCode.startsWith("<svg")) {
      console.error("[generate-image svg] bad output:", svgCode.slice(0, 200));
      return NextResponse.json({ error: "لم يُنتج الذكاء الاصطناعي رسماً متجهاً صالحاً" }, { status: 500 });
    }

    return NextResponse.json({ svgCode });
  }

  // ── Image generation via Pollinations.ai for visual_content ─────────────
  const imagePromptRes = await fetch("https://api.anthropic.com/v1/messages", {
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
          content: `You are an expert at writing image generation prompts for professional legal Arabic media.

Convert this Arabic description into a concise English image generation prompt:
Description: ${description}
Style: ${style ?? "professional, clean, corporate"}
Platform: ${channel ?? "social media"}
Format: ${dimensions ?? "square"}

Rules: photorealistic or clean illustration, professional corporate aesthetic, NO human faces, soft neutral backgrounds, max 120 words. Output ONLY the prompt.`,
        },
      ],
    }),
  });

  let promptEn = description;
  if (imagePromptRes.ok) {
    const p = (await imagePromptRes.json()) as { content?: { type: string; text: string }[] };
    const t = p.content?.find((c) => c.type === "text")?.text?.trim();
    if (t) promptEn = t;
  }

  const [w, h] = getDimensions(dimensions);
  const seed = Date.now() % 99999;
  const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptEn)}?width=${w}&height=${h}&model=flux&nologo=true&safe=true&seed=${seed}`;

  return NextResponse.json({ prompt: promptEn, imageUrl });
}
