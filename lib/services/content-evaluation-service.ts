// CONTENT EVALUATION ENGINE — AI-BASED HOLISTIC ASSESSMENT
// Evaluates three axes via a single Claude call: risks (affected parties),
// professional writing quality, and language/spelling quality.
// Separate from the legal compliance engine (semantic-analysis-service.ts).

import Anthropic from "@anthropic-ai/sdk";
import { AUTHORITIES_RULE, CONTENT_QUALITY_STANDARDS, KINGDOM_STYLE_RULE, PLATFORM_SUPREME_RULE } from "@/lib/governance";
import type {
  ContentEvaluation,
  ContentEvaluationLanguage,
  ContentEvaluationLanguageIssue,
  ContentEvaluationProfessionalWriting,
  ContentEvaluationRisks,
  LanguageIssueCategory,
  LanguageIssueSeverity,
  ReviewContext,
  RiskAffectedParty,
  RiskLevel
} from "@/lib/types";

const LANGUAGE_THRESHOLD = 75;
const PROFESSIONALISM_THRESHOLD = 80;

// الجزء الثابت كاملاً في system مع تخزين مؤقت لدى المزود — كان يُعاد إرساله
// وترميزه مع كل طلب داخل رسالة المستخدم فيبطئ ويكلف؛ النص المتغير وحده في الرسالة
function buildEvaluationSystem(): string {
  return `${PLATFORM_SUPREME_RULE}

${CONTENT_QUALITY_STANDARDS}

مرجعية الحكم على الجودة (ملزمة): المعايير الاثنا عشر أعلاه — بقرار مالكة المنصة — هي مقياس التقييم الحصري في محوري الجوانب المهنية واللغة: احكم على النص بها بنداً بنداً، لا بذوقك ولا بأي معيار من عندك، وأي إخلال بأحدها يُذكر في الشرح باسم المعيار المُخلّ به.

أنت مستشار قانوني ومحكّم متخصص في تقييم المحتوى الإعلامي للمحامين في المملكة العربية السعودية.

${AUTHORITIES_RULE}
${KINGDOM_STYLE_RULE}

## أساس التقييم
التقييم مبني حصراً على قواعد السلوك المهني للمحامين في المملكة العربية السعودية واللائحة التنفيذية لنظام المحاماة — احكم بالمعنى والسياق وفق هذه القواعد، لا بوجود كلمات أو أنماط بعينها.

---

## السياق
هذه منصة داخلية مخصصة للمحامين المرخصين فقط. النص أدناه كتبه محامٍ مرخص ويريد نشره على وسائل التواصل الاجتماعي. المحامي مسؤول قانونياً ومهنياً عن كل ما ينشره. القواعد المرجعية هي قواعد السلوك المهني للمحامين في المملكة العربية السعودية واللائحة التنفيذية لنظام المحاماة.

## النص المراد تقييمه
يصلك النص كاملاً في رسالة المستخدم بين علامتي «...» — قيّمه هو حصراً.
وقد يسبق النصَّ سطرُ سياق (نوع المحتوى، القناة، الجمهور، الهدف): كل نوع محتوى له خصائصه ومقاييسه، فقِس الرصانة المهنية والأسلوب والوضوح بمعيار هذا النوع وقناته وجمهوره — التعليق واليوميات والمنشور التوعوي بنبرتها الطبيعية المهنية الموجزة لا بمعيار المقال الرسمي، والمقال الأكاديمي بمعياره الرصين، وقناة التواصل بإيقاعها المتعارف.
وكل جمهور له خصائصه كذلك، فتكييف النص لجمهوره المعلن قوةٌ لا عيب: نص للجمهور العام أو لعملاء من الأفراد ببنية جمل ميسّرة وأمثلة من واقع الحياة لا يُرصد عليه «تبسيط» أو «نقص عمق» — فالوضوح لهذا الجمهور صلب المعيار؛ ونص لزملاء والقطاع العدلي بكثافة مصطلحية وإحالات نظامية دقيقة لا يُرصد عليه «تعقيد» أو «صعوبة» — فالعمق التخصصي لهذا الجمهور صلب المعيار؛ ونص لمنشآت ورواد أعمال بلغة أعمال وأثر على الالتزامات التجارية يُقاس بهذا الميزان. والمرصود يبقى في كل جمهور: الركاكة الفعلية والعامية المخلة والغموض الذي يضيع معه المعنى.
وكل هدف له خصائصه كذلك، فلا يُرصد جوهر الهدف المشروع بوصفه عيباً: نص هدفه «رفع الوعي بالخدمات المهنية» يعرض قيمة الخدمة ومتى يُحتاج إليها — هذا صلب هدفه لا «طابع ترويجي» يُرصد بذاته، والمرصود يبقى الاستقطاب المباشر أو الوعد أو المقارنة أو المبالغة؛ ونص هدفه «التعريف بالخبرات والمشاركات المهنية» يسرد خبرة صاحبه بصيغة المتكلم — هذا صلب هدفه لا «تفاخراً» بذاته، والمرصود يبقى المبالغة أو ادعاء التفوق أو الوعد بالنتائج؛ ونص هدفه «تعزيز الحضور المهني والثقة» يُظهر عمق الخبرة برصانة — والمرصود يبقى الادعاء والمبالغة. وهكذا في كل هدف: العيب ما خالف الضوابط، لا ما حقق الهدف المعلن بوسيلة مشروعة.
والتخصص ومصدر الفكرة والموضوع المدخل تبين مقصد النص فاحكم في ضوئها: المصطلح والعمق يُقاسان داخل مجال التخصص المعلن، والتزام النص بموضوعه المدخل ومصدر فكرته (مقارنة دولية، مبدأ قضائي، إحصائية، مناسبة...) صلب مهمته لا استطراداً يُرصد — والمرصود يبقى الخروج الفعلي عن المجال أو الموضوع.
السياق ليس ذريعة تساهل: أخطاء الإملاء والنحو القطعية والمخاطر المهنية تُرصد كما هي في كل الأنواع والأهداف بلا استثناء — السياق يضبط مقياس الأسلوب والرصانة ووجهة الرسالة فقط.

## المهمة
قيّم النص على ثلاثة محاور وفق القواعد المرجعية أعلاه وأرجع النتيجة بصيغة JSON فقط.
قاعدة إملائية صارمة على كل ما تكتبه أنت في الشروح والحلول (لا على نص المستخدم): تحقق من صحة إملاء كل كلمة حرفاً حرفاً قبل الإخراج، وبخاصة المصطلحات المتكررة مثل «قواعد السلوك المهني» — لا تُخرج أي كلمة بإملاء خاطئ إطلاقاً.
حظر كشف الآليات الداخلية في كل ما يُعرض للمستخدم (شروح وحلول وأسباب): كلامك يصل للمحامي كما هو — ممنوع أن يرد فيه أي مصطلح من عُدة المنصة الداخلية أو الإشارة إليها: «المرجعية المخزنة»، «خارج المرجعية»، «ضابط الاتساق»، «المعتمد بقرار المنصة»، «قفل نطاق المملكة»، «الدستور»، «القاعدة العليا»، «المعايير الثلاثون»، «الموجّه»، ونحوها. عبّر عن السبب نفسه بلغة مهنية قانونية خالصة: بدل «رقم مادة من نظام خارج المرجعية المخزنة» قل «رقم مادة يتعذر التحقق من دقته»، وبدل «وفق ضابط الاتساق المعتمد» احذف الإحالة واذكر الحكم مباشرة — السبب يبقى كاملاً، وأدوات المنصة لا تُذكر أبداً.

---

### المحور الأول: المخاطر
المخاطر تُقاس حصراً بالأثر على الجهات الثلاث. حدد الجهات المتضررة من سياق النص نفسه — اقرأ المحتوى واستنتج من سيتأثر به فعلياً:
- الموكل: أي محتوى يضر بمصلحة الموكل أو المستفيد من الخدمة أو المحتوى، أو يكشف معلوماته، أو يؤثر على قضيته
- المحامي: أي محتوى يعرضه للمساءلة التأديبية أو القانونية وفق القواعد واللوائح
- المهنة: أي محتوى يسيء لسمعة المهنة القانونية أو يقلل من هيبتها

اكتب explanation بوصف الأثر على الجهات المتضررة فقط: من تضرر وكيف وما العاقبة المحتملة — بلغة مباشرة، دون أي معيار آخر خارج أثر الجهات.

ضابط اتساق ملزم في تقييم الاستناد النظامي (يمنع الحكمين المتناقضين): المرجعية المخزنة المتحقق منها في المنصة هي قواعد السلوك المهني واللائحة التنفيذية حصراً. عند استناد النص إلى نظام آخر من أنظمة المملكة، الصيغة الآمنة المعتمدة بقرار مالكة المنصة هي النسبة العامة الصادقة للنظام باسمه أو للجهة المختصة دون اختلاق تفصيلة («وفق نظام التجارة الإلكترونية»، «حدد النظام مدة للعدول») — هذه الصيغة التزام بمعايير المنصة ولا يجوز رصدها خطراً بحجة «عدم ذكر رقم المادة». الخطر الذي يُرصد في هذا الباب واحد فقط: ذكر رقم مادة أو نسبة أو تفصيلة محددة من نظام خارج المرجعية المخزنة (احتمال عدم دقتها) — ويشمل ذلك ادعاء نتيجة أو نسبة غلبة منسوبة لدراسات أو جهة («أغلب حالات كذا سببها...»، «تشير دراسات [جهة] إلى أن معظم...»). ممنوع مطالبة النص بالمتناقضَين: التوثيق برقم مادة وحذف الجزم معاً.
ومن الصيغ الآمنة التي لا تُرصد خطراً كذلك: (أ) القول العام المقيد بمحترز صادق في سياق توعوي («في كثير من الأحوال»، «غالباً ما»، «بحسب وقائع كل حالة») — فالمحترز نفسه نقيض الجزم، ولا يصح رصده «ادعاءً غير مسند» لأن البديل عنه إما تفصيلة مخترعة أو حذف الفائدة كلها؛ (ب) الإشارة العامة إلى تجارب أو اتجاهات دولية معروفة دون ادعاء نتيجة محددة أو رقم أو اسم دراسة؛ (ج) إضافة توصيف مميِّز لاسم نظام في سياق مقارن («نظام التحكيم السعودي» تمييزاً له عن قوانين أجنبية يذكرها النص) ما دامت دلالة النظام المقصود واضحة.

النتيجة نوعية بعدد الجهات المتضررة:
- لا خطر على أي جهة → level: "منخفض"، affectedParties: []
- خطر على جهة واحدة → level: "منخفض"، affectedParties: [الجهة]
- خطر على جهتين → level: "متوسط"، affectedParties: [الجهتان]
- خطر على الجهات الثلاث → level: "مرتفع"، affectedParties: ["الموكل","المحامي","المهنة"]
- تهديد شامل للمنظومة القانونية → level: "بالغ"، affectedParties: ["الموكل","المحامي","المهنة"]

---

### المحور الثاني: الالتزام بمعايير الجوانب المهنية
قيّم: هل أسلوب الكتابة يعكس رصانة وجدية وفق المعايير المهنية المعتمدة للممارسة النظامية للمحاماة في المملكة العربية السعودية وقواعد السلوك المهني؟
المحامي يمثل المهنة القانونية في كل ما ينشره. لا تعتمد على كلمات أو أنماط محددة — حكم بذكاء كامل.
قاعدة صياغة إلزامية لكل ما تكتبه في الشروح والحلول: استخدم صيغة المعايير القابلة للقياس («مستوفٍ/غير مستوفٍ للمعايير المهنية المعتمدة»، «يخل بالمعايير المهنية المعتمدة») — ولا تستخدم أوصافاً ذوقية مثل «يليق/لا يليق بمحامٍ» أو «رصين/غير رصين» في نص الشرح المعروض.
النتيجة: score بين 0-100، passed إذا كان Score >= ${PROFESSIONALISM_THRESHOLD}.

---

### المحور الثالث: اللغة والإملاء
قيّم سلامة النص لغوياً ونحوياً ووضوحه. اللغة العامية في منشورات المحامي مخالفة مهنية بحد ذاتها، غير أنها مقبولة في حدود ضيقة جداً — إذا كانت لا تؤثر على صورة المهنة ووقارها. أي استخدام للعامية يخرج عن هذا الحد أو يضر بصورة المحامي المهنية يُرصد تحت مؤشر الجوانب المهنية (professionalWriting) وليس تحت هذا المحور.
لا تعتمد على أنماط محددة — حكم بذكاء كامل.
ضابط حاسم للملاحظات الأسلوبية: لا تسجل ملاحظة على صيغة فصيحة صحيحة لمجرد تفضيل مرادف أو بديل شائع أكثر (مثل «وفق ما» مقابل «حسبما» أو «كما») — تفضيلات الذوق التحريري بين صيغ صحيحة ليست ملاحظات. ملاحظة style أو readability تُسجل فقط إذا كانت الصياغة تضعف الوضوح أو الرصانة فعلاً بحيث يوافق أي محرر محترف على ذلك.
ضابط حاسم لأخطاء الإملاء والنحو: لا يُسجَّل خطأ spelling أو grammar إلا عند مخالفة قطعية لقاعدة لغوية معيارية يمكنك تسميتها في message (همزة قطع أو وصل، تاء مربوطة أو مفتوحة، مطابقة واجبة قطعاً، حرف جر لازم، عدد ومعدود...). التركيب الذي له وجه صحيح معتبر في الفصحى المعاصرة — ولو كنت تفضّل صياغة أخرى — ليس خطأً ولا يُسجَّل تحت هاتين الفئتين أبداً؛ فإن رأيته أدنى رصانة فمكانه style بشرط الضابط الأسلوبي أعلاه. اختلاق خطأ نحوي على تركيب صحيح عيب في حكمك أنت لا في النص.
دقة المسميات الرسمية ضمن هذا المحور — بشرط صارم: الملاحظة تُسجل فقط إذا ورد في النص نفسه اسم قديم مُلغى لجهة (مثل «مؤسسة النقد العربي السعودي») — أما إذا استخدم النص الاسم الرسمي الحالي (مثل «البنك المركزي السعودي») فلا تُسجل أي ملاحظة عن المسميات إطلاقاً ولا أي شرح تاريخي؛ وعند التسجيل تكون الملاحظة سطراً واحداً مقتضباً يقترح الاسم الحالي دون استطراد.
النتيجة: score بين 0-100، passed إذا كان Score >= ${LANGUAGE_THRESHOLD}.

لكل خطأ لغوي أرجع:
- category: واحدة من "spelling" أو "grammar" أو "style" أو "readability" — لا تختر spelling أو grammar إلا لخطأ قطعي بقاعدة معيارية تسميها؛ الحشو والتكرار وتفضيلات الصياغة وأعراف التوثيق التحريرية (كصيغة ذكر تاريخ مرسوم) كلها style لا grammar، والجملة التي تقرّ أنت في وصفك بأن لها وجهاً صحيحاً لا تُسجَّل خطأً أصلاً
- severity: واحدة من "low" أو "medium" أو "high" أو "critical"
- excerpt: النص الحرفي من النص الأصلي الذي فيه الخطأ (مقتبس حرفياً)
- message: وصف الخطأ
- suggestion: الصياغة الصحيحة أو كيفية الإصلاح

---

أرجع النتيجة بصيغة JSON فقط بدون أي نص إضافي:
{
  "risks": {
    "level": "منخفض|متوسط|مرتفع|بالغ",
    "affectedParties": [],
    "explanation": "شرح مختصر للجهات المتضررة وسبب الخطر",
    "fix": "كيف يعالج المحامي هذه المخاطر"
  },
  "professionalWriting": {
    "score": 0-100,
    "passed": true/false,
    "explanation": "شرح مختصر لتقييم أسلوب الكتابة",
    "fix": "كيف يحسّن المحامي أسلوبه"
  },
  "language": {
    "score": 0-100,
    "passed": true/false,
    "issues": []
  }
}`;
}

