// SEMANTIC COMPLIANCE ANALYSIS — HOLISTIC ENGINE
// ONE call to Claude. No rule list passed — Claude uses its full knowledge
// of the 46 professional conduct rules to judge the text holistically.
// Controlled by ANTHROPIC_API_KEY env var.

import Anthropic from "@anthropic-ai/sdk";
import type { ContentKind, FindingCategory, FindingDomain, ReviewContext, ReviewFinding, RiskLevel } from "@/lib/types";
import { legalKnowledgeEntries } from "@/lib/legal-knowledge-base";
import { OFFICIAL_CORPUS, type OfficialCorpusItem } from "@/lib/legal-official-corpus";
import { AUTHORITIES_RULE, PLATFORM_SUPREME_RULE } from "@/lib/governance";
import {
  arabicSeverity,
  businessSeverityForFinding,
  calculateFindingWeight,
  classifyLegalKnowledgeEntry,
  riskDimensionsForFinding
} from "@/lib/services/scoring-service";
import type { ScoringProfile } from "@/lib/scoring-profiles";
import { resolveScoringProfile } from "@/lib/scoring-profiles";

const DEFAULT_SOURCE_DOCUMENT_ID = "rules-professional-conduct-lawyers";
const DEFAULT_SOURCE_DOCUMENT = "قواعد السلوك المهني للمحامين";
const DEFAULT_SOURCE_URL = "https://laws.moj.gov.sa/ar/legislation/JmI0BPgVlA5GuIxkJUi08A";

function semanticTraceabilityId(entryId: string, evidence: string): string {
  const value = `${entryId}:${evidence}`;
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return `SEM-${hash.toString(16).toUpperCase().padStart(8, "0")}`;
}

function buildContextSummary(context?: ReviewContext): string {
  if (!context) return "غير محدد";
  const parts = [
    context.contentType && `نوع المحتوى: ${context.contentType}`,
    context.channel && `القناة: ${context.channel}`,
    context.audience && `الجمهور: ${context.audience}`,
    context.purpose && `الهدف: ${context.purpose}`
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" | ") : "غير محدد";
}

function buildValidReferencesList(): string {
  // الفهرس من المتن الرسمي نفسه: كل قاعدة سلوك وكل مادة لائحة قابلة للاستشهاد باسمها
  return OFFICIAL_CORPUS
    .map((item) => `- ${item.ref} (${item.sourceDocument})`)
    .join("\n");
}

// المتن الرسمي الكامل — بأمر مالكة المنصة: «شاملة كاملة لا نقص ولا زيادة».
// النص الحرفي المنقول من منصة تشريعات وزارة العدل لكل قاعدة سلوك (47) وكل مادة من
// اللائحة التنفيذية (90)، ليحكم الذكاء من المادة نفسها ومقصدها لا من ملخص أو عنوان.
// مناطق الرصد بالمعنى تُلحق من قاعدة المعرفة حيث توجد إشارات مطابقة.
function buildRuleCorpus(entries: typeof legalKnowledgeEntries): string {
  const hintsByRef = new Map<string, string>();
  for (const entry of entries) {
    if (!entry.legalReference || !entry.riskCategories?.length) continue;
    const baseRef = entry.legalReference.split("،")[0].trim();
    const existing = hintsByRef.get(baseRef);
    const hint = entry.riskCategories.join("، ");
    hintsByRef.set(baseRef, existing ? `${existing}، ${hint}` : hint);
  }
  const blocks: string[] = [];
  let lastSource = "";
  let lastChapter = "";
  for (const item of OFFICIAL_CORPUS) {
    if (item.sourceDocument !== lastSource) {
      blocks.push(`\n# ${item.sourceDocument}`);
      lastSource = item.sourceDocument;
      lastChapter = "";
    }
    if (item.chapter && item.chapter !== lastChapter) {
      blocks.push(`## ${item.chapter}`);
      lastChapter = item.chapter;
    }
    const hints = hintsByRef.get(item.ref);
    const areas = hints
      ? `\nمناطق الرصد بالمعنى (بأي صياغة، لا تحصر نفسك بألفاظ بعينها): ${hints}`
      : "";
    blocks.push(`### ${item.ref}${item.section ? ` — ${item.section}` : ""}\n${item.text}${areas}`);
  }
  return blocks.join("\n\n");
}

// إسناد الاستشهاد لمصدره الصحيح: قاعدة سلوك أم مادة لائحة — حتى لا تُنسب مادة لائحة
// استشهد بها الذكاء إلى قواعد السلوك خطأً عند غياب مدخلة مطابقة في قاعدة المعرفة.
// مطابقة تامة فقط: مطابقة الاحتواء الجزئي (startsWith) بين مرجعين مختلفين من المتن
// تُخطئ حين يكون أحدهما بادئة حرفية للآخر (مثل «المادة السابعة» بادئة لـ«المادة
// السابعة عشرة») فتُنسب مخالفة المادة السابعة عشرة خطأً إلى المادة السابعة.
function findOfficialCorpusItem(ruleReference: string): OfficialCorpusItem | null {
  const ref = ruleReference.split(/[،\-–—]|الفقرة/)[0].trim();
  return OFFICIAL_CORPUS.find((item) => item.ref === ref) ?? null;
}

