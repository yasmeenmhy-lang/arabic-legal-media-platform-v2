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
import type { IntentRepresentation, ClaimFinding, SourceDossier } from "@/lib/source-dossier";

export type ResearchResult = {
  // ملخص عربي للوقائع المتحقق منها، كل واقعة منسوبة لجهتها ورابطها — يُحقن في مطالبة الكاتب
  briefing: string;
  // المصادر المجلوبة فعلاً (عنوان + رابط) — للعرض في المحتوى وللتتبع
  sources: { title: string; url: string }[];
  // ★ بوابة السيادة المرجعية الحتمية (بقرار مالكة المنصة في المراجعة قبل النشر):
  // «لا تكفي شارة النطاق وحدها للحكم بالاختصاص أو الاعتماد» لكن الفصل الحتمي
  // الأول واجب — المصادر الحكومية الرسمية للمملكة العربية السعودية (.gov.sa)
  // وحدها سند الشأن المتعلق بالمملكة؛ وما سواها مصادر مقارنة/دولية تخضع للباب
  // الثاني ولا يجوز إثبات شأن يتعلق بالمملكة بها. الاختصاص الموضوعي والأصالة
  // (المادتان ٣ و٤) يحكم بهما الباحث والمدقق بالمعنى وفق الوثيقة المحقونة.
  saudiOfficialSources: { title: string; url: string }[];
  comparativeSources: { title: string; url: string }[];
  // لمسار التحقق: ما الذي تحقق منه لكل مصدر — السطر الحرفي من تقرير المدقق الذي
  // أسند إليه. المصدر الذي لم يُسند إليه شيء في التقرير «نتيجة بحث مجردة» ولا يُعد
  // مصدر تحقق (بقرار المالكة).
  details?: { title: string; url: string; note: string }[];
};

// هل الرابط لجهة حكومية رسمية في المملكة العربية السعودية؟ (النطاق .gov.sa لا
// تملكه إلا جهة حكومية فيها — فحص حتمي بالكود)
export function isSaudiOfficialUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host === "gov.sa" || host.endsWith(".gov.sa");
  } catch {
    return false;
  }
}

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
    const rawSources = extractSources(content);
    const briefing = extractText(content);
    // لا مصادر مجلوبة أو تقرير فارغ ⇒ لا فائدة من الحقن.
    // (حُذف بقرار المالكة فحصُ تضمُّن عبارة «لا توجد مصادر موثوقة» — كان يُسقط
    // تقريراً ناجحاً بمصادره الحقيقية لمجرد ورود العبارة عن نقطة واحدة فيه.)
    if (rawSources.length === 0 || !briefing) {
      return null;
    }
    // ★ بوابة الإسناد الفعلي (بقرار المالكة): «نتيجة البحث المجردة لا تُعد مصدراً» —
    // يُقدَّم المصدر الذي أسند إليه الباحث واقعةً في تقريره (رابطه وارد في التقرير
    // حرفياً)، فهو ما فُتح وقُرئ ونُقل منه فعلاً. وإن لم يوثِّق الباحث الروابط في
    // تقريره تبقى القائمة الخام بحدها الأقصى (لا نُسقط بحثاً ناجحاً لشكل التقرير).
    const cited = rawSources.filter((s) => briefing.includes(s.url));
    const base = (cited.length > 0 ? cited : rawSources).slice(0, MAX_SOURCES_TO_WRITER);
    // بوابة السيادة المرجعية: فصل حتمي بين الحكومي الرسمي للمملكة وبين ما سواه
    const saudiOfficialSources = base.filter((s) => isSaudiOfficialUrl(s.url));
    const comparativeSources = base.filter((s) => !isSaudiOfficialUrl(s.url));
    // ما الذي تحقق منه لكل مصدر مُسنَد: السطر الحرفي من التقرير الحامل لرابطه
    const details = cited.slice(0, MAX_SOURCES_TO_WRITER).map((s) => {
      const line = briefing
        .split("\n")
        .find((l) => l.includes(s.url));
      return { title: s.title, url: s.url, note: (line ?? "").replace(/^[-•\s]+/, "").trim() };
    }).filter((d) => d.note.length > 0);
    return { briefing, sources: base, saudiOfficialSources, comparativeSources, details };
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

