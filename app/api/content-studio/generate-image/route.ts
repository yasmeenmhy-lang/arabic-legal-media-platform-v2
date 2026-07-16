import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest } from "@/lib/api";
import { KINGDOM_STYLE_RULE } from "@/lib/governance";
import { generatePremiumImage, providerStatus, verifyOpenAIKey } from "@/lib/image-providers";
import { generateVisualPlan, planToEngineDescription, type VisualPlan } from "@/lib/visual-translator";

// توليد الصور عبر مزودين خارجيين قد يستغرق حتى دقيقة
export const maxDuration = 60;

const schema = z.object({
  description: z.string().min(5),
  visualType: z.enum(["image", "chart", "mindmap", "infographic", "quote_card", "carousel", "storyboard", "motion_script"]).default("image"),
  chartType: z.string().optional(),
  style: z.string().optional(),
  dimensions: z.string().optional(),
  channel: z.string().optional(),
  // طلب تعديل على مرئي سبق إنشاؤه — يُطبق على البيانات والتصميم معاً
  editInstruction: z.string().max(500).optional(),
  // البنية الحالية للرسم — التعديل يُطبَّق عليها بدل إعادة التوليد من الصفر
  previousVisual: z.object({ type: z.string(), chartType: z.string().optional(), data: z.unknown() }).optional(),
  // وضع الإخراج: البنية القابلة للتعديل (الافتراضي — السلوك القائم) أو صورة احترافية أو الاثنان
  outputMode: z.enum(["editable_svg", "premium_image", "both"]).default("editable_svg"),
  // توليد الخطة فقط (خطوة المراجعة) / خطة معتمدة من المستخدم — تُستخدم كما هي دون النص الخام
  planOnly: z.boolean().optional(),
  approvedPlan: z.custom<import("@/lib/visual-translator").VisualPlan>().optional(),
  audience: z.string().optional(),
  purpose: z.string().optional(),
  // معادلة السياق تسري على المرئيات أيضاً: النوع والتخصص والمصدر عوامل حاكمة
  contentType: z.string().max(60).optional(),
  specialty: z.string().max(60).optional(),
  source: z.string().max(160).optional(),
});

// ── الموجز البصري + المسار الاحترافي ─────────────────────────────────────
// الموجز يكثّف النص الطويل إلى بنية موجهة للتصميم — وعند فشله نعود للوصف الخام.

type VisualBrief = {
  centralMessage: string;
  objective: string;
  targetAudience: string;
  channel: string;
  visualType: string;
  planningType: string;
  keyPoints: string[];
  suggestedSections: string[];
  importantNumbers: string[];
  complianceSensitivePhrases: string[];
  recommendedTone: string;
  rtlArabicNotes: string;
};

async function generateVisualBrief(
  apiKey: string,
  description: string,
  ctx: { channel?: string; audience?: string; purpose?: string; visualType: string; planningType?: string; contentType?: string; specialty?: string; source?: string }
): Promise<VisualBrief | null> {
  try {
    const prompt = `حوّل النص التالي إلى موجز بصري JSON مضغوط لتصميم مرئي قانوني احترافي. أخرج JSON فقط بالمفاتيح:
{"centralMessage":"الرسالة المركزية بجملة واحدة","objective":"هدف المرئي","targetAudience":"الجمهور","channel":"القناة","visualType":"نوع المرئي","planningType":"نمط التخطيط","keyPoints":["3-5 نقاط موجزة"],"suggestedSections":["أقسام مقترحة"],"importantNumbers":["أرقام أو مواد نظامية مهمة"],"complianceSensitivePhrases":["أي عبارات في النص تعد وعداً بنتيجة أو تفوقاً أو نسب نجاح — انقلها حرفياً لتجنبها"],"recommendedTone":"النبرة","rtlArabicNotes":"ملاحظات اتجاه/خط عربي"}
معادلة السياق (كل عامل حاكم يجب أن يظهر أثره في الموجز): القناة ${ctx.channel ?? "عام"} تحدد إيقاع النصوص — الجمهور ${ctx.audience ?? "عام"} يحدد مستوى اللغة — الهدف ${ctx.purpose ?? "توعية"} يحدد الرسالة المركزية — النوع البصري ${ctx.visualType}${ctx.planningType ? ` — النمط ${ctx.planningType}` : ""}${ctx.contentType ? ` — نوع المحتوى ${ctx.contentType} يحدد طابع النصوص` : ""}${ctx.specialty ? ` — التخصص ${ctx.specialty} يحصر المجال` : ""}${ctx.source ? ` — مصدر الفكرة ${ctx.source} منطلق المضمون` : ""}
${KINGDOM_STYLE_RULE}
النص:
${description.slice(0, 2500)}`;
    const raw = await callClaude(apiKey, "claude-haiku-4-5-20251001", 900, prompt);
    const brief = parseJson<VisualBrief>(raw);
    if (!brief?.centralMessage) return null;
    return brief;
  } catch (e) {
    console.error("[visual-brief]", e);
    return null;
  }
}

// مقاسات القناة للمسار الاحترافي
function premiumDims(channel?: string): { w: number; h: number; label: string } {
  const c = (channel ?? "").toLowerCase();
  if (c.includes("instagram")) return { w: 1024, h: 1024, label: "مربع 1:1" };
  if (c.includes("tiktok") || c.includes("snap") || c.includes("story")) return { w: 1024, h: 1536, label: "طولي 9:16" };
  return { w: 1536, h: 1024, label: "عرضي 16:9" }; // LinkedIn / X / YouTube / عام
}

// المرئي الاحترافي أصل اتصال بصري مُصمَّم — لا صورة فوتوغرافية إلا بطلب صريح
function isPhotoExplicitlyRequested(text: string): boolean {
  const t = text.toLowerCase();
  return ["صورة فوتوغرافية", "فوتوغرافي", "مشهد واقعي", "صورة واقعية", "realistic photo", "photorealistic", "portrait"]
    .some((k) => t.includes(k));
}

const PREMIUM_TYPE_STYLE: Record<string, string> = {
  mindmap: "mind map / node diagram: عقد وفروع متصلة بخطوط، تسلسل هرمي واضح",
  infographic: "infographic layout: أقسام وبطاقات وأيقونات خطية وأرقام بارزة",
  chart: "chart / data visual: أعمدة أو منحنيات أو نسب مع محاور وقيم واضحة",
  executive: "KPI / report visual: مؤشرات ودوائر نسب وبطاقات أرقام تنفيذية",
  image: "poster/card design: ملصق تصميمي بعناصر نصية ورسومية — ليس صورة فوتوغرافية",
  quote_card: "quote card: بطاقة اقتباس أنيقة بعلامات تنصيص كبيرة — نصان فقط داخل الصورة: العنوان وجملة الاقتباس منسوخين حرفياً بخط كبير؛ لا أي نص آخر إطلاقاً",
  // بقرار مالكة المنصة: الكاروسيل والستوري بورد يخرجان مرئياً احترافياً من OpenAI افتراضياً —
  // بمستوى استوديوهات التصميم التحريري (مراجع Pinterest المعتمدة): كثافة تحريرية ورسوم توضيحية غنية
  carousel: "premium editorial carousel sheet, studio-grade Instagram carousel design: sequence of numbered cards laid out on one sheet, each card a rich editorial composition — hand-crafted flat object illustrations and line icons (objects, documents, symbols — strictly no people or faces) integrated into every card, decorative editorial ornaments (frames, ticks, dotted paths), alternating background tones, strong cover card and closing card, a cohesive sophisticated palette freely chosen to best suit the subject, dense but organized like a top design studio template — NOT a plain list of boxes; TEXT: nearly text-free — the ONLY Arabic text is one short cover title (2-4 words); card numbers as Arabic-Indic numerals; every idea expressed through illustration and icons, never through written sentences",
  storyboard: "premium illustrated storyboard sheet, film-production quality: numbered cinematic frames in 16:9 with rich flat illustrations of each scene (environments, props, and objects only — strictly no people, faces, or characters — drawn in an elegant editorial illustration style), scene number badges, duration tags, camera-direction arrows, a winding visual flow connecting frames, decorative editorial ornaments, a sophisticated background and palette freely chosen to best suit the story — like a professional animation studio's illustrated storyboard, NOT plain empty rectangles; TEXT: nearly text-free — the ONLY Arabic text is one short sheet title (2-4 words); frame numbers and durations as numerals; scenes communicate purely through illustration, never through written sentences",
  motion_script: "motion plan: لقطات مرقمة بنص شاشة وحركة ومدة",
};

// مطالبة المرئي الاحترافي — تصميم اتصالي عربي RTL، بلا صور واقعية افتراضياً
function premiumImagePrompt(brief: VisualBrief | null, description: string, ctx: { channel?: string; audience?: string; purpose?: string; visualType: string; style?: string; photoAllowed?: boolean; contentType?: string; specialty?: string; source?: string }, dims: { label: string }): string {
  const avoid = [
    "نضمن", "مضمون", "أفضل محامي", "الأفضل", "100%", "١٠٠٪", "نسبة نجاح", "تعويض مضمون", "حكم مضمون",
    ...(brief?.complianceSensitivePhrases ?? []),
  ].filter(Boolean);
  const core = brief
    ? `الرسالة المركزية: "${brief.centralMessage}"
الهدف: ${brief.objective} — الجمهور: ${brief.targetAudience}
النقاط الأساسية (مادة سياقية تُترجم إلى رسوم وأيقونات — لا تُنسخ نصاً داخل الصورة إلا بقدر ما تسمح به قاعدة النص الصارمة أدناه):
${(brief.keyPoints ?? []).slice(0, 5).map((k, i) => `${i + 1}. ${k}`).join("\n")}
${(brief.importantNumbers ?? []).length ? `أرقام/مواد يجوز إبرازها: ${(brief.importantNumbers ?? []).slice(0, 3).join("، ")}` : ""}
النبرة: ${brief.recommendedTone || "مهنية رصينة"} — ${brief.rtlArabicNotes || ""}`
    : `الموضوع: ${description.slice(0, 600)}`;
  const photoAllowed = ctx.photoAllowed === true;
  const typeStyle = PREMIUM_TYPE_STYLE[ctx.visualType] ?? PREMIUM_TYPE_STYLE.infographic;
  const designDirectives = photoAllowed ? "" : `
This is a designed visual communication asset, not a photorealistic image.
Do not generate photorealistic photos.
Do not generate realistic people, portraits, buildings, city skylines, courthouses, monuments, judges, lawyers, or dramatic legal scenes unless explicitly requested by the user.
No city, no buildings, no skyline, no photo, no dramatic scene — diagram, infographic layout, cards, nodes, sections, icons, and charts only.
Use infographic, vector, editorial, flat design, diagrammatic, or layout-based visual style.
Use Arabic RTL layout. Use short Arabic text blocks.
Use icons, cards, sections, nodes, charts, lines, diagrams, abstract shapes, and clear visual hierarchy.
The result must look like a professional designed visual, not a stock photo.
نمط هذا المخرج تحديداً: ${typeStyle}.`;
  const alwaysBan = `
Never include, under any circumstance: any invented or fake logo, brand mark, seal, stamp, official/government mark, any entity or organization name, any random foreign/Latin filler text, any watermark, and any source line or footer text not explicitly provided by the user.
Cultural and professional fit is mandatory — this design is for a Saudi legal platform: never draw pigs in any form, including piggy banks (for savings or money draw a safe, wallet, coin pouch, or coins instead); no dogs, no alcohol, no religious symbols, no statues; ABSOLUTE RULE — never draw people, human faces, human figures, or characters of any kind, not even illustrated/cartoon ones: represent every idea through objects, documents, icons, and symbols only (scales of justice, law book, gavel, contract, shield, clock, checkmark); never the European section sign §.
الملاءمة الثقافية والمهنية إلزامية: كل عنصر يجب أن يليق بالثقافة السعودية وبمهنة المحاماة — ممنوع الخنزير بكل أشكاله بما فيها حصالة الخنزير (للمال والادخار ارسم خزنة أو محفظة أو عملات)، وممنوع الكلاب والرموز الدينية والتماثيل والمشروبات المحرمة، وممنوع منعاً مطلقاً رسم أي شخص أو وجه أو شخصية بأي أسلوب كان (ولا حتى رسوماً كرتونية) — كل فكرة تُمثَّل بغرض أو وثيقة أو أيقونة أو رمز فقط.`;
  // قرار حاسم بأمر مالكة المنصة: نماذج صور OpenAI تشوّه العربية دائماً (حتى العنوان)، فالصورة
  // الاحترافية تخرج بلا أي نص عربي إطلاقاً — تكوين بصري بالأيقونات فقط، والنصوص كلها مصدرها
  // المرئيات المرسومة (SVG) حيث العربية مثالية. هذا يلغي التشويه من جذره.
  const strictTextRule = `قاعدة النص الحاسمة غير القابلة للتجاوز (النص العربي المرسوم في نماذج الصور يتشوّه دائماً ويسيء لمهنة المحاماة): لا تكتب أي نص عربي داخل الصورة إطلاقاً — لا عنوان، ولا عبارة، ولا تسمية، ولا كلمة واحدة. الصورة تكوين بصري خالص بالأيقونات والرموز والأغراض القانونية فقط، وتُعبّر عن كل المعاني بالرسم لا بالحروف. الأرقام الهندية (١ ٢ ٣ ٤) وحدها مسموحة للتسلسل، متسلسلة كاملة بلا قفز. أي حرف عربي مرسوم يُعدّ خطأً فادحاً.`;
  return `أنشئ مرئياً تصميمياً تحريرياً مصقولاً عالي الجودة باللغة العربية، اتجاه RTL كامل.${alwaysBan}${designDirectives}
${core}
معادلة السياق الحاكمة: القناة ${ctx.channel ?? "عام"} (التنسيق ${dims.label}) — الجمهور ${ctx.audience ?? "عام"} يحدد مستوى أي نص داخل الصورة وطابع الرسوم — الهدف ${ctx.purpose ?? "توعية"} يحدد الرسالة البصرية المركزية${ctx.contentType ? ` — نوع المحتوى ${ctx.contentType}` : ""}${ctx.specialty ? ` — التخصص ${ctx.specialty}: الرموز والمشاهد من مجاله حصراً` : ""}${ctx.source ? ` — مصدر الفكرة: ${ctx.source}` : ""}${ctx.style ? ` — الأسلوب: ${ctx.style}` : ""}
${KINGDOM_STYLE_RULE}
مواصفات تكوين بمستوى استوديو تصميم عالمي (إلزامية): شبكة تخطيط منضبطة الاصطفاف بهوامش سخية متساوية؛ عائلة أيقونات واحدة متسقة السماكة والأسلوب (خطية أنيقة بلمسات تعبئة ناعمة) — لا خلط أساليب؛ عمق بصري عبر طبقات وظلال ناعمة جداً وخلفيات بطاقات متنوعة الدرجات من اللوحة؛ ترقيم متسلسل كامل بلا قفز (١ ثم ٢ ثم ٣ ثم ٤)؛ عنصر بطل واحد أكبر يقود العين ثم عناصر متدرجة الأهمية؛ خط عربي هندسي حديث نظيف كبير للعنوان بلا أي تشويه أو قص — النتيجة تصميم يُظن أنه من استوديو هوية محترف، لا قالب مبتدئ متكرر.
لوحة الألوان إلزامية — لوحة «كود المنصات» الرسمية كاملة، استخدمها بثراء وتنوع لا بلون واحد باهت:
- الخلفية: أبيض نقي #FFFFFF أو ورقي #FCFCFD
- العائلة الرئيسية المهيمنة (الأخضر الرسمي بكل درجاته): #166A45 و#1B8354 و#25935F و#54C08A و#88D8AD و#B8EACB والنعناعي #DFF6E7 و#F3FCF6 — نوّع بين الداكن والمتوسط والفاتح لعمق بصري حقيقي
- الذهبي الثانوي للإبراز والأرقام والشارات: #DBA102 و#B87B02 وخلفياته الناعمة #FFFCE6 و#FCF3BD
- البنفسجي الخزامي كلون مساند للتمييز بين الأقسام: #80519F و#6D428F وخلفيته #F9F5FA
- الأزرق المعلوماتي الرسمي كعائلة مساندة ثانية: #1570EF و#175CD3 وخلفيته الناعمة #EFF8FF
- الأحمر الدلالي حصراً لأيقونات التحذير والمنع (علامة X، ما يجب تجنبه): #D92D20 وخلفيته #FEF3F2 — بجرعة صغيرة
- النصوص والعناصر الداكنة: #0D121C و#384250
- التدرجات المعتمدة مسموحة: من #1B8354 إلى #25935F ومن #166A45 إلى #1B8354
Mandatory palette — the FULL official Saudi platform design-system palette, used RICHLY (multi-tone, layered, alive — not flat monochrome): dominant green family #166A45/#1B8354/#25935F/#54C08A/#88D8AD/#B8EACB/#DFF6E7 on white, secondary gold #DBA102/#B87B02 with soft #FFFCE6 chips for numbers and highlights, supporting lavender #80519F/#6D428F with soft #F9F5FA and info blue #1570EF/#175CD3 with soft #EFF8FF for section distinction, small semantic red #D92D20 strictly for warning/prohibition icons only, dark neutrals #0D121C/#384250 for text, official gradients green-to-green allowed. STRICTLY FORBIDDEN: beige, cream, orange, brown, warm/earthy palettes, or any color outside this official list.
${strictTextRule}
ممنوع منعاً باتاً: أي كلمة عربية مؤلفة من عندك — كل نص عربي داخل الصورة منسوخ حرفاً حرفاً من النصوص المعطاة أعلاه وإلا فلا تكتبه، أي أشخاص أو وجوه أو شخصيات بأي أسلوب (واقعي أو مرسوم أو كرتوني) — التمثيل بالأغراض والأيقونات والرموز فقط، أي شعارات أو أختام أو علامات حكومية رسمية، أي إيحاء باعتماد رسمي، أي وعد بنتيجة قانونية أو ضمان أو نسب نجاح أو ادعاء أفضلية${avoid.length ? `، وتجنب حرفياً هذه العبارات: ${avoid.slice(0, 10).join(" ، ")}` : ""}.`;
}

