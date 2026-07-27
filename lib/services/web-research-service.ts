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
import { normalizeClaim } from "@/lib/services/article10-enforcer";
import type { IntentRepresentation, IntentClaim, ClaimFinding, SourceDossier, ResearchTraceEntry, OfficialDocKind, ExtractedEvidence, DossierClaim, DossierSource } from "@/lib/source-dossier";
import { buildDossier } from "@/lib/source-dossier";

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

function buildClaimResearchInstruction(
  intent: IntentRepresentation,
  // جولة التوسيع (اختيارية): تستهدف الادعاءات غير المثبتة وحدها، وتحمل مبررها —
  // ما فشل في الجولة السابقة ولماذا، فيغير الباحث زاويته لا أن يكرر نفسه
  expansion?: { targetIds: string[]; failureNotes: string[] }
): string {
  const proofClaims = intent.claims.filter((c) =>
    c.needsProof && (!expansion || expansion.targetIds.includes(c.id))
  );
  const claimLines = proofClaims
    .map((c) => `- [${c.id}] ${c.text} (النطاق: ${c.scope}${c.whyNeedsProof ? ` — الفئة: ${c.whyNeedsProof}` : ""})`)
    .join("\n");
  const expansionBlock = expansion
    ? `\n★ هذه جولة توسيع مبررة — الجولة السابقة لم تثبت هذه الادعاءات للأسباب التالية:
${expansion.failureNotes.map((n) => `- ${n}`).join("\n")}
غيّر زاوية البحث جذرياً: جرّب مصطلحاً رسمياً آخر من الفرضيات، أو جهة مختصة أخرى، أو صيغة مختلفة للمسألة — ولا تكرر استعلامات الجولة السابقة نفسها.\n`
    : "";
  return `أنت باحث قانوني موثوق يعمل لمنصة محتوى قانوني لمحامٍ مرخَّص في المملكة العربية السعودية. تحكمك وثيقة حوكمة المصادر التالية حرفياً:

${SOURCE_GOVERNANCE}

—

التمثيل الدلالي للطلب (من محرك الفهم):
- الموضوع الرئيس: ${intent.mainTopic}
- الموضوعات الفرعية: ${intent.subTopics.join("، ") || "—"}
- النطاق: ${intent.jurisdiction} | نوع المعلومة: ${intent.infoType} | الحداثة: ${intent.recency}
- فرضيات الجهات المختصة (اختبرها بالبحث، لا تفترض صحتها): ${intent.candidateAuthorities.join("، ") || "—"}
- فرضيات المصطلح الرسمي (اختبرها بالبحث): ${intent.candidateOfficialTerms.join("، ") || "—"}
${expansionBlock}
الادعاءات المطلوب إثباتها — ابحث عن كل واحد على حدة (بحدود ثلاث عمليات بحث إجمالاً، فوزّعها على الأهم — وتوقف فوراً متى أثبتَّها كلها ولا تستكمل عمليات لا حاجة لها):
${claimLines}

لكل ادعاء نوّع استراتيجيتك من المعنى: بصياغة المستخدم، وبالمصطلح الرسمي المفترض، وبالجهة المرشحة، وبنوع الوثيقة — ولا تعتمد مطابقة كلمات.

قواعد الإخراج الملزمة (تُقرأ آلياً — التزم الصيغة حرفياً):
لكل ادعاء سطر واحد يبدأ بمعرفه:
[c1] مثبت — «المقطع الداعم منقولاً حرفياً من المصدر» — الجهة المصدرة — نوع الوثيقة — الرابط الكامل
أو:
[c1] لم يُعثر — سبب موجز (لا نتائج / النتائج غير حكومية / غير مختصة / لا تدعم الادعاء)

- الادعاء **النظامي** بنطاق «المملكة» (حكم/إجراء/التزام/عقوبة/مدة/اختصاص) لا يُكتب له «مثبت» إلا بمصدر جهة حكومية رسمية فيها (المادتان ٣ و٦) — الأصل لا الناقل (المادة ٤). أما الادعاء البحثي أو الإحصائي أو الأكاديمي أو الصحفي فيقبل دراسة أو بحثاً أو مقالة من جهة موثوقة بنسبتها الصريحة — وتبقى محظورات المادة (٨) قائمة (لا موسوعات مفتوحة ولا مدونات ولا وسائل تواصل).
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
      // سبب عدم العثور بلفظ الباحث (ما بعد الشرطة) — يُبنى منه مبرر التوسيع والأثر
      const reason = line.split("—").slice(1).join("—").trim() || undefined;
      findings.push({ claimId, status: "لم يُعثر", reason });
      continue;
    }
    if (!/مثبت/.test(line)) continue;
    // الرابط: أول URL في السطر ورد فعلاً في نتائج البحث الخام (لا اختلاق)
    const urlMatch = line.match(/https?:\/\/[^\s)»]+/);
    const url = urlMatch?.[0]?.replace(/[).،]+$/, "");
    if (!url || !urls.has(url)) {
      // «مثبت» بلا رابط حقيقي من نتائج البحث = غير مقبول — يُعامل كغير معثور
      findings.push({ claimId, status: "لم يُعثر", reason: "الرابط المذكور لم يرد في نتائج البحث الفعلية" });
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
async function researchClaimsRound(
  instruction: string,
  stage: string,
  timeoutMs?: number
): Promise<ClaimResearchResult | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  const calledAt = Date.now();
  const budget = timeoutMs ?? 90_000;
  // ★ معالجة جذرية: توقف أداة البحث المؤقت في منتصف عملها ليس «لا نتيجة» —
  // يُتابَع الرد نفسه حتى يكتمل فعلاً (كان التوقف المؤقت يُحسب فراغاً فيخرج
  // «تعذر تنفيذ البحث» بلا سبب حقيقي)
  const messages: { role: "user" | "assistant"; content: unknown }[] = [{ role: "user", content: instruction }];
  const collected: unknown[] = [];
  for (let round = 0; round < 4; round++) {
    const remaining = budget - (Date.now() - calledAt);
    if (remaining < 5_000) break;
    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), remaining);
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
            messages,
          }),
        }
      );
      if (!response.ok) return null;
      const payload = (await response.json()) as { content?: unknown[]; usage?: unknown; stop_reason?: string };
      recordUsage(payload.usage, { stage, model: "claude-sonnet-5", durationMs: Date.now() - calledAt });
      collected.push(...(payload.content ?? []));
      if (payload.stop_reason === "pause_turn") {
        messages.push({ role: "assistant", content: payload.content ?? [] });
        continue;
      }
      break;
    } catch {
      return null;
    } finally {
      clearTimeout(abortTimer);
    }
  }
  const raw = extractSources(collected);
  const briefing = extractText(collected);
  if (!briefing) return null;
  const urls = new Set(raw.map((s) => s.url));
  return { briefing, findings: parseClaimFindings(briefing, urls), rawUrls: [...urls] };
}

export async function researchClaims(intent: IntentRepresentation, timeoutMs?: number): Promise<ClaimResearchResult | null> {
  return researchClaimsRound(buildClaimResearchInstruction(intent), "باحث الادعاءات", timeoutMs);
}

// ─── حلقة التوسع المحكومة (الدفعة ب — بمبادئ مالكة المنصة الستة) ─────────────
// الهدف تحسين الوصول إلى المصدر الرسمي لا زيادة عدد العمليات:
// ١) التوسع تدريجي ومبرر — جولة توسيع واحدة فقط، ولا تُنفذ إلا لادعاءات بقيت
//    بلا إثبات، بمبرر مبني من أسباب فشل الجولة الأولى.
// ٢) التوقف فور الإثبات — إن أثبتت الجولة الأولى كل الادعاءات بمصادر مقبولة
//    سيادياً فلا توسع إطلاقاً.
// ٣) العدد وسيلة لا هدف — لا «استكمال محاولات»؛ الجولة الثانية مشروطة بالحاجة.
// ٤) كل انتقال مسجل بسببه في أثر البحث (يسافر داخل الملف مع النسخة).
// ٥) استنفاد المحاولات يُسجل سبب إخفاق كل ادعاء بوضوح ثم تسري المادة (١٠)
//    عبر بناء الملف نفسه — لا ادعاء غير مثبت يُقدَّم حقيقةً.
// ٦) الأداء والكلفة: جولتان كحد أقصى (٦ عمليات بحث سقفاً مطلقاً)، والتوسيع
//    يُتخطى إن لم يبقَ من الميزانية الزمنية ما يكفيه.

// هل هذا الادعاء مثبت بنتيجة مقبولة سيادياً؟ (النظامي بنطاق المملكة ⇒ رابط
// حكومي رسمي؛ والبحثي/الإحصائي يقبل الموثوق — بقرار المالكة)
function claimProven(claim: { id: string; scope: string; regulatory?: boolean }, findings: ClaimFinding[]): boolean {
  const f = findings.find((x) => x.claimId === claim.id && x.status === "مثبت" && x.url);
  if (!f?.url) return false;
  return claim.scope !== "المملكة" || claim.regulatory === false || isSaudiOfficialUrl(f.url);
}

export type ExpandedResearchResult = {
  findings: ClaimFinding[];
  trace: ResearchTraceEntry[];
};

export async function researchClaimsWithExpansion(
  intent: IntentRepresentation,
  opts?: { totalBudgetMs?: number }
): Promise<ExpandedResearchResult> {
  const budget = opts?.totalBudgetMs ?? 150_000;
  const startedAt = Date.now();
  const trace: ResearchTraceEntry[] = [];
  const proofClaims = intent.claims.filter((c) => c.needsProof);
  // لا ادعاء يحتاج إثباتاً ⇒ لا عملية بحث واحدة (العدد وسيلة لا هدف)
  if (proofClaims.length === 0) return { findings: [], trace };
  const note = (stage: string, reason: string, claimIds: string[], outcome: string, durationMs?: number) =>
    trace.push({ stage, reason, claimIds, outcome, at: new Date().toISOString(), durationMs });

  // الجولة الأولى — كل الادعاءات المحتاجة إثباتاً
  const r1Start = Date.now();
  const round1 = await researchClaimsRound(
    buildClaimResearchInstruction(intent),
    "باحث الادعاءات",
    Math.min(90_000, budget)
  );
  let findings: ClaimFinding[] = round1?.findings ?? [];
  const proven1 = proofClaims.filter((c) => claimProven(c, findings));
  const unproven1 = proofClaims.filter((c) => !claimProven(c, findings));
  note(
    "البحث الأول",
    "الجولة الأولى بادعاءات محرك الفهم كاملة",
    proofClaims.map((c) => c.id),
    round1
      ? `أُثبت ${proven1.length} من ${proofClaims.length}${unproven1.length ? ` — بقي بلا إثبات: ${unproven1.map((c) => c.id).join("، ")}` : ""}`
      : "تعذر تنفيذ البحث (لا نتيجة من الأداة)",
    Date.now() - r1Start
  );

  // التوقف فور الإثبات — لا استكمال عمليات لمجرد العدد
  if (unproven1.length === 0) {
    if (proofClaims.length > 0) {
      note("التوقف", "كل الادعاءات أُثبتت بمصادر مقبولة سيادياً — لا حاجة لأي توسع", proofClaims.map((c) => c.id), "اكتفاء بالجولة الأولى");
    }
    return { findings, trace };
  }

  // جولة توسيع واحدة مشروطة بالحاجة وبالميزانية الزمنية المتبقية
  const remaining = budget - (Date.now() - startedAt);
  if (!round1 || remaining < 25_000) {
    note(
      "استنفاد المحاولات",
      !round1 ? "الجولة الأولى نفسها تعذرت — لا جدوى من توسيع فوق أداة متعطلة" : "الميزانية الزمنية لا تكفي جولة توسيع — حفاظاً على زمن الاستجابة",
      unproven1.map((c) => c.id),
      "تسري المادة (١٠) على ما لم يثبت — لا ادعاء غير مثبت يُقدَّم حقيقةً"
    );
    return { findings, trace };
  }

  // مبرر التوسيع: أسباب فشل كل ادعاء في الجولة الأولى (بلفظ الباحث أو الخفض الحتمي)
  const failureNotes = unproven1.map((c) => {
    const f = findings.find((x) => x.claimId === c.id);
    // ★ تصحيح التوجيه (بقرار المالكة — «الرسمية بالإثبات»): المصدر الذي لم تثبت
    // رسميته بعد لا يوصف «غير حكومي» — قد يكون موقع الجهة نفسها؛ والتوجيه الصحيح
    // لجولة التوسيع: اطلب الأصل الحكومي أو صفحة حكومية تشهد لموقع الجهة.
    const unattested = f?.status === "مثبت" && f.url && c.scope === "المملكة" && !isSaudiOfficialUrl(f.url);
    return `[${c.id}] ${unattested ? "عُثر على مصدر لم تثبت رسميته بعد — والادعاء نظامي بنطاق المملكة: ابحث عن أصل المعلومة في موقع حكومي، أو عن صفحة حكومية رسمية تعرّف بالجهة وموقعها الإلكتروني" : f?.reason ?? "لم يُعثر على نتيجة"}`;
  });
  const r2Start = Date.now();
  note(
    "توسيع البحث",
    `انتقال مبرر: ${failureNotes.join(" | ")}`,
    unproven1.map((c) => c.id),
    "جولة توسيع مستهدفة للادعاءات غير المثبتة وحدها بزاوية مختلفة"
  );
  const round2 = await researchClaimsRound(
    buildClaimResearchInstruction(intent, { targetIds: unproven1.map((c) => c.id), failureNotes }),
    "باحث الادعاءات — توسيع",
    Math.min(75_000, remaining)
  );
  if (round2) {
    // نتائج التوسيع تسد ما بقي فقط — المثبت من الجولة الأولى لا يُمس، ولا يتكرر
    // ادعاء بنتيجتين: نتيجة التوسيع تحل محل السابقة فقط إن أثبتت الادعاء فعلاً
    // (بمصدر مقبول سيادياً)، وإلا بقيت نتيجة الجولة الأولى بسببها الموثق.
    const unprovenIds = new Set(unproven1.map((c) => c.id));
    for (const f2 of round2.findings) {
      if (!unprovenIds.has(f2.claimId)) continue;
      const claim = proofClaims.find((c) => c.id === f2.claimId);
      if (!claim) continue;
      // معيار القبول نفسه في الجولتين (claimProven): البحثي بنطاق المملكة يقبله
      // الموثوق — كان الشرط هنا أشد من معيار الإثبات نفسه فيُهدر ما يثبت فعلاً
      const f2Proves = f2.status === "مثبت" && f2.url && (claim.scope !== "المملكة" || claim.regulatory === false || isSaudiOfficialUrl(f2.url));
      if (f2Proves) {
        // ★ الأصل لا يُنسى (بقرار المالكة): أي نتيجة وجدها الباحث من موقع جهةٍ
        // ورُفضت لمجرد أن رسميته لم تثبت بعد، تُحفظ مرشحَ أصلٍ مع النتيجة
        // الحكومية البديلة — فتُسترد فور ثبوت الرسمية بشهادة صفحة حكومية
        // مفتوحة، بلا أي بحث إضافي.
        const prev = findings.find((f) => f.claimId === f2.claimId);
        const enriched = prev?.status === "مثبت" && prev.url && !isSaudiOfficialUrl(prev.url)
          ? { ...f2, originCandidate: { url: prev.url, excerpt: prev.excerpt, issuer: prev.issuer, docType: prev.docType, title: prev.title } }
          : f2;
        findings = [...findings.filter((f) => f.claimId !== f2.claimId), enriched];
      } else if (!findings.some((f) => f.claimId === f2.claimId)) {
        findings = [...findings, f2];
      }
    }
  }
  const unproven2 = proofClaims.filter((c) => !claimProven(c, findings));
  note(
    "توسيع البحث — النتيجة",
    "خلاصة جولة التوسيع",
    unproven1.map((c) => c.id),
    round2
      ? `أُثبت بعد التوسيع ${unproven1.length - unproven2.length} من ${unproven1.length}${unproven2.length ? ` — بقي: ${unproven2.map((c) => c.id).join("، ")}` : ""}`
      : "تعذر تنفيذ جولة التوسيع",
    Date.now() - r2Start
  );
  if (unproven2.length > 0) {
    note(
      "استنفاد المحاولات",
      "اكتمل سقف الجولتين (٦ عمليات بحث) دون إثبات هذه الادعاءات",
      unproven2.map((c) => c.id),
      unproven2
        .map((c) => {
          const f = findings.find((x) => x.claimId === c.id);
          return `[${c.id}] ${f?.reason ?? (f?.status === "مثبت" ? "المصدر المتاح غير حكومي والادعاء يخص المملكة" : "لم يُعثر على مصدر")}`;
        })
        .join(" | ") + " — تسري المادة (١٠) ولا يُقدَّم غير المثبت حقيقةً"
    );
  }
  return { findings, trace };
}

// ─── مراحل الإخفاق الاثنتا عشرة (بقرار المالكة — بأسمائها حرفياً) ────────────
// عند أي إخفاق تُسمى مرحلته وسببه الفعلي في السجل والملاحظة المرافقة —
// «ولا تستخدم رسالة عامة إذا كان سبب الإخفاق معروفاً».
export const PIPELINE_STAGES = [
  "المرحلة ١: فهم الطلب",
  "المرحلة ٢: استخراج الادعاءات",
  "المرحلة ٣: البحث الأول",
  "المرحلة ٤: توسيع البحث",
  "المرحلة ٥: اختيار المصدر",
  "المرحلة ٦: فتح المصدر",
  "المرحلة ٧: مطابقة المصدر بالادعاء",
  "المرحلة ٨: استخراج النصوص أو الأحكام أو الوقائع",
  "المرحلة ٩: بناء ملف الإثبات",
  "المرحلة ١٠: الكتابة",
  "المرحلة ١١: فحص اكتمال الاستناد",
  "المرحلة ١٢: التحليل وقرار النشر",
] as const;

// خرائط أسماء مراحل الأثر إلى المراحل الاثنتي عشرة
const STAGE_BY_TRACE: Record<string, number> = {
  "البحث الأول": 2,
  "توسيع البحث": 3,
  "اختيار المصدر": 4,
  "فتح المصدر": 5,
  "مطابقة المصدر بالادعاء": 6,
  "استخراج النصوص أو الأحكام أو الوقائع": 7,
};

// يشتق اسم مرحلة الإخفاق من أثر البحث — حتمي بالكود، ولا يُخترع إخفاق حيث لا أثر
export function nameFailedStage(trace: ResearchTraceEntry[] | undefined): string | undefined {
  if (!trace?.length) return undefined;
  const round1 = trace.find((e) => e.stage === "البحث الأول");
  if (round1?.outcome.startsWith("تعذر")) return `${PIPELINE_STAGES[2]} — ${round1.outcome}`;
  // آخر إخفاق مسجل بمرحلة من مراحل الفتح/المطابقة/الاستخراج يقدَّم — الأدق أولاً
  const failEntry = [...trace].reverse().find((e) => e.stage in STAGE_BY_TRACE && /تعذر|لا تدعم|غير موثوق|أُسقط/.test(e.outcome));
  if (failEntry) return `${PIPELINE_STAGES[STAGE_BY_TRACE[failEntry.stage]]} — ${failEntry.outcome.slice(0, 200)}`;
  const exhausted = [...trace].reverse().find((e) => e.stage === "استنفاد المحاولات");
  if (exhausted) {
    const expanded = trace.some((e) => e.stage === "توسيع البحث");
    return `${expanded ? PIPELINE_STAGES[3] : PIPELINE_STAGES[2]} — ${exhausted.reason}`;
  }
  return undefined;
}

// ─── فتح المصدر والاستخراج (بقرار المالكة المعتمد — التصور v2) ───────────────
// «رابط المصدر أو مقتطف نتيجة البحث لا يكفي»: الفتح الفعلي شرط الإثبات.
// النداء يفتح صفحات المصادر المرشحة (بسقف ٣)، يصنف كل وثيقة من محتواها المفتوح
// على الأنواع الستة، ويستخرج الأدلة ذات الصلة المباشرة بفكرة المستخدم فقط
// بمحدد موضع يناسب النوع (مادة/قرار وتاريخ/إعلان وتاريخ/قسم) — لا اختلاق رقم
// مادة حيث لا مواد. ثم يُطبَّق التقرير حتمياً بالكود مع مضاد الاختلاق:
// النص المستخرج لا يُقبل إلا إذا ورد فعلاً في محتوى الصفحة المجلوب.
// الأحكام الثلاثة القاطعة: فُتح ودعم = مثبت · فُتح ولم يدعم = مرفوض بسببه ·
// تعذر الفتح تقنياً = غير مثبت بسبب تقني مسمى — **لا يوصف أبداً بغياب المصدر**.

const DOC_KINDS: OfficialDocKind[] = [
  "نظام أو لائحة", "أمر أو مرسوم أو قرار", "إعلان أو خبر حكومي",
  "دليل إرشادي", "صفحة تعريفية", "إحصاء أو بيان رسمي",
  "دراسة أو بحث علمي", "مقالة أو تقرير صحفي",
];

// يجمع نصوص الصفحات المجلوبة فعلاً من كتل نتائج web_fetch في رد النموذج —
// مسح متسامح مع شكل الكتل: يلتقط كل النصوص داخل كتل نتائج الجلب مع روابطها
export function extractFetchedTexts(content: unknown[]): { url?: string; text: string }[] {
  const pages: { url?: string; text: string }[] = [];
  const walk = (node: unknown, insideFetch: boolean, currentUrl?: string): string[] => {
    if (typeof node === "string") return insideFetch ? [node] : [];
    if (Array.isArray(node)) return node.flatMap((n) => walk(n, insideFetch, currentUrl));
    if (!node || typeof node !== "object") return [];
    const obj = node as Record<string, unknown>;
    const type = typeof obj.type === "string" ? obj.type : "";
    const url = typeof obj.url === "string" ? obj.url : currentUrl;
    const nowInside = insideFetch || type.includes("web_fetch");
    const texts: string[] = [];
    for (const key of ["data", "text"]) {
      if (nowInside && typeof obj[key] === "string" && (obj[key] as string).length > 40) texts.push(obj[key] as string);
    }
    for (const value of Object.values(obj)) {
      if (value && typeof value === "object") texts.push(...walk(value, nowInside, url));
    }
    if (!insideFetch && nowInside && texts.length) {
      pages.push({ url, text: texts.join("\n") });
      return [];
    }
    return texts;
  };
  for (const block of content) walk(block, false);
  return pages;
}

// مضاد الاختلاق: هل يرد جوهر النص المستخرج (نافذة متصلة مطبَّعة) في نص الصفحة؟
export function containsNormalizedWindow(pageText: string, extracted: string, windowSize = 25): boolean {
  const hay = normalizeClaim(pageText);
  const needle = normalizeClaim(extracted);
  if (!needle.trim()) return false;
  if (needle.length <= windowSize) return hay.includes(needle);
  for (let start = 0; start + windowSize <= needle.length; start += 10) {
    if (hay.includes(needle.slice(start, start + windowSize))) return true;
  }
  return false;
}

export async function openAndExtract(
  dossier: SourceDossier,
  intent: IntentRepresentation,
  // صفحات الأنظمة واللوائح الحكومية ضخمة — مهلة موسعة بقرار المالكة بعد أن
  // أسقطت مهلة أقصر فتح لائحة رسمية مرتين متتاليتين
  timeoutMs = 150_000
): Promise<SourceDossier> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  // المرشح للفتح: مصادر الادعاءات المثبتة من البحث — بسقف ٣ صفحات (الكلفة)
  const provenClaims = dossier.claims.filter((c) => c.status === "مثبت" && c.sourceId);
  const targetSources = dossier.sources.filter((s) => provenClaims.some((c) => c.sourceId === s.id)).slice(0, 3);
  if (provenClaims.length === 0) return dossier;
  const startedAt = Date.now();
  if (!apiKey) return failAllOpen(dossier, provenClaims, "خدمة الذكاء غير مهيأة لنداء الفتح", startedAt);

  // ★ معالجة جذرية (بقرار المالكة — «زيادة الوقت ليست معالجة»): كل مصدر يُفتح
  // في نداء مستقل — فشل صفحة لا يُسقط أخواتها، وحمولة كل نداء صغيرة فيكتمل
  // بطبيعته. والتوقف المؤقت لأداة الجلب يُتابَع حتى الاكتمال لا يُحكم به فراغاً.
  const perSourceInstruction = (s: DossierSource, linked: DossierClaim[]) => `أنت محرك استخراج في منصة محتوى قانوني لمحامٍ مرخَّص في المملكة العربية السعودية. افتح الصفحة التالية فعلياً بأداة web_fetch، ثم صنّفها واستخرج منها — ولا تحكم من الذاكرة أو من العنوان أبداً.

فكرة المستخدم (ميزان الصلة): ${intent.mainTopic}${intent.subTopics.length ? ` — ${intent.subTopics.join("، ")}` : ""}

الصفحة وادعاءاتها:
[${s.id}] ${s.url}
  الادعاءات المسندة إليه:
${linked.map((c) => `  - [${c.id}] ${c.text}`).join("\n")}

مهمتك للصفحة إذا فُتحت:
١) صنّف الوثيقة من محتواها على أحد الأنواع الثمانية حصراً: نظام أو لائحة / أمر أو مرسوم أو قرار / إعلان أو خبر حكومي / دليل إرشادي / صفحة تعريفية / إحصاء أو بيان رسمي / دراسة أو بحث علمي / مقالة أو تقرير صحفي.
٢) استخرج الأدلة ذات الصلة المباشرة بفكرة المستخدم وادعاءاتها فقط — لا كل محتوى الوثيقة. المحدِّد بحسب النوع: للنظام رقم المادة متى كان منشوراً؛ للقرار رقمه وتاريخه؛ للإعلان الجهة والتاريخ؛ للدليل القسم أو الصفحة؛ للصفحة التعريفية بيانها فقط؛ للإحصاء الرقم والفترة؛ **للدراسة: الجهة الناشرة أو الباحث وعنوان الدراسة وسنة النشر (ونطاق العينة متى نُشر)؛ وللمقالة الصحفية: الناشر والكاتب والتاريخ**. نتيجة الدراسة والمقالة تُستخرج بطبيعتها («نتيجة دراسة» / «مقالة صحفية») ولا تُقدَّم أبداً كأنها حكم نظامي. **ممنوع اختلاق رقم مادة إذا كانت الوثيقة ليست نظاماً ذا مواد** — اترك المحدد بما هو منشور فعلاً.
٣) صنّف صلة كل دليل: «جوهري» إن كان غيابه يخل بفكرة المستخدم، أو «مساند» إن كان صحيحاً ذا صلة لكنه غير لازم لها.
٤) انقل نص كل دليل حرفياً كما ورد في الصفحة — سيُطابَق آلياً مع محتوى الصفحة، وأي نص غير وارد فيها يُرفض.