// ─── البحث بالادعاءات — مسار محرك الفهم (قاعدة المحرك الواحد) ────────────────
// الباحث لا يستلم حقولاً خاماً بل التمثيل الدلالي من محرك الفهم: يبحث لكل
// ادعاء يحتاج إثباتاً على حدة، مسترشداً بفرضيات الجهات والمصطلحات الرسمية
// (يختبرها لا يفترض صحتها)، ويعيد تقريره منسوباً بمعرفات الادعاءات — فيُبنى
// منه Claim–Source Mapping بالكود. البحث مرحلة تفكير، لا نقطة بداية.

function buildClaimResearchInstruction(intent: IntentRepresentation): string {
  const proofClaims = intent.claims.filter((c) => c.needsProof);
  const claimLines = proofClaims
    .map((c) => `- [${c.id}] ${c.text} (النطاق: ${c.scope}${c.whyNeedsProof ? ` — الفئة: ${c.whyNeedsProof}` : ""})`)
    .join("\n");
  return `أنت باحث قانوني موثوق يعمل لمنصة محتوى قانوني لمحامٍ مرخَّص في المملكة العربية السعودية. تحكمك وثيقة حوكمة المصادر التالية حرفياً:

${SOURCE_GOVERNANCE}

—

التمثيل الدلالي للطلب (من محرك الفهم):
- الموضوع الرئيس: ${intent.mainTopic}
- الموضوعات الفرعية: ${intent.subTopics.join("، ") || "—"}
- النطاق: ${intent.jurisdiction} | نوع المعلومة: ${intent.infoType} | الحداثة: ${intent.recency}
- فرضيات الجهات المختصة (اختبرها بالبحث، لا تفترض صحتها): ${intent.candidateAuthorities.join("، ") || "—"}
- فرضيات المصطلح الرسمي (اختبرها بالبحث): ${intent.candidateOfficialTerms.join("، ") || "—"}

الادعاءات المطلوب إثباتها — ابحث عن كل واحد على حدة (بحدود ثلاث عمليات بحث إجمالاً، فوزّعها على الأهم):
${claimLines}

لكل ادعاء نوّع استراتيجيتك من المعنى: بصياغة المستخدم، وبالمصطلح الرسمي المفترض، وبالجهة المرشحة، وبنوع الوثيقة — ولا تعتمد مطابقة كلمات.

قواعد الإخراج الملزمة (تُقرأ آلياً — التزم الصيغة حرفياً):
لكل ادعاء سطر واحد يبدأ بمعرفه:
[c1] مثبت — «المقطع الداعم منقولاً حرفياً من المصدر» — الجهة المصدرة — نوع الوثيقة — الرابط الكامل
أو:
[c1] لم يُعثر — سبب موجز (لا نتائج / النتائج غير حكومية / غير مختصة / لا تدعم الادعاء)

- الادعاء بنطاق «المملكة» لا يُكتب له «مثبت» إلا بمصدر جهة حكومية رسمية فيها (المادتان ٣ و٦) — الأصل لا الناقل (المادة ٤).
- ممنوع منعاً باتاً اختلاق رابط أو مقطع أو جهة (المادة ١٣). انقل المقطع كما ورد حرفياً.
- لا تكتب شيئاً غير هذه الأسطر.`;
}