// حالة المزودين للواجهة — لا تكشف أي مفاتيح، وتتضمن تحققاً فعلياً من مفتاح OpenAI
export async function GET() {
  const status = providerStatus();
  const openaiCheck = status.openai && status.mode !== "mock" ? await verifyOpenAIKey() : null;
  return NextResponse.json({
    ...status,
    openaiVerified: openaiCheck?.verified ?? false,
    verifyNote: openaiCheck?.note,
  });
}

// ── Types ─────────────────────────────────────────────────────────────────

interface ChartData {
  title: string;
  yLabel: string;
  data: { label: string; value: number }[];
}

interface MindMapData {
  title?: string;
  center: string;
  branches: { label: string; sub1?: string; sub2?: string }[];
}

interface InfographicData {
  title: string;
  subtitle: string;
  sections: { heading: string; line1: string; line2: string; line3?: string; stat?: string }[];
  source: string;
}

// ── Anthropic helper ──────────────────────────────────────────────────────

async function callClaude(
  apiKey: string,
  model: string,
  maxTokens: number,
  prompt: string
): Promise<string> {
  const res = await fetch(`${process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com"}/v1/messages`, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}`);
  const payload = (await res.json()) as { content?: { type: string; text: string }[] };
  return payload.content?.find((c) => c.type === "text")?.text?.trim() ?? "";
}

// بقرار مالكة المنصة: بيانات المرئيات المرسومة (الرسوم البيانية والإنفوغراف والبطاقات)
// تُستخرج عبر مفتاح OpenAI أولاً، وعند غيابه أو فشله يتولى Claude تلقائياً — لا توقف للمرئيات.
async function callOpenAIExtractor(maxTokens: number, prompt: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${process.env.OPENAI_BASE_URL ?? "https://api.openai.com"}/v1/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`openai-extract ${res.status}`);
    const payload = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return payload.choices?.[0]?.message?.content?.trim() || null;
  } catch (e) {
    console.error("[extract-openai]", e instanceof Error ? e.message : e);
    return null;
  }
}

async function callExtractor(apiKey: string, maxTokens: number, prompt: string): Promise<string> {
  const viaOpenAI = await callOpenAIExtractor(maxTokens, prompt);
  if (viaOpenAI) return viaOpenAI;
  return callClaude(apiKey, "claude-haiku-4-5-20251001", maxTokens, prompt);
}

function parseJson<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // تحصين: أي نص زائد حول الكائن (مقدمة، أسوار متداخلة) — يُقتطع من أول { إلى آخر }
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1)) as T;
    throw new Error("json-parse-failed");
  }
}

// ── SVG renderers (programmatic — no AI coordinates) ─────────────────────

// DGA Madkhel exact tokens (design.dga.gov.sa/guidelines)
const FONT       = "IBM Plex Sans Arabic,Tahoma,Arial,sans-serif";
const PALM       = "#25935F"; // SA-500 — brand primary
const PALM_DARK  = "#1B8354"; // SA-600
const PALM_DEEP  = "#166A45"; // SA-700
const MINT       = "#F3FCF6"; // SA-50
const MINT_DEEP  = "#DFF6E7"; // SA-100
const INK        = "#0D121C"; // Gray-950 — primary text
const INK_SEC    = "#384250"; // Gray-700
const INK_TER    = "#4D5761"; // Gray-600
const LINE       = "#E5E7EB"; // Gray-200 — borders
const CANVAS_BG  = "#F4F7F6"; // page background
// Chart bar palette — درجات DGA أعمق (600/700) مدقَّقة حسابياً: نطاق الإضاءة، عتبة الصبغة،
// فصل عمى الألوان بين المتجاورات، وتباين ≥ 3:1 على السطح الورقي — كلها ناجحة بلا تحذير
const BAR_COLORS = ["#1B8354", "#54C08A", "#88D8AD", "#B8EACB", "#166A45"];

// Truncate Arabic text to max chars, appending ellipsis
function trunc(s: string, max: number): string {
  if (!s) return "";
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

// Full word-wrap: returns ALL lines — no truncation, no data loss
function wrapFull(s: string, maxPerLine: number): string[] {
  const words = (s || "").trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const candidate = cur ? `${cur} ${w}` : w;
    if (candidate.length > maxPerLine && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = candidate;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

// Wrap text into up to two lines at word boundaries — no mid-word cuts
function wrap2(s: string, maxPerLine: number): string[] {
  const t = (s || "").trim();
  if (t.length <= maxPerLine) return [t];
  const words = t.split(/\s+/);
  let line1 = "";
  for (const w of words) {
    const candidate = line1 ? `${line1} ${w}` : w;
    if (candidate.length > maxPerLine && line1) break;
    line1 = candidate;
  }
  const rest = t.slice(line1.length).trim();
  if (!rest) return [line1];
  return [line1, trunc(rest, maxPerLine)];
}

// ── Charts: 1200×628 (16:9, matches LinkedIn / Twitter / YouTube) ─────────

function renderBarChartSvg(d: ChartData): string {
  const W = 1200, H = 628, ML = 90, MR = 40, MT = 100, MB = 110;
  const cW = W - ML - MR, cH = H - MT - MB;
  const items = d.data.slice(0, 6);
  const maxVal = (Math.max(...items.map((x) => x.value)) || 1) * 1.25;
  const step = cW / items.length;
  const bw = Math.floor(step * 0.52);
  const toY = (v: number) => MT + cH - Math.round((v / maxVal) * cH);
  const bx = (i: number) => ML + i * step + Math.floor((step - bw) / 2);

  const gridLines = [0, 1, 2, 3, 4].map((i) => {
    const v = Math.round((maxVal * i) / 4);
    const y = toY(v);
    return `<line x1="${ML}" y1="${y}" x2="${W - MR}" y2="${y}" stroke="${LINE}" stroke-width="1"/>
<text x="${ML - 10}" y="${y + 5}" text-anchor="end" font-family="${FONT}" font-size="14" fill="${INK_TER}">${v}</text>`;
  }).join("\n");

  const bars = items.map((item, i) => {
    const x = bx(i), y = toY(item.value), bh = H - MB - y;
    return `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="${BAR_COLORS[i % BAR_COLORS.length]}" rx="4"/>
<text x="${x + bw / 2}" y="${y - 9}" text-anchor="middle" font-family="${FONT}" font-size="14" font-weight="600" fill="${INK}">${item.value}</text>
<text x="${x + bw / 2}" y="${H - MB + 22}" text-anchor="middle" font-family="${FONT}" font-size="13" fill="${INK_SEC}">${trunc(item.label, 10)}</text>`;
  }).join("\n");

  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="max-width:960px;display:block;margin-inline:auto">
<rect width="${W}" height="${H}" fill="${CANVAS_BG}"/>
<text x="${W / 2}" y="56" text-anchor="middle" font-family="${FONT}" font-size="28" font-weight="700" fill="${INK}">${trunc(d.title, 36)}</text>
<text x="${W / 2}" y="84" text-anchor="middle" font-family="${FONT}" font-size="16" fill="${INK_TER}">${trunc(d.yLabel, 40)}</text>
${gridLines}
<line x1="${ML}" y1="${MT}" x2="${ML}" y2="${H - MB}" stroke="${LINE}" stroke-width="1.5"/>
<line x1="${ML}" y1="${H - MB}" x2="${W - MR}" y2="${H - MB}" stroke="${LINE}" stroke-width="1.5"/>
${bars}
</svg>`;
}

function renderLineChartSvg(d: ChartData): string {
  const W = 1200, H = 628, ML = 90, MR = 40, MT = 100, MB = 110;
  const cW = W - ML - MR, cH = H - MT - MB;
  const items = d.data.slice(0, 6);
  const maxVal = (Math.max(...items.map((x) => x.value)) || 1) * 1.25;
  const gapX = cW / Math.max(items.length - 1, 1);
  const toX = (i: number) => ML + i * gapX;
  const toY = (v: number) => MT + cH - Math.round((v / maxVal) * cH);

  const gridLines = [0, 1, 2, 3, 4].map((i) => {
    const v = Math.round((maxVal * i) / 4);
    const y = toY(v);
    return `<line x1="${ML}" y1="${y}" x2="${W - MR}" y2="${y}" stroke="${LINE}" stroke-width="1"/>
<text x="${ML - 10}" y="${y + 5}" text-anchor="end" font-family="${FONT}" font-size="14" fill="${INK_TER}">${v}</text>`;
  }).join("\n");

  const pts = items.map((it, i) => `${toX(i)},${toY(it.value)}`).join(" ");
  const fill = `${ML},${H - MB} ${pts} ${toX(items.length - 1)},${H - MB}`;

  const dots = items.map((it, i) =>
    `<circle cx="${toX(i)}" cy="${toY(it.value)}" r="6" fill="${CANVAS_BG}" stroke="${PALM}" stroke-width="3"/>
<text x="${toX(i)}" y="${toY(it.value) - 14}" text-anchor="middle" font-family="${FONT}" font-size="13" font-weight="600" fill="${INK}">${it.value}</text>
<text x="${toX(i)}" y="${H - MB + 22}" text-anchor="middle" font-family="${FONT}" font-size="13" fill="${INK_SEC}">${trunc(it.label, 10)}</text>`
  ).join("\n");

  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="max-width:960px;display:block;margin-inline:auto">
<rect width="${W}" height="${H}" fill="${CANVAS_BG}"/>
<text x="${W / 2}" y="56" text-anchor="middle" font-family="${FONT}" font-size="28" font-weight="700" fill="${INK}">${trunc(d.title, 36)}</text>
<text x="${W / 2}" y="84" text-anchor="middle" font-family="${FONT}" font-size="16" fill="${INK_TER}">${trunc(d.yLabel, 40)}</text>
${gridLines}
<line x1="${ML}" y1="${MT}" x2="${ML}" y2="${H - MB}" stroke="${LINE}" stroke-width="1.5"/>
<line x1="${ML}" y1="${H - MB}" x2="${W - MR}" y2="${H - MB}" stroke="${LINE}" stroke-width="1.5"/>
<polygon points="${fill}" fill="${PALM}" opacity="0.07"/>
<polyline points="${pts}" fill="none" stroke="${PALM}" stroke-width="3" stroke-linejoin="round"/>
${dots}
</svg>`;
}

function renderAreaChartSvg(d: ChartData): string {
  const W = 1200, H = 628, ML = 90, MR = 40, MT = 100, MB = 110;
  const cW = W - ML - MR, cH = H - MT - MB;
  const items = d.data.slice(0, 6);
  const maxVal = (Math.max(...items.map((x) => x.value)) || 1) * 1.25;
  const gapX = cW / Math.max(items.length - 1, 1);
  const toX = (i: number) => ML + i * gapX;
  const toY = (v: number) => MT + cH - Math.round((v / maxVal) * cH);

  const gridLines = [0, 1, 2, 3, 4].map((i) => {
    const v = Math.round((maxVal * i) / 4);
    const y = toY(v);
    return `<line x1="${ML}" y1="${y}" x2="${W - MR}" y2="${y}" stroke="${LINE}" stroke-width="1"/>
<text x="${ML - 10}" y="${y + 5}" text-anchor="end" font-family="${FONT}" font-size="14" fill="${INK_TER}">${v}</text>`;
  }).join("\n");

  const pts = items.map((it, i) => `${toX(i)},${toY(it.value)}`).join(" ");
  const fill = `${ML},${H - MB} ${pts} ${toX(items.length - 1)},${H - MB}`;

  const dots = items.map((it, i) =>
    `<circle cx="${toX(i)}" cy="${toY(it.value)}" r="6" fill="${PALM}" stroke="${CANVAS_BG}" stroke-width="2.5"/>
<text x="${toX(i)}" y="${toY(it.value) - 14}" text-anchor="middle" font-family="${FONT}" font-size="13" font-weight="600" fill="${INK}">${it.value}</text>
<text x="${toX(i)}" y="${H - MB + 22}" text-anchor="middle" font-family="${FONT}" font-size="13" fill="${INK_SEC}">${trunc(it.label, 10)}</text>`
  ).join("\n");

  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="max-width:960px;display:block;margin-inline:auto">
<rect width="${W}" height="${H}" fill="${CANVAS_BG}"/>
<text x="${W / 2}" y="56" text-anchor="middle" font-family="${FONT}" font-size="28" font-weight="700" fill="${INK}">${trunc(d.title, 36)}</text>
<text x="${W / 2}" y="84" text-anchor="middle" font-family="${FONT}" font-size="16" fill="${INK_TER}">${trunc(d.yLabel, 40)}</text>
${gridLines}
<line x1="${ML}" y1="${MT}" x2="${ML}" y2="${H - MB}" stroke="${LINE}" stroke-width="1.5"/>
<line x1="${ML}" y1="${H - MB}" x2="${W - MR}" y2="${H - MB}" stroke="${LINE}" stroke-width="1.5"/>
<polygon points="${fill}" fill="${PALM}" opacity="0.12"/>
<polyline points="${pts}" fill="none" stroke="${PALM}" stroke-width="3" stroke-linejoin="round"/>
${dots}
</svg>`;
}