أخرج الأسطر التالية حصراً بصيغها الحرفية (تُقرأ آلياً):
[s1] النوع: نظام أو لائحة — سبب الاعتماد: (الاختصاص/الأصل/الحداثة بإيجاز)
[e1] عبر s1 — المحدد: المادة (٧٤) — «النص الحرفي كما ورد» — الطبيعة: نص نظامي — الصلة: جوهري — يدعم: c1 — التاريخ: (إن نُشر، وإلا اتركه)
[c1] الصفحة لا تدعم هذا الادعاء — السبب الفعلي
[${s.id}] تعذّر الفتح
لا تكتب شيئاً غير هذه الأسطر.`;

  const reports: string[] = [];
  const allPages: { url?: string; text: string }[] = [];
  for (const src of targetSources) {
    const linked = provenClaims.filter((c) => c.sourceId === src.id);
    const one = await callOpenOnce(apiKey, perSourceInstruction(src, linked), timeoutMs);
    if (one) {
      reports.push(one.report);
      allPages.push(...one.pages);
    } else {
      // فشل نداء هذه الصفحة وحده — يُدوَّن تعذر فتحها ولا يُسقط بقية الصفحات
      reports.push(`[${src.id}] تعذّر الفتح`);
    }
  }
  return applyOpenExtract(dossier, reports.join("\n"), allPages, targetSources.map((s) => s.id), Date.now() - startedAt);
}

// نداء فتح صفحة واحدة — مع متابعة «التوقف المؤقت» لأداة الجلب حتى الاكتمال
// (التوقف المؤقت ليس فراغاً)، وسقفٍ لمحتوى الصفحة المجلوب يتراجع تلقائياً إن لم
// تدعمه البيئة. يعيد التقرير النصي ونصوص الصفحات المجلوبة، أو null عند الفشل.
let maxContentTokensSupported = true;
async function callOpenOnce(
  apiKey: string,
  instruction: string,
  timeoutMs: number
): Promise<{ report: string; pages: { url?: string; text: string }[] } | null> {
  const startedAt = Date.now();
  const messages: { role: "user" | "assistant"; content: unknown }[] = [{ role: "user", content: instruction }];
  const collected: unknown[] = [];
  for (let round = 0; round < 4; round++) {
    const remaining = timeoutMs - (Date.now() - startedAt);
    if (remaining < 5_000) break;
    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), remaining);
    try {
      const fetchTool: Record<string, unknown> = { type: "web_fetch_20260209", name: "web_fetch", max_uses: 1 };
      // سقف محتوى الصفحة — معالجة جذرية لصفحات اللوائح الضخمة؛ يتراجع مرة واحدة
      // إن رفضته البيئة (لا يعطل الفتح أبداً)
      if (maxContentTokensSupported) fetchTool.max_content_tokens = 60_000;
      const response = await fetch(
        `${process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com"}/v1/messages`,
        {
          method: "POST",
          signal: controller.signal,
          headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-5",
            max_tokens: 2000,
            thinking: { type: "disabled" },
            tools: [fetchTool],
            messages,
          }),
        }
      );
      if (!response.ok) {
        if (response.status === 400 && maxContentTokensSupported) {
          // البيئة لا تدعم سقف المحتوى — تراجع دائم داخل هذه العملية وأعد النداء
          maxContentTokensSupported = false;
          continue;
        }
        return null;
      }
      const payload = (await response.json()) as { content?: unknown[]; usage?: unknown; stop_reason?: string };
      recordUsage(payload.usage, { stage: "فتح المصادر والاستخراج", model: "claude-sonnet-5", durationMs: Date.now() - startedAt });
      collected.push(...(payload.content ?? []));
      if (payload.stop_reason === "pause_turn") {
        // أداة الجلب توقفت مؤقتاً في منتصف عملها — نتابع الرد نفسه حتى يكتمل
        messages.push({ role: "assistant", content: payload.content ?? [] });
        continue;
      }
      return { report: extractText(collected), pages: extractFetchedTexts(collected) };
    } catch {
      return null;
    } finally {
      clearTimeout(abortTimer);
    }
  }
  // اكتمل جزئياً عبر جولات المتابعة دون ختام — ما جُمع خير من الفراغ
  return collected.length ? { report: extractText(collected), pages: extractFetchedTexts(collected) } : null;
}