// الجزء الثابت من مطالبة الحكم (الشخصية + التعليمات + القواعد الـ46) — يُرسل كتلة system
// مخزّنة مؤقتاً لدى المزود: قراءة واحدة تخدم كل طلبات المستخدمين المتزامنة، أسرع وأوفر،
// ونص المستخدم يُرسل في رسالة المستخدم المتغيرة ولا يدخل التخزين إطلاقاً.
function buildHolisticSystem(entries: typeof legalKnowledgeEntries): string {
  const validRefs = buildValidReferencesList();
  const ruleCorpus = buildRuleCorpus(entries);
  return `${PLATFORM_SUPREME_RULE}

أنت العقل الشامل والوحيد للحكم في هذه المنصة: خبير أول في نظام المحاماة، واللائحة التنفيذية لنظام المحاماة ١٤٤٦هـ (90 مادة — متنها الرسمي الكامل مرفق أدناه)، وقواعد السلوك المهني للمحامين (متنها الرسمي الكامل مرفق أدناه)، بخبرة عملية تعادل مدير الإدارة العامة للمحاماة، ومدقق جودة وامتثال محترف. تحكم بعقل قانوني مهني منطقي كخبير بشري — لا بمطابقة كلمات أو أنماط — وتزن المعنى والغرض والأثر على كرامة المهنة كما يفعل خبير حقيقي.
لا توجد طبقة أخرى تسندك أو تكمّل نقصك: أنت وحدك تغطّي كل النواحي بالمعنى. أي مخالفة تفوتك تُنشر فعلاً، فكن شاملاً ودقيقاً كخبير مسؤول.

${AUTHORITIES_RULE}

## السياق الثابت
هذه المنصة مخصصة للمحامين المرخصين حصراً. النص الذي سيصلك في رسالة المستخدم كتبه محامٍ ويريد نشره على وسائل التواصل الاجتماعي — سواء كان منشوراً، تغريدة، تعليقاً، رداً، أو إعلاناً.

## أساس الحكم
منطق التحليل مبني حصراً على قواعد السلوك المهني للمحامين واللائحة التنفيذية لنظام المحاماة — احكم بالمعنى والسياق والغرض وفق هذه القواعد، لا بوجود كلمات أو أنماط بعينها.
اقرأ نص كل مادة (المتن الكامل مرفق أدناه)، واستخلص **مقصدها وعلّتها والمصلحة التي تحميها**، ثم احكم على النص بمقصد القاعدة لا بلفظها فقط. المخالفة بالمعنى مخالفة ولو أُعيدت صياغتها أو تجنّبت عبارة بعينها.
المحتوى الخارج عن نطاق المهنة الذي لا يرتبط بقاعدة محددة من القائمة أدناه: صنّفه مؤشر مخاطر مهنية بـ severity="منخفض".

## مناطق رصد إلزامية بالمعنى (بأي صياغة أو مرادف — لا تحصر نفسك بألفاظ محددة)
هذه أمثلة على ما يجب أن يمسكه حكمك المعنوي دائماً، وليست قائمة حصرية:
- الادعاءات التفضيلية أو المطلقة: الأفضلية، التميّز المطلق، المركز الأول/الأقوى، «رقم ١»، «لا يُضاهى» — بأي صياغة.
- الوعد بنتيجة أو ضمانها أو الإيحاء بها: «نضمن»، «مضمون»، «كسب القضية»، «نسبة نجاح» — أو أي إيحاء مكافئ.
- التباهي بالدخل أو الأتعاب أو الأرقام المالية للترويج الشخصي — خاصة غير الموثقة أو المبالغ فيها.
- استغلال حاجة أو خوف أو استعجال الموكل المحتمل، أو الاستقطاب المباشر غير المشروع.
- المساس بكرامة المهنة أو هيبة القضاء، والأسلوب غير اللائق (العامية المبتذلة، الاستهزاء، الضحك ورموزه).
- التضليل أو نقص الدقة: أرقام/إحصاءات/مبالغ دون توضيح المصدر أو العملة أو السياق.

## الربط الإلزامي بين مخالفة اللائحة والنشر الإلكتروني
كل نص يصلك على هذه المنصة يُراد نشره إلكترونياً (منشور، تغريدة، تعليق، رد، إعلان، ملاحظة توعوية). إن ثبتت مخالفة لمادة من اللائحة التنفيذية، أو حمل النص معلومة قانونية غير صحيحة أو موهمة عن حكم نظامي يخص المحاماة (كالإيحاء بجواز ما هو محظور نظاماً أو العكس)، فهذا في الغالب مخالفة إضافية مستقلة للقاعدة (السابعة والثلاثين) من قواعد السلوك المهني — التي تُلزم المحامي عند مشاركته في وسائل النشر الإلكتروني بالتقيد بالأنظمة والقواعد ذات الصلة (فقرتها الأولى) وبتجنّب أي صورة من صور التضليل أو التزييف (فقرتها الثالثة). لا يصح الاكتفاء باستشهاد واحد بمادة اللائحة وحدها متى كان فعل النشر نفسه يحمل هذه المعلومة الخاطئة أو الموهمة — استشهد بكلا المرجعين معاً حين ينطبقان، فهما مخالفتان مستقلتان بمصلحتين مختلفتين: مخالفة الحكم النظامي ذاته، ومخالفة أصول ممارسة المهنة أثناء النشر.

## تحقق ذاتي إلزامي قبل الإخراج النهائي (ضمن هذه القراءة نفسها — لا قراءة ثانية)
أنت تخرج حكمك مرة واحدة فقط، فيجب أن تكون هذه القراءة الوحيدة شاملة تماماً. قبل أن تكتب مصفوفة الـJSON النهائية، راجع عملك داخلياً بصمت وفق الآتي، ثم أخرج النتيجة المكتملة مباشرة (لا تكتب مراجعتك، اكتفِ بأثرها في القائمة النهائية):
1. لكل مخالفة تنوي تسجيلها: هل لنفس الواقعة أو الدليل مخالفة مقابلة في الوثيقة الأخرى (لائحة ↔ قواعد سلوك) لم تستشهد بها بعد؟ (راجع تحديداً «الربط الإلزامي» أعلاه).
2. امسح النص كاملاً مرة أخيرة من الزوايا الثماني عشرة (الامتثال، المخاطر، الجوانب المهنية، اللغة) — تأكد أنك لم تفوّت شيئاً قبل أن تعتبر القائمة نهائية.
3. تأكد أن كل استشهاد يطابق اسم مرجع ورد حرفياً في فهرس المراجع أدناه، وأن كل دليل منسوخ حرفياً من النص.
هذا التحقق جزء من نفس التوليد ولا يستدعي أي تفاعل إضافي — أنت مسؤول عن اكتمال حكمك من أول وآخر مرة.

## المهمة
اقرأ النص وحدد هل ينتهك أياً من القواعد الـ46 بشكل مباشر أو غير مباشر.
حكم بفهمك الكامل للقواعد وسياق المهنة — لا تبحث عن كلمات أو أنماط محددة.
إذا لم توجد أي مخالفة — أرجع مصفوفة فارغة [].
إذا كان مستوى ثقتك "منخفض" في وجود المخالفة — لا تُدرجها.
evidenceExcerpt يجب أن يكون نصاً حرفياً مقتبساً من النص المُعطى — انسخه كما هو دون تعديل أو تلخيص؛ أي مخالفة دليلها غير منسوخ حرفياً من النص تُرفض آلياً.

## ضوابط دقة الحكم (تمنع الإيجابيات الكاذبة دون خفض الحساسية)
- ألفاظ الضمان لها استخدام نظامي مشروع ليس وعداً بنتيجة: «يضمن النظام هذا الحق»، «لضمان الامتثال»، «يتضمن العقد شروطاً»، «ضمانات المتهم» — المحظور هو وعد العميل أو الجمهور بنتيجة قضية أو مكسب محدد أو نسبة نجاح. لا تسجل مخالفة «حظر الوعود أو ضمان النتائج» إلا إذا كان في النص وعد فعلي موجه بنتيجة.
- التوعية العامة بأهمية خدمة قانونية (كالمراجعة القانونية للعقود) دون وعد ولا مقارنة ولا استقطاب مباشر: إعلان مهني مقبول لا مخالفة فيه.
- لا يكفي أن يكون عنوان الفصل أو الباب قريباً موضوعياً من المخالفة لتستشهد بمادته — يجب أن يصف **نص الفقرة المحددة** نفسها فعلاً ما ورد في النص فعلاً، لا مجرد قرابة الموضوع العام. مثال: المادة (الثامنة والثمانون) تخص تحديداً من يمارس المهنة دون ترخيص، أو بعد إيقافه، أو يزعم صفة المحامي دون ترخيص فعلي — لا تستشهد بها على نص يقرّ صاحبه صراحة بأنه مرخّص وممارس نظامياً للمهنة، حتى لو كان موضوع النص عن الجمع بين المهنة ووظيفة أخرى (تلك مخالفة مستقلة تحكمها المادة السابعة عشرة وحدها، ولا تستدعي معها اتهاماً بانتحال الصفة).
- لا تستشهد بمادة تفترض عكس ما يقرّه النص صراحة عن نفسه (كالترخيص، الصفة، الاختصاص) — إن ناقض الاستشهاد إقراراً صريحاً في النص فهو استشهاد خاطئ يُستبعد.
- الحكم النهائي يجب ألا يناقض تحليلك: إن كان شرحك يثبت أن النص ضمن الحدود المقبولة فلا تسجل مخالفة عليه.

## طبقة التحليل متعددة الزوايا
بعد التحليل الأساسي، طبّق على كل مخالفة محتملة المستويات الثلاثة الآتية قبل تسجيلها:

### المستوى الأول — التثبت
هل الدليل من النص واضح وصريح؟ هل المخالفة حقيقية أم مجرد احتمال؟
لا تُسجل مخالفة بدون دليل مباشر من النص.

### المستوى الثاني — التوضيح
وضّح لماذا تندرج هذه المخالفة تحت مؤشرها المحدد (الامتثال / المخاطر / الجوانب المهنية / اللغة).
ضع الزاوية التي اكتشفتها والمبرر المنطقي للتصنيف في حقل explanation.

### المستوى الثالث — الرابط
اربط المخالفة بالقاعدة الرسمية من قائمة القواعد المعتمدة أدناه.
لا تستشهد بقاعدة خارج القائمة.

---

حلّل النص من الزوايا الآتية مقسّمةً على أربعة مؤشرات:

### أولاً — الامتثال القانوني (7 زوايا)
1. زاوية لجنة التأديب: هل لو قُدم هذا النص شكوى أمام لجنة تأديبية يستوجب النظر؟
2. زاوية القواعد المهنية: هل ينتهك أي قاعدة من الـ46 بشكل مباشر أو غير مباشر؟
3. زاوية الالتزام بالأنظمة: هل يتعارض مع أنظمة المملكة أو التوجهات التشريعية؟
4. زاوية النظام العام: هل يتعارض مع النظام العام أو السياسة التشريعية؟
5. زاوية الأخلاق العامة: هل يتعارض مع القيم الإسلامية والأخلاق العامة في المملكة؟
6. زاوية التضليل: هل يتضمن ادعاءً مضللاً أو مبالغاً فيه أو يوحي بشيء غير ثابت؟
7. زاوية المصداقية المهنية: هل يقدم معلومات قانونية غير دقيقة أو مضللة أو ناقصة؟

### ثانياً — المخاطر (6 زوايا)
1. زاوية الموكل: هل يضر بمصلحة موكل حالي أو محتمل؟
2. زاوية هيبة القضاء: هل يمس هيبة القضاء أو الجهات القضائية أو يشكك فيها؟
3. زاوية السرية المهنية: هل يكشف أو يلمح إلى معلومات سرية تخص موكلين أو قضايا؟
4. زاوية الاستغلال: هل يستغل حاجة أو ضعف أو خوف أو استعجال الموكل المحتمل؟
5. زاوية التنافس غير المشروع: هل يستخدم وسائل غير مشروعة لاستقطاب العملاء؟
6. زاوية الاستقلالية: هل يوحي بتأثير خارجي على المحامي أو ارتباط بجهات غير مشروعة؟

### ثالثاً — الالتزام بمعايير الجوانب المهنية (3 زوايا)
1. زاوية السمعة المهنية: هل يسيء إلى سمعة المهنة القانونية أو يقلل من هيبتها؟
2. زاوية تمثيل العدالة: هل يليق هذا النص بشخص يمثل العدالة؟
3. زاوية الكرامة المهنية: هل يحافظ على كرامة المهنة وهيبة القضاء؟

### رابعاً — اللغة والإملاء (زاويتان)
1. زاوية الحياد والاستقلال المهني: هل يؤثر على حياد المحامي أو موضوعيته في الصياغة؟
2. زاوية الثقة العامة: هل الأخطاء اللغوية أو الإملائية تضعف ثقة المتلقي بالمحامي؟

## قواعد الرصد متعدد الزوايا
- لا تُسجل مخالفة إلا إذا اجتازت المستويات الثلاثة (التثبت → التوضيح → الرابط)
- هذه الزوايا طبقة إضافية ولا تُلغي أو تُخفف أي آلية تقييم حالية
- تُطبق جميع الزوايا الـ18 على كل نص دون استثناء
- لا يُفترض قصد الكاتب إلا إذا دل عليه النص صراحةً
- إذا اتفقت أكثر من زاوية على وجود إشكال: يُرفع مستوى الخطورة ويُوضح السبب في الـ explanation
- إذا تداخلت زاويتان في نفس المخالفة: تُدمجان في نتيجة واحدة لتجنب التكرار
- إذا وُجدت مؤشرات مهنية دون سند نظامي كافٍ: تُصنف severity="منخفض" مع إشارة في الـ explanation أنه مؤشر مخاطر مهني يحتاج مراجعة
- لا يجوز خفض مستوى الحساسية أو الرصد الحالي

## إرشادات الخبير — حالات لا يجوز أن تظهر «ملتزمة» ويجب رصدها بجدية
احكم كخبير بشري: هذه الحالات تمس كرامة المهنة أو مصداقيتها ولو لم تطابق كلمةً بعينها، فاربطها بأقرب قاعدة مناسبة (كرامة المهنة/الإعلان المضلل/المصداقية) بـ severity متوسط فأعلى ولا تُصنّفها امتثالاً سليماً:
- الأسلوب غير اللائق بمحامٍ: العامية المبتذلة، الاستهزاء، الضحك أو رموزه (مثل «ههههه»)، الطابع الهزلي أو العبثي، أو النص بلا مضمون مهني جاد — لا يليق بمن يمثل العدالة.
- التباهي بالدخل أو الأرباح أو الأتعاب أو أرقام مالية للترويج الشخصي — خصوصاً غير الموثقة أو المبالغ فيها — ادعاء يمس المصداقية وكرامة المهنة ويقترب من الإعلان المضلل.
- ذكر مبالغ أو أرقام أو إحصاءات دون توضيح العملة أو المصدر أو المرجع — قصور في الدقة والمصداقية المهنية يجب الإشارة إليه صراحةً في الـ explanation.
- الحكم النهائي يجب أن يعكس جوهر النص: إن كان النص عابثاً أو مبتذلاً أو مضللاً، لا يصح أن يخرج مؤشر الامتثال «ملتزماً» أخضر بلا ملاحظة.

## المتن الرسمي المعتمد (النص الحرفي الكامل — قواعد السلوك المهني للمحامين واللائحة التنفيذية لنظام المحاماة)
احكم من نص كل قاعدة ومادة ومقصدها. استشهد في ruleReference فقط بمرجع ورد في هذا المتن — باسمه كما ورد («القاعدة …» لقواعد السلوك، «المادة …» لمواد اللائحة) — ولا تستشهد بمرجع خارجه:

${ruleCorpus}

### فهرس المراجع القابلة للاستشهاد (الأسماء ومصادرها)
${validRefs}

أجب بـ JSON array فقط — لا تضف أي نص خارجه:
[
  {
    "ruleReference": "القاعدة الثانية",
    "confidenceLevel": "مرتفع" أو "متوسط",
    "evidenceExcerpt": "العبارة الحرفية من النص التي تُثبت المخالفة",
    "violationType": "صريح" أو "ضمني" أو "سياقي",
    "severity": "حرج" أو "مرتفع" أو "متوسط" أو "منخفض",
    "explanation": "شرح توعوي تعليمي (جملتان إلى ثلاث) يوضح للمحامي لماذا تُعد العبارة مخالفة، والغاية التي تحميها القاعدة، والأثر المهني أو القانوني المحتمل — بأسلوب إرشادي واضح لا تقني",
    "advice": "التوصية التطبيقية للمحامي"
  }
]`;
}

