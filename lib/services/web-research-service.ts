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

// أقصى عدد مصادر تُسلَّم للكاتب (بقرار المالكة: لا نُغرقه بقائمة طويلة — المقال
// وغيره يكفيه القليل الموثوق). حد البحث نفسه ٣ عمليات، وهذا حدٌّ على النتائج بعده.
const MAX_SOURCES_TO_WRITER = 5;

// الأنواع الموجزة والتعريفية والشخصية لا تستند لواقعة خارجية، فلا تحتاج بحثاً
// إطلاقاً (بقرار المالكة: الإعلان والتعليق واليوميات ونحوها لا تُبحث).
const NO_RESEARCH_TYPES = new Set([
  "إعلان مهني", "تعليق", "يوميات", "تصريح", "وسم", "عنوان",
  "محتوى بصري", "تصدير اجتماعي", "حملة", "خطة نشر",
]);

// هل يحتاج هذا الطلب بحثاً حياً؟ (مشروط — بقرار المالكة لتوفير الوقت والرصيد)
// - طلب المستخدم الصريح (wantSource) يُفعّله دائماً بمواصفاته، في أي نوع محتوى.
// - وإلا فالبحث التلقائي المشروط: النوع معرفي (لا موجز/تعريفي) والمحتوى يستند إلى
//   واقعة خارجية (نظام، حكم، دراسة، إحصائية، تطور دولي). ما عدا ذلك يبقى بسرعته.
export function needsResearch(
  source: string, topic: string, contentType?: string, spec?: SourceSpec
): boolean {
  // طلب المستخدم الصريح يسبق كل شيء — هو من قرر أنه يريد الاستدلال بمصدر
  if (spec?.wantSource) return true;
  if (contentType && NO_RESEARCH_TYPES.has(contentType)) return false;
  const s = source || "";
  const t = topic || "";
  const sourceAnchored =
    s.includes("عالمية") || s.includes("محلية") || s.includes("أنظمة ولوائح") ||
    s.includes("أحكام") || s.includes("المبادئ") || s.includes("إحصائيات") ||
    s.includes("أكاديمية") || s.includes("صفقات") || s.includes("هيئة");
  const topicAnchored =
    /دراس|بحث|أبحاث|إحصائ|تقرير|مقارن|دولي|دولية|تجارب|مؤشر|نسبة|معدل|اتجاه عالمي/.test(t);
  return sourceAnchored || topicAnchored;
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
  return `أنت باحث قانوني موثوق. مهمتك جمع وقائع متحقق منها فقط من نتائج البحث في المصادر الموثوقة المتاحة، لإعداد محامٍ سعودي لكتابة محتوى مهني.

السياق: ${parts}${specLines}

نفّذ بحثاً موجزاً (بحدود ثلاث عمليات) عن الوقائع والأنظمة والدراسات والإحصائيات ذات الصلة بهذا السياق تحديداً، ثم أخرج تقريراً موجزاً بالعربية على هذا النحو حصراً:
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

// البحث الحي عن مصادر موثوقة — يُستدعى مرة واحدة (مشترك) قبل الكتابة.
// فشل البحث أو خدمته لا يُسقط التوليد: يرجع null فيكمل الكاتب بضوابطه الحالية
// (النسبة العامة الصادقة) — البحث تحسين لجودة المصدر لا شرط لعمل المنصة.
export async function researchTrustedSources(context: {
  specialty?: string; source?: string; topic?: string; contentType?: string;
  spec?: SourceSpec;
}): Promise<ResearchResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  try {
    const response = await fetch(
      `${process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com"}/v1/messages`,
      {
        method: "POST",
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
          messages: [{ role: "user", content: buildResearchInstruction(context) }],
        }),
      }
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as { content?: unknown[] };
    const content = payload.content ?? [];
    // أفضل المصادر فقط (لا نُغرق الكاتب) — بحد أقصى معتمد من المالكة
    const sources = extractSources(content).slice(0, MAX_SOURCES_TO_WRITER);
    const briefing = extractText(content);
    // لا مصادر مجلوبة أو تقرير فارغ ⇒ لا فائدة من الحقن — يكمل الكاتب بضوابطه
    if (sources.length === 0 || !briefing || briefing.includes("لا توجد مصادر موثوقة")) {
      return null;
    }
    return { briefing, sources };
  } catch {
    return null;
  }
}
