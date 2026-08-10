// SEMANTIC COMPLIANCE ANALYSIS — HOLISTIC ENGINE
// ONE call to Claude. No rule list passed — Claude uses its full knowledge
// of the 46 professional conduct rules to judge the text holistically.
// Controlled by ANTHROPIC_API_KEY env var.

import { recordUsage } from "@/lib/cost-meter";
import Anthropic from "@anthropic-ai/sdk";
import type { ContentKind, FindingCategory, FindingDomain, ReviewContext, ReviewFinding, RiskLevel } from "@/lib/types";
import { OFFICIAL_CORPUS, type OfficialCorpusItem } from "@/lib/legal-official-corpus";
import { buildOfficialRuleCorpusText } from "@/lib/rule-corpus-text";
import { judgeByRules, type FirstLayerVerdict } from "@/lib/services/corpus-scan";
import { AUTHORITIES_RULE, KINGDOM_STYLE_RULE, PLATFORM_SUPREME_RULE } from "@/lib/governance";
import { LEADERSHIP_PRAISE_RULE } from "@/lib/leadership-praise-rule";
import {
  arabicSeverity,
  businessSeverityForFinding,
  calculateFindingWeight,
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
    context.purpose && `الهدف: ${context.purpose}`,
    context.specialty && `التخصص: ${context.specialty}`,
    context.source && `مصدر الفكرة: ${context.source}`,
    context.topic && `الموضوع المدخل: ${context.topic}`,
    context.sourceHint && `مرجع أشار إليه المستخدم (وجّه تحرّيك للتحقق من دقّته ومصداقيته، ولا تكتفِ به): ${context.sourceHint}`,
    context.verificationBriefing && `نتائج تحقّق حيّ من مصادر موثوقة لإحالات هذا النص — اعتمدها في الحكم على دقّة الإحالات والأرقام: ما ورد فيها «مؤكَّد» لا يُرصد خطأً في الدقّة، وما ورد «غير مطابق» فهو خلل دقّة يُرصد، وما «تعذّر التحقّق» يُعامَل بمعايرة الإحالة (لا تصعيد لمجرّد تعذّر التحقّق):\n${context.verificationBriefing}`
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" | ") : "غير محدد";
}

function buildValidReferencesList(): string {
  // الفهرس من المتن الرسمي نفسه: كل قاعدة سلوك وكل مادة لائحة قابلة للاستشهاد باسمها
  return OFFICIAL_CORPUS
    .map((item) => `- ${item.ref} (${item.sourceDocument})`)
    .join("\n");
}