// الجزء المتغير: نص المستخدم وسياقه — يُرسل طازجاً في كل طلب ولا يُخزَّن
function buildHolisticUserMessage(text: string, contextSummary: string): string {
  return `${contextSummary !== "غير محدد" ? `السياق الإضافي: ${contextSummary}\n\n` : ""}## النص المراد تحليله
«${text}»`;
}

// قراءة ثانية سريعة: تطلب «الإضافات فقط» لا إعادة كتابة القائمة كاملة — الفرق الحاسم
// في السرعة أن مخرَج النموذج (لا مدخَله) هو ما يحدد زمن التوليد؛ مصفوفة فارغة أو صغيرة
// تُكتب خلال ثوانٍ، بخلاف إعادة إخراج كل المخالفات بحقولها وشروحها الكاملة من جديد.
function buildAdditionsOnlyMessage(text: string, contextSummary: string, firstPassCompact: string): string {
  return `${contextSummary !== "غير محدد" ? `السياق الإضافي: ${contextSummary}\n\n` : ""}## النص المراد تحليله
«${text}»

## ما رصدتَه بالفعل في القراءة الأولى (مراجع فقط — لا تُعد ذكرها)
${firstPassCompact}

## مهمتك الآن: تحقق اكتمال سريع — الإضافات فقط
راجع النص مرة أخيرة بحثاً حصراً عن مخالفات **إضافية** لم تظهر أعلاه:
1. لكل مخالفة مذكورة أعلاه: هل لنفس الواقعة أو الدليل مخالفة مقابلة في الوثيقة الأخرى (لائحة ↔ قواعد سلوك) لم تُذكر؟
2. راجع الزوايا الثماني عشرة مرة أخيرة — هل فاتتك مخالفة كاملة لم تظهر إطلاقاً؟
لا تُعد كتابة أي مخالفة مذكورة أعلاه. إن لم توجد أي إضافة فعلية، أرجع مصفوفة فارغة [] فوراً دون شرح.
أجب بمصفوفة JSON فقط تحتوي على المخالفات **الجديدة فقط** بنفس تنسيق المخالفة المعتاد — لا تضف أي نص خارجها.`;
}

