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

خطوات التفكير قبل الكتابة:
١. حدّد المجال القانوني الدقيق للموضوع المطروح.
٢. استحضر أبرز المؤسسات والجامعات والمنظمات الدولية الأكثر تخصصاً وسلطةً في هذا المجال تحديداً. المرجعية تشمل على سبيل المثال لا الحصر:
• قانون العمل وعلاقات التوظيف → ILO (منظمة العمل الدولية) وتقاريرها السنوية، World Bank Doing Business
• التحكيم والفض البديل للنزاعات → ICC، UNCITRAL، LCIA، SIAC، AAA، DIAC، مركز القاهرة الإقليمي
• حوكمة الشركات والإفصاح → مبادئ OECD للحوكمة، World Bank Corporate Governance، معايير GRI
• حقوق الإنسان والحريات العامة → OHCHR (مفوضية الأمم المتحدة لحقوق الإنسان)، مجلس حقوق الإنسان الأممي، CEDAW، CRC
• قانون العقود والتجارة الدولية → مبادئ UNIDROIT، اتفاقية CISG الأممية، ICC Incoterms
• الملكية الفكرية والابتكار → WIPO واتفاقيات باريس وبرن، اتفاقية TRIPS ضمن WTO
• التمويل والأوراق المالية والبنوك → IOSCO، لجنة بازل (BIS)، صندوق النقد الدولي IMF، معايير IFRS
• الاستثمار الأجنبي وحل النزاعات الاستثمارية → مركز ICSID (البنك الدولي)، تقارير UNCTAD للاستثمار
• مكافحة غسل الأموال وتمويل الإرهاب → FATF (مجموعة العمل المالي)، مجموعة إيغمونت، Wolfsberg Group
• قانون المنافسة ومكافحة الاحتكار → لجنة منافسة OECD، الشبكة الدولية للمنافسة ICN، رابطة القانون الدولي ILA
• قانون الإفلاس وإعادة الهيكلة → قانون الأونسيترال النموذجي للإعسار، تقارير البنك الدولي
• القانون البيئي والاستدامة → UNEP، اتفاقية باريس للمناخ، مبادئ الأمم المتحدة للأعمال وحقوق الإنسان (UNGPs)
• التكنولوجيا والقانون الرقمي وحماية البيانات → OECD Guidelines on Privacy، ITU، UNCITRAL للتجارة الإلكترونية، GDPR كمرجع تنظيمي
• القانون البحري والنقل → IMO (المنظمة البحرية الدولية)، اتفاقية هامبورغ وروتردام
• قانون الصحة والدواء → WHO، اللوائح الصحية الدولية IHR، TRIPS وإمكانية الوصول للدواء
• حماية المستهلك والتجارة الإلكترونية → مبادئ الأمم المتحدة لحماية المستهلك، OECD Consumer Policy
• الشفافية ومكافحة الفساد → اتفاقية الأمم المتحدة لمكافحة الفساد UNCAC، Transparency International، OECD Anti-Bribery Convention
• القانون الجنائي والجريمة المنظمة → UNODC، اتفاقية باليرمو، Interpol
• قانون الأسرة والأحوال الشخصية ذات الطابع الدولي → الهيئة الدولية للقانون الخاص (HCCH)، اتفاقية لاهاي
• الجامعات والمراكز البحثية → كليات الحقوق في هارفارد وأكسفورد وييل وكولومبيا ونيويورك، مجلات Harvard Law Review وICLQ وAmerican Journal of International Law.
٣. اختر من تلك المؤسسات ما يُثري الموضوع فعلاً، واستشهد بها بأسمائها الكاملة المعروفة وبتقاريرها أو مبادئها الرئيسية حين تكون واثقاً من وجودها.
٤. إن لم تكن واثقاً من تفاصيل رقم أو تاريخ بعينه فاستخدم صياغة: "وفق تقارير [اسم المؤسسة]..." بدلاً من اختراع بيانات.

معايير الجودة المطلوبة:
- المرجعية ذكية ومتخصصة بحسب الموضوع — لا قائمة ثابتة
- وظّف الأرقام والإحصاءات الموثقة لتعزيز المصداقية
- اكتب بأسلوب يعكس عمق المحامي المتخصص لا مجرد ناشر محتوى
- ابنِ المحتوى بتسلسل: سياق قانوني — مرجع دولي موثوق — أثر عملي — خاتمة مهنية
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
