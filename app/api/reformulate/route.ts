import { z } from "zod";
import { NextResponse } from "next/server";
import { badRequest, ok } from "@/lib/api";

const schema = z.object({
  text: z.string().min(5),
  contentType: z.string().optional(),
  channel: z.string().optional(),
  audience: z.string().optional(),
  purpose: z.string().optional(),
  findings: z.array(z.object({
    issue: z.string(),
    evidence: z.string(),
    suggestedSaferWording: z.string(),
    legalReference: z.string()
  })).default([]),
  languageIssues: z.array(z.object({
    message: z.string(),
    excerpt: z.string().optional(),
    suggestion: z.string().optional()
  })).default([])
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return badRequest("بيانات غير صالحة");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "خدمة التحليل غير مهيأة — تأكد من ضبط متغيرات البيئة." }, { status: 503 });

  const { text, contentType, channel, audience, purpose, findings, languageIssues } = parsed.data;

  const findingsList = findings.length
    ? findings.map((f, i) =>
        `${i + 1}. المشكلة: ${f.issue}\n   العبارة المتأثرة: "${f.evidence}"\n   التوجيه القانوني: ${f.suggestedSaferWording}\n   المرجع: ${f.legalReference}`
      ).join("\n\n")
    : "لا توجد ملاحظات امتثالية.";

  const languageList = languageIssues.length
    ? languageIssues.map((i) => `- "${i.excerpt ?? ""}" → ${i.suggestion ?? i.message}`).join("\n")
    : "لا توجد ملاحظات لغوية أو إملائية.";

  const systemPrompt = [
    "أنت محرر قانوني متخصص في محتوى المحامين في المملكة العربية السعودية.",
    "مهمتك إعادة كتابة النص المُدخَل بحيث:",
    "- يعالج جميع الملاحظات القانونية والامتثالية المذكورة بشكل كامل",
    "- يصحح جميع الأخطاء اللغوية والإملائية",
    "- يحافظ على المعنى والهدف الأصلي للمحتوى",
    "- يستخدم لغة عربية فصحى رصينة تليق بالمهنة القانونية",
    "- يتجنب أي وعود أو ادعاءات مطلقة أو ضمانات بنتائج قانونية",
    "أعد النص المعاد كتابته فقط، دون عنوان أو شرح أو مقدمة أو تعليق."
  ].join("\n");

  const userPrompt = [
    `السياق: ${contentType ?? "محتوى مهني"} — القناة: ${channel ?? ""} — الجمهور: ${audience ?? ""} — الهدف: ${purpose ?? ""}`,
    "",
    "النص الأصلي:",
    text,
    "",
    "الملاحظات الامتثالية والقانونية التي يجب معالجتها:",
    findingsList,
    "",
    "الملاحظات اللغوية والإملائية التي يجب تصحيحها:",
    languageList,
    "",
    "أعد كتابة النص معالجًا جميع النقاط أعلاه مع الحفاظ على روح النص وهدفه المهني:"
  ].join("\n");

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-latest",
        max_tokens: 1200,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }]
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({})) as { error?: { message?: string } };
      return NextResponse.json(
        { error: err.error?.message ?? "تعذر إنشاء الصياغة المقترحة" },
        { status: 503 }
      );
    }

    const data = await response.json() as { content?: Array<{ type?: string; text?: string }> };
    const suggestedText = data.content?.find((item) => item.type === "text")?.text?.trim() ?? "";
    if (!suggestedText) return NextResponse.json({ error: "لم يُنتج النموذج صياغة صالحة" }, { status: 503 });

    return ok({ suggestedText });
  } catch (error) {
    const message = error instanceof Error ? error.message : "خطأ غير متوقع";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
