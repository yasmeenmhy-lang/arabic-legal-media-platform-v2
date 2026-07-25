// ─────────────────────────────────────────────────────────────────────────────
// طبقة البحث الحي (بقرار مالكة المنصة) — تجلب مصادر حقيقية موثوقة قبل الكتابة،
// فيستند الكاتب إليها بدل التخمين من الذاكرة (جذر مشكلة اختلاق رقم المادة أو الدراسة).
//
// الضوابط المعتمدة من المالكة:
// - المصادر: موثوقة فقط (رسمية + دولية + أكاديمية) — allowed_domains يقصر البحث عليها.
// - حد البحث: ثلاث عمليات كحد أقصى لكل طلب (max_uses).
// - مشروط: لا يُستدعى إلا حين يحتاجه المصدر أو الموضوع (needsResearch)، فالطلب الذي
//   لا يحتاج مصدراً خارجياً يبقى بسرعته الحالية.
// - مشترك: يُستدعى مرة واحدة قبل سباق النسختين، فتتشارك النسختان نفس المصادر (توفير الوقت).
//
// ★ لا يمسّ منطق التحليل إطلاقاً: البحث يرفع جودة ما يُقدَّم للفحص، لا الفحص نفسه.
// النص المستند إلى مصادر البحث يمرّ على مسؤول الامتثال ومقيّم اللغة والمخاطر كاملاً.
// ─────────────────────────────────────────────────────────────────────────────
import { TRUSTED_SOURCE_DOMAINS } from "@/lib/services/trusted-sources";
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

// الأنواع الموجزة والتعريفية والشخصية لا تستند لواقعة خارجية، فلا تحتاج بحثاً
// إطلاقاً (بقرار المالكة: الإعلان والتعليق واليوميات ونحوها لا تُبحث).
const NO_RESEARCH_TYPES = new Set([
  "إعلان مهني", "تعليق", "يوميات", "تصريح", "وسم", "عنوان",
  "محتوى بصري", "تصدير اجتماعي", "حملة", "خطة نشر",
]);

// هل يحتاج هذا الطلب بحثاً حياً؟ (مشروط — بقرار المالكة لتوفير الوقت والرصيد)
// - الأنواع التي لا تستند لواقعة خارجية (إعلان، خطة نشر، تعليق...) لا تُبحث أبداً،
//   حتى لو وصل wantSource مضبوطاً (حصنٌ خلفي وراء حجب الواجهة له).
// - طلب المستخدم الصريح (wantSource) في نوع مؤهل يُفعّله بمواصفاته.
// - وإلا فالبحث التلقائي المشروط: النوع معرفي والمحتوى يستند إلى واقعة خارجية.
// دلالات الاستناد النظامي التي توجب البحث عن نص المصدر قبل الكتابة — تُقاس على
// الموضوع ومصدر الفكرة. واسعة عمداً: كلفة بحث زائد أهون من حكم نظامي بلا سند.
const LEGAL_RESEARCH_TRIGGER =
  /نظام|أنظمة|لائح|ماد[هة]|قاعد[هة]|مرسوم|أمر ملكي|قرار وزاري|تعميم|دعوى|قضاء|محكم[هة]|ديوان|تظلم|طعن|استئناف|ميعاد|مواعيد|مدة|مهل[هة]|تقادم|عقوب[هة]|غرام[هة]|سجن|جريم[هة]|مخالف[هة]|عقد|التزام|حق|حقوق|تعويض|إجراء|إجراءات|اختصاص|صلاحي[هة]|ترخيص|تسجيل|شرط|شروط|بطلان|فسخ|إلغاء/;

export function needsResearch(
  source: string, topic: string, contentType?: string, spec?: SourceSpec
): boolean {
  // حصن أول: النوع غير المؤهل لا يُبحث إطلاقاً — يسبق حتى طلب المستخدم الصريح
  if (contentType && NO_RESEARCH_TYPES.has(contentType)) return false;
  // طلب المستخدم الصريح في نوع مؤهل — هو من قرر الاستناد لمرجع
  if (spec?.wantSource) return true;
  const s = source || "";
  const t = topic || "";
  const sourceAnchored =
    s.includes("عالمية") || s.includes("محلية") || s.includes("أنظمة ولوائح") ||
    s.includes("أحكام") || s.includes("المبادئ") || s.includes("إحصائيات") ||
    s.includes("أكاديمية") || s.includes("صفقات") || s.includes("هيئة");
  const topicAnchored =
    /دراس|بحث|أبحاث|إحصائ|تقرير|مقارن|دولي|دولية|تجارب|مؤشر|نسبة|معدل|اتجاه عالمي/.test(t);
  // ★ الدلالة النظامية (بقرار مالكة المنصة): شروط البحث كانت ألفاظاً بحثية
  // وإحصائية وحدها — ولا كلمة عن نظام أو مادة أو مدة أو عقوبة. فموضوع نظامي
  // خالص («التظلم من قرار إداري») لا يطابق شرطاً، فلا يُستدعى له بحث، ثم يكتب
  // الكاتب حكمه من ذاكرته. والمنصة لا تستشهد بنص إلا من مصدره، فأي دلالة
  // استناد نظامي تستوجب البحث.
  const legalAnchored = LEGAL_RESEARCH_TRIGGER.test(t) || LEGAL_RESEARCH_TRIGGER.test(s);
  return sourceAnchored || topicAnchored || legalAnchored;
}

