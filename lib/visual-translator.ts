// المترجم التحريري البصري — قلب «محرك ترجمة المحتوى إلى مرئيات».
// يفهم النص القانوني العربي ويعيد كتابته نصوصاً بصرية قصيرة مصقولة ضمن
// خطة موحدة (VisualPlan) تغذي محركات SVG والمسار الاحترافي.
// ملاحظة معمارية ثابتة: لا يُحقن AI_CONSTITUTION هنا (عائلة الاستخراج).

export type VisualPlanSection = {
  heading: string;          // ≤ 6 كلمات
  bullets: string[];        // 1-3 نقاط، كل نقطة ≤ 12 كلمة
  stat?: string;            // رقم/نسبة/مادة نظامية إن وجدت
  icon?: string;            // اقتراح أيقونة بالعربية (مثل: ميزان، وثيقة، ساعة)
};

export type VisualPlan = {
  centralMessage: string;
  objective: string;
  audience: string;
  // توجيه أسلوب بصري يقترحه Claude بما يناسب الموضوع — يُغذّى لنموذج الصور، ويعدّله المستخدم
  styleDirective?: string;
  recommendedOutputFormat: "infographic" | "chart" | "mindmap" | "image" | "executive" | "carousel" | "storyboard" | "quote_card" | "motion_script";
  visualStyle: "رسمي" | "تعليمي";
  layoutStrategy: string;   // مثل: خطوات متسلسلة / مقارنة / إحصائي / زمني
  title: string;            // ≤ 8 كلمات
  subtitle: string;         // ≤ 12 كلمة
  shortVisualCopy: string;  // الرسالة بصياغة بصرية ≤ 20 كلمة
  keySections: VisualPlanSection[];      // 3-5 أقسام
  importantNumbers: string[];            // "٦٠ يوماً — مهلة الإشعار"
  iconsSuggestions: string[];
  complianceSensitivePhrases: string[];  // تُنقل حرفياً من النص لتُتجنب
  complianceNotes: string;
  rtlArabicNotes: string;
};

import { KINGDOM_STYLE_RULE, AUTHORITIES_RULE } from "@/lib/governance";

const PLAN_PROMPT_RULES = `${KINGDOM_STYLE_RULE}
${AUTHORITIES_RULE}
أنت محرر تحريري بصري محترف للمحتوى القانوني العربي. لا تنسخ الجمل الطويلة —
أعد الكتابة: عنوان ≤ ٨ كلمات، عنوان فرعي ≤ ١٢ كلمة، عناوين أقسام ≤ ٦ كلمات،
كل نقطة ≤ ١٢ كلمة بصياغة رسمية رصينة، أبرز الأرقام والمواد النظامية كقيم مستقلة،
ولا تدخل أي وعد بنتيجة أو تفوق أو نسب نجاح في النصوص المعاد صياغتها.`;