function renderHBarChartSvg(d: ChartData): string {
  const W = 1200, H = 628, ML = 200, MR = 100, MT = 100, MB = 60;
  const cW = W - ML - MR, cH = H - MT - MB;
  const items = d.data.slice(0, 6);
  const maxVal = (Math.max(...items.map((x) => x.value)) || 1) * 1.25;
  const step = cH / items.length;
  const bh = Math.floor(step * 0.5);
  const toW = (v: number) => Math.round((v / maxVal) * cW);
  const by = (i: number) => MT + i * step + Math.floor((step - bh) / 2);

  const gridLines = [0, 1, 2, 3, 4].map((i) => {
    const v = Math.round((maxVal * i) / 4);
    const x = ML + toW(v);
    return `<line x1="${x}" y1="${MT}" x2="${x}" y2="${H - MB}" stroke="${LINE}" stroke-width="1"/>
<text x="${x}" y="${H - MB + 20}" text-anchor="middle" font-family="${FONT}" font-size="13" fill="${INK_TER}">${v}</text>`;
  }).join("\n");

  const bars = items.map((item, i) => {
    const y = by(i), barW = toW(item.value);
    return `<rect x="${ML}" y="${y}" width="${barW}" height="${bh}" fill="${BAR_COLORS[i % BAR_COLORS.length]}" rx="4"/>
<text x="${ML + barW + 8}" y="${y + bh / 2 + 5}" text-anchor="start" font-family="${FONT}" font-size="14" font-weight="600" fill="${INK}">${item.value}</text>
<text x="${ML - 12}" y="${y + bh / 2 + 5}" text-anchor="end" font-family="${FONT}" font-size="13" fill="${INK_SEC}">${trunc(item.label, 12)}</text>`;
  }).join("\n");

  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="max-width:960px;display:block;margin-inline:auto">
<rect width="${W}" height="${H}" fill="${CANVAS_BG}"/>
<text x="${W / 2}" y="56" text-anchor="middle" font-family="${FONT}" font-size="28" font-weight="700" fill="${INK}">${trunc(d.title, 36)}</text>
<text x="${W / 2}" y="84" text-anchor="middle" font-family="${FONT}" font-size="16" fill="${INK_TER}">${trunc(d.yLabel, 40)}</text>
${gridLines}
<line x1="${ML}" y1="${MT}" x2="${ML}" y2="${H - MB}" stroke="${LINE}" stroke-width="1.5"/>
${bars}
</svg>`;
}

function renderPieOrDonutSvg(d: ChartData, isDonut: boolean): string {
  // Square 1080×1080 — matches Instagram square
  const W = 1080, H = 1080;
  const cx = 540, cy = 520, R = 280, ri = isDonut ? 140 : 0;
  const items = d.data.slice(0, 6);
  const total = items.reduce((s, x) => s + x.value, 0) || 1;

  let angle = -Math.PI / 2;
  const slices = items.map((item, i) => {
    const frac = item.value / total;
    const start = angle;
    angle += frac * 2 * Math.PI;
    const end = angle;
    const x1 = cx + R * Math.cos(start), y1 = cy + R * Math.sin(start);
    const x2 = cx + R * Math.cos(end), y2 = cy + R * Math.sin(end);
    const large = frac > 0.5 ? 1 : 0;
    const pct = Math.round(frac * 100);
    const lAngle = start + (frac * Math.PI);
    const lx = cx + (R * 0.68) * Math.cos(lAngle);
    const ly = cy + (R * 0.68) * Math.sin(lAngle);

    if (isDonut) {
      const ix1 = cx + ri * Math.cos(end), iy1 = cy + ri * Math.sin(end);
      const ix2 = cx + ri * Math.cos(start), iy2 = cy + ri * Math.sin(start);
      return `<path d="M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${ri} ${ri} 0 ${large} 0 ${ix2} ${iy2} Z" fill="${BAR_COLORS[i]}" stroke="#fff" stroke-width="3"/>
${pct >= 7 ? `<text x="${lx}" y="${ly + 6}" text-anchor="middle" font-family="${FONT}" font-size="18" font-weight="600" fill="#fff">${pct}%</text>` : ""}`;
    }
    return `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z" fill="${BAR_COLORS[i]}" stroke="#fff" stroke-width="3"/>
${pct >= 5 ? `<text x="${lx}" y="${ly + 6}" text-anchor="middle" font-family="${FONT}" font-size="18" font-weight="600" fill="#fff">${pct}%</text>` : ""}`;
  });

  const legendY = 870;
  const legend = items.map((item, i) => {
    const lx = 120 + Math.floor(i / 3) * 500;
    const ly = legendY + (i % 3) * 42;
    return `<rect x="${lx}" y="${ly}" width="22" height="22" rx="4" fill="${BAR_COLORS[i]}"/>
<text x="${lx + 32}" y="${ly + 16}" font-family="${FONT}" font-size="16" fill="${INK_SEC}">${trunc(item.label, 14)}: ${item.value}</text>`;
  }).join("\n");

  const center = isDonut
    ? `<circle cx="${cx}" cy="${cy}" r="${ri - 4}" fill="${CANVAS_BG}"/>
<text x="${cx}" y="${cy - 12}" text-anchor="middle" font-family="${FONT}" font-size="44" font-weight="700" fill="${PALM}">${Math.round((items[0].value / total) * 100)}%</text>
<text x="${cx}" y="${cy + 22}" text-anchor="middle" font-family="${FONT}" font-size="18" fill="${INK_SEC}">${trunc(items[0].label, 12)}</text>`
    : "";

  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="max-width:960px;display:block;margin-inline:auto">
<rect width="${W}" height="${H}" fill="${CANVAS_BG}"/>
<text x="${W / 2}" y="64" text-anchor="middle" font-family="${FONT}" font-size="30" font-weight="700" fill="${INK}">${trunc(d.title, 32)}</text>
${slices.join("\n")}
${center}
${legend}
</svg>`;
}

function renderChartSvg(data: ChartData, chartType: string): string {
  const t = chartType.toLowerCase();
  if (t.includes("خطي") || t.includes("line")) return renderLineChartSvg(data);
  if (t.includes("مساحة") || t.includes("area")) return renderAreaChartSvg(data);
  if (t.includes("أفقية") || t.includes("hbar") || t.includes("h-bar")) return renderHBarChartSvg(data);
  if (t.includes("دائري") || t.includes("pie")) return renderPieOrDonutSvg(data, false);
  if (t.includes("حلقي") || t.includes("donut")) return renderPieOrDonutSvg(data, true);
  return renderBarChartSvg(data);
}

// ── Mind map: 1240×dynamic — RTL horizontal tree ──────────────────────────
// الجذر يمين، الفروع عمود أوسط، التفاصيل عمود يسار. لا قصّ للنصوص إطلاقاً:
// كل عقدة تلتفّ أسطراً كاملة ويتكيّف حجمها وارتفاع اللوحة مع المحتوى.

// Per-branch accent hues — نفس لوحة الرسوم البيانية المدقَّقة (أخضر/ذهبي/بنفسجي/أزرق/برتقالي 600/700)
const MM_ACCENTS = BAR_COLORS;
// أرقام هندية للترقيم التحريري في الراسمات
const MM_AR = ["١", "٢", "٣", "٤", "٥", "٦", "٧", "٨"];

// ── المحركات المفعّلة بأمر مالكة المنصة: بطاقة اقتباس، كاروسيل، ستوري بورد، مخطط موشن ──

interface QuoteCardData { title: string; quote: string; attribution?: string; note?: string }
interface CardsData { title: string; subtitle?: string; cards: { tag: string; heading: string; line1: string; line2?: string; meta?: string }[] }

function quoteCardDataPrompt(desc: string): string {
  return `من المحتوى التالي استخرج أبرز رسالة أو اقتباساً واحداً يصلح لبطاقة اقتباس/توعية قانونية رصينة.
ربط إلزامي بالخطة إن وُجدت حقولها في المحتوى: سطر «العنوان:» هو عنوان البطاقة كما هو، وسطر «الرسالة:» هو نص الاقتباس كما هو حرفياً (لا تعد صياغته)، وإن ذُكر نظام أو مادة في الأقسام فاجعله النسبة.
المحتوى: ${desc}
أخرج JSON فقط بلا أي نص آخر:
{"title":"عنوان قصير للبطاقة (٣-٦ كلمات)","quote":"الجملة الأبرز (١٥-٣٥ كلمة) — النص النظامي يُنقل حرفياً","attribution":"نسبة الاقتباس لمصدره (المادة/النظام/الجهة) أو \"\" إن كان صياغة عامة","note":"سطر توضيحي قصير اختياري"}
ممنوع: وعود بنتائج، مقارنات، أسماء جهات كشعارات، أخطاء إملائية.\nقاعدة حاكمة (بأمر مالكة المنصة): أنت تترجم المحتوى أعلاه بصرياً — كل نص ورقم ومادة نظامية في الناتج يجب أن يكون مستخرجاً أو معاد صياغته من المحتوى المعطى حصراً؛ ممنوع اختراع معلومة أو رقم أو مثال أو مادة لم ترد فيه.\n${KINGDOM_STYLE_RULE}`;
}

function cardsDataPrompt(desc: string, kind: "carousel" | "storyboard" | "motion"): string {
  const spec = kind === "carousel"
    ? `كاروسيل من ٤ إلى ٦ بطاقات متسلسلة تحكي الفكرة: الأولى افتتاحية جاذبة والأخيرة خلاصة عملية. tag: ترقيم مثل "١/٥". meta: "".`
    : kind === "storyboard"
    ? `ستوري بورد فيديو من ٤ إلى ٦ مشاهد. tag: "مشهد ١". heading: عنوان المشهد. line1: وصف اللقطة المرئية. line2: التعليق الصوتي بجملة واحدة. meta: المدة مثل "٨ ثوانٍ".`
    : `مخطط موشن جرافيك من ٤ إلى ٦ لقطات. tag: "لقطة ١". heading: النص الظاهر على الشاشة (موجز). line1: وصف الحركة والانتقال. line2: العنصر الرسومي الرئيس. meta: المدة مثل "٥ ثوانٍ".`;
  return `حوّل المحتوى التالي إلى ${spec}
المحتوى: ${desc}
أخرج JSON فقط بلا أي نص آخر:
{"title":"عنوان علوي موجز","subtitle":"سطر فرعي اختياري","cards":[{"tag":"","heading":"","line1":"","line2":"","meta":""}]}
نصوص عربية فصحى موجزة مصقولة. ممنوع: وعود بنتائج، مقارنات، شعارات، أخطاء إملائية.\nقاعدة حاكمة (بأمر مالكة المنصة): أنت تترجم المحتوى أعلاه بصرياً — كل نص ورقم ومادة نظامية في الناتج يجب أن يكون مستخرجاً أو معاد صياغته من المحتوى المعطى حصراً؛ ممنوع اختراع معلومة أو رقم أو مثال أو مادة لم ترد فيه.\n${KINGDOM_STYLE_RULE}`;
}