interface HolisticViolation {
  ruleReference: string;
  confidenceLevel: "مرتفع" | "متوسط" | "منخفض";
  evidenceExcerpt: string;
  violationType: "صريح" | "ضمني" | "سياقي";
  severity: RiskLevel;
  explanation: string;
  advice: string;
}

function extractJsonArray(raw: string): string | null {
  const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) {
    const inner = codeBlock[1].trim();
    const arr = inner.match(/\[[\s\S]*\]/);
    return arr ? arr[0] : null;
  }
  const arr = raw.match(/\[[\s\S]*\]/);
  return arr ? arr[0] : null;
}

// تثبّت حتمي من الدليل: المخالفة لا تُقبل إلا إذا كان دليلها الحرفي موجوداً فعلاً
// في النص المُحلَّل — بعد تطبيع شكلي (تشكيل/همزات/علامات اقتباس) يسامح فروق النسخ.
// هذا يمنع «مخالفة بلا دليل» التي يجتهد فيها النموذج فتحجب نصاً سليماً.
function normalizeForMatch(s: string): string {
  return s
    .replace(/[ً-ْـ]/g, "")
    .replace(/[«»"'“”]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

function evidenceAppearsInText(evidence: string, text: string): boolean {
  const haystack = normalizeForMatch(text);
  const segments = normalizeForMatch(evidence)
    .split(/…|\.\.\./)
    .map((s) => s.trim())
    .filter((s) => s.length >= 4);
  if (segments.length === 0) return false;
  return segments.every((seg) => haystack.includes(seg));
}

// إنقاذ جواب مقطوع: يلتقط الكائنات المكتملة فقط من مصفوفة JSON انقطعت في منتصفها —
// حتى لا تضيع مخالفات مكتملة بسبب انقطاع الجواب عند سقف الإخراج.
function salvageTruncatedArray(raw: string): string | null {
  const start = raw.indexOf("[");
  if (start < 0) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  let lastComplete = -1;
  for (let i = start; i < raw.length; i++) {
    const c = raw[i];
    if (esc) { esc = false; continue; }
    if (c === "\\") { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "{") depth++;
    else if (c === "}") { depth--; if (depth === 0) lastComplete = i; }
  }
  if (lastComplete < 0) return null;
  return raw.slice(start, lastComplete + 1) + "]";
}

// null = فشل قراءة جواب المحرك (يُعامل فشلاً مغلقاً) — أما [] فتعني «لا مخالفات» فعلاً.
// التمييز جوهري: جواب مقطوع أو غير مقروء يجب ألا يتنكر في صورة «ملتزم».
function parseHolisticResponse(raw: string): HolisticViolation[] | null {
  try {
    const jsonMatch = extractJsonArray(raw) ?? salvageTruncatedArray(raw);
    if (!jsonMatch) return null;
    let parsed: Partial<HolisticViolation>[];
    try {
      parsed = JSON.parse(jsonMatch) as Partial<HolisticViolation>[];
    } catch {
      const salvaged = salvageTruncatedArray(raw);
      if (!salvaged) return null;
      parsed = JSON.parse(salvaged) as Partial<HolisticViolation>[];
    }
    if (!Array.isArray(parsed)) return null;
    return parsed
      .filter((v) => typeof v.ruleReference === "string" && v.ruleReference && typeof v.evidenceExcerpt === "string" && v.evidenceExcerpt)
      .map((v) => ({
        ruleReference: v.ruleReference!,
        confidenceLevel: v.confidenceLevel ?? "متوسط",
        evidenceExcerpt: v.evidenceExcerpt!.trim(), // منقول حرفياً من نص المستخدم — لا يُمس
        violationType: v.violationType ?? "سياقي",
        severity: v.severity ?? "متوسط",
        // حارس نطاق المملكة الحتمي على النصوص الإنشائية للنموذج
        explanation: v.explanation ?? "",
        advice: v.advice ?? ""
      }));
  } catch {
    return null;
  }
}

// بعض القواعد (كالسابعة والثلاثين والثامنة والثلاثين) لها أكثر من مدخلة في قاعدة
// المعرفة القديمة — كل مدخلة مربوطة بفقرة أو زاوية واحدة بعينها من نفس القاعدة.
// مرجع الذكاء لا يحدد الفقرة، فأخذ أول مدخلة تطابق رقم القاعدة تخمين قد يُسند
// مخالفة زاويتها مختلفة كلياً (كالتضليل) إلى مدخلة زاوية أخرى (كالسرية) خطأً —
// وهذا يُفسد التصنيف والتصعيد التلقائي المبني على هوية المدخلة. عند التباس أكثر
// من مدخلة: لا تُخمَّن — تُعامل معاملة «بلا مدخلة» ويُبنى الحكم من المتن الرسمي
// وتفسير الذكاء نفسه مباشرة بدل مدخلة قد لا تطابق زاوية المخالفة الفعلية.
function findKbEntry(ruleReference: string): typeof legalKnowledgeEntries[number] | null {
  const matches = legalKnowledgeEntries.filter((e) => e.legalReference && e.legalReference.startsWith(ruleReference));
  return matches.length === 1 ? matches[0] : null;
}

function buildSemanticFinding(
  violation: HolisticViolation,
  entry: typeof legalKnowledgeEntries[number] | null,
  profile: ScoringProfile
): ReviewFinding | null {
  if (violation.confidenceLevel === "منخفض") return null;
  const evidence = violation.evidenceExcerpt.trim();
  if (!evidence) return null;

  // عند غياب مدخلة قاعدة المعرفة: يُسند الاستشهاد إلى مصدره الصحيح من المتن الرسمي
  // (قاعدة سلوك أو مادة لائحة) بدل افتراض قواعد السلوك دائماً.
  const corpusItem = entry ? null : findOfficialCorpusItem(violation.ruleReference);
  const legalKnowledgeEntryId = entry?.id ?? violation.ruleReference.replace(/\s+/g, "-").replace(/،/g, "");
  const legalReference = entry?.legalReference ?? violation.ruleReference;
  const sourceDocumentId = entry?.sourceDocumentId ?? corpusItem?.sourceDocumentId ?? DEFAULT_SOURCE_DOCUMENT_ID;
  const sourceDocument = entry?.sourceDocument ?? corpusItem?.sourceDocument ?? DEFAULT_SOURCE_DOCUMENT;
  const articleTitle = entry?.articleTitle ?? (corpusItem ? `${corpusItem.ref}${corpusItem.section ? ` — ${corpusItem.section}` : ""}` : violation.ruleReference);
  const sourceUrl = entry?.sourceUrl ?? corpusItem?.sourceUrl ?? DEFAULT_SOURCE_URL;

  const classification = entry
    ? classifyLegalKnowledgeEntry(entry)
    : { category: "التواصل العام" as FindingCategory, domain: "إجرائي" as FindingDomain, potentialImpact: violation.severity };

  const baseFinding = {
    traceabilityId: semanticTraceabilityId(legalKnowledgeEntryId, evidence),
    legalKnowledgeEntryId,
    sourceDocumentId,
    title: articleTitle,
    category: classification.category,
    domain: classification.domain,
    potentialImpact: classification.potentialImpact,
    weight: 0,
    scoreImpact: 0,
    issue: entry?.riskCategories.join("، ") || violation.explanation,
    severity: violation.severity,
    evidence,
    matchedPattern: `[دلالي — ${violation.violationType}]`,
    contentClassification: "إعلان مضلل محتمل" as const,
    advice: violation.advice || entry?.recommendedAction || "",
    suggestedSaferWording: entry?.recommendedAction ?? violation.advice,
    legalCitation: `${sourceDocument}، ${legalReference}`,
    sourceDocument,
    legalReference,
    articleTitle,
    articleTextExcerpt: entry?.fullText ?? corpusItem?.text ?? "",
    explanation: violation.explanation,
    // تأنيث نوع المخالفة ليطابق «مخالفة» المؤنثة (كان: «مخالفة ضمني» ← الصواب «مخالفة ضمنية»)
    legalExplanation: `العبارة «${evidence}» تُعد مخالفة ${({ "صريح": "صريحة", "ضمني": "ضمنية", "سياقي": "سياقية" } as const)[violation.violationType] ?? violation.violationType} لـ${legalReference} من ${sourceDocument}: ${violation.explanation}`,
    reviewOutcome: "رصدت ملاحظة" as const,
    confidenceLevel: violation.confidenceLevel,
    sourceUrl,
    sourceType: "semantic" as const
  } satisfies ReviewFinding;

  const businessSeverity = businessSeverityForFinding(baseFinding);
  const normalizedSeverity = arabicSeverity(businessSeverity);
  const weight = calculateFindingWeight(normalizedSeverity, classification.category, classification.potentialImpact, profile);

  if (weight === 0) return null;

  return {
    ...baseFinding,
    severity: normalizedSeverity,
    potentialImpact: businessSeverity === "critical" ? "حرج" : classification.potentialImpact,
    businessSeverity,
    riskDimensions: riskDimensionsForFinding(baseFinding),
    resolved: false,
    weight,
    scoreImpact: weight
  };
}

export type SemanticAnalysisResult =
  | { mode: "full"; findings: ReviewFinding[] }
  | { mode: "pattern-only"; findings: ReviewFinding[]; degradedReason: "missing-key" | "api-error" | "timeout" };

type HolisticCallOutcome =
  | { ok: true; violations: HolisticViolation[]; truncatedEmpty: boolean }
  | { ok: false; reason: "timeout" | "api-error" };

// نداء الحاكم الدلالي — قراءة واحدة شاملة (بلا قراءة تحقق ثانية بقرار مالكة المنصة:
// السرعة أهم من تكرار النداء، والتحقق من الاكتمال جزء من تعليمات القراءة نفسها أعلاه).
async function callHolisticJudge(
  client: Anthropic,
  system: string,
  userMessage: string,
  label: string,
  maxTokens = 6000
): Promise<HolisticCallOutcome> {
  let message: Awaited<ReturnType<typeof client.messages.create>>;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45_000);
    try {
      message = await client.messages.create(
        {
          model: "claude-sonnet-5",
          // تنبيه من SDK المثبت: النماذج بعد Opus 4.6 (ومنها Sonnet 5) ترفض أي حرارة
          // غير 1.0 بخطأ 400 — لا يوجد خيار «حرارة صفر» على هذا النموذج، فلا تُضبط.
          thinking: { type: "disabled" },
          // سقف إخراج واسع للقراءة الأولى: المتن الكامل جعل الخبير يرصد مخالفات أكثر
          // بشروح أوفى — السقف الضيق كان يقطع الـJSON فتضيع المخالفات. القراءة الثانية
          // (الإضافات فقط) تُستدعى بسقف أصغر بكثير لأنها لا تُعيد كتابة القائمة كاملة.
          max_tokens: maxTokens,
          // القواعد الثابتة كتلة system مخزّنة مؤقتاً لدى المزود — نص المستخدم لا يدخل التخزين
          system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: userMessage }],
        },
        { signal: controller.signal }
      );
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    const isTimeout = err instanceof Error && (err.name === "AbortError" || err.message.includes("abort"));
    const reason = isTimeout ? "timeout" : "api-error";
    console.warn(`[semantic] ${label} call failed — reason:`, reason, err instanceof Error ? err.message : "");
    return { ok: false, reason };
  }

  const rawText = message.content
    .filter((block) => block.type === "text")
    .map((block) => (block as { type: "text"; text: string }).text)
    .join("");

  const violations = parseHolisticResponse(rawText);
  // فشل مغلق: تعذّر قراءة جواب المحرك (JSON مكسور/مقطوع بلا كائن مكتمل) ليس «لا مخالفات» —
  // يُعامل عطلاً فيظهر التحذير بدل نتيجة «ملتزم» زائفة.
  if (violations === null) {
    console.warn(`[semantic] ${label}: unparseable engine response. raw head:`, rawText.slice(0, 200));
    return { ok: false, reason: "api-error" };
  }
  const truncatedEmpty = message.stop_reason === "max_tokens" && violations.length === 0;
  if (message.stop_reason === "max_tokens") {
    console.warn(`[semantic] ${label}: response truncated at max_tokens — salvaged complete findings:`, violations.length);
  }
  console.log(`[semantic] ${label}: violations =`, violations.length);
  return { ok: true, violations, truncatedEmpty };
}

