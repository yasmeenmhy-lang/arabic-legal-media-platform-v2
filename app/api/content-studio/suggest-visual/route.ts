import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest } from "@/lib/api";

const schema = z.object({
  text: z.string().min(10),
});

type VisualType = "infographic" | "chart" | "mindmap" | "image";

interface Suggestion {
  visualType: VisualType;
  chartType?: string;
  reason: string;
}

const VALID_TYPES: VisualType[] = ["infographic", "chart", "mindmap", "image"];

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return badRequest("النص مطلوب");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "الخدمة غير مهيأة" }, { status: 503 });
  }

  const excerpt = parsed.data.text.slice(0, 600);

  const prompt = `أنت مساعد تحريري متخصص في المحتوى القانوني العربي.
اقرأ النص التالي وحدد أفضل تنسيق مرئي لتقديمه للجمهور على وسائل التواصل الاجتماعي.

النص:
"""
${excerpt}
"""

الخيارات المتاحة:
- infographic: للمعلومات المنظمة، الخطوات المتسلسلة، المقارنات النصية، الإجراءات القانونية
- chart: للأرقام والإحصائيات والبيانات القابلة للقياس والمقارنة الكمية
- mindmap: للمفاهيم المتشعبة، التصنيفات القانونية، العلاقات بين المصطلحات
- image: للمحتوى التوعوي العام الذي لا يحتوي على بيانات منظمة

أجب بـ JSON صالح فقط بدون أي نص إضافي أو markdown:
{"visualType":"infographic","chartType":"","reason":"سبب الاختيار في جملة واحدة بالعربية"}

قواعد:
- chartType مطلوب فقط إذا كان visualType = "chart" — اختر من: أعمدة، خطي، دائري، حلقي، مساحة، أعمدة أفقية
- إذا لم يكن visualType = "chart" فاتركه نصاً فارغاً ""
- reason: جملة واحدة موجزة تشرح سبب اختيار هذا النوع`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) throw new Error(`Claude API ${res.status}`);

    const payload = (await res.json()) as { content?: { type: string; text: string }[] };
    const raw = payload.content?.find((c) => c.type === "text")?.text?.trim() ?? "";

    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const suggestion = JSON.parse(cleaned) as Suggestion;

    if (!VALID_TYPES.includes(suggestion.visualType)) {
      suggestion.visualType = "infographic";
    }
    if (suggestion.visualType !== "chart") {
      delete suggestion.chartType;
    }

    return NextResponse.json(suggestion);
  } catch (e) {
    console.error("[suggest-visual]", e);
    return NextResponse.json({ error: "تعذر إعداد الاقتراح — حاول مرة أخرى." }, { status: 500 });
  }
}