// هل يتضمن النص المُحسَّن/المراجَع مصدراً أو مرجعاً أو دراسة؟ (لمسار التحسين)
// بقرار المالكة: البحث في التحسين يعمل فقط إن كان النص نفسه يستند إلى مصدر — فنتحقق
// منه وندعمه؛ وإلا فلا يحتاج بحثاً. كشف لغوي بسيط لألفاظ الاستناد الخارجي.
export function mentionsSource(text: string): boolean {
  const t = text || "";
  return /دراس|بحث علمي|أبحاث|إحصائ|تقرير|مصدر|مرجع|وفق|بحسب|أشار|نشرت|جامعة|منظمة|الأونسيترال|المادة\s|نظام\s|لائحة|نسبة\s|معدل\s|٪|%/.test(t);
}

function buildResearchInstruction(context: {
  specialty?: string; source?: string; topic?: string; contentType?: string;
  spec?: SourceSpec;
}): string {
  // الوصول إلى نصّ المادة يحتاج بحثاً ثم فتح صفحة ثم قراءة — وثلاث عمليات قد
  // لا تكفي. يُوسَّع السقف للسياق النظامي وحده، ويبقى ضيّقاً لغيره حفظاً للزمن.
  const legalContext =
    LEGAL_RESEARCH_TRIGGER.test(context.topic || "") ||
    LEGAL_RESEARCH_TRIGGER.test(context.source || "");
  const maxSearches = legalContext ? "ست" : "ثلاث";
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
  return `أنت باحث قانوني موثوق. مهمتك جمع وقائع متحقق منها فقط من نتائج البحث في المصادر الموثوقة المتاحة، لإعداد محامٍ سعودي لكتابة محتوى مهني.

السياق: ${parts}${specLines}

★ إن كان السياق نظامياً (يمسّ نظاماً أو مادة أو مدة أو ميعاداً أو عقوبة أو إجراءً): هدفك الأول **نصّ المادة نفسه** لا كلاماً حولها. حدّد **النظام أو الاتفاقية أو النص المعني بالموضوع نفسه** باسمه الرسمي — أياً كان مصدره: سعودياً أو دولياً — وافتح مصدره الرسمي (بوابة الأنظمة والتشريعات أو وزارة العدل أو الجريدة الرسمية للأنظمة السعودية، وموقع الجهة الدولية أو المحكمة أو المنظمة صاحبة النص للمصادر الدولية)، **وانقل نصّ المادة المعنية حرفاً بحرف** برقمها ورابطها. اتبع الموضوع حيث يقود ولا تفترض أنه سعودي. مقالٌ يتحدث عن النظام ليس بديلاً عن نصّ المادة. وإن تعدّدت المواد فانقل ما يخصّ الموضوع منها.

نفّذ بحثاً موجزاً (بحدود ${maxSearches} عمليات) عن الوقائع والأنظمة والدراسات والإحصائيات ذات الصلة بهذا السياق تحديداً، ثم أخرج تقريراً موجزاً بالعربية على هذا النحو حصراً:
- كل واقعة أو حكم أو رقم في سطر مستقل، منسوباً لجهته الرسمية باسمها، متبوعاً برابط مصدره الحرفي بين قوسين.
- انقل الأرقام وأسماء الأنظمة والمواد والدراسات كما وردت في المصدر حرفياً — ممنوع منعاً باتاً تخمين أو استنتاج أي رقم أو اسم أو تاريخ لم يرد صراحةً في نتيجة بحث.
- إن لم تجد مصدراً موثوقاً لواقعة، فاذكر صراحةً «لم يُعثر على مصدر موثوق لهذه النقطة» ولا تخترعها.
- لا تكتب المحتوى النهائي ولا تحلّل — فقط اجمع الوقائع الموثقة بمصادرها. إن لم تجد شيئاً موثوقاً البتة، اكتب «لا توجد مصادر موثوقة كافية».`;
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
              max_uses: 3,                        // حد البحث المعتمد من المالكة
              allowed_domains: TRUSTED_SOURCE_DOMAINS, // المصادر الموثوقة حصراً
            },
          ],
          messages: [{ role: "user", content: instruction }],
        }),
      }
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as { content?: unknown[]; usage?: unknown };
    recordUsage(payload.usage); // عدّاد التكلفة الداخلي (يشمل عدد عمليات البحث)
    const content = payload.content ?? [];
    const sources = extractSources(content).slice(0, MAX_SOURCES_TO_WRITER);
    const briefing = extractText(content);
    // لا مصادر مجلوبة أو تقرير فارغ ⇒ لا فائدة من الحقن
    if (sources.length === 0 || !briefing || briefing.includes("لا توجد مصادر موثوقة")) {
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
  return `أنت مدقّق مصادر قانوني موثوق. أمامك نصّ يريد محامٍ سعودي نشره، وقد يتضمّن إحالات نظامية (أرقام مواد أو أسماء أنظمة)، أو أرقاماً ونسباً، أو دراسات ووقائع منسوبة لجهات.${spec}${hint}

مهمتك: ابحث في المصادر الموثوقة المتاحة فقط (بحدود ثلاث عمليات) للتحقّق من صحة كل إحالة أو رقم أو واقعة وردت في النص — حتى ما لم يُفصح عنه كاتب النص صراحةً. لا تكتب محتوى ولا تحكم على الامتثال؛ فقط دقّق الوقائع.

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