// بطاقة الاقتباس — لغة هوية بصرية بمستوى استوديو (مرجعية مالكة المنصة):
// عالم لوني واحد ملتزم (أخضر غابي داكن متدرج + ذهبي وحيد)، موتيف حلقات متحدة
// المركز ينزف خارج اللوحة، شرارة ذهبية، واقتباس أبيض ضخم هو بطل التصميم.
const DK_BG1 = "#FCFCFD", DK_BG2 = "#F7FDF9", DK_LINE = "#DFF6E7"; // Gray-25 → SA-25، خطوط SA-100
const DK_TEXT = "#0D121C", DK_MINT = "#4D5761", DK_GOLD = "#B87B02", DK_GOLD_DEEP = "#DBA102";
// شرارة رباعية منحنية — عنصر الهوية الصغير
function spark(cx: number, cy: number, r: number, fill: string, opacity = 1): string {
  return `<path d="M${cx} ${cy - r} C${cx + r * 0.22} ${cy - r * 0.28} ${cx + r * 0.28} ${cy - r * 0.22} ${cx + r} ${cy} C${cx + r * 0.28} ${cy + r * 0.22} ${cx + r * 0.22} ${cy + r * 0.28} ${cx} ${cy + r} C${cx - r * 0.22} ${cy + r * 0.28} ${cx - r * 0.28} ${cy + r * 0.22} ${cx - r} ${cy} C${cx - r * 0.28} ${cy - r * 0.22} ${cx - r * 0.22} ${cy - r * 0.28} ${cx} ${cy - r}Z" fill="${fill}" opacity="${opacity}"/>`;
}
// حلقات متحدة المركز — موتيف الهوية الكبير (ينزف خارج الحواف)
function rings(cx: number, cy: number, base: number, n: number, stroke: string): string {
  return Array.from({ length: n }, (_, k) =>
    `<circle cx="${cx}" cy="${cy}" r="${base + k * 46}" fill="none" stroke="${stroke}" stroke-width="1.5" opacity="${(0.5 - k * 0.09).toFixed(2)}"/>`
  ).join("");
}
function renderQuoteCardSvg(d: QuoteCardData): string {
  const X = (t?: string) => (t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const W = 1200;
  const RX = W - 120;
  // مقاس تكيفي بقرار مالكة المنصة: الاقتباس القصير بطل كبير، والطويل يصغر ويلتف أعرض فلا يتضخم
  const qLen = (d.quote ?? "").length;
  const qFS = qLen > 110 ? 40 : qLen > 70 ? 48 : 58;
  const qWrap = qLen > 110 ? 38 : qLen > 70 ? 32 : 24;
  const quoteLines = wrapFull(d.quote ?? "", qWrap);
  const noteLines = d.note ? wrapFull(d.note, 54) : [];
  const qLH = Math.round(qFS * 1.6), qY = 366;
  const attrY = qY + quoteLines.length * qLH + 14;
  const noteY = attrY + (d.attribution ? 70 : 12);
  const H = Math.max(700, noteY + noteLines.length * 40 + 130);
  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" direction="ltr" style="direction:ltr;max-width:1100px;display:block;margin-inline:auto">
<defs><linearGradient id="qcBg" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="${DK_BG1}"/><stop offset="1" stop-color="${DK_BG2}"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="url(#qcBg)"/>
${rings(96, H - 60, 90, 6, DK_LINE)}
${rings(W - 40, 70, 70, 4, DK_LINE)}
<text x="150" y="360" font-family="${FONT}" font-size="340" font-weight="800" fill="${DK_TEXT}" opacity="0.05">&#x201D;</text>
${spark(RX - 190, 136, 11, DK_GOLD)}
<text x="${RX - 214}" y="144" text-anchor="end" font-family="${FONT}" font-size="18" font-weight="600" fill="${DK_GOLD}">بطاقة اقتباس</text>
<text x="${RX}" y="216" text-anchor="end" font-family="${FONT}" font-size="38" font-weight="800" fill="${DK_TEXT}">${X(d.title)}</text>
<rect x="${RX - 84}" y="244" width="84" height="5" rx="2.5" fill="${DK_GOLD_DEEP}"/>
${quoteLines.map((ln, i) => `<text x="${RX}" y="${qY + i * qLH}" text-anchor="end" font-family="${FONT}" font-size="${qFS}" font-weight="700" fill="${DK_TEXT}">${X(ln)}</text>`).join("\n")}
${d.attribution ? `${spark(RX - 8, attrY - 9, 8, DK_GOLD)}
<text x="${RX - 28}" y="${attrY}" text-anchor="end" font-family="${FONT}" font-size="25" font-weight="600" fill="${DK_GOLD}">${X(d.attribution)}</text>` : ""}
${noteLines.map((ln, i) => `<text x="${RX}" y="${noteY + i * 40}" text-anchor="end" font-family="${FONT}" font-size="22" font-weight="400" fill="${DK_MINT}">${X(ln)}</text>`).join("\n")}
<rect x="${RX - 76}" y="${H - 96}" width="76" height="4" rx="2" fill="${DK_GOLD_DEEP}" opacity="0.9"/>
</svg>`;
}

function renderCardsSheetSvg(d: CardsData, variant: "carousel" | "storyboard" | "motion"): string {
  const X = (t?: string) => (t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const AR_D = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  const arNum = (v: number) => String(v).split("").map((ch) => AR_D[+ch] ?? ch).join("");
  const GOLD_DEEP = "#B87B02", PAPER = "#FAF9F5";
  const W = 1240, PAD = 44, CW = W - PAD * 2;
  const isBoard = variant !== "carousel";
  const SP = isBoard ? 72 : 0; // حارة الترقيم اليمنى لمتتالية المشاهد
  const BW = CW - SP;
  const cards = (d.cards ?? []).slice(0, 8);
  const n = Math.max(cards.length, 1);
  const FW = 332, FH = 200; // إطار المشهد الفيلمي 16:9
  const spX = W - PAD - 30;
  const variantLabel = variant === "carousel" ? "كاروسيل" : variant === "storyboard" ? "ستوري بورد" : "مخطط موشن جرافيك";
  const unitLabel = variant === "carousel" ? "بطاقات" : variant === "storyboard" ? "مشاهد" : "لقطات";

  // ── القياس قبل الرسم: الارتفاعات من النصوص الكاملة بلا قصّ ──
  const headWrap = isBoard ? 34 : 44;
  const bodyWrap = isBoard ? 50 : 64;
  const ms = cards.map((c) => {
    const head = wrapFull(c.heading ?? "", headWrap);
    const l1 = wrapFull(c.line1 ?? "", bodyWrap);
    const l2 = c.line2 ? wrapFull(c.line2, bodyWrap) : [];
    const textH = isBoard
      ? 98 + (head.length - 1) * 41 + 85 + (l1.length - 1) * 33 + (l2.length ? 76 + (l2.length - 1) * 33 : 0) + 30
      : 92 + (head.length - 1) * 41 + 56 + (l1.length - 1) * 33 + (l2.length ? 45 + (l2.length - 1) * 33 : 0) + 34;
    const h = Math.max(textH, isBoard ? 32 + FH + 76 : 168);
    return { h, head, l1, l2 };
  });

  const tLines = wrapFull(d.title ?? "", 40);
  const subLines = d.subtitle ? wrapFull(d.subtitle, 66) : [];
  const headerH = 96 + tLines.length * 50 + subLines.length * 30 + 48;
  const cvT = wrapFull(d.title ?? "", 30);
  const coverH = variant === "carousel" ? 112 + cvT.length * 58 + (d.subtitle ? 40 : 0) + 92 : 0;
  const closeH = variant === "carousel" ? 168 : 0;
  const tlH = isBoard ? 138 : 0;
  const GAP = 34;
  const H = headerH + (coverH ? coverH + 26 : 0) + ms.reduce((a, m) => a + m.h + GAP, 0) + tlH + closeH + 26;

  // ── رسوم مشهدية قانونية ثنائية اللون داخل الإطار (صندوق 264×136) — لون المشهد + ذهبي الهوية،
  //    ظل أرضي وتفاصيل تحريرية غنية، تتنوع بتسلسل المشاهد ──
  const sceneArt = (k: number, acc: string): string => {
    const G = "#1B8354"; // SA-600
    const s = `stroke="${acc}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
    const g2 = `stroke="${G}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
    const shadow = `<ellipse cx="132" cy="131" rx="94" ry="5" fill="${acc}" opacity="0.10"/>`;
    switch (k % 6) {
      case 0: return `${shadow}
<circle cx="233" cy="24" r="11" fill="${G}" opacity="0.85"/>
<g ${g2} stroke-width="2"><path d="M233 7 v-4 M233 41 v4 M216 24 h-4 M250 24 h4 M221 12 l-3 -3 M245 36 l3 3 M245 12 l3 -3 M221 36 l-3 3"/></g>
<path d="M62 48 L132 14 L202 48 Z" fill="${acc}" opacity="0.12"/>
<g ${s}>
<path d="M62 48 L132 14 L202 48 Z"/><circle cx="132" cy="35" r="7"/>
<line x1="70" y1="48" x2="194" y2="48"/><line x1="70" y1="55" x2="194" y2="55"/>
<rect x="80" y="60" width="13" height="42" rx="2"/><rect x="112" y="60" width="13" height="42" rx="2"/><rect x="144" y="60" width="13" height="42" rx="2"/><rect x="176" y="60" width="13" height="42" rx="2"/>
<rect x="66" y="104" width="132" height="9" rx="2"/><rect x="58" y="115" width="148" height="9" rx="2"/>
<circle cx="27" cy="88" r="8"/><path d="M27 96 v18 M27 101 l-9 8 M27 101 l9 8 M27 114 l-7 12 M27 114 l7 12"/></g>
<rect x="34" y="105" width="13" height="10" rx="2" fill="${G}" opacity="0.8"/>`;
      case 1: return `${shadow}
<rect x="10" y="8" width="52" height="40" rx="4" stroke="${acc}" stroke-width="2" fill="none" opacity="0.4"/><line x1="36" y1="8" x2="36" y2="48" stroke="${acc}" stroke-width="2" opacity="0.4"/><line x1="10" y1="28" x2="62" y2="28" stroke="${acc}" stroke-width="2" opacity="0.4"/>
<rect x="94" y="6" width="96" height="40" rx="12" fill="${G}" opacity="0.15"/>
<g ${g2}><rect x="94" y="6" width="96" height="40" rx="12"/><path d="M118 46 l-7 13 18 -13"/><line x1="108" y1="20" x2="176" y2="20"/><line x1="108" y1="32" x2="156" y2="32"/></g>
<g ${s}>
<rect x="52" y="88" width="160" height="10" rx="5"/><line x1="66" y1="98" x2="66" y2="126"/><line x1="198" y1="98" x2="198" y2="126"/>
<rect x="98" y="76" width="34" height="12" rx="2"/><line x1="104" y1="82" x2="126" y2="82"/>
<circle cx="64" cy="56" r="13"/><path d="M44 88 q20 -22 40 0"/>
<circle cx="200" cy="56" r="13"/><path d="M180 88 q20 -22 40 0"/></g>
<path d="M218 80 h18 v9 q0 7 -9 7 t-9 -7 z" fill="${G}" opacity="0.7"/>`;
      case 2: return `${shadow}
<g ${s}>
<rect x="80" y="6" width="112" height="122" rx="6"/>
<line x1="96" y1="42" x2="176" y2="42"/><line x1="96" y1="57" x2="176" y2="57"/><line x1="96" y1="72" x2="176" y2="72"/><line x1="96" y1="87" x2="152" y2="87"/></g>
<path d="M164 6 h28 v28 z" fill="${G}" opacity="0.3"/><path d="M164 6 l28 28" stroke="${G}" stroke-width="2"/>
<rect x="96" y="18" width="64" height="11" rx="5" fill="${acc}" opacity="0.3"/>
<circle cx="172" cy="104" r="17" fill="${G}" opacity="0.2"/>
<g ${g2}><circle cx="172" cy="104" r="17"/><circle cx="172" cy="104" r="8"/><path d="M165 119 l-6 13 M179 119 l6 13"/></g>
<g ${s}><path d="M34 98 l32 -32"/><path d="M34 98 l-7 11 11 -7 z"/></g>`;
      case 3: return `${shadow}
<circle cx="132" cy="14" r="7" fill="${G}" opacity="0.9"/>
<path d="M40 62 q20 26 40 0" fill="${G}" opacity="0.2"/><path d="M184 62 q20 26 40 0" fill="${G}" opacity="0.2"/>
<g ${s}>
<line x1="132" y1="22" x2="132" y2="100"/><line x1="60" y1="34" x2="204" y2="34"/>
<path d="M60 34 l-15 28 M60 34 l15 28"/><path d="M204 34 l-15 28 M204 34 l15 28"/>
<path d="M117 120 h30 l7 9 h-44 z"/><path d="M132 100 l-12 20 M132 100 l12 20"/></g>
<g ${g2}><path d="M40 62 h40"/><path d="M40 62 q20 26 40 0"/><path d="M184 62 h40"/><path d="M184 62 q20 26 40 0"/></g>
<g ${s}><rect x="16" y="66" width="28" height="15" rx="4" transform="rotate(-35 30 73)"/><line x1="38" y1="86" x2="54" y2="104"/><rect x="12" y="112" width="36" height="8" rx="3"/></g>`;
      case 4: return `${shadow}
<g ${s}>
<rect x="52" y="8" width="160" height="98" rx="10"/>
<line x1="132" y1="106" x2="132" y2="122"/><line x1="104" y1="126" x2="160" y2="126"/></g>
<circle cx="132" cy="44" r="18" fill="${G}" opacity="0.9"/><path d="M126 36 l16 8 -16 8 z" fill="#FFFFFF"/>
<g ${g2} stroke-width="2"><path d="M190 26 q8 8 0 16 M198 20 q14 14 0 28"/></g>
<rect x="70" y="78" width="124" height="8" rx="4" fill="${acc}" opacity="0.3"/><rect x="92" y="90" width="80" height="8" rx="4" fill="${acc}" opacity="0.3"/>`;
      default: return `${shadow}
<circle cx="132" cy="26" r="16" fill="${G}" opacity="0.2"/>
<g ${g2}><circle cx="132" cy="26" r="16"/><path d="M100 10 l8 9 M164 10 l-8 9"/><path d="M92 30 h8 M96 26 v8 M168 30 h8 M172 26 v8" stroke-width="2"/></g>
<path d="M124 26 l6 7 13 -14" stroke="${acc}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
<g ${s}>
<rect x="6" y="66" width="86" height="30" rx="15"/><line x1="80" y1="68" x2="80" y2="94"/>
<rect x="172" y="66" width="86" height="30" rx="15"/><line x1="184" y1="68" x2="184" y2="94"/>
<rect x="84" y="58" width="96" height="44" rx="22"/><path d="M104 72 h24 M104 86 h24" opacity="0.7"/></g>`;
    }
  };

  // ── كتلة الإطار الفيلمي: شريط فيلم بثقوبه + كلابر بالمشهد + رسم مشهدي + شارة مدة + مسار صوت/حركة ──
  const frameBlock = (i: number, y0: number, c: { tag: string; meta?: string }, acc: string): string => {
    const fx = PAD + 26, fy = y0 + 32;
    const holes = (hx: number) => Array.from({ length: 6 }, (_, k) =>
      `<rect x="${hx}" y="${fy + 14 + k * 31}" width="9" height="14" rx="3" fill="${PAPER}"/>`).join("");
    const wave = Array.from({ length: 21 }, (_, k) => `q6.5 ${k % 2 ? 15 : -15} 13 0`).join(" ");
    const track = variant === "motion"
      ? `<line x1="${fx + 14}" y1="${fy + FH + 30}" x2="${fx + FW - 14}" y2="${fy + FH + 30}" stroke="${acc}" stroke-width="2" opacity="0.8"/>
${Array.from({ length: 5 }, (_, k) => { const kx = fx + 24 + k * ((FW - 48) / 4); return `<rect x="${kx - 5}" y="${fy + FH + 25}" width="10" height="10" rx="2" fill="${k % 2 ? "#FFFFFF" : acc}" stroke="${acc}" stroke-width="2" transform="rotate(45 ${kx} ${fy + FH + 30})"/>`; }).join("")}`
      : `<path d="M${fx + 8} ${fy + FH + 30} ${wave}" stroke="${acc}" stroke-width="2" fill="none" opacity="0.75"/>
<circle cx="${fx + FW - 18}" cy="${fy + FH + 28}" r="12" stroke="${acc}" stroke-width="2" fill="none"/>
<rect x="${fx + FW - 22}" y="${fy + FH + 21}" width="8" height="10" rx="4" fill="${acc}"/>`;
    // هوية إطار مميزة لكل تنسيق: الستوري بورد شريط فيلم بكلابر — الموشن شاشة داكنة بشبكة وأسهم حركة
    const shell = variant === "motion"
      ? `<g filter="url(#crdShad)"><rect x="${fx}" y="${fy}" width="${FW}" height="${FH}" rx="16" fill="${INK}"/></g>
<rect x="${fx + 10}" y="${fy + 10}" width="${FW - 20}" height="${FH - 20}" rx="10" fill="#FFFFFF"/>
${[1, 2, 3].map((g) => `<line x1="${fx + 10 + g * (FW - 20) / 4}" y1="${fy + 10}" x2="${fx + 10 + g * (FW - 20) / 4}" y2="${fy + FH - 10}" stroke="${LINE}" stroke-width="1"/>`).join("")}
${[1, 2].map((g) => `<line x1="${fx + 10}" y1="${fy + 10 + g * (FH - 20) / 3}" x2="${fx + FW - 10}" y2="${fy + 10 + g * (FH - 20) / 3}" stroke="${LINE}" stroke-width="1"/>`).join("")}
<g transform="translate(${fx + 34},${fy + 30})">${sceneArt(i, acc)}</g>
<path d="M${fx + 56} ${fy + 158} Q ${fx + 166} ${fy + 66} ${fx + 270} ${fy + 138}" stroke="${acc}" stroke-width="2.5" fill="none" stroke-dasharray="6 7" opacity="0.75"/>
<path d="M${fx + 270} ${fy + 138} l-16 -4 l7 -11 z" fill="${acc}"/>
<rect x="${fx - 8}" y="${fy - 16}" width="104" height="32" rx="16" fill="${acc}"/>
<text x="${fx + 44}" y="${fy + 5}" text-anchor="middle" font-family="${FONT}" font-size="13.5" font-weight="700" fill="#FFFFFF">${X(c.tag)}</text>`
      : `<g filter="url(#crdShad)"><rect x="${fx}" y="${fy}" width="${FW}" height="${FH}" rx="8" fill="#FFFFFF" stroke="${INK}" stroke-width="2.5"/></g>
<rect x="${fx + 3}" y="${fy + 3}" width="20" height="${FH - 6}" rx="5" fill="${INK}" opacity="0.9"/>${holes(fx + 8.5)}
<rect x="${fx + FW - 23}" y="${fy + 3}" width="20" height="${FH - 6}" rx="5" fill="${INK}" opacity="0.9"/>${holes(fx + FW - 17.5)}
<g transform="translate(${fx + 34},${fy + 30})">${sceneArt(i, acc)}</g>
<g transform="rotate(-2 ${fx} ${fy})"><rect x="${fx - 8}" y="${fy - 24}" width="112" height="34" rx="7" fill="${INK}"/>
<path d="M${fx - 2} ${fy - 24} l9 9 M${fx + 14} ${fy - 24} l9 9 M${fx + 30} ${fy - 24} l9 9 M${fx + 46} ${fy - 24} l9 9 M${fx + 62} ${fy - 24} l9 9 M${fx + 78} ${fy - 24} l9 9 M${fx + 94} ${fy - 24} l9 9" stroke="#FFFFFF" stroke-width="2" opacity="0.85"/>
<line x1="${fx - 8}" y1="${fy - 15}" x2="${fx + 104}" y2="${fy - 15}" stroke="#FFFFFF" stroke-width="1" opacity="0.6"/>
<text x="${fx + 48}" y="${fy + 3}" text-anchor="middle" font-family="${FONT}" font-size="13.5" font-weight="700" fill="#FFFFFF">${X(c.tag)}</text></g>`;
    return `${shell}
${track}
${c.meta ? `<rect x="${fx + FW - 126}" y="${fy + FH - 42}" width="100" height="30" rx="15" fill="${INK}" opacity="0.85"/>
<circle cx="${fx + FW - 108}" cy="${fy + FH - 27}" r="7" stroke="#FFFFFF" stroke-width="1.6" fill="none"/><path d="M${fx + FW - 108} ${fy + FH - 31} v4 l3 2" stroke="#FFFFFF" stroke-width="1.6" fill="none" stroke-linecap="round"/>
<text x="${fx + FW - 66}" y="${fy + FH - 22}" text-anchor="middle" font-family="${FONT}" font-size="13.5" font-weight="600" fill="#FFFFFF">${X(c.meta)}</text>` : ""}`;
  };

  const CARD_ICONS = [
    '<path d="M12 2l9 4v6c0 5.5-4 9.5-9 10-5-.5-9-4.5-9-10V6z"/>',
    '<path d="M4 6h16M4 12h16M4 18h9"/>',
    '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
    '<path d="M12 3l10 18H2z"/><path d="M12 10v5"/><circle cx="12" cy="18.2" r="0.6"/>',
    '<path d="M5 20V10M12 20V4M19 20v-8"/>',
  ];

  // ── جسد البطاقات ──
  let y = headerH + (coverH ? coverH + 26 : 0);
  const firstCy = y + 46;
  const bodyParts: string[] = [];
  cards.forEach((c, i) => {
    const m = ms[i]; const acc = MM_ACCENTS[i % MM_ACCENTS.length]; const y0 = y; y += m.h + GAP;
    if (isBoard) {
      const xR = PAD + BW - 34;
      const A = y0 + 98 + (m.head.length - 1) * 41;
      const l1y = A + 85, Bv = l1y + (m.l1.length - 1) * 33, l2y = Bv + 76;
      const lab1 = variant === "storyboard" ? "وصف اللقطة" : "الحركة والانتقال";
      const lab2 = variant === "storyboard" ? "التعليق الصوتي" : "العنصر الرسومي";
      bodyParts.push(`<g filter="url(#crdShad)"><rect x="${PAD}" y="${y0}" width="${BW}" height="${m.h}" rx="20" fill="#FFFFFF" stroke="${MINT_DEEP}" stroke-width="1.5"/></g>
<rect x="${PAD}" y="${y0}" width="${BW}" height="6" rx="3" fill="${acc}" opacity="0.85"/>
<text x="${xR}" y="${y0 + 54}" text-anchor="end" font-family="${FONT}" font-size="15" font-weight="700" fill="${acc}">${X(c.tag)}</text>
${m.head.map((ln, j) => `<text x="${xR}" y="${y0 + 98 + j * 41}" text-anchor="end" font-family="${FONT}" font-size="28" font-weight="800" fill="${INK}">${X(ln)}</text>`).join("")}
<line x1="${xR}" y1="${A + 22}" x2="${xR - 64}" y2="${A + 22}" stroke="${acc}" stroke-width="2.5"/><rect x="${xR - 81}" y="${A + 17}" width="10" height="10" fill="${acc}" transform="rotate(45 ${xR - 76} ${A + 22})"/>
<text x="${xR}" y="${A + 52}" text-anchor="end" font-family="${FONT}" font-size="14" font-weight="700" fill="${PALM_DEEP}">${lab1}</text>
${m.l1.map((ln, j) => `<text x="${xR}" y="${l1y + j * 33}" text-anchor="end" font-family="${FONT}" font-size="21" fill="${INK_SEC}">${X(ln)}</text>`).join("")}
${m.l2.length ? `<text x="${xR}" y="${Bv + 43}" text-anchor="end" font-family="${FONT}" font-size="14" font-weight="700" fill="${GOLD_DEEP}">${lab2}</text>` + m.l2.map((ln, j) => `<text x="${xR}" y="${l2y + j * 33}" text-anchor="end" font-family="${FONT}" font-size="21" fill="${INK_TER}">${X(ln)}</text>`).join("") : ""}
${frameBlock(i, y0, c, acc)}
<circle cx="${spX}" cy="${y0 + 46}" r="21" fill="#FFFFFF" stroke="${acc}" stroke-width="2.5"/>
<text x="${spX}" y="${y0 + 53}" text-anchor="middle" font-family="${FONT}" font-size="18" font-weight="800" fill="${acc}">${arNum(i + 1)}</text>`);
    } else {
      const xR2 = W - PAD - 34;
      const ym = y0 + m.h / 2;
      const cardBg = "#FFFFFF";
      const A = y0 + 92 + (m.head.length - 1) * 41;
      const l1y = A + 56, Bv = l1y + (m.l1.length - 1) * 33, l2y = Bv + 45;
      bodyParts.push(`<g filter="url(#crdShad)"><rect x="${PAD}" y="${y0}" width="${CW}" height="${m.h}" rx="20" fill="${cardBg}" stroke="${MINT_DEEP}" stroke-width="1.5"/></g>
<rect x="${W - PAD - 6}" y="${y0 + 14}" width="6" height="${m.h - 28}" rx="3" fill="${acc}"/>
<text x="212" y="${ym + 36}" text-anchor="middle" font-family="${FONT}" font-size="96" font-weight="800" fill="${acc}" opacity="0.08">${arNum(i + 1)}</text>
<circle cx="114" cy="${ym}" r="36" fill="#FFFFFF" stroke="${acc}" stroke-width="2" stroke-dasharray="2 7" stroke-linecap="round"/>
<circle cx="114" cy="${ym}" r="27" fill="${acc}" opacity="0.13"/>
<g stroke="${acc}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" transform="translate(102,${ym - 12})">${CARD_ICONS[i % CARD_ICONS.length]}</g>
<rect x="${xR2 - 72}" y="${y0 + 20}" width="72" height="30" rx="15" fill="${acc}" opacity="0.14"/>
<text x="${xR2 - 36}" y="${y0 + 41}" text-anchor="middle" font-family="${FONT}" font-size="15" font-weight="700" fill="${acc}">${X(c.tag)}</text>
${m.head.map((ln, j) => `<text x="${xR2}" y="${y0 + 92 + j * 41}" text-anchor="end" font-family="${FONT}" font-size="28" font-weight="800" fill="${INK}">${X(ln)}</text>`).join("")}
<line x1="${xR2}" y1="${A + 20}" x2="${xR2 - 64}" y2="${A + 20}" stroke="${acc}" stroke-width="2.5"/><rect x="${xR2 - 81}" y="${A + 15}" width="10" height="10" fill="${acc}" transform="rotate(45 ${xR2 - 76} ${A + 20})"/>
${m.l1.map((ln, j) => `<text x="${xR2}" y="${l1y + j * 33}" text-anchor="end" font-family="${FONT}" font-size="21" fill="${INK_SEC}">${X(ln)}</text>`).join("")}
${m.l2.length ? m.l2.map((ln, j) => `<text x="${xR2}" y="${l2y + j * 33}" text-anchor="end" font-family="${FONT}" font-size="21" fill="${INK_TER}">${X(ln)}</text>`).join("") : ""}
${c.meta ? `<rect x="${PAD + 20}" y="${y0 + 20}" width="118" height="28" rx="14" fill="${MINT}" stroke="${MINT_DEEP}" stroke-width="1"/><text x="${PAD + 79}" y="${y0 + 40}" text-anchor="middle" font-family="${FONT}" font-size="14" font-weight="600" fill="${PALM_DEEP}">${X(c.meta)}</text>` : ""}`);
    }
  });

  // ── المسار الزمني الختامي (ستوري بورد/موشن): مقاطع ملونة مرقّمة بمددها ──
  const tlBlock = (ty: number): string => {
    const x0 = PAD + 60, x1 = PAD + BW - 24;
    const segW = (x1 - x0 - (n - 1) * 8) / n;
    const segs = cards.map((c, i) => {
      const acc = MM_ACCENTS[i % MM_ACCENTS.length];
      const sx = x1 - (i + 1) * segW - i * 8;
      return `<rect x="${sx}" y="${ty + 66}" width="${segW}" height="12" rx="6" fill="${acc}" opacity="0.85"/>
<text x="${sx + segW / 2}" y="${ty + 58}" text-anchor="middle" font-family="${FONT}" font-size="13" font-weight="700" fill="${INK_SEC}">${arNum(i + 1)}</text>
${c.meta ? `<text x="${sx + segW / 2}" y="${ty + 100}" text-anchor="middle" font-family="${FONT}" font-size="13" fill="${INK_TER}">${X(c.meta)}</text>` : ""}`;
    }).join("");
    return `<g filter="url(#crdShad)"><rect x="${PAD}" y="${ty}" width="${BW}" height="${tlH - 14}" rx="16" fill="#FFFFFF" stroke="${MINT_DEEP}" stroke-width="1.5"/></g>
<text x="${PAD + BW - 24}" y="${ty + 34}" text-anchor="end" font-family="${FONT}" font-size="16" font-weight="700" fill="${PALM_DEEP}">المسار الزمني ${variant === "storyboard" ? "للمشاهد" : "للقطات"}</text>
<path d="M${x0 - 28} ${ty + 72} l16 -8 v16 z" fill="${INK_TER}"/>
${segs}`;
  };

  // ── غلاف الكاروسيل: عمق متدرج وزوايا مزخرفة ونقاط عدّ البطاقات ──
  const coverBlock = (cy0: number): string => {
    const pips = Array.from({ length: n }, (_, k) =>
      `<circle cx="${W / 2 + ((n - 1) * 14) - k * 28}" cy="${cy0 + coverH - 64}" r="6" fill="${k === 0 ? "#FFFFFF" : "none"}" stroke="#FFFFFF" stroke-width="2"/>`).join("");
    return `<g filter="url(#crdShad)"><rect x="${PAD}" y="${cy0}" width="${CW}" height="${coverH}" rx="24" fill="url(#cvGrad)"/></g>
<rect x="${PAD + 16}" y="${cy0 + 16}" width="${CW - 32}" height="${coverH - 32}" rx="16" fill="none" stroke="#DFF6E7" stroke-width="1.5" stroke-dasharray="1 7" stroke-linecap="round" opacity="0.7"/>
<path d="M${PAD + 42} ${cy0 + 76} v-34 h34" stroke="#B8EACB" stroke-width="2.5" fill="none" stroke-linecap="round"/>
<path d="M${W - PAD - 42} ${cy0 + coverH - 76} v34 h-34" stroke="#B8EACB" stroke-width="2.5" fill="none" stroke-linecap="round"/>
<text x="${W / 2}" y="${cy0 + 64}" text-anchor="middle" font-family="${FONT}" font-size="16" font-weight="700" fill="#FCF3BD">سلسلة بطاقات توعوية</text>
${cvT.map((ln, j) => `<text x="${W / 2}" y="${cy0 + 122 + j * 58}" text-anchor="middle" font-family="${FONT}" font-size="44" font-weight="800" fill="#FFFFFF">${X(ln)}</text>`).join("")}
${d.subtitle ? `<text x="${W / 2}" y="${cy0 + 122 + (cvT.length - 1) * 58 + 42}" text-anchor="middle" font-family="${FONT}" font-size="21" fill="#DFF6E7">${X(d.subtitle)}</text>` : ""}
${pips}
<text x="${W / 2}" y="${cy0 + coverH - 30}" text-anchor="middle" font-family="${FONT}" font-size="15" font-weight="600" fill="#B9E9CC">اسحب للبطاقات ←</text>`;
  };

  const closeBlock = (cy0: number): string => `<g filter="url(#crdShad)"><rect x="${PAD}" y="${cy0}" width="${CW}" height="${closeH}" rx="22" fill="${MINT}" stroke="${PALM}" stroke-width="2"/></g>
<g stroke="${PALM}" stroke-width="2"><line x1="${W / 2 - 110}" y1="${cy0 + 38}" x2="${W / 2 - 14}" y2="${cy0 + 38}"/><line x1="${W / 2 + 14}" y1="${cy0 + 38}" x2="${W / 2 + 110}" y2="${cy0 + 38}"/></g>
<rect x="${W / 2 - 5}" y="${cy0 + 33}" width="10" height="10" fill="${PALM}" transform="rotate(45 ${W / 2} ${cy0 + 38})"/>
<text x="${W / 2}" y="${cy0 + 84}" text-anchor="middle" font-family="${FONT}" font-size="27" font-weight="700" fill="${PALM_DEEP}">هذا المحتوى توعوي عام</text>
<text x="${W / 2}" y="${cy0 + 124}" text-anchor="middle" font-family="${FONT}" font-size="19" fill="${INK_SEC}">ولكل حالة ظروفها التي تستدعي استشارة قانونية متخصصة</text>`;

  const tick = (tx: number, tyk: number, dx: number, dy: number) =>
    `<path d="M${tx} ${tyk + dy * 26} L${tx} ${tyk} L${tx + dx * 26} ${tyk}" stroke="${PALM}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;

  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" direction="ltr" style="direction:ltr;max-width:960px;display:block;margin-inline:auto">
<defs><filter id="crdShad" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="5" flood-color="${INK}" flood-opacity="0.08"/></filter>
<linearGradient id="cvGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${PALM_DEEP}"/><stop offset="100%" stop-color="${PALM_DARK}"/></linearGradient>
<pattern id="crdDots" width="26" height="26" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1.7" fill="${PALM_DEEP}" opacity="0.06"/></pattern></defs>
<rect width="${W}" height="${H}" fill="${CANVAS_BG}"/>
<rect width="${W}" height="${H}" fill="url(#crdDots)"/>
${tick(16, 16, 1, 1)}${tick(W - 16, 16, -1, 1)}${tick(16, H - 16, 1, -1)}${tick(W - 16, H - 16, -1, -1)}
${spark(W / 2 - 100, 70, 10, DK_GOLD)}
<text x="${W / 2 + 14}" y="78" text-anchor="middle" font-family="${FONT}" font-size="17" font-weight="600" fill="${DK_GOLD}">${variantLabel}</text>
${tLines.map((ln, i) => `<text x="${W / 2}" y="${134 + i * 50}" text-anchor="middle" font-family="${FONT}" font-size="38" font-weight="800" fill="${INK}">${X(ln)}</text>`).join("")}
${subLines.map((ln, i) => `<text x="${W / 2}" y="${134 + (tLines.length - 1) * 50 + 38 + i * 30}" text-anchor="middle" font-family="${FONT}" font-size="19" fill="${INK_SEC}">${X(ln)}</text>`).join("")}
<rect x="${W / 2 - 45}" y="${headerH - 32}" width="90" height="5" rx="2.5" fill="${DK_GOLD_DEEP}"/>
${coverH ? coverBlock(headerH) : ""}
${isBoard && cards.length ? `<line x1="${spX}" y1="${firstCy}" x2="${spX}" y2="${y + 4}" stroke="${PALM}" stroke-width="2.5" stroke-dasharray="2 8" stroke-linecap="round" opacity="0.45"/>` : ""}
${bodyParts.join("\n")}
${tlH ? tlBlock(y) : ""}
${closeH ? closeBlock(y) : ""}
</svg>`;
}