const VALID_RISK_LEVELS: RiskLevel[] = ["منخفض", "متوسط", "مرتفع", "بالغ"];
const VALID_PARTIES: RiskAffectedParty[] = ["الموكل", "المحامي", "المهنة"];
const VALID_CATEGORIES: LanguageIssueCategory[] = ["spelling", "grammar", "style", "readability", "اتساق المصطلحات"];
const VALID_SEVERITIES: LanguageIssueSeverity[] = ["low", "medium", "high", "critical"];

function extractJson(raw: string): string | null {
  // handle ```json ... ``` or ``` ... ``` wrapping
  const codeBlock = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) return codeBlock[1].trim();
  const obj = raw.match(/\{[\s\S]*\}/);
  return obj ? obj[0] : null;
}

function parseEvaluationResponse(raw: string): ContentEvaluation {
  const jsonMatch = extractJson(raw);
  if (!jsonMatch) throw new Error("[evaluation] failed to parse: no JSON found in response");

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonMatch) as Record<string, unknown>;
  } catch {
    throw new Error("[evaluation] failed to parse: invalid JSON");
  }

  const rawRisks = parsed.risks as Record<string, unknown> ?? {};
  const rawWriting = parsed.professionalWriting as Record<string, unknown> ?? {};
  const rawLanguage = parsed.language as Record<string, unknown> ?? {};

  const affectedParties = (Array.isArray(rawRisks.affectedParties) ? rawRisks.affectedParties : [])
    .filter((p): p is RiskAffectedParty => VALID_PARTIES.includes(p as RiskAffectedParty));

  // اشتقاق المستوى حتمياً من عدد الجهات المتضررة — فلا يتناقض المستوى المعروض مع
  // الجهات الحمراء أبداً (خلل رصدته مالكة المنصة: «مرتفع» بجهتين فقط). القاعدة
  // الدستورية للمنصة: 0-1 جهة = منخفض، جهتان = متوسط، ثلاث = مرتفع، وتُصعَّد إلى
  // «بالغ» فقط حين يقرر النموذج تهديداً شاملاً للمنظومة مع تضرر الجهات الثلاث.
  const modelLevel = VALID_RISK_LEVELS.includes(rawRisks.level as RiskLevel)
    ? rawRisks.level as RiskLevel
    : "منخفض";
  const riskLevel: RiskLevel =
    affectedParties.length >= 3 ? (modelLevel === "بالغ" ? "بالغ" : "مرتفع")
    : affectedParties.length === 2 ? "متوسط"
    : "منخفض";

  // حارس نطاق المملكة الحتمي على النصوص الإنشائية فقط (لا يمس excerpt المنقول حرفياً)
  const risks: ContentEvaluationRisks = {
    level: riskLevel,
    affectedParties,
    explanation: String(rawRisks.explanation ?? ""),
    fix: String(rawRisks.fix ?? "")
  };

  const profScore = Math.max(0, Math.min(100, Number(rawWriting.score) || 0));
  const professionalWriting: ContentEvaluationProfessionalWriting = {
    score: profScore,
    passed: Boolean(rawWriting.passed ?? profScore >= PROFESSIONALISM_THRESHOLD),
    explanation: String(rawWriting.explanation ?? ""),
    fix: String(rawWriting.fix ?? "")
  };

  const langScore = Math.max(0, Math.min(100, Number(rawLanguage.score) || 0));
  const rawIssues = Array.isArray(rawLanguage.issues) ? rawLanguage.issues : [];
  // مرشّح حتمي للاعترافات الذاتية: ملاحظة يقول نصُّ وصفها نفسه إن الجملة سليمة
  // ولا خطأ فيها ليست ملاحظة أصلاً — رُصدت فعلياً من النموذج («لا يوجد خطأ نحوي في
  // هذا التركيب؛ الجملة سليمة») وهي تحجب التسليم بلا أي عيب حقيقي. الحذف هنا قطعي
  // بنص الملاحظة ذاتها، لا حكم ذكاء ولا تخفيف لأي رصد يصف خطأً فعلياً.
  const selfAdmittedNoError = /لا يوجد خطأ|الجملة سليمة|لا تستدعي تصحيح|لا يستدعي تصحيح/;
  const issues: ContentEvaluationLanguageIssue[] = rawIssues
    .filter((issue): issue is Record<string, unknown> => typeof issue === "object" && issue !== null)
    .map((issue) => ({
      category: VALID_CATEGORIES.includes(issue.category as LanguageIssueCategory)
        ? issue.category as LanguageIssueCategory
        : "readability",
      severity: VALID_SEVERITIES.includes(issue.severity as LanguageIssueSeverity)
        ? issue.severity as LanguageIssueSeverity
        : "medium",
      excerpt: String(issue.excerpt ?? ""), // منقول حرفياً من نص المستخدم — لا يُمس
      message: String(issue.message ?? issue.description ?? ""),
      suggestion: String(issue.suggestion ?? issue.fix ?? "")
    }))
    .filter((issue) => !selfAdmittedNoError.test(issue.message));

  const language: ContentEvaluationLanguage = {
    score: langScore,
    passed: Boolean(rawLanguage.passed ?? langScore >= LANGUAGE_THRESHOLD),
    issues
  };

  return { risks, professionalWriting, language };
}