// يقرأ أسطر [cN] من تقرير الباحث — تحليل حتمي بالكود
export function parseClaimFindings(briefing: string, urls: Set<string>): ClaimFinding[] {
  const findings: ClaimFinding[] = [];
  for (const raw of briefing.split("\n")) {
    const line = raw.trim();
    const idMatch = line.match(/^\[?(c\d+)\]?/);
    if (!idMatch) continue;
    const claimId = idMatch[1];
    if (/لم يُعثر|لم يعثر/.test(line)) {
      findings.push({ claimId, status: "لم يُعثر" });
      continue;
    }
    if (!/مثبت/.test(line)) continue;
    // الرابط: أول URL في السطر ورد فعلاً في نتائج البحث الخام (لا اختلاق)
    const urlMatch = line.match(/https?:\/\/[^\s)»]+/);
    const url = urlMatch?.[0]?.replace(/[).،]+$/, "");
    if (!url || !urls.has(url)) {
      // «مثبت» بلا رابط حقيقي من نتائج البحث = غير مقبول — يُعامل كغير معثور
      findings.push({ claimId, status: "لم يُعثر" });
      continue;
    }
    const excerpt = line.match(/«(.+?)»/)?.[1];
    // الجهة والنوع بين الشرطات إن التُزمت الصيغة — وإلا تبقى فارغة (لا تخمين)
    const parts = line.split("—").map((p) => p.trim());
    findings.push({
      claimId, status: "مثبت", url,
      excerpt,
      issuer: parts.length >= 4 ? parts[2] : undefined,
      docType: parts.length >= 5 ? parts[3] : undefined,
      title: parts.length >= 4 ? parts[2] : url,
    });
  }
  return findings;
}

export type ClaimResearchResult = {
  briefing: string;
  findings: ClaimFinding[];
  rawUrls: string[];
};

// نداء البحث بالادعاءات — نفس نواة callWebSearch (نفس الأداة والقيود) مع
// موجه الادعاءات وتحليل مخرجه. فشله لا يُسقط التوليد — تسري المادة (١٠).
export async function researchClaims(intent: IntentRepresentation, timeoutMs?: number): Promise<ClaimResearchResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const calledAt = Date.now();
  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), timeoutMs ?? 90_000);
  try {
    const response = await fetch(
      `${process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com"}/v1/messages`,
      {
        method: "POST",
        signal: controller.signal,
        headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-5",
          max_tokens: 2048,
          thinking: { type: "disabled" },
          tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 3 }],
          messages: [{ role: "user", content: buildClaimResearchInstruction(intent) }],
        }),
      }
    );
    if (!response.ok) return null;
    const payload = (await response.json()) as { content?: unknown[]; usage?: unknown };
    recordUsage(payload.usage, { stage: "باحث الادعاءات", model: "claude-sonnet-5", durationMs: Date.now() - calledAt });
    const content = payload.content ?? [];
    const raw = extractSources(content);
    const briefing = extractText(content);
    if (!briefing) return null;
    const urls = new Set(raw.map((s) => s.url));
    return { briefing, findings: parseClaimFindings(briefing, urls), rawUrls: [...urls] };
  } catch {
    return null;
  } finally {
    clearTimeout(abortTimer);
  }
}

