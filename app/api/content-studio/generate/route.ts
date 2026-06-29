import { z } from "zod";
import { NextResponse } from "next/server";
import { badRequest } from "@/lib/api";

const schema = z.object({
  contentType: z.string().min(1),
  channel: z.string().min(1),
  audience: z.string().min(1),
  purpose: z.string().min(1),
  specialty: z.string().optional(),
  source: z.string().min(1),
  topic: z.string().min(3),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return badRequest("المدخلات غير مكتملة");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "خدمة الإنشاء غير مهيأة — تأكد من ضبط ANTHROPIC_API_KEY" },
      { status: 503 }
    );
  }

  const { contentType, channel, audience, purpose, specialty, source, topic } = parsed.data;

  const system = `أنت كاتب محتوى قانوني احترافي في المملكة العربية السعودية. تساعد المحامين في إنشاء محتوى إعلامي يتوافق مع أخلاقيات المهنة وأنظمة هيئة المحامين السعوديين.

القواعد الثابتة:
- لا تضمن نتائج القضايا أو تعد بالفوز
- لا تستخدم ألقاب تفضيلية مطلقة (الأفضل، رقم واحد، الأكبر)
- لا تعلن عن أسعار أو رسوم محددة
- اكتب بعربية فصحى مناسبة للمهنة القانونية
- أخرج النص النهائي فقط جاهزاً للنشر دون مقدمات أو شرح إضافي`;

  const user = `أنشئ محتوى من نوع "${contentType}" للنشر على "${channel}".
الجمهور المستهدف: ${audience}
الهدف: ${purpose}${specialty ? `\nالتخصص القانوني: ${specialty}` : ""}
مصدر الإلهام: ${source}
الموضوع أو الفكرة: ${topic}

اكتب النص الكامل بالطول المناسب للقناة.`;

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
        max_tokens: 1024,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });

    if (!response.ok) {
      console.error("[content-studio/generate]", response.status, await response.text().catch(() => ""));
      return NextResponse.json({ error: "فشل الاتصال بخدمة الذكاء الاصطناعي" }, { status: 503 });
    }

    const payload = (await response.json()) as { content?: { type: string; text: string }[] };
    const text = payload.content?.find((c) => c.type === "text")?.text?.trim() ?? "";

    if (!text) return NextResponse.json({ error: "لم يُنشأ أي محتوى" }, { status: 500 });

    return NextResponse.json({ text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطأ غير متوقع";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