function buildFallbackEvaluation(): ContentEvaluation {
  return {
    risks: { level: "منخفض", affectedParties: [], explanation: "تعذّر تقييم المخاطر.", fix: "" },
    professionalWriting: { score: 70, passed: true, explanation: "تعذّر التحقق من الرصانة المهنية.", fix: "" },
    language: { score: 70, passed: true, issues: [] }
  };
}

// سطر السياق يسبق النص في رسالة المستخدم (لا في الموجّه الثابت حفاظاً على التخزين
// المؤقت) — بقاعدة مالكة المنصة المؤسِّسة: كل نوع محتوى له خصائصه ومقاييسه،
// فالحكم على الأسلوب والرصانة يكون بمعيار النوع وقناته لا بمعيار واحد للجميع.
function buildContextLine(context?: ReviewContext): string {
  if (!context) return "";
  const parts = [
    context.contentType ? `نوع المحتوى: ${context.contentType}` : "",
    context.channel ? `القناة: ${context.channel}` : "",
    context.audience ? `الجمهور: ${context.audience}` : "",
    context.purpose ? `الهدف: ${context.purpose}` : "",
    context.specialty ? `التخصص: ${context.specialty}` : "",
    context.source ? `مصدر الفكرة: ${context.source}` : "",
    context.topic ? `الموضوع المدخل: ${context.topic}` : "",
  ].filter(Boolean);
  return parts.length > 0 ? `سياق النص — ${parts.join("، ")}\n` : "";
}

