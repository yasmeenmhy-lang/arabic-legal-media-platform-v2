// ─────────────────────────────────────────────────────────────────────────────
// محرك الفهم — محلل النية والسياق النظامي.
//
// ★ قاعدة المحرك الواحد (بقرار مالكة المنصة): هذا المحرك هو المرجع الوحيد
// لفهم الطلب، ومخرجه (الادعاءات) هو المرجع الوحيد لما يحتاج إثباتاً — ولا
// يجوز لأي مرحلة لاحقة (بحث، تحقق، كتابة) تجاوزه أو العمل خارج تمثيله.
//
// ★ التسلسل المعتمد: فكرة ← فهم ← ادعاءات ← إثبات ← محتوى — البحث مرحلة
// تفكير في منتصف السلسلة، لا نقطة بداية.
//
// يستلم كل حقول المستخدم معاً (لا الفكرة وحدها)، ويستخرج بالمعنى — لا بأي
// قائمة كلمات — التمثيل الدلالي المنظم: الموضوع، النطاق، نوع المعلومة،
// الجهات والمصطلحات الرسمية المرشحة (فرضيات تُختبر بالبحث لا تُفترض صحتها)،
// والادعاءات المستقلة مصنفةً: ما يحتاج إثباتاً بفئات المادة (١٠) وما هو عام.
// المستخدم غير مطالب بمعرفة اسم النظام أو الجهة — هذه مسؤولية هذا المحرك.
// ─────────────────────────────────────────────────────────────────────────────
import { SOURCE_GOVERNANCE } from "@/lib/source-governance";
import { LEADERSHIP_PRAISE_PIPELINE_NOTE } from "@/lib/leadership-praise-rule";
import { recordUsage } from "@/lib/cost-meter";
import type { IntentRepresentation, IntentClaim } from "@/lib/source-dossier";

export type IntentInputs = {
  topic?: string;        // الفكرة بصياغة المستخدم الطبيعية
  specialty?: string;
  purpose?: string;
  audience?: string;
  source?: string;       // مصدر المحتوى المختار
  contentType?: string;
  channel?: string;
  extraDirectives?: string; // توجيهات النوع الإضافية إن وجدت
};

const SYSTEM = `أنت محلل نية في منصة محتوى قانوني لمحامٍ مرخَّص في المملكة العربية السعودية. مهمتك الفهم فقط — لا البحث ولا الكتابة.

تحكمك وثيقة حوكمة المصادر التالية (لتصنيف ما يحتاج إثباتاً بمصدر وفق فئات المادة العاشرة الثلاث عشرة: حكم نظامي، تفسير نظامي، اختصاص جهة، إجراء حكومي، مدة أو مهلة، عقوبة، نسبة، رقم جوهري، متطلب نظامي، التزام نظامي، استثناء نظامي، أثر قانوني، معلومة منسوبة لجهة حكومية):

${SOURCE_GOVERNANCE}

${LEADERSHIP_PRAISE_PIPELINE_NOTE}
وعليه في تحليلك: عبارة الثناء أو الإشادة بالقيادة لا تدخل الادعاءات أصلاً (ليست needsProof ولا ادعاءً مستقلاً) — ولا يدخل الادعاءات من هذا الباب إلا الواقعة المحددة القابلة للإثبات المنسوبة للقيادة.

—

اقرأ مدخلات المستخدم كلها معاً وافهم مقصوده بالمعنى — المستخدم يكتب بلغته الطبيعية وغير مطالب بمعرفة اسم النظام أو اللائحة أو الجهة أو المصطلح الرسمي؛ استنتاجها مسؤوليتك، بوصفها فرضيات ستُختبر بالبحث لاحقاً لا حقائق.

أخرج JSON واحداً صالحاً فقط، بلا أي نص قبله أو بعده، بهذه البنية حرفياً:
{
  "mainTopic": "الموضوع الرئيس",
  "subTopics": ["..."],
  "jurisdiction": "المملكة" | "دولي" | "مختلط",
  "infoType": "نظام" | "لائحة" | "قرار" | "خبر رسمي" | "إجراء" | "اختصاص" | "إحصاء" | "تحليل",
  "recency": "حديث" | "مستقر",
  "candidateAuthorities": ["فرضيات الجهات المختصة بالاستدلال"],
  "candidateOfficialTerms": ["فرضيات المصطلح الرسمي المحتمل"],
  "claims": [
    { "id": "c1", "text": "نص الادعاء المستقل", "needsProof": true|false, "whyNeedsProof": "الفئة من الثلاث عشرة إن احتاج", "scope": "المملكة" | "دولي" | "عام", "essential": true|false, "regulatory": true|false }
  ]
}

قواعد الادعاءات:
- فكك مضمون المحتوى المتوقع إلى ادعاءات مستقلة قابلة للتحقق كل على حدة (٢ إلى ٦ ادعاءات).
- needsProof=true لكل ادعاء يقع في فئة من الثلاث عشرة؛ وneedsProof=false للفكرة العامة المشروعة.
- scope="المملكة" لأي ادعاء يتعلق بأنظمتها أو جهاتها — ولا يثبته لاحقاً إلا مصدر حكومي رسمي فيها.
- essential=true إذا كان الادعاء جوهرياً لتحقيق فكرة المستخدم — غيابه يجعل المحتوى ناقصاً أو مضللاً؛ وessential=false إذا كان مسانداً يمكن حذفه دون إخلال بالفكرة.
- regulatory=true إذا كان الادعاء حكماً أو إجراءً أو التزاماً أو عقوبة أو مدة أو اختصاصاً نظامياً يخص جهات المملكة (لا يثبته إلا مصدر حكومي)؛ وregulatory=false إذا كان معلومة بحثية أو إحصائية أو أكاديمية أو صحفية عامة (تقبل دراسة أو بحثاً أو مقالة موثوقة بنسبتها الصريحة).`;