// بنّاء المتن انتقل إلى lib/rule-corpus-text — مصدر واحد يقرأ منه القاضي
// والكاتب معاً، فلا يكتب الكاتب وهو يجهل ما سيُحاكَم به.
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
function buildHolisticSystem(): string {
  const validRefs = buildValidReferencesList();
  const ruleCorpus = buildOfficialRuleCorpusText();
  return `${PLATFORM_SUPREME_RULE}

أنت العقل الشامل والوحيد للحكم في هذه المنصة: خبير أول في نظام المحاماة، واللائحة التنفيذية لنظام المحاماة ١٤٤٦هـ (90 مادة — متنها الرسمي الكامل مرفق أدناه)، وقواعد السلوك المهني للمحامين (متنها الرسمي الكامل مرفق أدناه)، بخبرة عملية تعادل مدير الإدارة العامة للمحاماة، ومدقق جودة وامتثال محترف. تحكم بعقل قانوني مهني منطقي كخبير بشري — لا بمطابقة كلمات أو أنماط — وتزن المعنى والغرض والأثر على كرامة المهنة كما يفعل خبير حقيقي.
لا توجد طبقة أخرى تحكم أو تكمّل نقصك: الحكم كله إليك وحدك بالمعنى. أي مخالفة تفوتك تُنشر فعلاً، فكن شاملاً ودقيقاً كخبير مسؤول.

## علاقتك بالطبقة الأولى (الحاكمة بالقواعد واللائحة)
يسبق قراءتَك طبقةٌ أولى تعرض نصّ المحامي على المتن الرسمي بنداً بنداً و**تحكم** به. تصلك أحكامها في رسالة المستخدم. وضعها منك:
- **أنت المتحقِّق منها بمعنى النص ونيّة كاتبه: تُثبت أو تصحّح — ولا ثالث.** لا تسكت عن حكم، ولا تمرّره بلا مراجعة.
- **التصحيح يشمل** القاعدة أو البند أو الدليل أو الوصف أو الشدّة — حتى يستقيم الحكم على معنى النص كما هو.
- **ولا تكتب للمستخدم أن حكماً صُحّح**؛ يصله الحكم الصحيح وحده.
- **وخلوّ أحكامها حكمٌ لا فراغ، ولا تحصر نظرك بها إطلاقاً:** المتن الكامل أمامك، ومسؤوليتك عن كل ما في النص كاملةٌ كما لو لم تصلك.

${AUTHORITIES_RULE}
${KINGDOM_STYLE_RULE}

${LEADERSHIP_PRAISE_RULE}

## السياق الثابت
هذه المنصة مخصصة للمحامين المرخصين حصراً. النص الذي سيصلك في رسالة المستخدم كتبه محامٍ ويريد نشره على وسائل التواصل الاجتماعي — سواء كان منشوراً، تغريدة، تعليقاً، رداً، أو إعلاناً.

## كيف تقرأ قبل أن تحكم (سابقٌ على كل ما بعده)
اقرأ النص كإنسان خبير يقرأ كلام زميله، لا كمدقّق يقابل ألفاظاً بألفاظ. وقبل أن تفتح المتن اسأل نفسك بصمت:
1. **ما مقصد كاتبه؟** سمِّ المقصد لنفسك أولاً بفهمك الحر.
2. **كيف يقرؤه جمهوره فعلاً؟** ما الذي سيفهمه القارئ العادي من هذا الكلام — لا ما تحتمله الألفاظ في أضيق معانيها ولا في أبعدها. والاسم أو الوصف الذي يُطلقه الكاتب على نفسه أو على كيان يدعو إليه: بأي صفة سيفهمه الناس؟
3. **ثم احكم**: هل يقع هذا المقصد وهذا الفهم تحت مقصد قاعدة من المتن؟

فالحكم على النص بمقصده لا بألفاظه: النصّ الذي مقصده الإشادة أو الشكر لا يصير مخالفاً لأن فيه لفظاً يشبه لفظ قاعدة؛ والنصّ الذي مقصده سليم في ظاهره يصير مخالفاً إذا كان ما يفهمه الناس منه يقع تحت مقصد قاعدة.

## ما ليس مخالفةً في الامتثال أبداً
الخطأ الإملائي أو النحوي أو ضعف الصياغة أو ركاكة التركيب أو غموض العبارة — **ليست مخالفة مهنية ولا مؤشر امتثال ولا خطراً**، مهما كان موضوع النص، ولها مؤشرها الخاص في المنصة (اللغة). فلا تبنِ على خطأ في اللغة حكماً بمخالفة قاعدة، ولا تجعل ضعف صياغةٍ مساساً بمكانة المهنة أو بثقة الناس بها. المخالفة تكون في **ما قاله الكاتب ومقصده**، لا في **كيف صاغه**.

## أساس الحكم
منطق التحليل مبني حصراً على قواعد السلوك المهني للمحامين واللائحة التنفيذية لنظام المحاماة — احكم بالمعنى والسياق والغرض وفق هذه القواعد، لا بوجود كلمات أو أنماط بعينها.
اقرأ نص كل مادة (المتن الكامل مرفق أدناه)، واستخلص **مقصدها وعلّتها والمصلحة التي تحميها**، ثم احكم على النص بمقصد القاعدة لا بلفظها فقط. المخالفة بالمعنى مخالفة ولو أُعيدت صياغتها أو تجنّبت عبارة بعينها.
**استقصاء الإسناد (بقرار مالكة المنصة — كما تصنع لجنة التأديب)**: الواقعة المخالفة الواحدة تُسند إلى **كل** قاعدة أو مادة ينطبق مقصدها عليها — العامة مع الخاصة، وقاعدة السلوك مع مادة اللائحة متى انطبقتا معاً — ولا تكتفِ بالأخصّ عن العامة: لكل واحدة مدخلة مستقلة بدليلها ووجه انطباق مقصدها هي.
موضوع النص لا يُصنَّف بذاته مخاطرةً — كونه خارج المسائل النظامية ليس مخالفة، ولا قاعدة تمنع المحامي من الكتابة في غيرها. احكم على كل نصّ بمقاصد القواعد واللائحة وحدها أياً كان موضوعه؛ فإن لم يقع تحت مقصد قاعدة من المتن فلا مؤشر. ولا يُشترط وقوع ضرر: القاعدة تُصان بمقصدها.

## الربط الإلزامي بين مخالفة اللائحة والنشر الإلكتروني
كل نص يصلك على هذه المنصة يُراد نشره إلكترونياً (منشور، تغريدة، تعليق، رد، إعلان، ملاحظة توعوية). إن ثبتت مخالفة لمادة من اللائحة التنفيذية، أو حمل النص معلومة قانونية غير صحيحة أو موهمة عن حكم نظامي يخص المحاماة (كالإيحاء بجواز ما هو محظور نظاماً أو العكس)، فهذا في الغالب مخالفة إضافية مستقلة للقاعدة (السابعة والثلاثين) من قواعد السلوك المهني — التي تُلزم المحامي عند مشاركته في وسائل النشر الإلكتروني بالتقيد بالأنظمة والقواعد ذات الصلة (فقرتها الأولى) وبتجنّب أي صورة من صور التضليل أو التزييف (فقرتها الثالثة). لا يصح الاكتفاء باستشهاد واحد بمادة اللائحة وحدها متى كان فعل النشر نفسه يحمل هذه المعلومة الخاطئة أو الموهمة — استشهد بكلا المرجعين معاً حين ينطبقان، فهما مخالفتان مستقلتان بمصلحتين مختلفتين: مخالفة الحكم النظامي ذاته، ومخالفة أصول ممارسة المهنة أثناء النشر.

## تحقق ذاتي إلزامي قبل الإخراج النهائي (ضمن هذه القراءة نفسها — لا قراءة ثانية)
أنت تخرج حكمك مرة واحدة فقط، فيجب أن تكون هذه القراءة الوحيدة شاملة تماماً. قبل أن تكتب مصفوفة الـJSON النهائية، راجع عملك داخلياً بصمت وفق الآتي، ثم أخرج النتيجة المكتملة مباشرة (لا تكتب مراجعتك، اكتفِ بأثرها في القائمة النهائية):
1. لكل مخالفة تنوي تسجيلها: هل لنفس الواقعة أو الدليل مخالفة مقابلة في الوثيقة الأخرى (لائحة ↔ قواعد سلوك) لم تستشهد بها بعد؟ وهل ثمة قاعدة أخرى — عامة أو خاصة — ينطبق مقصدها على الواقعة نفسها ولم تُسرد بعد؟ اسردها (راجع «الربط الإلزامي» و«استقصاء الإسناد» أعلاه). وأعد قراءة شروحك أنت: كل معنى كتبتَه في شرح مخالفة وهو عينُ مقصد قاعدة من المتن (كأن تكتب أن الفعل يمسّ ثقة الناس بالمهنة وفي المتن قاعدة مقصدها صون هذه الثقة) — فتلك القاعدة مخالفةٌ قائمة تُسرد مدخلةً مستقلة بدليلها، ولا يُكتفى بورود معناها ضمن شرح غيرها.
2. امسح النص كاملاً مرة أخيرة من الزوايا الثماني عشرة (الامتثال، المخاطر، الجوانب المهنية، اللغة) — تأكد أنك لم تفوّت شيئاً قبل أن تعتبر القائمة نهائية.
3. تأكد أن كل استشهاد يطابق اسم مرجع ورد حرفياً في فهرس المراجع أدناه، وأن كل دليل منسوخ حرفياً من النص. والمسمّيات في شروحك من المتن الرسمي حصراً: كل إشارة إلى قاعدة أو مادة أو موضوع أو وثيقة تكون بمسمّاها المعتمد كما ورد في المتن — ولا يُخترع مسمّى أو تصنيف لا وجود له فيه.
4. **تحقق المصطلح النظامي (إلزامي — إعمالاً لمعيار الدقة النظامية المعتمد في معايير الكتابة المهنية للمنصة، ونصّه: «استخدام المصطلحات القانونية والمهنية المعتمدة في المملكة» و«عدم استخدام مصطلحات أجنبية أو غير مستخدمة في الأنظمة والممارسة المهنية في المملكة» — وهو يسري على كلامك أنت عن النص كما يسري على النص نفسه، ولا يُكتفى فيه بالنية):** أعد قراءة كل ما كتبتَه أنت (وصف المخالفة، وشرحها، وتعليلها، والبديل الآمن) **لفظاً لفظاً**، واسأل عن كل لفظ تصف به سلوكاً أو واقعة أو أثراً: هل يَرد هذا اللفظ في صياغات أنظمة المملكة ولوائحها بهذا المعنى؟ فإن كان لفظاً إعلامياً أو اجتماعياً دارجاً (ولو شاع وفُهم) فلا تكتفِ بتبديل الكلمة — **أعد صياغة الجملة كاملة** بالمصطلح النظامي المكافئ بما يستقيم به المعنى والتذكير والتأنيث والسياق (مثالاً لا حصراً: «تنمّر» تُعاد «تحقيراً» أو «مساساً بالكرامة» أو «إساءةً» بحسب ما تصفه الواقعة فعلاً). ولا تُخرج نصاً فيه لفظ خارج لغة الأنظمة إطلاقاً. ويُستثنى نقل كلام صاحب النص بنصه داخل حقل الدليل — فهو منقول لا منشأ.
هذا التحقق جزء من نفس التوليد ولا يستدعي أي تفاعل إضافي — أنت مسؤول عن اكتمال حكمك من أول وآخر مرة.

## المهمة
اقرأ النص وحدد هل ينتهك أياً من القواعد الـ46 بشكل مباشر أو غير مباشر.
حكم بفهمك الكامل للقواعد وسياق المهنة — لا تبحث عن كلمات أو أنماط محددة.
إذا لم توجد أي مخالفة — أرجع مصفوفة فارغة [].
وإن ترجّح عندك وقوع الفعل تحت مقصد قاعدة ولم تبلغ اليقين فسجّلها وبيّن سندها ووجه استنباطك.
evidenceExcerpt يجب أن يكون نصاً حرفياً مقتبساً من النص المُعطى — انسخه كما هو دون تعديل أو تلخيص؛ أي مخالفة دليلها غير منسوخ حرفياً من النص تُرفض آلياً.

## قاعدة تحرّي المصادر والمراجع (إلزامية — تُطبَّق على كل نص، بصرف النظر عن إفصاح كاتبه)
لا تنتظر أن يُعلن كاتب النص وجود مرجع أو مادة استند إليها؛ تحرَّ أنت استباقياً في كل نص:
- ارصد كل ادعاء نظامي أو واقعي يحتاج إسناداً (مادة، حكم، رقم، نسبة، إحصاء، واقعة، اسم دراسة أو جهة)، وكل مرجع أو اقتباس ورد في النص صراحةً أو ضمناً — ولو لم يُفصح عنه المستخدم.
- تحقَّق من دقّته ومصداقيته بعلمك القانوني الخبير وبمعيار المصادر المعتمدة وحدها (جهات رسمية حكومية، ومنظمات دولية، ومصادر أكاديمية) — ولا تعتدّ بمصدر غير معتمد (مدونة، منتدى، موقع غير رسمي).
- سجّل ملاحظة صريحة عند أيٍّ مما يلي: ادعاء بلا إسناد كافٍ · معلومة أو رقم أو نسبة غير موثقة · مرجع غير دقيق أو منسوب خطأً · مصدر غير موثوق أو غير معتمد · تعارض مع نص المصدر الرسمي.
- لا تختلق مرجعاً، ولا تؤكّد دقّة ما لا تستطيع التحقق منه؛ وعند تعذّر التحقّق صرّح بذلك في الـ explanation بدل الصمت أو الافتراض.
- معايرة الإحالة النظامية المحددة (رقم مادة أو حكم يمكن الحكم على معقوليته بعلمك الخبير): إذا أورد النص إحالة نظامية محددة وكانت متّسقةً معقولةً في ضوء معرفتك القانونية الخبيرة، فلا تُصعِّدها خطراً لمجرّد تعذّر التحقّق اللحظي من الرقم — تعذّر التحقّق الآني ليس دليل خطأ. صعِّد فقط إذا بدت الإحالة خاطئةً أو منسوبةً لغير موضعها أو غير معقولةٍ في ضوء علمك. أمّا الإحالة المعقولة المتّسقة فأقصى ما تستوجبه — إن اقتضى الأمر — ملاحظة إرشادية لطيفة منخفضة المستوى بالتثبّت من الرقم قبل النشر، لا رفعَ خطورة ولا إدراجَ جهة متضررة.
- إقرار المستخدم بوجود مرجع يُعينك على توجيه التحرّي بدقّة أكبر، لكنه ليس شرطاً: التحرّي يجري دائماً.
- اتّساقاً مع ضابط النسبة العامة الصادقة أعلاه: التعبير العام المحوط الصادق ليس مخالفة — الرصد هنا للتفصيلة المحددة غير الموثقة أو غير الدقيقة، وللمرجع غير الموثوق. وهذه القاعدة تقوية للفحص ولا تُخفّف أي رصد قائم.

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
]

ضابط أسلوب النقد (متّفقٌ عليه — يخص صياغة explanation وadvice ونبرتهما، لا ما يُرصد): اكتبهما بنبرة **تمكين وإرشاد لا ترهيب**، ومراعياً **قناة النشر وإطار المحتوى** (النوع/الجمهور/الهدف/التخصص) فتخاطب المحامي بما يناسب سياق نصه. القناة والإطار يغيّران **كيف يُصاغ النقد** فقط — لا **ما يُرصد** ولا **صرامة الرصد**، فالرصد موحّد صارم في كل القنوات بلا تخفيف.

قيد صارم على explanation و advice (يصلان للمحامي كما هما): ممنوع ذكر أي مصطلح من عُدة المنصة الداخلية — «المرجعية المخزنة»، «خارج المرجعية»، «ضابط الاتساق»، «قفل نطاق المملكة»، «الدستور»، «القاعدة العليا»، «الموجّه» ونحوها — عبّر عن السبب بلغة مهنية قانونية خالصة دون أي إشارة لآليات المنصة وقواعدها الداخلية.`;
}