// موجّه تدقيق الإحالات لمسار المراجعة — تحقّق فعلي من صحة ما في النص القائم، لا كتابة.
function buildVerificationInstruction(context: { text: string; specialty?: string; sourceHint?: string; dossier?: SourceDossier }): string {
  const spec = context.specialty ? `\nالتخصص القانوني: ${context.specialty}` : "";
  const hint = context.sourceHint
    ? `\nأشار كاتب النص إلى هذا المرجع (وجّه تحرّيك للتحقق منه، ولا تكتفِ به): ${context.sourceHint}`
    : "";
  // ★ قاعدة المحرك الواحد: خريطة الادعاء–المصدر المرافقة للنسخة هي المرجع الوحيد
  // لما استند إليه النص — المدقق يبدأ بها: يتحقق أن كل مصدر فيها يدعم ادعاءه فعلاً
  // (بالصيغ الحرفية نفسها)، ثم يدقق ما في النص خارجها.
  const provenClaims = (context.dossier?.claims ?? []).filter((c) => c.status === "مثبت" && c.sourceId);
  const dossierBlock = provenClaims.length
    ? `\n\nخريطة الادعاءات ومصادرها المرافقة لهذه النسخة (ابدأ تدقيقك بها — لكل بند: افتح المصدر وتحقق أنه يدعم الادعاء فعلاً، واحكم عليه بالصيغ الحرفية نفسها مع ذكر الرابط):\n${provenClaims
        .map((c) => {
          const src = context.dossier!.sources.find((s) => s.id === c.sourceId);
          return `- الادعاء: ${c.text}\n  المصدر: ${src?.title ?? ""} — ${src?.url ?? ""}${c.supportingExcerpt ? `\n  المقطع المسند إليه: «${c.supportingExcerpt}»` : ""}`;
        })
        .join("\n")}`
    : "";
  return `أنت مدقّق مصادر قانوني موثوق يعمل لمنصة محتوى قانوني لمحامٍ مرخَّص في المملكة العربية السعودية. أمامك نصّ يريد المحامي نشره، وقد يتضمّن إحالات نظامية (أرقام مواد أو أسماء أنظمة)، أو أرقاماً ونسباً، أو دراسات ووقائع منسوبة لجهات.${spec}${hint}${dossierBlock}

تحكم تدقيقَك وثيقة حوكمة المصادر التالية حرفياً — وأخصّها للتدقيق: ما تعلق بالمملكة العربية السعودية لا يُثبَت إلا من جهة حكومية مختصة فيها، والأصل يُقدَّم على الناقل، والمصادر المحظورة في المادة (٨) والقواعد المانعة لا يُعتد بها:

${SOURCE_GOVERNANCE}

—

مهمتك: ابحث (بحدود ثلاث عمليات) للتحقّق من صحة كل إحالة أو رقم أو واقعة وردت في النص — حتى ما لم يُفصح عنه كاتب النص صراحةً. لا تكتب محتوى ولا تحكم على الامتثال؛ فقط دقّق الوقائع.

أخرج تقريراً موجزاً بالعربية، كل بند في سطر مستقل، بهذه الصيغ الحرفية حصراً (فهي تُقرأ آلياً):
- «مؤكَّد»: الإحالة أو الرقم مطابق للمصدر الرسمي — انقل النص أو الرقم حرفياً من المصدر متبوعاً برابطه بين قوسين.
- «غير مطابق»: الإحالة موجودة لكن مضمون المصدر يخالف ما في النص (الرابط لا يدعم الواقعة المزعومة) — وضّح وجه المخالفة مع الرابط.
- «غير مختص»: المصدر المستشهد به خارج اختصاص موضوع المعلومة أو ناقل عن الأصل المتاح (المادتان ٣ و٤ من الوثيقة) — سمِّ الجهة المختصة الصحيحة إن عرفتها.
- «تعذّر التحقّق»: لم يُعثر على مصدر موثوق لها أو تعذّر الوصول للصفحة.
ممنوع منعاً باتاً تخمين أو استنتاج أي رقم أو مادة أو تاريخ لم يرد صراحةً في نتيجة بحث. إن لم تجد شيئاً موثوقاً البتة، اكتب «لا توجد مصادر موثوقة كافية».

النص المراد تدقيق إحالاته:
«${context.text}»`;
}

// مسار المراجعة: تحقّق حيّ من إحالات نص قائم في المصادر الموثوقة — إنفاذٌ فعليٌّ
// لقاعدة تحرّي المصادر بأداة تحقّق حقيقية بدل الاكتفاء بذاكرة النموذج.
export async function verifyTextCitations(context: {
  text: string; specialty?: string; sourceHint?: string; dossier?: SourceDossier; timeoutMs?: number;
}): Promise<ResearchResult | null> {
  return callWebSearch(buildVerificationInstruction(context), context.timeoutMs);
}