export async function runSemanticAnalysis(
  text: string,
  context: ReviewContext | undefined,
  contentKind?: ContentKind
): Promise<SemanticAnalysisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[semantic] ANTHROPIC_API_KEY missing — falling back to pattern-only");
    return { mode: "pattern-only", findings: [], degradedReason: "missing-key" };
  }

  const profile = resolveScoringProfile(contentKind ?? ("post" as ContentKind), context?.channel);
  const contextSummary = buildContextSummary(context);

  const eligibleEntries = legalKnowledgeEntries.filter((e) => e.legalReference);
  console.log("[semantic] starting holistic analysis: anchored to", eligibleEntries.length, "KB entries");

  const client = new Anthropic({ apiKey });
  const system = buildHolisticSystem(eligibleEntries);
  const userMessage = buildHolisticUserMessage(text, contextSummary);

  const result = await callHolisticJudge(client, system, userMessage, "القراءة الأولى");
  if (!result.ok) return { mode: "pattern-only", findings: [], degradedReason: result.reason };
  // انقطع الجواب بلا أي مخالفة مكتملة: لا يُدّعى الامتثال — فشل مغلق
  if (result.truncatedEmpty) return { mode: "pattern-only", findings: [], degradedReason: "api-error" };

  // قراءة ثانية سريعة (إضافات فقط): تسد فجوة التذكّر التي قد تفوت القراءة الواحدة —
  // مخرَجها صغير عادة (فارغ أو مخالفة أو اثنتان) فتنتهي خلال ثوانٍ، بخلاف إعادة كتابة
  // القائمة كاملة. فشلها أو انقطاعها لا يُسقط نتيجة القراءة الأولى الصالحة أصلاً.
  const firstPassCompact = JSON.stringify(
    result.violations.map((v) => ({ ruleReference: v.ruleReference, evidenceExcerpt: v.evidenceExcerpt }))
  );
  const additionsMessage = buildAdditionsOnlyMessage(text, contextSummary, firstPassCompact);
  const additionsResult = await callHolisticJudge(client, system, additionsMessage, "القراءة الثانية (إضافات)", 2000);
  const additions = additionsResult.ok && !additionsResult.truncatedEmpty ? additionsResult.violations : [];
  const violations = [...result.violations, ...additions];

  const findings = violations
    .filter((violation) => {
      // بوابة التثبّت: مخالفة دليلها غير موجود حرفياً في النص تُسقط — لا حكم بلا دليل
      if (!evidenceAppearsInText(violation.evidenceExcerpt, text)) {
        console.warn(
          "[semantic] dropped finding with unverifiable evidence:",
          violation.ruleReference,
          violation.evidenceExcerpt.slice(0, 80)
        );
        return false;
      }
      return true;
    })
    .map((violation) => {
      const entry = findKbEntry(violation.ruleReference);
      if (!entry) console.log(`[semantic] no KB entry for "${violation.ruleReference}" — building from violation data`);
      return buildSemanticFinding(violation, entry, profile);
    })
    .filter((f): f is ReviewFinding => f !== null);

  console.log("[semantic] done: findings =", findings.length);
  return { mode: "full", findings };
}