// مضيف الرابط — للتحقق الحتمي من «الرسمية بالإثبات»
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

// تعذر النداء كله تقنياً ⇒ (بقرار المالكة): العطل الشبكي يمس التحقق الحالي فقط
// ولا يمحو المعرفة السابقة — الادعاءات تبقى مثبتة بإسناد تقرير البحث «مسند
// بالتقرير»، وحالة الفتح وحدها تسجل التعذر، ويُعاد التحقق لاحقاً.
function failAllOpen(dossier: SourceDossier, provenClaims: DossierClaim[], reason: string, startedAt: number): SourceDossier {
  const ids = new Set(provenClaims.map((c) => c.id));
  return {
    ...dossier,
    sources: dossier.sources.map((s) => (provenClaims.some((c) => c.sourceId === s.id) ? { ...s, fetchStatus: "تعذر الفتح تقنياً" as const } : s)),
    researchTrace: [
      ...(dossier.researchTrace ?? []),
      { stage: "فتح المصدر", reason: "العطل الشبكي يمس التحقق الحالي فقط — المعرفة السابقة لا تُمحى", claimIds: [...ids], outcome: `تعذر تقني: ${reason} — أُبقي الإسناد «مسند بالتقرير» ويمكن إعادة التحقق لاحقاً`, at: new Date().toISOString(), durationMs: Date.now() - startedAt },
    ],
  };
}

