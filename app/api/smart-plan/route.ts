import { z } from "zod";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const recordSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  sharingStatus: z.string().optional(),
  purpose: z.string().optional(),
  audience: z.string().optional(),
  channel: z.string().optional(),
  approved: z.boolean(),
  publicationLabel: z.string().optional(),
  channels: z.array(z.string()),
});

const schema = z.object({
  records: z.array(recordSchema),
  horizon: z.enum(["weekly", "monthly"]),
  startDate: z.string(),
});

function buildPrompt(data: z.infer<typeof schema>): string {
  const horizonLabel = data.horizon === "weekly" ? "أسبوع واحد (7 أيام)" : "شهر كامل (4 أسابيع)";

  const summaries = data.records
    .map((r) =>
      `- المعرف: ${r.id}
  العنوان: ${r.title}
  الحالة: ${r.status}${r.approved ? " [معتمد]" : ""}
  الجمهور: ${r.audience ?? "غير محدد"}
  الهدف: ${r.purpose ?? "غير محدد"}
  القناة المفضلة: ${r.channel ?? "غير محددة"}
  القنوات المقترحة: ${r.channels.length ? r.channels.join("، ") : "لا توجد"}
  قرار النشر: ${r.publicationLabel ?? "لم يُحلَّل"}`
    )
    .join("\n\n");

  return `أنت مستشار تخطيط إعلامي متخصص للمحامين في المملكة العربية السعودية.

## المهمة
ضع خطة نشر ذكية لـ${horizonLabel} تبدأ من ${data.startDate} بناءً على المحتوى المتاح.

## قواعد التخطيط
- المحتوى المعتمد له أولوية قصوى (priority: "high")
- المحتوى المُحلَّل غير المعتمد: أولوية متوسطة (priority: "medium")
- المسودات غير المحللة: أولوية منخفضة (priority: "low")
- لا تضع أكثر من منشور واحد في اليوم الواحد
- فجوة يوم على الأقل بين كل منشورَين
- أيام الأسبوع (الاثنين–الخميس) للمحتوى القانوني والتعليمي
- الأحد والخميس للمحتوى العام والتعريف بالخدمات
- اختر القناة الأنسب بناءً على الجمهور والهدف
- نبّه عن أي أسبوع بلا محتوى مناسب للنشر في قسم gaps

## المحتوى المتاح
${summaries}

أرجع JSON فقط بدون أي نص إضافي:
{
  "plan": [
    {
      "contentId": "المعرف كما ورد أعلاه",
      "suggestedDate": "YYYY-MM-DD",
      "channel": "اسم القناة",
      "reason": "سبب الاختيار بجملة واحدة مختصرة",
      "priority": "high|medium|low"
    }
  ],
  "gaps": ["وصف الفجوة إن وجدت"],
  "summary": "ملخص الخطة في جملتين"
}`;
}

function extractJson(raw: string): string | null {
  const block = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (block) return block[1].trim();
  const obj = raw.match(/\{[\s\S]*\}/);
  return obj ? obj[0] : null;
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "خدمة التخطيط الذكي غير مهيأة — تأكد من ضبط ANTHROPIC_API_KEY" }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }

  if (parsed.data.records.length === 0) {
    return NextResponse.json({ error: "لا يوجد محتوى لتخطيطه" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  let rawText: string;
  try {
    const message = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 2048,
      messages: [{ role: "user", content: buildPrompt(parsed.data) }],
    });
    rawText = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "فشل الاتصال بخدمة الذكاء الاصطناعي" },
      { status: 502 }
    );
  }

  const jsonStr = extractJson(rawText);
  if (!jsonStr) {
    return NextResponse.json({ error: "تعذّر قراءة استجابة الخطة" }, { status: 500 });
  }

  try {
    const result = JSON.parse(jsonStr) as { plan: unknown; gaps: unknown; summary: unknown };
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "استجابة غير صالحة من الخدمة" }, { status: 500 });
  }
}
