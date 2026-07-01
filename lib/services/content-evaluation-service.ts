// CONTENT EVALUATION ENGINE — AI-BASED HOLISTIC ASSESSMENT
// Evaluates three axes via a single Claude call: risks (affected parties),
// professional writing quality, and language/spelling quality.
// Separate from the legal compliance engine (semantic-analysis-service.ts).

import Anthropic from "@anthropic-ai/sdk";
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

## المبدأ الجوهري — اقرأه أولاً قبل أي تقييم
المحامي لا ينشر إلا ما يخدم أحد هذه الأهداف:
1. خدمة العدالة وتوعية الجمهور بحقوقهم
2. توضيح المسائل القانونية
3. الإعلان عن خدماته القانونية بأسلوب مهني ورصين

أي محتوى خارج هذه الأهداف هو مخالفة تلقائية بغض النظر عن موضوعه أو أسلوبه، بما في ذلك:
- إظهار الثروة أو المكانة المادية بأي شكل (سيارات، مكاتب، سفر، ملابس، مطاعم، أو غيرها)
- المحتوى الترويجي الذي يستغل المظاهر المادية لجذب العملاء
- أي محتوى لا علاقة له بالمهنة القانونية

القواعد المنتهكة في هذه الحالات:
- ق2: أهداف قواعد السلوك المهني
- ق5: الشرف والنزاهة الشخصية
- ق38: ضوابط الإعلان والصدق في التعريف بالخدمات المهنية

---

## السياق
هذه منصة داخلية مخصصة للمحامين المرخصين فقط. النص أدناه كتبه محامٍ مرخص ويريد نشره على وسائل التواصل الاجتماعي. المحامي مسؤول قانونياً ومهنياً عن كل ما ينشره. القواعد المرجعية هي قواعد السلوك المهني للمحامين في المملكة العربية السعودية.

## النص المراد تقييمه
«${text}»

## المهمة
قيّم النص على ثلاثة محاور وأرجع النتيجة بصيغة JSON فقط.
**تذكّر: ابدأ بتطبيق المبدأ الأساسي أعلاه قبل تقييم أي محور.**

---

### المحور الأول: المخاطر
أولاً: هل المحتوى يخدم المهنة القانونية أو يُعلّم الجمهور؟
- إذا لا → المحتوى مخالف تلقائياً، المهنة متضررة بالضرورة، وكذلك المحامي.

ثم حدد هل يوجد خطر إضافي على:
- الموكل: أي محتوى يضر بمصلحته أو يكشف معلوماته أو يؤثر على قضيته
- المحامي: أي محتوى يعرضه للمساءلة التأديبية أو القانونية
- المهنة: أي محتوى يسيء لسمعة المهنة القانونية أو يقلل من هيبتها أو لا يخدمها

النتيجة نوعية بعدد الجهات المتضررة:
- لا خطر على أي جهة → level: "منخفض"، affectedParties: []
- خطر على جهة واحدة → level: "منخفض"، affectedParties: [الجهة]
- خطر على جهتين → level: "متوسط"، affectedParties: [الجهتان]
- خطر على الجهات الثلاث → level: "مرتفع"، affectedParties: ["الموكل","المحامي","المهنة"]
- تهديد شامل للمنظومة القانونية → level: "بالغ"، affectedParties: ["الموكل","المحامي","المهنة"]

---

### المحور الثاني: الالتزام بمعايير الكتابة المهنية
أولاً: هل المحتوى في أصله مناسب لمحامٍ مرخص؟
- إذا كان المحتوى لا يخدم المهنة القانونية → score لا يتجاوز 20 مهما كان أسلوب الكتابة.

ثم قيّم: هل أسلوب الكتابة يعكس رصانة وجدية تليق بمحامٍ مرخص؟
المحامي يمثل المهنة القانونية في كل ما ينشره. لا تعتمد على كلمات أو أنماط محددة — حكم بذكاء كامل.
النتيجة: score بين 0-100، passed إذا كان Score >= ${PROFESSIONALISM_THRESHOLD}.

---

### المحور الثالث: اللغة والإملاء
قيّم سلامة النص لغوياً ونحوياً ووضوحه. اللغة العامية في منشورات المحامي مخالفة مهنية بحد ذاتها، غير أنها مقبولة في حدود ضيقة جداً — إذا كانت لا تؤثر على صورة المهنة ووقارها. أي استخدام للعامية يخرج عن هذا الحد أو يضر بصورة المحامي المهنية يُرصد تحت مؤشر الكتابة المهنية (professionalWriting) وليس تحت هذا المحور.
لا تعتمد على أنماط محددة — حكم بذكاء كامل.
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

  const riskLevel = VALID_RISK_LEVELS.includes(rawRisks.level as RiskLevel)
    ? rawRisks.level as RiskLevel
    : "منخفض";

  const affectedParties = (Array.isArray(rawRisks.affectedParties) ? rawRisks.affectedParties : [])
    .filter((p): p is RiskAffectedParty => VALID_PARTIES.includes(p as RiskAffectedParty));

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
  const issues: ContentEvaluationLanguageIssue[] = rawIssues
    .filter((issue): issue is Record<string, unknown> => typeof issue === "object" && issue !== null)
    .map((issue) => ({
      category: VALID_CATEGORIES.includes(issue.category as LanguageIssueCategory)
        ? issue.category as LanguageIssueCategory
        : "readability",
      severity: VALID_SEVERITIES.includes(issue.severity as LanguageIssueSeverity)
        ? issue.severity as LanguageIssueSeverity
        : "medium",
      excerpt: String(issue.excerpt ?? ""),
      message: String(issue.message ?? issue.description ?? ""),
      suggestion: String(issue.suggestion ?? issue.fix ?? "")
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
  let message: Awaited<ReturnType<typeof client.messages.create>>;
  try {
    message = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 2048,
      messages: [{ role: "user", content: buildEvaluationPrompt(text) }]
    });
  } catch (err) {
    console.warn("[evaluation] API call failed — returning fallback evaluation", err instanceof Error ? err.message : "");
    return buildFallbackEvaluation();
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
}
