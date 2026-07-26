// ─────────────────────────────────────────────────────────────────────────────
// طبقة البحث الحي (بقرار مالكة المنصة) — تجلب مصادر حقيقية موثوقة قبل الكتابة،
// فيستند الكاتب إليها بدل التخمين من الذاكرة (جذر مشكلة اختلاق رقم المادة أو الدراسة).
//
// الضوابط المعتمدة من المالكة (قرارات الاعتماد النهائية):
// - المصادر بالمواصفات لا بالحصر: وثيقة حوكمة المصادر (الأبواب الثلاثة) تُحقن في
//   توجيه الباحث، والذكاء يحكم على كل مصدر بصفته لا باسمه. قائمة النطاقات المعدودة
//   حُذفت من الفلتر — «ماتحصر، نعطي مواصفات».
// - حد البحث: ثلاث عمليات كحد أقصى لكل طلب (max_uses).
// - القرار للمستخدم وحده: البحث يُستدعى بمفتاح «تعزيز بمصدر» (أو بطلبه المكتوب
//   المفهوم بالمعنى في مسار الإنشاء) — لا قوائم كلمات تقرر بدله.
// - مشترك: يُستدعى مرة واحدة قبل سباق النسختين، فتتشارك النسختان نفس المصادر.
//
// ★ لا يمسّ منطق التحليل إطلاقاً: البحث يرفع جودة ما يُقدَّم للفحص، لا الفحص نفسه.
// النص المستند إلى مصادر البحث يمرّ على مسؤول الامتثال ومقيّم اللغة والمخاطر كاملاً.
// ─────────────────────────────────────────────────────────────────────────────
import { SOURCE_GOVERNANCE } from "@/lib/source-governance";
import { recordUsage } from "@/lib/cost-meter";

export type ResearchResult = {
  // ملخص عربي للوقائع المتحقق منها، كل واقعة منسوبة لجهتها ورابطها — يُحقن في مطالبة الكاتب
  briefing: string;
  // المصادر المجلوبة فعلاً (عنوان + رابط) — للعرض في المحتوى وللتتبع
  sources: { title: string; url: string }[];
};

// مواصفات المصدر التي يطلبها المستخدم (اختيارية كلها) — تُوجّه البحث بدقة
export type SourceSpec = {
  wantSource?: boolean;   // طلب صريح للدعم بمصدر
  sourceKind?: string;    // نوع المصدر (دراسة/نظام/إحصائية...)
  sourceEntity?: string;  // اسم الجهة (كتابة حرة)
  sourceDesc?: string;    // وصف المصدر (كتابة حرة)
};

// أقصى عدد مصادر تُسلَّم للكاتب (قاعدة ثابتة بقرار مالكة المنصة: ٣ مصادر كحدٍّ أعلى
// مطلق — لا خمسة ولا أكثر؛ المطلوب مصدران أو ثلاثة موثوقة تكفي، لا قائمة طويلة).
// حد البحث نفسه ٣ عمليات، وهذا حدٌّ على النتائج المعروضة والمُسلَّمة للكاتب بعده.
const MAX_SOURCES_TO_WRITER = 3;

// النوع الوحيد الذي لا يحمل دليلاً بطبعه: خطة النشر (جدول مواعيد ومواضيع، لا نص
// موضوعي). بقرار المالكة حُذفت بقية القائمة القديمة — أنواع تحمل أدلة فعلاً كانت
// ممنوعة، وثلاثة منها لم تكن قابلة للاختيار أصلاً.
const NO_RESEARCH_TYPES = new Set(["خطة نشر"]);

// هل يُستدعى البحث الحي؟ — قرار المستخدم وحده (بقرار المالكة النهائي الملزم):
// المفتاح «تعزيز بمصدر» يقرر، ولا قائمة كلمات تقرر بدله. «نعم» تعني ابحث،
// و«لا» تعني لا تبحث — تُحترم في الاتجاهين. طلبه المكتوب بالمعنى يُفهم في
// مسار الإنشاء نفسه (الكاتب يفهم الفكرة ويرفع إشارة «بحاجة بحث»).
export function needsResearch(contentType?: string, spec?: SourceSpec): boolean {
  if (contentType && NO_RESEARCH_TYPES.has(contentType)) return false;
  return Boolean(spec?.wantSource);
}

