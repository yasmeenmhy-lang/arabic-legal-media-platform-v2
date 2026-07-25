// ─────────────────────────────────────────────────────────────────────────────
// الطبقة الأولى — البحث الحتمي في المتن (بقرار مالكة المنصة: «خليها طبقتين،
// الطبقة الأولى تبحث في القواعد واللوائح والطبقة الثانية تحكم بالمعنى»).
//
// برمجية بالكامل، بلا أي ذكاء: النصّ نفسه يعطي المواضع نفسها اليوم وغداً وبعد
// سنة. هذا هو موضع الثبات في المحرّك — لا حرارة له ولا اجتهاد ولا احتمالات.
//
// ★ حدود صلاحيتها (ثابتة، لا يجوز تجاوزها):
// (١) لا تُصدر حكماً ولا تُسند مخالفةً إلى قاعدة. الإسناد النظامي حكمٌ بالمعنى،
//     وهو عمل الطبقة الثانية وحدها — فلا تختلق هذه الطبقة نسبةً لمادة.
// (٢) لا تحصر الطبقة الثانية ولا تضيّق نطاق قراءتها: المتن الرسمي الكامل يبقى
//     أمامها، وحريتها في الرصد كما هي. هذه الطبقة **تُضيف مواضع تُلزم بفحصها**
//     ولا تحذف من نطاق الفحص شيئاً — إضافةٌ صرفة، فالجدار لا يُضعَّف أبداً.
// (٣) خلوّ نتيجتها من المواضع ليس شهادة سلامة — هو غياب إصابة حرفية فقط.
//
// أثرها على ثبات الحكم: الحكم المفتوح («ابحث عن المخالفات») فضاء قراره واسع،
// فيتذبذب عند الحافة. أما إلزام الطبقة الثانية بالحكم صراحةً على موضع مستخرَج
// بعينه فيحوّل السؤال المفتوح إلى سؤال مغلق على ذلك الموضع — وضيق فضاء القرار
// هو ما يضيّق التذبذب.
// ─────────────────────────────────────────────────────────────────────────────
import { legalKnowledgeEntries } from "@/lib/legal-knowledge-base";

export type CorpusPositionKind = "نمط محظور" | "نمط سياقي" | "جزم نظامي بلا سند";

export type CorpusPosition = {
  // المقطع منقولاً حرفياً من نصّ المستخدم — لا يُعاد صوغه ولا يُختصر
  excerpt: string;
  kind: CorpusPositionKind;
  // ما التقطه البحث حرفياً (النمط المطابَق)، أو "" في الجزم البنيوي
  trigger: string;
  // مراجع المتن التي ارتبط بها النمط في قاعدة المعرفة — ترشيحٌ للفحص لا حكم.
  // فارغة في الجزم البنيوي: الإسناد للطبقة الثانية.
  candidateRefs: string[];
};

// إصابة قاطعة: مخالفة تلتقطها الطبقة الأولى **بنفسها** ويصدر بها حكمها، لا
// موضعاً يُحال إلى غيرها. لا تُعدّ الإصابة قاطعة إلا حين لا يحتمل السياق
// وجهاً سليماً — انظر isDecisive أدناه.
export type CorpusHit = {
  // مقطع الدليل منقولاً حرفياً من نصّ المحامي
  excerpt: string;
  // النمط المحظور المطابَق، كما هو مخزّن في قاعدة المعرفة
  trigger: string;
  // معرّف المدخلة في قاعدة المعرفة — منها يُبنى الإسناد النظامي كاملاً،
  // فلا تختلق هذه الطبقة نسبةً لمادة ولا تجتهد في تحديدها
  entryId: string;
  legalReference: string;
};

export type CorpusScan = {
  // ما حكمت به الطبقة الأولى بنفسها — الأساس
  hits: CorpusHit[];
  // ما رفعته للطبقة الثانية لتحكم فيه بالمعنى — ما لم يبلغ حدّ القطع
  positions: CorpusPosition[];
  // مراجع مرشّحة لقراءة مركّزة، مستخرجة بدلالة مفاتيح المتن — لا تحصر القراءة
  focusRefs: string[];
};

// حدّان يمنعان تضخّم المطالبة على النصوص الطويلة — الأولوية للمواضع الأقوى دلالة
const MAX_POSITIONS = 12;
const MAX_FOCUS_REFS = 8;
const MAX_HITS = 20;