export async function generateVisualPlan(
  apiKey: string,
  text: string,
  ctx: { channel?: string; audience?: string; purpose?: string; visualType?: string; contentType?: string; specialty?: string; source?: string }
): Promise<VisualPlan | null> {
  try {
    // معادلة السياق (قاعدة أساسية بقرار مالكة المنصة): كل مدخل عامل حاكم له أثر إلزامي في الخطة
    const audienceEffect = (ctx.audience ?? "").includes("زملاء") || (ctx.audience ?? "").includes("قانوني")
      ? "مصطلحات نظامية دقيقة"
      : (ctx.audience ?? "").includes("منشآت") || (ctx.audience ?? "").includes("أعمال")
        ? "لغة أعمال وأثر تجاري"
        : "تبسيط واضح يفهمه غير المتخصص";
    const prompt = `${PLAN_PROMPT_RULES}

حوّل النص إلى خطة بصرية JSON فقط بالمفاتيح التالية حرفياً:
{"centralMessage":"","objective":"","audience":"","recommendedOutputFormat":"infographic|chart|mindmap|image|executive","visualStyle":"رسمي|تعليمي","styleDirective":"جملة إنجليزية موجزة تقترح الأسلوب البصري الأنسب لهذا الموضوع تحديداً لنموذج توليد صور: نوع الرسم (flat vector / isometric / editorial illustration)، المزاج، والعناصر الرمزية القانونية المناسبة — بلا ذكر ألوان (الألوان محكومة بالهوية)","layoutStrategy":"خطوات متسلسلة|مقارنة|إحصائي|زمني|تفرعي","title":"","subtitle":"","shortVisualCopy":"","keySections":[{"heading":"","bullets":[""],"stat":"","icon":""}],"importantNumbers":[""],"iconsSuggestions":[""],"complianceSensitivePhrases":["انقل حرفياً أي وعد بنتيجة/تفوق/نسبة نجاح وردت في النص"],"complianceNotes":"","rtlArabicNotes":""}

معادلة السياق — كل عامل أدناه حاكم ويجب أن يظهر أثره في الخطة، وخطة لا تعكس أي عامل منها ناتج خاطئ يعاد حسابه:
- الصيغة البصرية المطلوبة: ${ctx.visualType ?? "إنفوغراف"} — تحدد بنية الأقسام وعددها
${ctx.contentType ? `- نوع المحتوى الأصلي: ${ctx.contentType} — يحدد طابع النصوص البصرية وقالبها\n` : ""}- القناة: ${ctx.channel ?? "عام"} — تحدد إيقاع النصوص وكثافتها (قناة سريعة = نصوص أخف وأقصر)
- الجمهور: ${ctx.audience ?? "عام"} — يحدد مستوى لغة كل نص في الخطة: ${audienceEffect}
- الهدف: ${ctx.purpose ?? "توعية"} — يحدد centralMessage ومعيار اختيار الأقسام (كل قسم يخدم هذا الهدف)
${ctx.specialty ? `- التخصص القانوني: ${ctx.specialty} — الأمثلة والمواد النظامية من داخله حصراً\n` : ""}${ctx.source ? `- مصدر الفكرة: ${ctx.source} — منطلق المضمون\n` : ""}النص:
${text.slice(0, 3500)}

أخرج كائن JSON فقط — لا أي نص قبله أو بعده.`;

    const res = await fetch(`${process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com"}/v1/messages`, {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      // استخراج JSON محض — التفكير الداخلي معطّل وإلا استهلك السقف وقُطعت الخطة (سبب «تعذر توليد الخطة البصرية»)
      body: JSON.stringify({ model: "claude-sonnet-5", max_tokens: 3200, thinking: { type: "disabled" }, messages: [{ role: "user", content: prompt }] }),
    });
    if (!res.ok) throw new Error(`plan ${res.status}`);
    const payload = (await res.json()) as { content?: { type: string; text: string }[]; stop_reason?: string };
    if (payload.stop_reason === "max_tokens") throw new Error("plan truncated");
    const raw = payload.content?.find((c) => c.type === "text")?.text?.trim() ?? "";
    let cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first > 0 || (last !== -1 && last < cleaned.length - 1)) cleaned = cleaned.slice(first, last + 1);
    const plan = JSON.parse(cleaned) as VisualPlan;
    if (!plan?.centralMessage || !plan?.title || !Array.isArray(plan.keySections)) return null;
    return plan;
  } catch (e) {
    console.error("[visual-plan]", e);
    return null;
  }
}

// وصف مُعاد الصياغة يُغذّى لمحركات الاستخراج القائمة بدل النص الخام الطويل
export function planToEngineDescription(plan: VisualPlan): string {
  const sections = plan.keySections
    .map((s, i) => `${i + 1}. ${s.heading}: ${s.bullets.join(" · ")}${s.stat ? ` (${s.stat})` : ""}`)
    .join("\n");
  return `العنوان: ${plan.title}
العنوان الفرعي: ${plan.subtitle}
الرسالة: ${plan.shortVisualCopy || plan.centralMessage}
الأقسام:
${sections}
${plan.importantNumbers?.length ? `أرقام بارزة: ${plan.importantNumbers.join(" | ")}` : ""}
استخدم هذه الصياغات القصيرة كما هي — لا تُطِل النصوص.`;
}