function buildResearchInstruction(context: {
  specialty?: string; source?: string; topic?: string; contentType?: string;
  spec?: SourceSpec;
}): string {
  const parts = [
    context.contentType && `نوع المحتوى: ${context.contentType}`,
    context.specialty && `التخصص القانوني: ${context.specialty}`,
    context.source && `مصدر الفكرة: ${context.source}`,
    context.topic && `الموضوع أو التوجيه: ${context.topic}`,
  ].filter(Boolean).join(" | ");
  // مواصفات المصدر التي طلبها المستخدم صراحةً — توجّه البحث بدقة أعلى
  const sp = context.spec;
  const specLines = sp?.wantSource
    ? [
        "\n★ طلب المستخدم صراحةً دعم المحتوى بمصدر موثوق بهذه المواصفات — استهدفها في بحثك:",
        sp.sourceKind && `- نوع المصدر المطلوب: ${sp.sourceKind}`,
        sp.sourceEntity && `- الجهة المطلوبة: ${sp.sourceEntity} (إن لم تجد لها مصدراً في المصادر المعتمدة، ابحث عن بديل موثوق للموضوع نفسه، ولا تختلق نسبةً إليها)`,
        sp.sourceDesc && `- وصف المصدر المطلوب: ${sp.sourceDesc}`,
      ].filter(Boolean).join("\n")
    : "";
  return `أنت باحث قانوني موثوق يعمل لمنصة محتوى قانوني لمحامٍ مرخَّص في المملكة العربية السعودية. مهمتك جمع وقائع متحقق منها فقط من نتائج البحث، وفق وثيقة حوكمة المصادر أدناه حرفياً.

${SOURCE_GOVERNANCE}

—

السياق: ${parts}${specLines}

نفّذ بحثاً موجزاً (بحدود ثلاث عمليات) عن الوقائع والأنظمة والدراسات والإحصائيات ذات الصلة بهذا السياق تحديداً، ملتزماً بالوثيقة أعلاه — وأخصّها:
- احكم على كل مصدر **بصفته لا باسمه** وفق البابين الأول والثاني: إن تعلقت المعلومة بالمملكة العربية السعودية فلا تعتمد إلا مصدراً صادراً عن جهة حكومية مختصة فيها (المادتان ٣ و٦)، وقدّم الجهة صاحبة الاختصاص والأصل على الناقل (المادة ٤ والبند ١).
- استبعد كل ما حظرته المادة (٨) والقواعد المانعة: الموسوعات المفتوحة، المدونات، المنتديات، وسائل التواصل، المحتوى المولد بالذكاء، المجهول، التسويقي، والناقل عن الرسمي دون إحالة.
- عند تعدد المصادر التزم سلم الأولوية، وعند تعارضها قدّم الأعلى مع بيان سبب الترجيح.

ثم أخرج تقريراً موجزاً بالعربية على هذا النحو حصراً:
- كل واقعة أو حكم أو رقم في سطر مستقل، منسوباً لجهته الرسمية باسمها، متبوعاً برابط مصدره الحرفي بين قوسين.
- انقل الأرقام وأسماء الأنظمة والمواد والدراسات كما وردت في المصدر حرفياً — ممنوع منعاً باتاً تخمين أو استنتاج أي رقم أو اسم أو تاريخ لم يرد صراحةً في نتيجة بحث (المادة ١٣).
- إن لم تجد مصدراً موثوقاً لواقعة، فاذكر صراحةً «لم يُعثر على مصدر موثوق لهذه النقطة» ولا تخترعها.
- لا تكتب المحتوى النهائي ولا تحلّل — فقط اجمع الوقائع الموثقة بمصادرها.`;
}

// يستخرج المصادر (عنوان + رابط) من كتل نتائج البحث في رد كلود
function extractSources(content: unknown[]): { title: string; url: string }[] {
  const seen = new Set<string>();
  const out: { title: string; url: string }[] = [];
  for (const block of content) {
    const b = block as { type?: string; content?: unknown };
    if (b.type === "web_search_tool_result" && Array.isArray(b.content)) {
      for (const r of b.content) {
        const res = r as { type?: string; title?: string; url?: string };
        if (res.type === "web_search_result" && res.url && !seen.has(res.url)) {
          seen.add(res.url);
          out.push({ title: res.title || res.url, url: res.url });
        }
      }
    }
  }
  return out;
}

// يجمع كل النص الظاهر من رد كلود (التقرير الموجز)
function extractText(content: unknown[]): string {
  return content
    .filter((b) => (b as { type?: string }).type === "text")
    .map((b) => (b as { text?: string }).text ?? "")
    .join("\n")
    .trim();
}