// Average Arabic glyph width ≈ 0.56 × font-size (IBM Plex Sans Arabic)
function mmCharW(fontSize: number): number {
  return fontSize * 0.56;
}

// Centered multi-line <text> block around a vertical midpoint
function mmText(
  x: number, cyMid: number, lines: string[], fontSize: number, lineH: number,
  weight: number, fill: string, anchor: "middle" | "end" = "middle"
): string {
  const y0 = cyMid - ((lines.length - 1) * lineH) / 2 + fontSize * 0.35;
  const tspans = lines.slice(1).map((l) => `<tspan x="${x}" dy="${lineH}">${l}</tspan>`).join("");
  return `<text x="${x}" y="${Math.round(y0)}" text-anchor="${anchor}" font-family="${FONT}" font-size="${fontSize}" font-weight="${weight}" fill="${fill}">${lines[0]}${tspans}</text>`;
}

function renderMindMapSvg(d: MindMapData): string {
  const W = 1240;
  const branches = (d.branches || []).slice(0, 5);

  // Node metrics per level: [fontSize, lineHeight, maxWidth, padX, padY, minWidth]
  const ROOT = { fs: 20, lh: 30, maxW: 260, padX: 22, padY: 17, minW: 170 };
  const BR   = { fs: 17, lh: 26, maxW: 320, padX: 20, padY: 14, minW: 150 };
  const SUB  = { fs: 14.5, lh: 22, maxW: 340, padX: 18, padY: 11, minW: 130 };

  type NodeBox = { lines: string[]; w: number; h: number };
  const measure = (text: string, m: typeof ROOT): NodeBox => {
    const cw = mmCharW(m.fs);
    const maxChars = Math.floor((m.maxW - 2 * m.padX) / cw);
    const lines = wrapFull(text, Math.max(maxChars, 8));
    const longest = Math.max(...lines.map((l) => l.length));
    const w = Math.max(m.minW, Math.min(m.maxW, Math.ceil(longest * cw) + 2 * m.padX));
    const h = lines.length * m.lh + 2 * m.padY;
    return { lines, w, h };
  };

  const rootBox = measure(d.center || d.title || "", ROOT);
  const branchBoxes = branches.map((b) => measure(b.label, BR));
  const subBoxes = branches.map((b) =>
    ([b.sub1, b.sub2].filter(Boolean) as string[]).map((s) => measure(s, SUB))
  );

  // Header — wraps instead of truncating; band grows for two lines
  const hLines = wrapFull(d.title || d.center || "", 58);
  const HDR = hLines.length > 1 ? 216 : 172;

  // Vertical rhythm: each branch group = branch node + its sub nodes
  const SUB_GAP = 14, GROUP_GAP = 38, TOP_PAD = 54, BOT_PAD = 54;
  const groupHs = branches.map((_, i) => {
    const subsTotal = subBoxes[i].reduce((acc, s) => acc + s.h, 0)
      + Math.max(subBoxes[i].length - 1, 0) * SUB_GAP;
    return Math.max(branchBoxes[i].h, subsTotal);
  });
  const contentH = groupHs.reduce((a, b) => a + b, 0) + Math.max(branches.length - 1, 0) * GROUP_GAP;
  const H = Math.max(HDR + TOP_PAD + contentH + BOT_PAD, HDR + TOP_PAD + rootBox.h + BOT_PAD, 560);

  // Columns (right-anchored — RTL): root | branches | subs
  const rootRight = W - 56;
  const branchRight = 830;
  const subRight = 420;

  const rootCy = HDR + TOP_PAD + Math.max(contentH, rootBox.h) / 2;
  const rootLeft = rootRight - rootBox.w;

  const connectors: string[] = [];
  const nodes: string[] = [];

  let yCursor = HDR + TOP_PAD;
  branches.forEach((b, i) => {
    const acc = MM_ACCENTS[i % MM_ACCENTS.length];
    const gH = groupHs[i];
    const gy = Math.round(yCursor + gH / 2);
    const bb = branchBoxes[i];
    const bLeft = branchRight - bb.w;

    // root → branch: smooth horizontal bezier
    connectors.push(
      `<path d="M ${rootLeft} ${Math.round(rootCy)} C ${rootLeft - 70} ${Math.round(rootCy)}, ${branchRight + 70} ${gy}, ${branchRight} ${gy}" fill="none" stroke="${acc}" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>`
    );

    // branch node: white card, accent border + soft accent tint, junction dot + numbered badge
    const bRx = bb.lines.length === 1 ? Math.round(bb.h / 2) : 18;
    nodes.push(
      `<g filter="url(#cardShad)">
<rect x="${bLeft}" y="${gy - Math.round(bb.h / 2)}" width="${bb.w}" height="${bb.h}" rx="${bRx}" fill="#FFFFFF"/>
<rect x="${bLeft}" y="${gy - Math.round(bb.h / 2)}" width="${bb.w}" height="${bb.h}" rx="${bRx}" fill="${acc}" opacity="0.08"/>
<rect x="${bLeft}" y="${gy - Math.round(bb.h / 2)}" width="${bb.w}" height="${bb.h}" rx="${bRx}" fill="none" stroke="${acc}" stroke-opacity="0.6" stroke-width="1.8"/>
</g>
${mmText(branchRight - Math.round(bb.w / 2), gy, bb.lines, BR.fs, BR.lh, 600, INK)}
<circle cx="${branchRight}" cy="${gy}" r="4.5" fill="${acc}" stroke="#FFFFFF" stroke-width="1.5"/>
<circle cx="${bLeft}" cy="${gy}" r="12" fill="${acc}"/>
<text x="${bLeft}" y="${gy + 4.5}" text-anchor="middle" font-family="${FONT}" font-size="12.5" font-weight="700" fill="#FFFFFF">${MM_AR[i] ?? i + 1}</text>`
    );

    // sub nodes stacked and centered within the group
    const sbs = subBoxes[i];
    const subsTotal = sbs.reduce((acc2, s) => acc2 + s.h, 0) + Math.max(sbs.length - 1, 0) * SUB_GAP;
    let sy = gy - subsTotal / 2;
    sbs.forEach((sb) => {
      const scy = Math.round(sy + sb.h / 2);
      const sLeft = subRight - sb.w;
      connectors.push(
        `<path d="M ${bLeft} ${gy} C ${bLeft - 50} ${gy}, ${subRight + 50} ${scy}, ${subRight} ${scy}" fill="none" stroke="${acc}" stroke-width="1.8" stroke-linecap="round" opacity="0.5"/>`
      );
      nodes.push(
        `<g filter="url(#cardShad)"><rect x="${sLeft}" y="${scy - Math.round(sb.h / 2)}" width="${sb.w}" height="${sb.h}" rx="12" fill="#FFFFFF" stroke="${LINE}" stroke-width="1.2"/></g>
<circle cx="${subRight - 14}" cy="${scy}" r="3.5" fill="${acc}"/>
${mmText(subRight - Math.round(sb.w / 2) - 6, scy, sb.lines, SUB.fs, SUB.lh, 400, INK_SEC)}`
      );
      sy += sb.h + SUB_GAP;
    });

    yCursor += gH + GROUP_GAP;
  });

  // Root node — gradient card + dashed halo ring, fully wrapped text
  const rootRx = rootBox.lines.length === 1 ? Math.round(rootBox.h / 2) : 22;
  const rootNode = `<rect x="${rootLeft - 12}" y="${Math.round(rootCy - rootBox.h / 2) - 12}" width="${rootBox.w + 24}" height="${rootBox.h + 24}" rx="${rootRx + 10}" fill="none" stroke="${PALM}" stroke-width="1.5" stroke-dasharray="2 8" stroke-linecap="round" opacity="0.5"/>
<g filter="url(#rootShad)">
<rect x="${rootLeft}" y="${Math.round(rootCy - rootBox.h / 2)}" width="${rootBox.w}" height="${rootBox.h}" rx="${rootRx}" fill="url(#rootGrad)"/>
<rect x="${rootLeft + 4}" y="${Math.round(rootCy - rootBox.h / 2) + 4}" width="${rootBox.w - 8}" height="${rootBox.h - 8}" rx="${Math.max(rootRx - 4, 8)}" fill="none" stroke="#FFFFFF" stroke-width="1.2" opacity="0.25"/>
</g>
${mmText(rootRight - Math.round(rootBox.w / 2), Math.round(rootCy), rootBox.lines, ROOT.fs, ROOT.lh, 700, "#FFFFFF")}`;

  // رأس تحريري موسّط على الطراز الموحّد: مسطرة مزدوجة + شارات + عين ذهبية + فاصل مزخرف
  const GOLD_DEEP = "#B87B02";
  const MPAD = 56;
  const titleBase = 122;
  const headerText = `${spark(W / 2 - 92, 68, 10, DK_GOLD)}
<text x="${W / 2 + 14}" y="76" text-anchor="middle" font-family="${FONT}" font-size="17" font-weight="600" fill="${DK_GOLD}">خريطة ذهنية</text>
${hLines.map((ln, i) => `<text x="${W / 2}" y="${titleBase + i * 44}" text-anchor="middle" font-family="${FONT}" font-size="34" font-weight="800" fill="${INK}">${ln}</text>`).join("")}
<rect x="${W / 2 - 45}" y="${HDR - 26}" width="90" height="5" rx="2.5" fill="${DK_GOLD_DEEP}"/>`;

  const tick = (tx: number, tyk: number, dx: number, dy: number) =>
    `<path d="M${tx} ${tyk + dy * 26} L${tx} ${tyk} L${tx + dx * 26} ${tyk}" stroke="${PALM}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;

  return `<svg width="100%" viewBox="0 0 ${W} ${Math.round(H)}" xmlns="http://www.w3.org/2000/svg" direction="rtl" style="max-width:1000px;display:block;margin-inline:auto">
<defs>
  <pattern id="dotGrid" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
    <circle cx="14" cy="14" r="1.5" fill="${PALM_DEEP}" opacity="0.06"/>
  </pattern>
  <linearGradient id="rootGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${PALM_DARK}"/>
    <stop offset="100%" stop-color="${PALM}"/>
  </linearGradient>
  <filter id="cardShad" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="${INK}" flood-opacity="0.10"/>
  </filter>
  <filter id="rootShad" x="-25%" y="-25%" width="150%" height="150%">
    <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="${PALM_DEEP}" flood-opacity="0.30"/>
  </filter>
</defs>
<rect width="${W}" height="${Math.round(H)}" fill="${CANVAS_BG}"/>
<rect width="${W}" height="${Math.round(H)}" fill="url(#dotGrid)"/>
${tick(16, 16, 1, 1)}${tick(W - 16, 16, -1, 1)}${tick(16, Math.round(H) - 16, 1, -1)}${tick(W - 16, Math.round(H) - 16, -1, -1)}
${headerText}
${connectors.join("\n")}
${nodes.join("\n")}
${rootNode}
</svg>`;
}

// ── Infographic: 1080×dynamic portrait — safe for all platforms ───────────

function renderInfographicSvg(d: InfographicData): string {
  // إنفوغراف عمودي عالي الجودة: التفاف كامل للنصوص بلا قصّ، ارتفاعات متكيفة،
  // لون مميز لكل قسم من لوحة العلامة، وظلال بطاقات — بنفس مستوى الخريطة الذهنية.
  const W = 1080, PAD = 56;
  // لوحة الهوية الملتزمة: تناوب ذهبي/نعناعي فقط — لا ألوان خارج العالم اللوني
  const ACCENTS = ["#25935F", "#DBA102", "#80519F", "#1570EF"]; // أخضر/ذهبي/خزامي/أزرق — تنويع من اللوحة الرسمية بلا تكرار
  const CARD_W = W - 2 * PAD;
  const BAR_W = 10;
  const TR = W - PAD - 34;              // مرساة النص يمين (RTL) داخل البطاقة
  const textMax = CARD_W - 34 - 120;    // مساحة النص: نطرح الشريط ورقم الخلفية

  const chars = (fs: number) => Math.max(Math.floor(textMax / (fs * 0.56)), 12);
  const sections = (d.sections || []).slice(0, 4);

  // الترويسة والعنوان الفرعي يلتفان بدل القص — رأس تحريري موسّط على الطراز الموحّد
  const titleLines = wrapFull(d.title, Math.floor((W - 160) / (32 * 0.56)));
  const HEADER_H = 132 + titleLines.length * 44;
  const subLines = wrapFull(d.subtitle, Math.floor((W - 160) / (16 * 0.56)));
  const SUB_H = 40 + subLines.length * 26;

  // قياس كل قسم حسب محتواه الفعلي (+ فاصل مزخرف وشارة إحصائية)
  type Sec = { heading: string[]; lines: string[][]; stat: string; h: number };
  const measured: Sec[] = sections.map((sec) => {
    const heading = wrapFull(sec.heading, chars(20));
    const lines = [sec.line1, sec.line2, sec.line3].filter(Boolean).map((l) => wrapFull(l as string, chars(14.5)));
    const bodyLines = lines.reduce((a, l) => a + l.length, 0);
    const h = Math.max(26 + heading.length * 30 + 10 + 18 + bodyLines * 25 + (sec.stat ? 46 : 0) + 26, 170);
    return { heading, lines, stat: sec.stat ?? "", h };
  });

  const GAP = 24;
  const srcLines = wrapFull(d.source, 70);
  const FOOTER_H = 40 + srcLines.length * 22;
  const bodyH = measured.reduce((a, m) => a + m.h, 0) + GAP * (measured.length + 1);
  const H = HEADER_H + SUB_H + bodyH + FOOTER_H;

  // أيقونات خطية للأقسام — نفس عائلة أيقونات صحيفة البطاقات
  const INF_ICONS = [
    '<path d="M12 2l9 4v6c0 5.5-4 9.5-9 10-5-.5-9-4.5-9-10V6z"/>',
    '<path d="M4 6h16M4 12h16M4 18h9"/>',
    '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
    '<path d="M5 20V10M12 20V4M19 20v-8"/>',
  ];
  const GOLD_DEEP = "#B87B02";

  let y = HEADER_H + SUB_H + GAP;
  const blocks = measured.map((m, i) => {
    const ac = ACCENTS[i % ACCENTS.length];
    const y0 = y;
    y += m.h + GAP;
    let ty = y0 + 26 + 20;
    const headingText = `<text x="${TR}" y="${ty}" text-anchor="end" font-family="${FONT}" font-size="18" font-weight="700" fill="${DK_TEXT}">${m.heading[0]}${m.heading.slice(1).map(() => "").join("")}${m.heading.slice(1).map((l) => `<tspan x="${TR}" dy="30">${l}</tspan>`).join("")}</text>`;
    ty += (m.heading.length - 1) * 30 + 10;
    const divider = `<line x1="${TR}" y1="${ty + 6}" x2="${TR - 64}" y2="${ty + 6}" stroke="${ac}" stroke-width="2.5"/><rect x="${TR - 81}" y="${ty + 1}" width="10" height="10" fill="${ac}" transform="rotate(45 ${TR - 76} ${ty + 6})"/>`;
    ty += 18;
    const bodyText = m.lines.map((wrapped) => {
      const first = ty + 25;
      const t = `<text x="${TR}" y="${first}" text-anchor="end" font-family="${FONT}" font-size="15" fill="${INK_SEC}">${wrapped[0]}${wrapped.slice(1).map((l) => `<tspan x="${TR}" dy="25">${l}</tspan>`).join("")}</text>`;
      ty = first + (wrapped.length - 1) * 25;
      return t;
    }).join("\n");
    const statW = m.stat ? Math.min(Math.round(m.stat.length * 9.5) + 56, CARD_W - 160) : 0;
    const statText = m.stat
      ? `<rect x="${TR - statW}" y="${ty + 14}" width="${statW}" height="32" rx="16" fill="${DK_GOLD}" opacity="0.14"/>
<rect x="${TR - statW}" y="${ty + 14}" width="${statW}" height="32" rx="16" fill="none" stroke="${DK_GOLD_DEEP}" stroke-width="1" opacity="0.5"/>
<circle cx="${TR - statW + 18}" cy="${ty + 30}" r="4" fill="${DK_GOLD}"/>
<text x="${TR - 16}" y="${ty + 36}" text-anchor="end" font-family="${FONT}" font-size="15" font-weight="700" fill="${DK_GOLD}">${m.stat}</text>`
      : "";
    const connector = i < measured.length - 1
      ? `<line x1="${W - PAD - BAR_W / 2}" y1="${y0 + m.h + 3}" x2="${W - PAD - BAR_W / 2}" y2="${y0 + m.h + GAP - 3}" stroke="${ac}" stroke-width="2" stroke-dasharray="2 6" stroke-linecap="round" opacity="0.6"/>`
      : "";
    return `<rect x="${PAD}" y="${y0}" width="${CARD_W}" height="${m.h}" rx="20" fill="#FFFFFF" stroke="${LINE}" stroke-width="1"/>
<rect x="${W - PAD - BAR_W}" y="${y0}" width="${BAR_W}" height="${m.h}" rx="5" fill="${ac}"/>
<text x="${PAD + 64}" y="${y0 + m.h / 2 + 42}" text-anchor="middle" font-family="${FONT}" font-size="76" font-weight="800" fill="${ac}" opacity="0.07">${MM_AR[i] ?? i + 1}</text>
<circle cx="${PAD + 60}" cy="${y0 + 54}" r="24" fill="none" stroke="${ac}" stroke-width="2" stroke-dasharray="2 6" stroke-linecap="round"/>
<circle cx="${PAD + 60}" cy="${y0 + 54}" r="17" fill="${ac}" opacity="0.13"/>
<g stroke="${ac}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" transform="translate(${PAD + 48},${y0 + 42})">${INF_ICONS[i % INF_ICONS.length]}</g>
${headingText}
${divider}
${bodyText}
${statText}
${connector}`;
  }).join("\n");

  const titleText = `${spark(W / 2 - 92, 66, 10, DK_GOLD)}
<text x="${W / 2 + 14}" y="74" text-anchor="middle" font-family="${FONT}" font-size="17" font-weight="600" fill="${DK_GOLD}">إنفوغراف قانوني</text>
${titleLines.map((l, i) => `<text x="${W / 2}" y="${124 + i * 44}" text-anchor="middle" font-family="${FONT}" font-size="34" font-weight="800" fill="${DK_TEXT}">${l}</text>`).join("")}
<rect x="${W / 2 - 45}" y="${HEADER_H - 24}" width="90" height="5" rx="2.5" fill="${DK_GOLD_DEEP}"/>`;
  const subText = `<text x="${W / 2}" y="${HEADER_H + 34}" text-anchor="middle" font-family="${FONT}" font-size="16" fill="${DK_MINT}">${subLines[0]}${subLines.slice(1).map((l) => `<tspan x="${W / 2}" dy="26">${l}</tspan>`).join("")}</text>`;
  const footerY = H - FOOTER_H;
  const srcText = `<text x="${W / 2}" y="${footerY + 30}" text-anchor="middle" font-family="${FONT}" font-size="12.5" fill="${DK_MINT}" opacity="0.85">${srcLines[0]}${srcLines.slice(1).map((l) => `<tspan x="${W / 2}" dy="22">${l}</tspan>`).join("")}</text>`;

  const tick = (tx: number, tyk: number, dx: number, dy: number) =>
    `<path d="M${tx} ${tyk + dy * 24} L${tx} ${tyk} L${tx + dx * 24} ${tyk}" stroke="${PALM}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`;

  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" direction="ltr" style="direction:ltr;max-width:960px;display:block;margin-inline:auto">
<defs><linearGradient id="qcBg2" x1="0" y1="0" x2="0.6" y2="1"><stop offset="0" stop-color="${DK_BG1}"/><stop offset="1" stop-color="${DK_BG2}"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="url(#qcBg2)"/>
${rings(30, 30, 60, 5, DK_LINE)}
${rings(W - 60, H - 40, 80, 6, DK_LINE)}
${titleText}
${subText}
${blocks}
<rect x="${W / 2 - 38}" y="${footerY + 4}" width="76" height="4" rx="2" fill="${DK_GOLD_DEEP}" opacity="0.9"/>
${srcText}
</svg>`;
}


// ── Data prompts ───────────────────────────────────────────────────────────

function chartDataPrompt(description: string, chartType: string): string {
  return `Generate Arabic legal chart data for: "${description}"
Chart type: ${chartType || "أعمدة (bar)"}

Return ONLY valid JSON with no markdown fences or explanation:
{
  "title": "عنوان عربي لا يتجاوز 28 حرفاً",
  "yLabel": "وحدة القياس بالعربية مثل (قضية / مليون ريال / %)",
  "data": [
    {"label": "نص عربي 5-8 أحرف", "value": 45},
    {"label": "نص عربي 5-8 أحرف", "value": 30},
    {"label": "نص عربي 5-8 أحرف", "value": 60},
    {"label": "نص عربي 5-8 أحرف", "value": 25},
    {"label": "نص عربي 5-8 أحرف", "value": 50}
  ]
}

Rules:
- Exactly 5 data items
- Labels: short Arabic (5-8 chars max), relevant to the legal topic
- Values: استخدم فقط الأرقام الواردة صراحةً في المحتوى (مواد، مهل، نسب، مبالغ)؛ وإن خلا المحتوى من أرقام قابلة للرسم فمثّل عناصره بقيم ترتيبية تعكس تسلسلها أو أولويتها كما وردت مع yLabel صادق مثل "ترتيب الأهمية" — لا تختلق إحصائية خارجية
- Title: concise and informative\nقاعدة حاكمة (بأمر مالكة المنصة): أنت تترجم المحتوى أعلاه بصرياً — كل نص ورقم ومادة نظامية في الناتج يجب أن يكون مستخرجاً أو معاد صياغته من المحتوى المعطى حصراً؛ ممنوع اختراع معلومة أو رقم أو مثال أو مادة لم ترد فيه.\n${KINGDOM_STYLE_RULE}`;
}

function mindMapDataPrompt(description: string): string {
  return `Generate an Arabic legal mind map structure for: "${description}"

Return ONLY valid JSON with no markdown fences or explanation:
{
  "title": "عنوان توضيحي للخريطة — أقصى 24 حرفاً",
  "center": "اختصار المفهوم المركزي — أقصى 13 حرفاً",
  "branches": [
    {"label": "فرع رئيسي 1 — أقصى 14 حرفاً", "sub1": "فرعي 1أ — أقصى 12 حرفاً", "sub2": "فرعي 1ب — أقصى 12 حرفاً"},
    {"label": "فرع رئيسي 2 — أقصى 14 حرفاً", "sub1": "فرعي 2أ — أقصى 12 حرفاً", "sub2": "فرعي 2ب — أقصى 12 حرفاً"},
    {"label": "فرع رئيسي 3 — أقصى 14 حرفاً", "sub1": "فرعي 3أ — أقصى 12 حرفاً", "sub2": "فرعي 3ب — أقصى 12 حرفاً"},
    {"label": "فرع رئيسي 4 — أقصى 14 حرفاً", "sub1": "فرعي 4أ — أقصى 12 حرفاً"},
    {"label": "فرع رئيسي 5 — أقصى 14 حرفاً", "sub1": "فرعي 5أ — أقصى 12 حرفاً"}
  ]
}

IMPORTANT: Strictly respect every character limit. Nodes are sized to fit exactly these limits — any longer text will be cut off visually with "…".
Rules:
- Exactly 5 main branches covering distinct legal aspects of the topic
- title: full descriptive heading displayed in the header banner ≤24 Arabic chars
- center: short core concept for the central circle ≤13 Arabic chars
- branch labels: ≤14 Arabic chars — abbreviate if needed (حق → حقوق الملكية ✗, حق الملكية ✓)
- sub-labels: ≤12 Arabic chars each
- All content must be legally accurate and topic-specific\nقاعدة حاكمة (بأمر مالكة المنصة): أنت تترجم المحتوى أعلاه بصرياً — كل نص ورقم ومادة نظامية في الناتج يجب أن يكون مستخرجاً أو معاد صياغته من المحتوى المعطى حصراً؛ ممنوع اختراع معلومة أو رقم أو مثال أو مادة لم ترد فيه.\n${KINGDOM_STYLE_RULE}`;
}

function infographicDataPrompt(description: string): string {
  return `Generate Arabic legal infographic content for: "${description}"

Return ONLY valid JSON with no markdown fences or explanation:
{
  "title": "عنوان رئيسي عربي — أقصى 24 حرفاً",
  "subtitle": "وصف توضيحي عربي — أقصى 42 حرفاً",
  "sections": [
    {
      "heading": "عنوان القسم — أقصى 26 حرفاً",
      "line1": "نص عربي وصفي أول — أقصى 36 حرفاً",
      "line2": "نص عربي وصفي ثانٍ — أقصى 36 حرفاً",
      "line3": "نص عربي ثالث اختياري — أقصى 36 حرفاً",
      "stat": "مثال: المادة ٧٤ — نظام العمل"
    },
    { "heading": "...", "line1": "...", "line2": "...", "stat": "..." },
    { "heading": "...", "line1": "...", "line2": "..." },
    { "heading": "...", "line1": "...", "line2": "...", "line3": "..." }
  ],
  "source": "المرجع: نظام العمل — المادة ٧٤"
}

Rules:
- Exactly 4 sections, each covering a distinct aspect of the topic
- CRITICAL: each field must NOT exceed the char limit or it will be cut off
- All text in Arabic, professional legal tone with accurate information
- stat is optional — use only when there is a real article number or statistic
- source must be a proper legal citation: the relevant Saudi law/regulation name + article number (معايير الاقتباس)
- source must NEVER contain an entity or authority name such as "وزارة العدل" or "هيئة المحامين" — cite the document, not the entity\nقاعدة حاكمة (بأمر مالكة المنصة): أنت تترجم المحتوى أعلاه بصرياً — كل نص ورقم ومادة نظامية في الناتج يجب أن يكون مستخرجاً أو معاد صياغته من المحتوى المعطى حصراً؛ ممنوع اختراع معلومة أو رقم أو مثال أو مادة لم ترد فيه.\n${KINGDOM_STYLE_RULE}`;
}

// ── Route ──────────────────────────────────────────────────────────────────

function getDimensions(dim?: string): [number, number] {
  if (dim === "16:9") return [1280, 720];
  if (dim === "9:16") return [720, 1280];
  if (dim === "4:5") return [820, 1024];
  return [1024, 1024];
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return badRequest("المدخلات غير مكتملة");

  const { description, visualType, chartType, style, dimensions, channel, editInstruction, previousVisual, outputMode, audience, purpose, planOnly, approvedPlan, contentType, specialty, source } = parsed.data;

  // عند طلب تعديل: يُلحق الطلب بالوصف فيُطبق على البيانات المولدة والتصميم
  // عند وجود بنية سابقة: التعديل يُطبَّق عليها حرفياً وكل ما عداه يبقى كما هو
  const editGrounding = editInstruction?.trim() && previousVisual?.data
    ? `\n\nالبنية الحالية المعتمدة للرسم (أعد نفس هذه البيانات حرفياً مع تطبيق طلب التعديل فقط — لا تغيّر أي نص أو قيمة لم يشملها الطلب):\n${JSON.stringify(previousVisual.data)}`
    : "";
  const effectiveDescription = editInstruction?.trim()
    ? `${description}\n\nطلب تعديل من المستخدم يجب تطبيقه حرفياً على النتيجة: ${editInstruction.trim()}${editGrounding}`
    : description;

  const apiKey = process.env.ANTHROPIC_API_KEY;

  // ── المرحلة ١: المترجم التحريري — خطة بصرية موحدة تعيد صياغة النص نصوصاً
  // قصيرة مصقولة. فشلها لا يكسر شيئاً (سقوط للنص الخام)، وتُتخطى أثناء التعديل.
  const isEditFlow = Boolean(editInstruction?.trim() && previousVisual?.data);
  // خطة معتمدة من المستخدم = مصدر الحقيقة الوحيد؛ وإلا تُولَّد (وتُتخطى في التعديل)
  const visualPlan: VisualPlan | null = approvedPlan
    ? approvedPlan
    : apiKey && !isEditFlow && visualType !== "image"
      ? await generateVisualPlan(apiKey, description, {
          channel, audience, purpose, contentType, specialty, source,
          // النوع يصل للخطة بتسميته العربية الدقيقة (مع نوع الشارت) لا بمفتاح خام — الخطة تعكس المطلوب حرفياً
          // (نوع «صورة» لا يمر بالخطة أصلاً بحكم الشرط أعلاه)
          visualType: visualType === "chart" ? `رسم بياني${chartType ? ` (${chartType})` : ""}`
            : visualType === "mindmap" ? "خريطة ذهنية"
            : visualType === "quote_card" ? "بطاقة اقتباس/توعوية"
            : visualType === "carousel" ? "كاروسيل بطاقات متسلسلة"
            : visualType === "storyboard" ? "ستوري بورد فيديو (مشاهد)"
            : visualType === "motion_script" ? "مخطط موشن جرافيك (لقطات)"
            : "إنفوغراف",
        })
      : null;
  // خطوة المراجعة: إرجاع الخطة فقط دون توليد مرئي
  if (planOnly) {
    if (!visualPlan) return NextResponse.json({ error: "تعذر توليد الخطة البصرية — حاول مجدداً" }, { status: 502 });
    return NextResponse.json({ visualPlan });
  }
  const engineDescription = visualPlan
    ? `${planToEngineDescription(visualPlan)}${editInstruction?.trim() ? `\n\nطلب تعديل يجب تطبيقه: ${editInstruction.trim()}` : ""}`
    : effectiveDescription;

  // ── المسار الاحترافي (premium_image / both) — يعمل بجانب المحركات دون مساسها
  let premiumExtras: Record<string, unknown> = {};
  if (outputMode !== "editable_svg") {
    const dims = premiumDims(channel);
    const brief = visualPlan
      ? {
          centralMessage: visualPlan.centralMessage,
          objective: visualPlan.objective,
          targetAudience: visualPlan.audience,
          channel: channel ?? "",
          visualType,
          planningType: visualPlan.layoutStrategy,
          keyPoints: visualPlan.keySections.flatMap((k) => [k.heading, ...k.bullets.slice(0, 1)]).slice(0, 5),
          suggestedSections: visualPlan.keySections.map((k) => k.heading),
          importantNumbers: visualPlan.importantNumbers ?? [],
          complianceSensitivePhrases: visualPlan.complianceSensitivePhrases ?? [],
          recommendedTone: visualPlan.visualStyle === "تعليمي" ? "تعليمية حديثة" : "مهنية رصينة",
          rtlArabicNotes: visualPlan.rtlArabicNotes ?? "",
        }
      : apiKey
        ? await generateVisualBrief(apiKey, effectiveDescription, { channel, audience, purpose, visualType, contentType, specialty, source })
        : null;
    // photoAllowed=false افتراضياً — يُفتح فقط بطلب صريح في الوصف أو التعديل
    const photoAllowed = isPhotoExplicitlyRequested(effectiveDescription);
    const pPrompt = premiumImagePrompt(brief, effectiveDescription, { channel, audience, purpose, visualType, style, photoAllowed, contentType, specialty, source }, dims);
    const img = await generatePremiumImage(pPrompt, dims.w, dims.h);
    const premiumOk = Boolean(img.imageBase64 || img.imageUrl);
    if (premiumOk) {
      premiumExtras = Object.fromEntries(Object.entries({
        imageBase64: img.imageBase64,
        imageUrl: img.imageUrl,
        provider: img.provider,
        providerNote: img.failureNote,
        brief,
        qualityNotes: brief
          ? "صورة مبنية على موجز بصري مركّز (رسالة مركزية، نقاط، محاذير امتثال تُتجنب حرفياً)."
          : "تعذر توليد الموجز البصري — استُخدم الوصف مباشرة دون كسر التدفق.",
      }).filter(([, v]) => v !== undefined && v !== null));
    } else {
      // فشل المزود الحقيقي: بطاقة حالة صادقة فقط — لا صورة احتياطية تُعرض للاعتماد
      premiumExtras = Object.fromEntries(Object.entries({
        premiumError: "تعذر إنشاء المرئي الاحترافي — أعد المحاولة، وإن استمرت المشكلة تواصل مع مسؤول المنصة.",
        providerNote: img.failureNote,
      }).filter(([, v]) => v !== undefined && v !== null));
    }
    // نوع «صورة» لا محرك SVG له — المساران premium_image وboth يعودان هنا (نجاحاً أو بطاقة حالة)
    if (outputMode === "premium_image" || visualType === "image") return NextResponse.json(premiumExtras);
  }

  if (!apiKey) {
    // وضع both: لا نُسقط الصورة الاحترافية الناجحة بسبب تعطل فرع البنية
    if (outputMode === "both" && (premiumExtras.imageBase64 || premiumExtras.imageUrl)) {
      return NextResponse.json({
        ...premiumExtras,
        svgError: "تعذر توليد النسخة القابلة للتعديل — الصورة الاحترافية جاهزة.",
      });
    }
    return NextResponse.json(
      { error: "خدمة الذكاء الاصطناعي غير متاحة حالياً — تواصل مع مسؤول المنصة." },
      { status: 503 }
    );
  }

  // ── Chart ─────────────────────────────────────────────────────────────────
  if (visualType === "chart") {
    try {
      const raw = await callExtractor(apiKey, 600, chartDataPrompt(engineDescription, chartType ?? ""));
      const data = parseJson<ChartData>(raw);
      const svgCode = renderChartSvg(data, chartType ?? "");
      // visual: بيانات البنية لتصدير PowerPoint قابل للتعديل عنصراً عنصراً
      return NextResponse.json({ svgCode, visual: { type: "chart", chartType: chartType ?? "", data }, visualPlan: visualPlan ?? undefined, ...premiumExtras });
    } catch (e) {
      console.error("[chart]", e);
      return NextResponse.json({ error: "تعذر إنشاء الرسم البياني — حاول مرة أخرى." }, { status: 500 });
    }
  }

  // ── Mind map ──────────────────────────────────────────────────────────────
  if (visualType === "mindmap") {
    try {
      const raw = await callExtractor(apiKey, 600, mindMapDataPrompt(engineDescription));
      const data = parseJson<MindMapData>(raw);
      // المحرك الداخلي دائماً: يتيح تصدير PowerPoint بعناصر قابلة للتعديل (لا صورة مسطحة)
      const svgCode = renderMindMapSvg(data);
      return NextResponse.json({ svgCode, visual: { type: "mindmap", data }, visualPlan: visualPlan ?? undefined, ...premiumExtras });
    } catch (e) {
      console.error("[mindmap]", e);
      return NextResponse.json({ error: "تعذر إنشاء الخريطة الذهنية — حاول مرة أخرى." }, { status: 500 });
    }
  }

  // ── Infographic ───────────────────────────────────────────────────────────
  if (visualType === "infographic") {
    try {
      const raw = await callExtractor(apiKey, 800, infographicDataPrompt(engineDescription));
      const data = parseJson<InfographicData>(raw);
      // المحرك الداخلي دائماً: يتيح تصدير PowerPoint بعناصر قابلة للتعديل (لا صورة مسطحة)
      const svgCode = renderInfographicSvg(data);
      return NextResponse.json({ svgCode, visual: { type: "infographic", data }, visualPlan: visualPlan ?? undefined, ...premiumExtras });
    } catch (e) {
      console.error("[infographic]", e);
      return NextResponse.json({ error: "تعذر إنشاء الإنفوغراف — حاول مرة أخرى." }, { status: 500 });
    }
  }

  // ── بطاقة اقتباس ─────────────────────────────────────────────────────────
  if (visualType === "quote_card") {
    try {
      const raw = await callExtractor(apiKey, 800, quoteCardDataPrompt(engineDescription));
      const data = parseJson<QuoteCardData>(raw);
      const svgCode = renderQuoteCardSvg(data);
      return NextResponse.json({ svgCode, visual: { type: "quote_card", data }, visualPlan: visualPlan ?? undefined, ...premiumExtras });
    } catch (e) {
      console.error("[quote_card]", e);
      return NextResponse.json({ error: "تعذر إنشاء بطاقة الاقتباس — حاول مرة أخرى." }, { status: 500 });
    }
  }

  // ── كاروسيل / ستوري بورد / مخطط موشن — راسم بطاقات مشترك ──────────────────
  if (visualType === "carousel" || visualType === "storyboard" || visualType === "motion_script") {
    const variant = visualType === "carousel" ? "carousel" as const : visualType === "storyboard" ? "storyboard" as const : "motion" as const;
    try {
      // سقف أوسع: ستوري بورد من ستة مشاهد عربية غنية يتجاوز ٩٠٠ توكن فيقتطع JSON ويفشل التحليل
      let data: CardsData;
      try {
        data = parseJson<CardsData>(await callExtractor(apiKey, 2000, cardsDataPrompt(engineDescription, variant)));
      } catch {
        // محاولة ثانية واحدة قبل إعلان الفشل — استجابة النموذج غير حتمية
        data = parseJson<CardsData>(await callExtractor(apiKey, 2000, cardsDataPrompt(engineDescription, variant)));
      }
      const svgCode = renderCardsSheetSvg(data, variant);
      return NextResponse.json({ svgCode, visual: { type: visualType, data }, visualPlan: visualPlan ?? undefined, ...premiumExtras });
    } catch (e) {
      console.error("[cards]", visualType, e);
      return NextResponse.json({ error: "تعذر إنشاء البطاقات المتسلسلة — حاول مرة أخرى." }, { status: 500 });
    }
  }

  // ── نوع «صورة» (مسار الوصف المباشر) — يمر بالموجّه المحكوم نفسه بكل قواعده:
  // لوحة كود المنصات، حظر الوجوه والنص اللاتيني، الملاءمة الثقافية — لا موجه جانبي يتجاوزها
  try {
    const promptRaw = premiumImagePrompt(
      null,
      effectiveDescription,
      { channel, audience, purpose, visualType: "image", style, photoAllowed: isPhotoExplicitlyRequested(effectiveDescription), contentType, specialty, source },
      { label: dimensions === "16:9" ? "عرضي 16:9" : dimensions === "9:16" ? "طولي 9:16" : dimensions === "4:5" ? "طولي 4:5" : "مربع 1:1" }
    );
    const [w, h] = getDimensions(dimensions);
    const img = await generatePremiumImage(promptRaw, w, h);
    if (img.imageBase64 || img.imageUrl) {
      return NextResponse.json(Object.fromEntries(Object.entries({
        prompt: promptRaw,
        imageBase64: img.imageBase64,
        imageUrl: img.imageUrl,
        provider: img.provider,
        providerNote: img.failureNote,
      }).filter(([, v]) => v !== undefined && v !== null)));
    }
    // فشل المزود الحقيقي: بطاقة حالة صادقة فقط — لا صورة بديلة
    return NextResponse.json(Object.fromEntries(Object.entries({
      premiumError: "تعذر إنشاء المرئي الاحترافي — أعد المحاولة، وإن استمرت المشكلة تواصل مع مسؤول المنصة.",
      providerNote: img.failureNote,
    }).filter(([, v]) => v !== undefined && v !== null)));
  } catch (e) {
    console.error("[image]", e);
    return NextResponse.json({ error: "تعذر إنشاء الصورة — حاول مرة أخرى." }, { status: 500 });
  }
}