// تطبيق تقرير الفتح والاستخراج على الملف — حتمي بالكود، بمضاد الاختلاق والأثر
export function applyOpenExtract(
  dossier: SourceDossier,
  report: string,
  pages: { url?: string; text: string }[],
  targetSourceIds: string[],
  durationMs?: number
): SourceDossier {
  const combinedPageText = pages.map((p) => p.text).join("\n");
  const kindBySource = new Map<string, { kind: OfficialDocKind; selectionReason?: string }>();
  const failedSources = new Set<string>();
  const unsupported = new Map<string, string>(); // claimId → السبب
  const evidence: ExtractedEvidence[] = [];
  const droppedEvidence: string[] = [];

  for (const raw of report.split("\n")) {
    const line = raw.trim();
    // [sN] النوع: ... — سبب الاعتماد: ...
    const kindMatch = line.match(/^\[?(s\d+)\]?\s*النوع:\s*([^—]+?)(?:—\s*سبب الاعتماد:\s*(.+))?$/);
    if (kindMatch) {
      const kindText = kindMatch[2].trim();
      const kind = DOC_KINDS.find((k) => kindText.includes(k));
      if (kind) kindBySource.set(kindMatch[1], { kind, selectionReason: kindMatch[3]?.trim() });
      continue;
    }
    // [sN] تعذّر الفتح
    if (/^\[?s\d+\]?\s*(تعذّر الفتح|تعذر الفتح)/.test(line)) {
      const sid = line.match(/^\[?(s\d+)\]?/)?.[1];
      if (sid) failedSources.add(sid);
      continue;
    }
    // [cN] الصفحة لا تدعم هذا الادعاء — السبب
    const noSupport = line.match(/^\[?(c\d+)\]?\s*الصفحة لا تدعم/);
    if (noSupport) {
      unsupported.set(noSupport[1], line.split("—").slice(1).join("—").trim() || "الصفحة تتناول الموضوع ولا تثبت الادعاء نفسه");
      continue;
    }
    // [eN] عبر sM — المحدد: ... — «النص» — الطبيعة: ... — الصلة: ... — يدعم: c1,c2 — التاريخ: ...
    const evMatch = line.match(/^\[?(e\d+)\]?\s*عبر\s*(s\d+)/);
    if (evMatch) {
      const text = line.match(/«(.+?)»/)?.[1] ?? "";
      const locator = line.match(/المحدد:\s*([^—«]+)/)?.[1]?.trim();
      const nature = line.match(/الطبيعة:\s*([^—]+)/)?.[1]?.trim();
      const relevance = /الصلة:\s*جوهري/.test(line) ? "جوهري" as const : "مساند" as const;
      const publishedAt = line.match(/التاريخ:\s*([^—]+)$/)?.[1]?.trim() || undefined;
      const supports = [...line.matchAll(/c\d+/g)].map((m) => m[0]);
      const sourceInfo = kindBySource.get(evMatch[2]);
      if (!text || !targetSourceIds.includes(evMatch[2])) continue;
      // ★ مضاد الاختلاق: النص لا يُقبل إلا إذا ورد فعلاً في محتوى الصفحة المجلوب
      if (!containsNormalizedWindow(combinedPageText, text)) {
        droppedEvidence.push(`[${evMatch[1]}] أُسقط — النص غير وارد في محتوى الصفحة المجلوب (استخراج غير موثوق)`);
        continue;
      }
      evidence.push({
        id: `e${evidence.length + 1}`,
        sourceId: evMatch[2],
        docKind: sourceInfo?.kind ?? "صفحة تعريفية",
        locator: locator && locator !== "—" ? locator : undefined,
        text,
        natureLabel: nature,
        relevance,
        publishedAt,
        linkedClaimIds: [...new Set(supports)],
      });
    }
  }

  // تطبيق الأحكام على الادعاءات المستهدفة — (بقرار المالكة): التعذر التقني
  // والغموض يمسان التحقق الحالي فقط ولا يمحوان الإسناد السابق؛ الرفض الصريح
  // وحده («الصفحة لا تدعم») يُنزل الادعاء.
  const supportedIds = new Set(evidence.flatMap((e) => e.linkedClaimIds));
  const noVerdict: string[] = [];
  const claims = dossier.claims.map((c) => {
    if (c.status !== "مثبت" || !c.sourceId || !targetSourceIds.includes(c.sourceId)) return c;
    if (failedSources.has(c.sourceId)) {
      // تعذر الفتح تقنياً ⇒ يبقى الادعاء مثبتاً بإسناد التقرير — حالة الفتح وحدها تتغير
      return c;
    }
    if (unsupported.has(c.id)) {
      return { ...c, status: "غير قابل للجزم" as const, failure: { stage: "مطابقة المصدر بالادعاء", reason: unsupported.get(c.id)!, technical: false } };
    }
    if (supportedIds.has(c.id)) {
      return { ...c, evidenceIds: evidence.filter((e) => e.linkedClaimIds.includes(c.id)).map((e) => e.id) };
    }
    // فُتحت الصفحة ولم يصدر حكم ولا دليل ⇒ غموضٌ لا رفضٌ: يبقى «مسند بالتقرير»
    noVerdict.push(c.id);
    return c;
  });

  const sources = dossier.sources.map((s) => {
    if (!targetSourceIds.includes(s.id)) return s;
    const info = kindBySource.get(s.id);
    if (failedSources.has(s.id)) return { ...s, fetchStatus: "تعذر الفتح تقنياً" as const, docKind: info?.kind, selectionReason: info?.selectionReason };
    const hasEvidence = evidence.some((e) => e.sourceId === s.id);
    const hasUnsupported = s.linkedClaimIds.some((id) => unsupported.has(id));
    return {
      ...s,
      docKind: info?.kind,
      selectionReason: info?.selectionReason,
      fetchStatus: "فُتح وتحقق" as const,
      verificationStatus: hasEvidence ? ("متحقق بالفتح" as const) : hasUnsupported ? ("غير مطابق" as const) : s.verificationStatus,
    };
  });

  // ★ «الرسمية بالإثبات» (بقرار المالكة — جذرياً بلا قوائم): أي صفحة حكومية
  // (gov.sa) مفتوحة فعلاً وورد في نصها المجلوب نطاق موقع سعودي آخر حرفياً ⇒
  // ذلك النطاق مُثبَت الرسمية (الصفحة الحكومية تشهد له)، فيجوز فتح موقع الجهة
  // الأصل — أي جهة كانت، حاضرة أو مستحدثة — بدل الاكتفاء بالصفحات الناقلة.
  const attested = new Set(dossier.attestedOfficialDomains ?? []);
  for (const page of pages) {
    const pageHost = page.url ? hostOf(page.url) : "";
    if (!pageHost || !(pageHost === "gov.sa" || pageHost.endsWith(".gov.sa"))) continue;
    for (const m of page.text.matchAll(/\b(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+sa\b/gi)) {
      const host = m[0].toLowerCase().replace(/^www\./, "");
      if (host === "gov.sa" || host.endsWith(".gov.sa") || host === pageHost) continue;
      attested.add(host);
    }
  }

  const targetClaimIds = dossier.claims.filter((c) => c.sourceId && targetSourceIds.includes(c.sourceId)).map((c) => c.id);
  const outcomeParts = [
    `أدلة مستخرجة: ${evidence.length} (${evidence.filter((e) => e.relevance === "جوهري").length} جوهري)`,
    unsupported.size ? `لا تدعم: ${[...unsupported.keys()].join("، ")}` : "",
    failedSources.size ? `تعذر الفتح تقنياً (بقي الإسناد بالتقرير): ${[...failedSources].join("، ")}` : "",
    noVerdict.length ? `بلا حكم (بقي مسنداً بالتقرير): ${noVerdict.join("، ")}` : "",
    attested.size > (dossier.attestedOfficialDomains?.length ?? 0)
      ? `أثبتت صفحة حكومية رسميةَ نطاقات: ${[...attested].filter((h) => !(dossier.attestedOfficialDomains ?? []).includes(h)).join("، ")}`
      : "",
    droppedEvidence.length ? droppedEvidence.join(" | ") : "",
  ].filter(Boolean).join(" | ");
  const trace: ResearchTraceEntry[] = [
    ...(dossier.researchTrace ?? []),
    { stage: "استخراج النصوص أو الأحكام أو الوقائع", reason: "فتح الصفحات فعلياً وتصنيف الوثائق والاستخراج بحسب النوع — الفتح شرط الإثبات", claimIds: targetClaimIds, outcome: outcomeParts || "لا مخرجات", at: new Date().toISOString(), durationMs },
  ];
  return {
    ...dossier,
    claims,
    sources,
    evidence: [...(dossier.evidence ?? []), ...evidence],
    researchTrace: trace,
    attestedOfficialDomains: attested.size ? [...attested] : dossier.attestedOfficialDomains,
  };
}

// موجه جولة «طلب الأصل» — بحث واحد موجّه عن أصل المعلومة في موقع الجهة الذي
// شهدت له صفحة حكومية مفتوحة (المادة ٤: الأصل لا الناقل). القبول محكوم بالكود:
// لا يُقبل من مخرجه إلا رابط على نطاق مثبت الرسمية أو حكومي.
function buildOriginHuntInstruction(intent: IntentRepresentation, claims: IntentClaim[], origins: string[]): string {
  return `أنت باحث قانوني موثوق لمنصة محتوى قانوني لمحامٍ مرخَّص في المملكة العربية السعودية. هذه جولة «طلب الأصل»: ثبتت رسميةُ مواقع الجهات التالية بشهادة صفحة حكومية مفتوحة فعلاً: ${origins.join("، ")} — والمطلوب أصل المعلومة في موقع الجهة نفسه، لا صفحة ناقلة عنها.

الموضوع: ${intent.mainTopic}${intent.subTopics.length ? ` — ${intent.subTopics.join("، ")}` : ""}

الادعاءات — ابحث عن أصل كل معلومة في موقع جهتها نفسه (بحدود عمليتي بحث إجمالاً، وتوقف فور العثور):
${claims.map((c) => `- [${c.id}] ${c.text}`).join("\n")}

قواعد الإخراج الملزمة (تُقرأ آلياً — التزم الصيغة حرفياً):
لكل ادعاء سطر واحد يبدأ بمعرفه:
[c1] مثبت — «المقطع الداعم منقولاً حرفياً من المصدر» — الجهة المصدرة — نوع الوثيقة — الرابط الكامل
أو:
[c1] لم يُعثر — سبب موجز

- لا يُكتب «مثبت» إلا برابط من مواقع الجهات المذكورة أعلاه أو موقع حكومي رسمي.
- ممنوع منعاً باتاً اختلاق رابط أو مقطع أو جهة. انقل المقطع كما ورد حرفياً.
- لا تكتب شيئاً غير هذه الأسطر.`;
}

// ★ إتمام «الرسمية بالإثبات» — «الأصل لا الناقل» فعلاً لا وصفاً. حالتان:
// ١) استرداد: البحث سبق أن وجد رابطاً في موقع الجهة ورُفض لمجرد النطاق ⇒ يُعاد
//    بناء الملف بالمعيار الموسّع ويُفتح الأصل — بلا أي نداء بحث إضافي.
// ٢) طلب الأصل: البحث لم يمر بموقع الجهة أصلاً (أثبت بصفحة البوابة الناقلة
//    مباشرة) ⇒ جولة بحث واحدة موجهة لأصل المعلومة في موقع الجهة المثبت رسميته،
//    فإن وُجد قُدِّم على الناقل وفُتح واستُخرج منه.
// لا قوائم يدوية إطلاقاً: النطاقات كلها من شهادة صفحات حكومية مفتوحة فعلاً.
export async function pursueAttestedOrigins(
  dossier: SourceDossier,
  intent: IntentRepresentation,
  findings: ClaimFinding[],
  timeoutMs = 60_000
): Promise<SourceDossier> {
  const attested = new Set(dossier.attestedOfficialDomains ?? []);
  if (attested.size === 0) return dossier;
  const extendedOfficial = (u: string) => isSaudiOfficialUrl(u) || attested.has(hostOf(u));

  // الحالة ١: استرداد من نتائج البحث القائمة
  const recoverable = dossier.claims.some((c) => {
    if (c.status !== "محكوم بالمادة ١٠") return false;
    const f = findings.find((x) => x.claimId === c.id && x.status === "مثبت" && x.url);
    return Boolean(f?.url && attested.has(hostOf(f.url)));
  });

  // الحالة ٢: الشهادة قائمة ولا مصدر من موقع الجهة نفسه
  const sourceHosts = new Set(dossier.sources.map((s) => hostOf(s.url)));
  const missingOrigins = [...attested].filter((h) => !sourceHosts.has(h)).slice(0, 3);
  // الادعاءات المستهدفة بالمعنى (من محرك الفهم): ما يخص المملكة ويحتاج إثباتاً
  // وليس مصدره الحالي موقعَ جهة مثبت — سواء أكان نظامياً أم معلومة منسوبة لجهة
  const targetClaims = intent.claims.filter((c) => {
    if (!c.needsProof || c.scope !== "المملكة") return false;
    const current = findings.find((x) => x.claimId === c.id && x.status === "مثبت" && x.url);
    return !current?.url || !attested.has(hostOf(current.url));
  });

  let mergedFindings = findings;
  let huntOutcome = "";

  // استرداد الأصل المحفوظ من جولات البحث نفسها («الأصل لا يُنسى») — بلا أي نداء
  const candidateFindings: ClaimFinding[] = findings.flatMap((f) => {
    const oc = f.originCandidate;
    if (!oc?.url || !attested.has(hostOf(oc.url)) || sourceHosts.has(hostOf(oc.url))) return [];
    return [{ claimId: f.claimId, status: "مثبت" as const, url: oc.url, excerpt: oc.excerpt, issuer: oc.issuer, docType: oc.docType, title: oc.title ?? oc.url }];
  });
  if (!recoverable && candidateFindings.length > 0) {
    const replaced = new Set(candidateFindings.map((f) => f.claimId));
    mergedFindings = [...candidateFindings, ...findings.filter((f) => !replaced.has(f.claimId))];
    huntOutcome = `استُرد الأصل الذي وجده البحث أولاً لدى الجهة: ${[...new Set(candidateFindings.map((f) => hostOf(f.url!)))].join("، ")}`;
  } else if (!recoverable && missingOrigins.length > 0 && targetClaims.length > 0) {
    const hunt = await researchClaimsRound(buildOriginHuntInstruction(intent, targetClaims, missingOrigins), "طلب الأصل", timeoutMs);
    const originFindings = (hunt?.findings ?? []).filter(
      (f) => f.status === "مثبت" && f.url && extendedOfficial(f.url) && !sourceHosts.has(hostOf(f.url))
    );
    if (originFindings.length > 0) {
      const replaced = new Set(originFindings.map((f) => f.claimId));
      mergedFindings = [...originFindings, ...findings.filter((f) => !replaced.has(f.claimId))];
      huntOutcome = `عُثر على الأصل لدى الجهة: ${originFindings.map((f) => hostOf(f.url!)).join("، ")}`;
    } else {
      // لا أصل من الجولة — والعطل التقني لا يوصف غياباً (بقرار المالكة): يُميز
      // تعذر تنفيذ الجولة عن بحثٍ نُفذ ولم يجد أصلاً منشوراً
      const outcome = hunt === null
        ? `تعذر تنفيذ جولة طلب الأصل تقنياً — بقي المصدر الحكومي الناقل سنداً، ويمكن إعادة المحاولة لاحقاً`
        : `لم يُعثر على أصل منشور لدى الجهة (${missingOrigins.join("، ")}) — بقي المصدر الحكومي الناقل سنداً`;
      return {
        ...dossier,
        researchTrace: [
          ...(dossier.researchTrace ?? []),
          { stage: "اختيار المصدر", reason: "طلب الأصل: شهدت صفحة حكومية لموقع جهة ليس ضمن المصادر — بُحث عن أصل المعلومة لديه", claimIds: targetClaims.map((c) => c.id), outcome, at: new Date().toISOString() },
        ],
      };
    }
  }
  if (!recoverable && !huntOutcome) return dossier;

  const prevTrace = dossier.researchTrace ?? [];
  console.log("[origin-pursuit]", huntOutcome || "استرداد من نتائج البحث القائمة", "—", [...attested].join("، "));
  let rebuilt = buildDossier(intent, mergedFindings, extendedOfficial);
  rebuilt = {
    ...rebuilt,
    attestedOfficialDomains: [...attested],
    researchTrace: [
      ...prevTrace,
      { stage: "اختيار المصدر", reason: "الرسمية بالإثبات: صفحة حكومية مفتوحة شهدت حرفياً لنطاق موقع الجهة — يُقدَّم الأصل على الناقل (المادة ٤)", claimIds: [], outcome: huntOutcome || `نطاقات مثبتة الرسمية: ${[...attested].join("، ")}`, at: new Date().toISOString() },
    ],
  };
  return openAndExtract(rebuilt, intent);
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