// النواة المشتركة لنداء البحث الحي على المصادر الموثوقة — يخدم مسارين:
// الإنشاء (جمع مصادر قبل الكتابة) والمراجعة (تدقيق إحالات نص قائم). فشل البحث أو
// خدمته لا يُسقط العملية: يرجع null فتُكمل بضوابطها الحالية — البحث تحسين لا شرط.
async function callWebSearch(instruction: string, timeoutMs?: number): Promise<ResearchResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const calledAt = Date.now(); // زمن الاستدعاء للسجل التفصيلي
  // سقف زمني صارم للبحث (بقرار مالكة المنصة لمنع تعليق الصفحة): إن تجاوزه يُلغى.
  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), timeoutMs ?? 60_000);
  try {
    const response = await fetch(
      `${process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com"}/v1/messages`,
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-sonnet-5",
          max_tokens: 2048,
          thinking: { type: "disabled" },
          tools: [
            {
              type: "web_search_20260209",
              name: "web_search",
              max_uses: 3, // حد البحث المعتمد من المالكة
              // بقرار المالكة النهائي: لا حصر بقائمة نطاقات — «ماتحصر، نعطي
              // مواصفات». وثيقة حوكمة المصادر محقونة في التوجيه، والذكاء يحكم
              // على كل مصدر بصفته، والمراجعة تعيد التحقق على كل نص (ضمانة ثانية).
            },
          ],
          messages: [{ role: "user", content: instruction }],
        }),
      }
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as { content?: unknown[]; usage?: unknown };
    // عدّاد التكلفة الداخلي مع السجل التفصيلي (يشمل عدد عمليات البحث)
    recordUsage(payload.usage, { stage: "بحث المصادر", model: "claude-sonnet-5", durationMs: Date.now() - calledAt });
    const content = payload.content ?? [];
    const sources = extractSources(content).slice(0, MAX_SOURCES_TO_WRITER);
    const briefing = extractText(content);
    // لا مصادر مجلوبة أو تقرير فارغ ⇒ لا فائدة من الحقن.
    // (حُذف بقرار المالكة فحصُ تضمُّن عبارة «لا توجد مصادر موثوقة» — كان يُسقط
    // تقريراً ناجحاً بمصادره الحقيقية لمجرد ورود العبارة عن نقطة واحدة فيه.)
    if (sources.length === 0 || !briefing) {
      return null;
    }
    return { briefing, sources };
  } catch {
    return null;
  } finally {
    clearTimeout(abortTimer);
  }
}

// مسار الإنشاء: يُستدعى مرة واحدة (مشترك) قبل الكتابة لجلب مصادر موثوقة يستند إليها الكاتب.
export async function researchTrustedSources(context: {
  specialty?: string; source?: string; topic?: string; contentType?: string;
  spec?: SourceSpec;
  // سقف زمني للبحث (اختياري). المسار المتزامن (إعادة الصياغة) يمرّر سقفاً أقصر كي
  // يبقى الطلب قصيراً فلا ينقطع اتصال الجوال؛ المسار الخلفي (الإنشاء) يحتمل الأطول.
  timeoutMs?: number;
}): Promise<ResearchResult | null> {
  return callWebSearch(buildResearchInstruction(context), context.timeoutMs);
}

// موجّه تدقيق الإحالات لمسار المراجعة — تحقّق فعلي من صحة ما في النص القائم، لا كتابة.
function buildVerificationInstruction(context: { text: string; specialty?: string; sourceHint?: string }): string {
  const spec = context.specialty ? `\nالتخصص القانوني: ${context.specialty}` : "";
  const hint = context.sourceHint
    ? `\nأشار كاتب النص إلى هذا المرجع (وجّه تحرّيك للتحقق منه، ولا تكتفِ به): ${context.sourceHint}`
    : "";
  return `أنت مدقّق مصادر قانوني موثوق يعمل لمنصة محتوى قانوني لمحامٍ مرخَّص في المملكة العربية السعودية. أمامك نصّ يريد المحامي نشره، وقد يتضمّن إحالات نظامية (أرقام مواد أو أسماء أنظمة)، أو أرقاماً ونسباً، أو دراسات ووقائع منسوبة لجهات.${spec}${hint}

تحكم تدقيقَك وثيقة حوكمة المصادر التالية حرفياً — وأخصّها للتدقيق: ما تعلق بالمملكة العربية السعودية لا يُثبَت إلا من جهة حكومية مختصة فيها، والأصل يُقدَّم على الناقل، والمصادر المحظورة في المادة (٨) والقواعد المانعة لا يُعتد بها:

${SOURCE_GOVERNANCE}

—

مهمتك: ابحث (بحدود ثلاث عمليات) للتحقّق من صحة كل إحالة أو رقم أو واقعة وردت في النص — حتى ما لم يُفصح عنه كاتب النص صراحةً. لا تكتب محتوى ولا تحكم على الامتثال؛ فقط دقّق الوقائع.

أخرج تقريراً موجزاً بالعربية، كل بند في سطر مستقل:
- «مؤكَّد»: الإحالة أو الرقم مطابق للمصدر الرسمي — انقل النص أو الرقم حرفياً من المصدر متبوعاً برابطه بين قوسين.
- «غير مطابق»: الإحالة موجودة لكن مضمونها يخالف ما في النص — وضّح وجه المخالفة مع الرابط.
- «تعذّر التحقّق»: لم يُعثر على مصدر موثوق لها.
ممنوع منعاً باتاً تخمين أو استنتاج أي رقم أو مادة أو تاريخ لم يرد صراحةً في نتيجة بحث. إن لم تجد شيئاً موثوقاً البتة، اكتب «لا توجد مصادر موثوقة كافية».

النص المراد تدقيق إحالاته:
«${context.text}»`;
}

// مسار المراجعة: تحقّق حيّ من إحالات نص قائم في المصادر الموثوقة — إنفاذٌ فعليٌّ
// لقاعدة تحرّي المصادر بأداة تحقّق حقيقية بدل الاكتفاء بذاكرة النموذج.
export async function verifyTextCitations(context: {
  text: string; specialty?: string; sourceHint?: string; timeoutMs?: number;
}): Promise<ResearchResult | null> {
  return callWebSearch(buildVerificationInstruction(context), context.timeoutMs);
}