// تطبيع شكلي يسامح فروق الكتابة: تشكيل/همزات/تاء مربوطة/أرقام/ترقيم/مسافات.
// نفس فلسفة normalizeForMatch في محرّك الحكم وverifyCorpusCitations في المتحقق.
function normalize(s: string): string {
  return s
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[ً-ْـ]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/[ؤئ]/g, "ء")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[«»""''‹›".,،؛؟!:…_|()٪%*{}\[\]\/\\–—-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// تقسيم إلى جمل مع الاحتفاظ بالنصّ الخام لكل جملة — المقطع يُعرض على الطبقة
// الثانية كما كتبه المحامي، لا مطبَّعاً، فحكمها يقع على لفظه الحقيقي.
function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.؟!])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// ─── الجزم النظامي بلا سند ──────────────────────────────────────────────────
// كاشف **بنيوي** لا لفظي: يلتقط تقرير حكم نظامي بصيغة جازمة، ثم يسأل: هل في
// الجملة نفسها إحالة إلى مصدرها؟ فإن غابت الإحالة فالموضع يستحق حكماً صريحاً
// من الطبقة الثانية — ولا يُحكم عليه هنا، فقد يكون في سياقه سليماً.
//
// سبب وجوده: هذا بالضبط موضع التذبذب الذي رُصد عملياً — جزمٌ نظامي على الحافة
// يمرّ مرة ويُرصد مرة. إخراجه من دائرة الاجتهاد إلى دائرة البحث الحتمي يجعل
// السؤال عنه مطروحاً في كل مرة، لا في بعض المرات.
//
// ملاحظة تنفيذية لازمة: المطابقة تجري على النصّ **بعد التطبيع**، والتطبيع يبدّل
// الحروف (ة←ه، ى←ي، أإآ←ا، ؤئ←ء). فتُكتب العبارات هنا بصيغتها الطبيعية ثم
// تُطبَّع برمجياً عند التحميل — كتابتها مطبَّعة باليد مزلقة أخطاء. ولا تُستعمل
// حدود الكلمات (\b) إطلاقاً: JavaScript يعرّفها على [A-Za-z0-9_]، والحرف العربي
// خارجها، فتفشل المطابقة صامتةً.
const CATEGORICAL_SUBJECTS = ["جريمة", "مخالفة", "جنحة", "جناية", "باطلاً", "باطلة", "محظوراً", "محظورة"];
const CATEGORICAL_VERBS = ["يعد", "تعد", "يعتبر", "تعتبر"];

const CATEGORICAL_ASSERTION_PHRASES: string[] = [
  ...CATEGORICAL_VERBS.flatMap((verb) => CATEGORICAL_SUBJECTS.map((subject) => `${verb} ${subject}`)),
  "يعاقب", "تعاقب", "عقوبته", "عقوبتها", "يسجن", "بالسجن", "بغرامة", "غرامة قدرها", "غرامة مالية",
  "يبطل العقد", "تبطل", "باطل نظاماً", "باطلة نظاماً", "ينفسخ العقد", "يفسخ العقد",
  "تسقط الدعوى", "يسقط الحق", "يسقط بالتقادم", "تسقط بمضي", "مدة التقادم",
  "لا يجوز نظاماً", "يحظر نظاماً", "يجب نظاماً", "يلزم نظاماً", "يشترط نظاماً",
  "تختص المحكمة", "ينعقد الاختصاص", "الاختصاص ينعقد",
  "من حقك نظاماً", "تستحق تعويضاً", "يستحق تعويضاً",
].map(normalize);

// إشارات الإحالة: وجود أيّها في الجملة يعني أن الكاتب أسند قوله إلى مصدره،
// فيخرج الموضع من دائرة «الجزم بلا سند».
const CITATION_MARKERS: string[] = [
  "المادة", "المواد", "القاعدة", "القواعد", "الفقرة", "البند",
  "اللائحة", "النظام", "نظام العمل", "نظام المحاماة", "المرسوم", "الأمر الملكي", "قرار مجلس الوزراء",
  "بموجب", "استناداً إلى", "وفقاً لنظام", "وفق نظام", "بحسب نظام", "نصت", "نص عليه", "جاء في",
].map(normalize);

function detectCategoricalAssertions(sentences: string[]): CorpusPosition[] {
  const out: CorpusPosition[] = [];
  for (const sentence of sentences) {
    const norm = normalize(sentence);
    if (!CATEGORICAL_ASSERTION_PHRASES.some((phrase) => norm.includes(phrase))) continue;
    if (CITATION_MARKERS.some((marker) => norm.includes(marker))) continue;
    out.push({
      excerpt: sentence,
      kind: "جزم نظامي بلا سند",
      trigger: "",
      candidateRefs: [],
    });
  }
  return out;
}

