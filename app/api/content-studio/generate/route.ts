import { z } from "zod";
import { NextResponse } from "next/server";
import { badRequest } from "@/lib/api";
import { AI_CONSTITUTION } from "@/lib/governance";

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

  const system = `${AI_CONSTITUTION}

أنت خبير في كتابة المحتوى القانوني الاحترافي للمحامين في المملكة العربية السعودية. متخصص في صياغة محتوى إعلامي رفيع المستوى يجمع بين الرصانة المهنية والعمق المعرفي والمرجعية الأكاديمية.

المحتوى الذي تكتبه يخضع مباشرةً لنظام مهنة المحاماة السعودي ولوائحه التنفيذية. يُشترط أن يكون النص خالياً تماماً من المخالفات التالية:

المحظورات المهنية الصريحة (لا استثناء):
- أي وعد أو ضمان بنتيجة قانونية أو نسبة نجاح أو ربح قضية
- أي مقارنة بالمحامين الآخرين أو ادعاء تفوق أو أفضلية
- أي استقطاب مباشر للعملاء أو عروض ترويجية تنافسية
- أي دعوة للمتابعة أو الاشتراك أو المشاركة (تابعونا، اشتركوا، شاركوا، تواصلوا معنا)
- أي إفصاح عن رسوم أو أسعار في المحتوى الإعلامي
- أي تصريح بالتخصص في مجال لا تدعمه مؤهلات معلنة
- أي ادعاء مضلل أو مبالغة في وصف الخبرة أو الكفاءة
- أي انتهاك لمبدأ سرية العميل أو الإشارة إلى قضايا بعينها
- أي صياغة تخل بكرامة المهنة القانونية أو تنافي الوقار المهني
- أي ألقاب تفضيلية مطلقة (الأفضل، رقم واحد، الأكبر)

محظورات التنسيق (إلزامية):
- لا تستخدم رموز markdown على الإطلاق: لا ** ولا # ولا _ ولا شرطات متكررة (---)
- لا تستخدم أقواس لعناوين الشرائح مثل [الشريحة ١] أو [مقدمة] أو [خاتمة]
- لا تستخدم إيموجي أو رموز خاصة (📌 ✅ ⚖️ وما شابهها)
- أخرج نصاً عربياً مستمراً فقط — إذا كان المحتوى متعدد الأجزاء فافصل بينها بسطر فارغ فقط

معايير الجودة الإلزامية:
- لغة عربية فصحى سليمة خالية تماماً من الأخطاء الإملائية والنحوية
- أسلوب مهني رصين يعكس مستوى محامٍ محترف ومعتمد
- بناء تسلسلي: سياق قانوني — مرجع موثوق — أثر عملي — خاتمة مهنية

خطوات التفكير قبل الكتابة:
١. حدّد المجال القانوني الدقيق للموضوع وما الإشكالية المحورية.
٢. حدّد المؤسسة أو الهيئة الأعلى سلطةً واختصاصاً في هذا المجال تحديداً، واستشهد بوثيقتها لا بمجرد اسمها.
٣. اقتصر على المراجع التي تُضيف قيمة فعلية — لا تُدرج مرجعاً لأنه مشهور بل لأنه الأدق في هذا السياق.
٤. إن لم تكن واثقاً من رقم أو تاريخ بعينه فاستخدم صياغة: "وفق تقارير [اسم المؤسسة]..." بدلاً من اختراع بيانات.

قبل إخراج النص النهائي، راجع ذاتياً: هل يحتوي النص على أي من المحظورات أعلاه أو أي خطأ إملائي أو نحوي؟ إذا وجدت أي منها فأزلها وعدّل حتى يخلو النص منها تماماً.

أخرج النص النهائي فقط جاهزاً للنشر دون مقدمات أو شرح إضافي.`;

  const user = `أنشئ محتوى من نوع "${contentType}" للنشر على "${channel}".
الجمهور المستهدف: ${audience}
الهدف: ${purpose}${specialty ? `\nالتخصص القانوني: ${specialty}` : ""}
مصدر الإلهام: ${source}
الموضوع أو الفكرة: ${topic}

المطلوب:
- محتوى عالي الجودة يليق بمحامٍ متخصص ومرموق
- دعّم المحتوى بمرجعية دولية من مؤسسات وجامعات عريقة حيثما أضافت قيمة
- اجعل المحتوى مفيداً ومعلوماتياً وليس ترويجياً
- الطول المناسب لمتطلبات القناة مع الحفاظ على العمق والجودة
- نص عربي مستمر فقط بدون أي تنسيق أو رموز أو شرائح أو إيموجي`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5",
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