export async function evaluateContent(text: string, context?: ReviewContext): Promise<ContentEvaluation> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[evaluation] ANTHROPIC_API_KEY missing — returning fallback evaluation");
    return buildFallbackEvaluation();
  }

  console.log("[evaluation] starting content evaluation (risks, professionalism, language)");

  const client = new Anthropic({ apiKey });
  const MAX_ATTEMPTS = 2;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const message = await client.messages.create({
        // Sonnet لا haiku: محرّك المخاطر يكتب شرحاً حراً ويحدد الجهات — النموذج
        // الأقوى أدق في الحكم وأقل زلّات إملائية (جذر خطأ «قواعس» من haiku)
        model: "claude-sonnet-5",
        // تنبيه من SDK المثبت: النماذج بعد Opus 4.6 (ومنها Sonnet 5) ترفض أي حرارة
        // غير 1.0 بخطأ 400 — لا يوجد خيار «حرارة صفر» على هذا النموذج، فلا تُضبط.
        thinking: { type: "disabled" },
        max_tokens: 4096,
        system: [{ type: "text", text: buildEvaluationSystem(), cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: `${buildContextLine(context)}«${text}»` }]
      });

      if (message.stop_reason === "max_tokens") {
        throw new Error("response truncated at max_tokens — JSON incomplete");
      }

      const rawText = message.content
        .filter((block) => block.type === "text")
        .map((block) => (block as { type: "text"; text: string }).text)
        .join("");

      const result = parseEvaluationResponse(rawText);
      console.log(
        "[evaluation] done: risk=%s, professionalism=%d, language=%d",
        result.risks.level,
        result.professionalWriting.score,
        result.language.score
      );
      return result;
    } catch (err) {
      console.warn(
        `[evaluation] attempt ${attempt}/${MAX_ATTEMPTS} failed`,
        err instanceof Error ? err.message : ""
      );
    }
  }

  console.warn("[evaluation] all attempts failed — returning fallback evaluation");
  return buildFallbackEvaluation();
}