// ─── مطابقة أنماط المتن المخزّنة في قاعدة المعرفة ───────────────────────────
// الأنماط هنا ليست «قائمة ممنوعات» تحكم بذاتها — بقرار مالكة المنصة أُلغيت
// طبقة الأنماط الحاكمة نهائياً، والحكم كله للمعنى. دورها هنا استدلالي بحت:
// دالّة على أي قاعدة أو مادة من المتن يُحتمل أن تكون في محلّ النظر، فتُرفع
// الجملة إلى الطبقة الثانية لتحكم عليها بالمعنى — إثباتاً أو نفياً.
// ─── حدّ القطع: متى تحكم الطبقة الأولى بنفسها ومتى تُحيل؟ ──────────────────
// «الخلل فيه ممنوع» — بقرار مالكة المنصة. ومطابقة اللفظ وحدها لا تكفي حكماً:
// النصّ قد يورد العبارة نافياً لها، أو محذّراً منها، أو ناقلاً لها، أو سائلاً
// عنها — فيكون قائلُها ملتزماً لا مخالفاً، ويكون الحكم عليه ظلماً وخللاً.
//
// فحين يخلو السياق من كل صارف: الحكم قاطع وتحكم به الطبقة الأولى.
// وحين يوجد صارف: لا تُسقط الموضع — تُحيله إلى الطبقة الثانية لتحكم بالمعنى.
// فلا تُخطئ الأولى، ولا يسقط الموضع بين الطبقتين.
const CONTEXT_QUALIFIERS: string[] = [
  // النفي والحظر — «لا يجوز أن يضمن»، «لم يعد»، «ليس صحيحاً»
  "لا يجوز", "لا يحق", "لا يصح", "لا يمكن", "لا ينبغي", "لا تقل", "لا تكتب", "لا تعد",
  "لم", "ليس", "ليست", "غير صحيح", "غير جائز", "بلا", "دون",
  // التحذير والإنكار — نصّ يحذّر من المخالفة لا يرتكبها
  "يحظر", "ممنوع", "محظور", "تجنب", "احذر", "احذري", "خطأ شائع", "من الأخطاء",
  "مخالفة", "يخالف", "لا يجوز للمحامي", "على المحامي ألا",
  // النقل والاستفهام
  "هل", "يقول بعض", "يزعم", "يدعي", "يروج",
];

function hasContextQualifier(normalizedSentence: string): boolean {
  return CONTEXT_QUALIFIERS.some((q) => normalizedSentence.includes(normalize(q)));
}

// الاقتباس صارفٌ أيضاً: العبارة داخل علامتي اقتباس منقولةٌ عن غير الكاتب.
// يُفحص على النصّ الخام قبل التطبيع، لأن التطبيع يجرّد علامات الاقتباس.
function isInsideQuotes(rawSentence: string, trigger: string): boolean {
  const quoted = rawSentence.match(/[«"'"']([^«»"'"']+)[»"'"']/g) ?? [];
  const normalizedTrigger = normalize(trigger);
  return quoted.some((segment) => normalize(segment).includes(normalizedTrigger));
}

function detectPatternPositions(sentences: string[]): { hits: CorpusHit[]; positions: CorpusPosition[] } {
  const byExcerpt = new Map<string, CorpusPosition>();
  const hits: CorpusHit[] = [];
  const seenHits = new Set<string>();

  for (const sentence of sentences) {
    const norm = normalize(sentence);
    if (!norm) continue;

    for (const entry of legalKnowledgeEntries) {
      if (!entry.legalReference) continue;

      const prohibited = entry.prohibitedPatterns.find((p) => {
        const n = normalize(p);
        return n.length >= 3 && norm.includes(n);
      });

      // الحكم القاطع: نمط محظور صريح، في جملة خالية من كل صارف سياقي.
      // تحكم به الطبقة الأولى بنفسها ولا يُحال — وهذا هو الأساس.
      if (prohibited && !hasContextQualifier(norm) && !isInsideQuotes(sentence, prohibited)) {
        const key = `${entry.id}|${sentence}`;
        if (!seenHits.has(key)) {
          seenHits.add(key);
          hits.push({
            excerpt: sentence,
            trigger: prohibited,
            entryId: entry.id,
            legalReference: entry.legalReference,
          });
        }
        continue;
      }
      const contextual = prohibited
        ? undefined
        : (entry.contextualPatterns ?? []).find((p) => {
            const n = normalize(p);
            return n.length >= 3 && norm.includes(n);
          });
      const trigger = prohibited ?? contextual;
      if (!trigger) continue;

      // بلغ هنا نمطٌ محظور دخله صارف سياقي، أو نمطٌ سياقي — كلاهما دون حدّ
      // القطع، فيُرفع للطبقة الثانية لتحكم فيه بالمعنى ولا يسقط.
      const kind: CorpusPositionKind = prohibited ? "نمط محظور" : "نمط سياقي";
      const key = `${sentence}|${kind}`;
      const existing = byExcerpt.get(key);
      if (existing) {
        if (!existing.candidateRefs.includes(entry.legalReference)) {
          existing.candidateRefs.push(entry.legalReference);
        }
        continue;
      }
      byExcerpt.set(key, {
        excerpt: sentence,
        kind,
        trigger,
        candidateRefs: [entry.legalReference],
      });
    }
  }

  // المحظور قبل السياقي — عند بلوغ السقف تبقى المواضع الأقوى دلالة
  const positions = [...byExcerpt.values()].sort((a, b) =>
    a.kind === b.kind ? 0 : a.kind === "نمط محظور" ? -1 : 1
  );
  return { hits, positions };
}

