// CONTENT EVALUATION ENGINE — AI-BASED HOLISTIC ASSESSMENT
// Evaluates three axes via a single Claude call: risks (affected parties),
// professional writing quality, and language/spelling quality.
// Separate from the legal compliance engine (semantic-analysis-service.ts).

import Anthropic from "@anthropic-ai/sdk";
import { AUTHORITIES_RULE, KINGDOM_STYLE_RULE } from "@/lib/governance";
import { sanitizeKingdom } from "@/lib/kingdom-guard";
import type {
  ContentEvaluation,
  ContentEvaluationLanguage,
  ContentEvaluationLanguageIssue,
  ContentEvaluationProfessionalWriting,
  ContentEvaluationRisks,
  LanguageIssueCategory,
  LanguageIssueSeverity,
  RiskAffectedParty,
  RiskLevel
} from "@/lib/types";

const LANGUAGE_THRESHOLD = 75;
const PROFESSIONALISM_THRESHOLD = 80;

function buildEvaluationPrompt(text: string): string {
  return `أنت مستشار قانوني ومحكّم متخصص في تقييم المحتوى الإعلامي للمحامين في المملكة العربية السعودية.

${AUTHORITIES_RULE}
${KINGDOM_STYLE_RULE}

## أساس التقييم
التقييم مبني حصراً على قواعد السلوك المهني للمحامين في المملكة العربية السعودية واللائحة التنفيذية لنظام المحاماة — احكم بالمعنى والسياق وفق هذه القواعد، لا بوجود كلمات أو أنماط بعينها.

---

## السياق
هذه منصة داخلية مخصصة للمحامين المرخصين فقط. النص أدناه كتبه محامٍ مرخص ويريد نشره على وسائل التواصل الاجتماعي. المحامي مسؤول قانونياً ومهنياً عن كل ما ينشره. القواعد المرجعية هي قواعد السلوك المهني للمحامين في المملكة العربية السعودية واللائحة التنفيذية لنظام المحاماة.

## النص المراد تقييمه
«${text}»

## المهمة
قيّم النص على ثلاثة محاور وفق القواعد المرجعية أعلاه وأرجع النتيجة بصيغة JSON فقط.
قاعدة إملائية صارمة على كل ما تكتبه أنت في الشروح والحلول (لا على نص المستخدم): تحقق من صحة إملاء كل كلمة حرفاً حرفاً قبل الإخراج، وبخاصة المصطلحات المتكررة مثل «قواعد السلوك المهني» — لا تُخرج أي كلمة بإملاء خاطئ إطلاقاً.

---

### المحور الأول: المخاطر
المخاطر تُقاس حصراً بالأثر على الجهات الثلاث. حدد الجهات المتضررة من سياق النص نفسه — اقرأ المحتوى واستنتج من سيتأثر به فعلياً:
- الموكل: أي محتوى يضر بمصلحة الموكل أو المستفيد من الخدمة أو المحتوى، أو يكشف معلوماته، أو يؤثر على قضيته
- المحامي: أي محتوى يعرضه للمساءلة التأديبية أو القانونية وفق القواعد واللوائح
- المهنة: أي محتوى يسيء لسمعة المهنة القانونية أو يقلل من هيبتها

اكتب explanation بوصف الأثر على الجهات المتضررة فقط: من تضرر وكيف وما العاقبة المحتملة — بلغة مباشرة، دون أي معيار آخر خارج أثر الجهات.

النتيجة نوعية بعدد الجهات المتضررة:
- لا خطر على أي جهة → level: "منخفض"، affectedParties: []
- خطر على جهة واحدة → level: "منخفض"، affectedParties: [الجهة]
- خطر على جهتين → level: "متوسط"، affectedParties: [الجهتان]
- خطر على الجهات الثلاث → level: "مرتفع"، affectedParties: ["الموكل","المحامي","المهنة"]
- تهديد شامل للمنظومة القانونية → level: "بالغ"، affectedParties: ["الموكل","المحامي","المهنة"]

---

### المحور الثاني: الالتزام بمعايير الجوانب المهنية
قيّم: هل أسلوب الكتابة يعكس رصانة وجدية تليق بمحامٍ مرخص وفق قواعد السلوك المهني؟
المحامي يمثل المهنة القانونية في كل ما ينشره. لا تعتمد على كلمات أو أنماط محددة — حكم بذكاء كامل.
النتيجة: score بين 0-100، passed إذا كان Score >= ${PROFESSIONALISM_THRESHOLD}.

---

### المحور الثالث: اللغة والإملاء
قيّم سلامة النص لغوياً ونحوياً ووضوحه. اللغة العامية في منشورات المحامي مخالفة مهنية بحد ذاتها، غير أنها مقبولة في حدود ضيقة جداً — إذا كانت لا تؤثر على صورة المهنة ووقارها. أي استخدام للعامية يخرج عن هذا الحد أو يضر بصورة المحامي المهنية يُرصد تحت مؤشر الجوانب المهنية (professionalWriting) وليس تحت هذا المحور.
لا تعتمد على أنماط محددة — حكم بذكاء كامل.
ضابط حاسم للملاحظات الأسلوبية: لا تسجل ملاحظة على صيغة فصيحة صحيحة لمجرد تفضيل مرادف أو بديل شائع أكثر (مثل «وفق ما» مقابل «حسبما» أو «كما») — تفضيلات الذوق التحريري بين صيغ صحيحة ليست ملاحظات. ملاحظة style أو readability تُسجل فقط إذا كانت الصياغة تضعف الوضوح أو الرصانة فعلاً بحيث يوافق أي محرر محترف على ذلك.
دقة المسميات الرسمية ضمن هذا المحور — بشرط صارم: الملاحظة تُسجل فقط إذا ورد في النص نفسه اسم قديم مُلغى لجهة (مثل «مؤسسة النقد العربي السعودي») — أما إذا استخدم النص الاسم الرسمي الحالي (مثل «البنك المركزي السعودي») فلا تُسجل أي ملاحظة عن المسميات إطلاقاً ولا أي شرح تاريخي؛ وعند التسجيل تكون الملاحظة سطراً واحداً مقتضباً يقترح الاسم الحالي دون استطراد.
النتيجة: score بين 0-100، passed إذا كان Score >= ${LANGUAGE_THRESHOLD}.

لكل خطأ لغوي أرجع:
- category: واحدة من "spelling" أو "grammar" أو "style" أو "readability"
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
    explanation: sanitizeKingdom(String(rawRisks.explanation ?? "")),
    fix: sanitizeKingdom(String(rawRisks.fix ?? ""))
  };

  const profScore = Math.max(0, Math.min(100, Number(rawWriting.score) || 0));
  const professionalWriting: ContentEvaluationProfessionalWriting = {
    score: profScore,
    passed: Boolean(rawWriting.passed ?? profScore >= PROFESSIONALISM_THRESHOLD),
    explanation: sanitizeKingdom(String(rawWriting.explanation ?? "")),
    fix: sanitizeKingdom(String(rawWriting.fix ?? ""))
  };

  const langScore = Math.max(0, Math.min(100, Number(rawLanguage.score) || 0));
  const rawIssues = Array.isArray(rawLanguage.issues) ? rawLanguage.issues : [];
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
      message: sanitizeKingdom(String(issue.message ?? issue.description ?? "")),
      suggestion: sanitizeKingdom(String(issue.suggestion ?? issue.fix ?? ""))
    }));

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

export async function evaluateContent(text: string): Promise<ContentEvaluation> {
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
        max_tokens: 4096,
        messages: [{ role: "user", content: buildEvaluationPrompt(text) }]
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