// الجزء المتغير: نص المستخدم وسياقه — يُرسل طازجاً في كل طلب ولا يُخزَّن.
// يلحق به قسم الطبقة الأولى (البحث الحتمي) حين تُخرج مواضع — ومحلّه رسالة
// المستخدم لا كتلة system المخزّنة مؤقتاً، لأنه يتغيّر بتغيّر النص.
// ★ الفهم المثبّت (بقرار مالكة المنصة): يُحقن في رسالة القاضي فيحكم على فهم
// واحد مثبّت لا على قراءة يعيدها من الصفر كل تشغيل فتتقلّب — وهو ما جعل الثناء
// يُقرأ تشكيكاً مرة ويُبرَّأ مرة.
export function buildUnderstandingBlock(u?: { nature: string; purport: string; formalRegisterRequired: boolean; summary: string }): string {
  if (!u) return "";
  return `\n\nالفهم المثبّت لهذا النص (محسوب قبل الحكم — اعتمده ولا تعِد تكوين فهم مخالف له):\n- طبيعة النص كما فُهمت: ${u.nature}\n- مقصد الكاتب: ${u.purport}\n- ملخصه: ${u.summary}\n★ لا تحكم بخلاف هذا المقصد: فإن كان المقصد ثناءً فلا يُقرأ تشكيكاً ولا طعناً، وإن كان إخباراً فلا يُقرأ ترويجاً. ومجرّد ذكر جهة أو موضوع لا يجعل النص مخالفاً لقاعدة تخصّه — العبرة بتحقق شرط البند نفسه في ألفاظ النص.`;
}