// ─── ترشيح المراجع بدلالة المفاتيح ──────────────────────────────────────────
// لا يُنتج مواضع، بل قائمة قراءة مركّزة: أي مواد المتن أقرب إلى موضوع النصّ.
// ترتيبٌ للانتباه لا حصرٌ له — المتن الكامل يبقى أمام الطبقة الثانية.
function detectFocusRefs(normalizedText: string): string[] {
  const scored: Array<{ ref: string; hits: number }> = [];
  for (const entry of legalKnowledgeEntries) {
    if (!entry.legalReference) continue;
    let hits = 0;
    for (const keyword of entry.keywords) {
      const n = normalize(keyword);
      if (n.length >= 3 && normalizedText.includes(n)) hits++;
    }
    if (hits > 0) scored.push({ ref: entry.legalReference, hits });
  }
  return scored
    .sort((a, b) => b.hits - a.hits)
    .slice(0, MAX_FOCUS_REFS)
    .map((s) => s.ref);
}

export function scanAgainstCorpus(text: string): CorpusScan {
  const sentences = splitSentences(text);
  const normalizedText = normalize(text);
  const patternScan = detectPatternPositions(sentences);

  const positions = [
    ...detectCategoricalAssertions(sentences),
    ...patternScan.positions,
  ].slice(0, MAX_POSITIONS);

  return {
    hits: patternScan.hits.slice(0, MAX_HITS),
    positions,
    focusRefs: detectFocusRefs(normalizedText),
  };
}

// صياغة نتيجة البحث كقسم يُلحق برسالة المستخدم في الطبقة الثانية.
// يعود بسلسلة فارغة عند خلوّ النتيجة، فلا يُحشى في المطالبة قسمٌ بلا مضمون.
export function formatCorpusScanSection(scan: CorpusScan): string {
  if (scan.hits.length === 0 && scan.positions.length === 0 && scan.focusRefs.length === 0) return "";

  const blocks: string[] = ["## نتيجة البحث الحتمي في المتن (الطبقة الأولى)"];

  if (scan.hits.length > 0) {
    blocks.push(
      "مخالفات **حكمت بها الطبقة الأولى وصدرت فعلاً** — مثبتة في النتيجة ولا تحتاج منك إعادة رصدها ولا تأكيدها. لا تُعد ذكرها:"
    );
    scan.hits.forEach((hit, index) => {
      blocks.push(`${index + 1}. «${hit.trigger}» ← ${hit.legalReference} — في: «${hit.excerpt}»`);
    });
    blocks.push(
      "دورك تجاهها: التقاط ما **لم تلتقطه** — أيّ وجه آخر من المخالفة في الجملة نفسها لم يُغطَّ أعلاه، أو مخالفة في وثيقة أخرى لنفس الواقعة."
    );
  }

  if (scan.positions.length > 0) {
    blocks.push(
      "مواضع استخرجها بحثٌ برمجي في نصّ المحامي قبل قراءتك. **يلزمك الحكم على كل موضع منها صراحةً** — إثباتاً أو نفياً — ولا يجوز إغفال أيّها:"
    );
    scan.positions.forEach((position, index) => {
      const refs =
        position.candidateRefs.length > 0
          ? `\n  مراجع مرشّحة للنظر (ترشيحٌ لا حكم — قد يكون الصواب غيرها): ${position.candidateRefs.join("، ")}`
          : "\n  الإسناد النظامي إليك وحدك: حدّد القاعدة أو المادة إن كان مخالفاً.";
      const trigger = position.trigger ? `\n  ما التقطه البحث: «${position.trigger}»` : "";
      blocks.push(
        `${index + 1}. [${position.kind}] «${position.excerpt}»${trigger}${refs}`
      );
    });
  }

  if (scan.focusRefs.length > 0) {
    blocks.push(
      `مواد قريبة من موضوع النصّ بدلالة مفاتيح المتن (قراءة مركّزة إضافية، لا تحصر نظرك بها): ${scan.focusRefs.join("، ")}`
    );
  }

  return blocks.join("\n");
}