// تحليل النية — نداء واحد صغير. فشله = فشل مرحلة الفهم (المرحلة ١ من مراحل
// الإخفاق السبع) ويُبلَّغ باسمها؛ لا سقوط صامت لمسار قديم (قاعدة المحرك الواحد).
export async function analyzeIntent(inputs: IntentInputs, timeoutMs = 45_000): Promise<IntentRepresentation | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const startedAt = Date.now();
  const user = [
    "مدخلات المستخدم كاملة:",
    inputs.topic && `- الفكرة (بصياغته الحرفية): «${inputs.topic}»`,
    inputs.specialty && `- التخصص: ${inputs.specialty}`,
    inputs.purpose && `- الهدف: ${inputs.purpose}`,
    inputs.audience && `- الجمهور: ${inputs.audience}`,
    inputs.source && `- مصدر المحتوى المختار: ${inputs.source}`,
    inputs.contentType && `- نوع المحتوى: ${inputs.contentType}`,
    inputs.channel && `- القناة: ${inputs.channel}`,
    inputs.extraDirectives && `- توجيهات إضافية: ${inputs.extraDirectives}`,
  ].filter(Boolean).join("\n");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(
      `${process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com"}/v1/messages`,
      {
        method: "POST",
        signal: controller.signal,
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-5",
          max_tokens: 1500,
          thinking: { type: "disabled" },
          system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: user }],
        }),
      }
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as { content?: { type: string; text: string }[]; usage?: unknown };
    recordUsage(payload.usage, { stage: "محلل النية", model: "claude-sonnet-5", durationMs: Date.now() - startedAt });
    const text = payload.content?.find((c) => c.type === "text")?.text ?? "";
    return parseIntent(text);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// تحليل متسامح للمخرج: يقتطع كتلة الـJSON ويصححها بنيوياً — أي نقص جوهري = null
export function parseIntent(raw: string): IntentRepresentation | null {
  try {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start < 0 || end <= start) return null;
    const obj = JSON.parse(raw.slice(start, end + 1)) as Partial<IntentRepresentation>;
    if (!obj.mainTopic || !Array.isArray(obj.claims) || obj.claims.length === 0) return null;
    const claims: IntentClaim[] = obj.claims
      .filter((c): c is IntentClaim => Boolean(c && typeof c.text === "string" && c.text.trim()))
      .map((c, i) => ({
        id: typeof c.id === "string" && c.id ? c.id : `c${i + 1}`,
        text: c.text,
        needsProof: Boolean(c.needsProof),
        whyNeedsProof: c.whyNeedsProof,
        scope: c.scope === "دولي" || c.scope === "عام" ? c.scope : "المملكة",
        // غياب الحقل في مخرج قديم/ناقص ⇒ يُعامل جوهرياً احتياطاً (الأشد أماناً)
        essential: c.essential === undefined ? true : Boolean(c.essential),
        // غياب الصفة ⇒ نظامي احتياطاً (الأشد أماناً — لا يثبته إلا حكومي)
        regulatory: c.regulatory === undefined ? true : Boolean(c.regulatory),
      }));
    if (claims.length === 0) return null;
    return {
      mainTopic: obj.mainTopic,
      subTopics: Array.isArray(obj.subTopics) ? obj.subTopics : [],
      jurisdiction: obj.jurisdiction === "دولي" || obj.jurisdiction === "مختلط" ? obj.jurisdiction : "المملكة",
      infoType: typeof obj.infoType === "string" ? obj.infoType : "تحليل",
      recency: obj.recency === "حديث" ? "حديث" : "مستقر",
      candidateAuthorities: Array.isArray(obj.candidateAuthorities) ? obj.candidateAuthorities : [],
      candidateOfficialTerms: Array.isArray(obj.candidateOfficialTerms) ? obj.candidateOfficialTerms : [],
      claims,
    };
  } catch {
    return null;
  }
}