function buildHolisticUserMessage(text: string, contextSummary: string, understandingBlock = ""): string {
  return `${contextSummary !== "غير محدد" ? `السياق الإضافي: ${contextSummary}\n\n` : ""}## النص المراد تحليله
«${text}»${understandingBlock}`;
}

// قراءة ثانية سريعة: تطلب «الإضافات فقط» لا إعادة كتابة القائمة كاملة — الفرق الحاسم
// في السرعة أن مخرَج النموذج (لا مدخَله) هو ما يحدد زمن التوليد؛ مصفوفة فارغة أو صغيرة
// تُكتب خلال ثوانٍ، بخلاف إعادة إخراج كل المخالفات بحقولها وشروحها الكاملة من جديد.
function buildAdditionsOnlyMessage(
  text: string,
  contextSummary: string,
  firstPassCompact: string,
  understandingBlock = ""
): string {
  return `${contextSummary !== "غير محدد" ? `السياق الإضافي: ${contextSummary}\n\n` : ""}## النص المراد تحليله
«${text}»${understandingBlock}

## ما رصدتَه بالفعل في القراءة الأولى (مراجع فقط — لا تُعد ذكرها)
${firstPassCompact}

## مهمتك الآن: تحقق اكتمال سريع — الإضافات فقط
راجع النص مرة أخيرة بحثاً حصراً عن مخالفات **إضافية** لم تظهر أعلاه:
1. لكل مخالفة مذكورة أعلاه: هل لنفس الواقعة أو الدليل مخالفة مقابلة في الوثيقة الأخرى (لائحة ↔ قواعد سلوك) لم تُذكر؟
2. راجع الزوايا الثماني عشرة مرة أخيرة — هل فاتتك مخالفة كاملة لم تظهر إطلاقاً؟
3. أحكام الطبقة الأولى أعلاه (إن وُجدت): راجعها بمعنى النص ونيّة كاتبه — أثبت الصحيح منها وصحّح المخطئ، ولا ثالث. ★ الأصل السلامة: مجرّد أن النص لامس موضوع القاعدة ليس مخالفة.
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
    // توحيد الأرقام العربية والفارسية مع اللاتينية — فلا تُسقط مخالفة لأن النص كتب «٨٤» والاقتباس «84»
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[ً-ْـ]/g, "")
    .replace(/[إأآا]/g, "ا")
    // توحيد حوامل الهمزة (مسؤول ↔ مسئول) كي لا يُسقط فرقٌ إملائي مخالفةً صحيحة
    .replace(/[ؤئ]/g, "ء")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    // تجريد علامات الترقيم والاقتباس — فلا تُسقط مخالفة لفرق فاصلة أو قوس
    .replace(/[«»""''‹›".,،؛؟!:…_|()٪%*{}\[\]\/\\–—-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function evidenceAppearsInText(evidence: string, text: string): boolean {
  const haystack = normalizeForMatch(text);
  // التقسيم على علامة الحذف يجري على النص الخام قبل التطبيع — لأن التطبيع يجرّد «…» و«.»،
  // فلو قسّمنا بعده لالتصقت القصاصتان المنفصلتان وسقطت المخالفة. نقسّم أولاً ثم نطبّع كل قصاصة.
  const segments = evidence
    .split(/…|\.\.\./)
    .map((s) => normalizeForMatch(s))
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

function buildSemanticFinding(
  violation: HolisticViolation,
  profile: ScoringProfile
): ReviewFinding | null {
  if (violation.confidenceLevel === "منخفض") return null;
  const evidence = violation.evidenceExcerpt.trim();
  if (!evidence) return null;

  // الإسناد النظامي كله من المتن الرسمي مباشرة — لا قاعدة معرفة وسيطة.
  const corpusItem = findOfficialCorpusItem(violation.ruleReference);
  const legalKnowledgeEntryId = violation.ruleReference.replace(/\s+/g, "-").replace(/،/g, "");
  const legalReference = violation.ruleReference;
  const sourceDocumentId = corpusItem?.sourceDocumentId ?? DEFAULT_SOURCE_DOCUMENT_ID;
  const sourceDocument = corpusItem?.sourceDocument ?? DEFAULT_SOURCE_DOCUMENT;
  const articleTitle = corpusItem ? `${corpusItem.ref}${corpusItem.section ? ` — ${corpusItem.section}` : ""}` : violation.ruleReference;
  const sourceUrl = corpusItem?.sourceUrl ?? DEFAULT_SOURCE_URL;

  const classification = { category: "التواصل العام" as FindingCategory, domain: "إجرائي" as FindingDomain, potentialImpact: violation.severity };

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
    issue: violation.explanation,
    severity: violation.severity,
    evidence,
    matchedPattern: `[دلالي — ${violation.violationType}]`,
    contentClassification: "إعلان مضلل محتمل" as const,
    advice: violation.advice || "",
    suggestedSaferWording: violation.advice,
    legalCitation: `${sourceDocument}، ${legalReference}`,
    sourceDocument,
    legalReference,
    articleTitle,
    articleTextExcerpt: corpusItem?.text ?? "",
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

// ★ بقرار مالكة المنصة: «لا يُجرَّد — سردهم بتكرارهم أفضل».
// لا يُطوى شيء: كل مؤشر يُسرد كما صدر، ولو تكرّرت القاعدة.
// الطبقة الأولى (البحث الحتمي) لا تُصدر أحكاماً بعد حذف قاعدة المعرفة — ترفع
// مواضع فقط ليحكم عليها القاضي الدلالي بالمعنى؛ الحكم كله من الطبقة الثانية.

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
  maxTokens = 16000
): Promise<HolisticCallOutcome> {
  let message: Awaited<ReturnType<typeof client.messages.create>>;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 150_000);
    try {
      message = await client.messages.create(
        {
          // أعلى مستوى فهم بقرار مالكة المنصة: أقوى نموذج + تفكير تمهيدي قبل الحكم
          model: "claude-opus-5",
          // تنبيه من SDK المثبت: النماذج بعد Opus 4.6 (ومنها Sonnet 5) ترفض أي حرارة
          // غير 1.0 بخطأ 400 — لا يوجد خيار «حرارة صفر» على هذا النموذج، فلا تُضبط.
          thinking: { type: "adaptive" },
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

  recordUsage(message.usage, { stage: "القاضي الدلالي", model: "claude-opus-5" }); // عدّاد التكلفة الداخلي — قياس صرف

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


// ★★ عرض حكم الطبقة الأولى على الثانية (بقرار مالكة المنصة): «الأولى تحكم على
// النص بالقواعد واللائحة، والثانية تتحقق وتراجع معنى النص والنية فتُثبت الحكم
// أو تصححه». وليس لها ثالث: لا إسقاط ولا إهمال — كل حكم يخرج مُثبَتاً أو مُصحَّحاً.
function buildFirstLayerBlock(verdicts: FirstLayerVerdict[]): string {
  if (verdicts.length === 0) {
    // بلا أحكام من الأولى: الثانية تتحقق بمنهجها كاملاً — لا تُكمَّم ولا تُدفَع
    return "\n\n## حكم الطبقة الأولى\nعرضت الطبقة الأولى النصَّ على القواعد واللائحة ولم تُخرج مخالفة. تحقَّق أنت من النص بمعناه ونيّة كاتبه وفق منهجك كاملاً: فإن وجدت مخالفة بمقصد قاعدةٍ أو مادة فاحكم بها بمرجعها ودليلها الحرفي — حكمُ الأولى لا يقيّدك؛ أنت المتحقِّق.";
  }
  const items = verdicts
    .map(
      (v, i) =>
        `${i + 1}. ${v.ruleReference}${v.clause ? ` — البند: ${v.clause}` : ""}\n` +
        `   الدليل من نص المحامي: «${v.evidence}»\n` +
        `   تعليل الطبقة الأولى: ${v.reason}`
    )
    .join("\n");
  return `\n\n## أحكام الطبقة الأولى — راجعها بمعنى النص والنية\nهذه أحكامٌ صدرت بعرض النص على القواعد واللائحة بنداً بنداً. **مهمتك مراجعتها بمعنى النص ونيّة كاتبه: تُثبت أو تصحّح — ولا ثالث**:\n- إن صحّ الحكم: أثبته وأخرجه مخالفةً بمرجعه ودليله.\n- وإن أخطأ: صحّحه — بتصويب القاعدة أو البند أو الدليل أو الوصف أو الشدّة، حتى يستقيم على معنى النص.\n- **وتحقّق خاصةً من نسبة الحكم إلى قاعدته**: هل معنى القاعدة المُسمّاة يقع فعلاً على هذه المخالفة؟ فإن كانت المخالفة قائمة والقاعدة المُسمّاة عن موضوع آخر، فصحّح النسبة إلى القاعدة الصحيحة من المتن الرسمي — الحكم الصحيح بقاعدة خاطئة حكمٌ لم يستقم بعد.\n- ولا تكتب للمستخدم أن حكماً صُحّح؛ يصله الحكم الصحيح وحده.\n\n${items}`;
}

