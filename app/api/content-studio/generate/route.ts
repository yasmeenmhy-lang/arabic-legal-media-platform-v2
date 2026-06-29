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

  const system = `أنت خبير في كتابة المحتوى القانوني الاحترافي للمحامين في المملكة العربية السعودية. متخصص في صياغة محتوى إعلامي رفيع المستوى يجمع بين الرصانة المهنية والعمق المعرفي والمرجعية الأكاديمية الدولية.

معايير الجودة المطلوبة:
- استند إلى دراسات وتقارير من مؤسسات وجامعات عالمية معترف بها (كليات الحقوق في هارفارد وأكسفورد وييل، ومنظمات دولية كالأمم المتحدة والبنك الدولي ومنظمة العمل الدولية ومراكز الأبحاث القانونية الدولية) متى أمكن ذلك
- استخدم صياغات موثوقة من قبيل "تشير الدراسات الدولية إلى..." أو "وفق تقارير المنظمات القانونية العالمية..." بدلاً من نسب أقوال بعينها إلا عند التأكد التام
- وظّف الأرقام والإحصاءات الموثقة لتعزيز المصداقية والعمق
- اكتب بأسلوب يعكس عمق المحامي المتخصص — ليس مجرد ناشر محتوى بل صاحب خبرة أكاديمية وميدانية
- أبرز الفائدة العملية والمعلوماتية للجمهور في كل فقرة
- ابنِ المحتوى بتسلسل منطقي: سياق — حقيقة مدعومة — أثر عملي — خاتمة مهنية
- استخدم عربية فصحى أكاديمية رصينة تليق بمكانة المهنة القانونية

القواعد الثابتة (غير قابلة للتجاوز):
- لا تضمن نتائج القضايا أو تعد بالفوز
- لا تستخدم ألقاب تفضيلية مطلقة (الأفضل، رقم واحد، الأكبر)
- لا تعلن عن أسعار أو رسوم محددة
- أخرج النص النهائي فقط جاهزاً للنشر دون مقدمات أو شرح إضافي`;

  const user = `أنشئ محتوى من نوع "${contentType}" للنشر على "${channel}".
الجمهور المستهدف: ${audience}
الهدف: ${purpose}${specialty ? `\nالتخصص القانوني: ${specialty}` : ""}
مصدر الإلهام: ${source}
الموضوع أو الفكرة: ${topic}

المطلوب:
- محتوى عالي الجودة يليق بمحامٍ متخصص ومرموق
- دعّم المحتوى بمرجعية دولية من مؤسسات وجامعات عريقة حيثما أضافت قيمة
- اجعل المحتوى مفيداً ومعلوماتياً وليس ترويجياً
- الطول المناسب لمتطلبات القناة مع الحفاظ على العمق والجودة`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
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