export async function runSemanticAnalysis(
  text: string,
  context: ReviewContext | undefined,
  contentKind?: ContentKind
): Promise<SemanticAnalysisResult> {
  const profile = resolveScoringProfile(contentKind ?? ("post" as ContentKind), context?.channel);
  const contextSummary = buildContextSummary(context);

  // الطبقة الأولى تحكم بعرض النص على المتن، ولا تبني ReviewFinding بذاتها:
  // حكمها يُعرض على الثانية فتُثبته أو تصححه، والمخرج النهائي منها وحدها.
  const rawBaseFindings: ReviewFinding[] = [];

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[semantic] ANTHROPIC_API_KEY missing — لا يمكن الحكم بلا القاضي الدلالي");
    return { mode: "pattern-only", findings: rawBaseFindings, degradedReason: "missing-key" };
  }

  // ═══ الطبقة الأولى — تحكم على النص بالقواعد واللائحة ═══
  const firstLayer = await judgeByRules(text);
  console.log("[layer1] أحكام الطبقة الأولى =", firstLayer?.length ?? "تعذّرت");
  const firstLayerBlock = firstLayer ? buildFirstLayerBlock(firstLayer) : "";

  const client = new Anthropic({ apiKey });
  const system = buildHolisticSystem();
  const understandingBlock = buildUnderstandingBlock(context?.understanding);
  const userMessage = buildHolisticUserMessage(text, contextSummary, understandingBlock + firstLayerBlock);

  const result = await callHolisticJudge(client, system, userMessage, "القراءة الأولى");
  if (!result.ok) {
    return { mode: "pattern-only", findings: rawBaseFindings, degradedReason: result.reason };
  }
  // انقطع الجواب بلا أي مخالفة مكتملة: لا يُدّعى الامتثال — فشل مغلق
  if (result.truncatedEmpty) {
    return { mode: "pattern-only", findings: rawBaseFindings, degradedReason: "api-error" };
  }

  // قراءة ثانية سريعة (إضافات فقط): تسد فجوة التذكّر التي قد تفوت القراءة الواحدة —
  // مخرَجها صغير عادة (فارغ أو مخالفة أو اثنتان) فتنتهي خلال ثوانٍ، بخلاف إعادة كتابة
  // القائمة كاملة. فشلها أو انقطاعها لا يُسقط نتيجة القراءة الأولى الصالحة أصلاً.
  const firstPassCompact = JSON.stringify(
    result.violations.map((v) => ({ ruleReference: v.ruleReference, evidenceExcerpt: v.evidenceExcerpt }))
  );
  const additionsMessage = buildAdditionsOnlyMessage(text, contextSummary, firstPassCompact, understandingBlock + firstLayerBlock);
  const additionsResult = await callHolisticJudge(client, system, additionsMessage, "القراءة الثانية (إضافات)", 2000);
  const additions = additionsResult.ok && !additionsResult.truncatedEmpty ? additionsResult.violations : [];
  const allViolations = [...result.violations, ...additions];

  const violations = allViolations;

  const semanticFindings = violations
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
    .map((violation) => buildSemanticFinding(violation, profile))
    .filter((f): f is ReviewFinding => f !== null);

  const findings = [...rawBaseFindings, ...semanticFindings];

  console.log("[semantic] done: findings =", findings.length);
  return { mode: "full", findings };
}
