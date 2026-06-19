import type {
  ContentKind,
  LanguageIssueCategory,
  LanguageIssueSeverity,
  LanguageQualityIssue,
  LanguageQualityReviewInput,
  LanguageQualityReviewResult
} from "@/lib/types";

const DEFAULT_THRESHOLD = 82;
const ARABIC_BOUNDARY_START = "(?<![\\u0600-\\u06FF])";
const ARABIC_BOUNDARY_END = "(?![\\u0600-\\u06FF])";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wordPattern(value: string) {
  return new RegExp(`${ARABIC_BOUNDARY_START}${escapeRegExp(value)}${ARABIC_BOUNDARY_END}`, "g");
}

const spellingRules: Array<{ pattern: RegExp; correction: string; message: string }> = [
  { pattern: wordPattern("ان"), correction: "أن", message: "استخدم الهمزة في (أن) عند فتح الجملة المصدرية." },
  { pattern: wordPattern("الى"), correction: "إلى", message: "اكتب حرف الجر بصيغته الصحيحة: إلى." },
  { pattern: wordPattern("علي"), correction: "على", message: "اكتب حرف الجر بصيغته الصحيحة: على." },
  { pattern: wordPattern("اجراءات"), correction: "إجراءات", message: "أضف الهمزة في المصطلح المهني: إجراءات." },
  { pattern: wordPattern("اجراء"), correction: "إجراء", message: "أضف الهمزة في المصطلح المهني: إجراء." },
  { pattern: wordPattern("مسؤليه"), correction: "مسؤولية", message: "صحح رسم الكلمة إلى: مسؤولية." },
  { pattern: wordPattern("مسؤلية"), correction: "مسؤولية", message: "صحح رسم الكلمة إلى: مسؤولية." },
  { pattern: wordPattern("القضيه"), correction: "القضية", message: "صحح التاء المربوطة في كلمة: القضية." },
  { pattern: wordPattern("القضيةه"), correction: "القضية", message: "احذف الحرف الزائد واكتب: القضية." },
  { pattern: wordPattern("محاميى"), correction: "محامي", message: "صحح رسم الكلمة إلى: محامي." },
  { pattern: wordPattern("السعوديه"), correction: "السعودية", message: "صحح التاء المربوطة في كلمة: السعودية." },
  { pattern: wordPattern("الانظمه"), correction: "الأنظمة", message: "أضف الهمزة وصحح التاء المربوطة في كلمة: الأنظمة." },
  { pattern: wordPattern("اللائحه"), correction: "اللائحة", message: "صحح التاء المربوطة في كلمة: اللائحة." },
  { pattern: wordPattern("شي"), correction: "شيء", message: "اكتب الكلمة بصيغتها الفصيحة: شيء." }
];

const weakPhrases: Array<{ pattern: RegExp; suggestion: string }> = [
  { pattern: wordPattern("نوعا ما"), suggestion: "استبدلها بعبارة محددة تبين درجة الأثر أو المخاطر." },
  { pattern: wordPattern("بشكل كبير"), suggestion: "حدد معيار الأثر أو استخدم وصفاً مهنياً أدق." },
  { pattern: wordPattern("قد يكون"), suggestion: "اذكر سبب الاحتمال أو استخدم صياغة أكثر تحديداً إذا كان الحكم واضحاً." },
  { pattern: wordPattern("أشياء"), suggestion: "استخدم اسماً محدداً بدلاً من كلمة عامة." },
  { pattern: wordPattern("موضوع"), suggestion: "استبدلها بمصطلح أدق مثل: إجراء، التزام، مخالفة، نزاع، أو طلب." }
];

const nonProfessionalLegalWording: Array<{ pattern: RegExp; suggestion: string }> = [
  { pattern: wordPattern("أكيد"), suggestion: "استخدم: من المرجح، يتبين، يثبت، بحسب المستندات، أو وفق السياق." },
  { pattern: wordPattern("مضمون"), suggestion: "تجنب ضمان النتائج واستخدم صياغة مهنية غير قطعية." },
  { pattern: wordPattern("راح"), suggestion: "استخدم: سوف أو سيتم." },
  { pattern: wordPattern("لازم"), suggestion: "استخدم: يجب أو يتعين." },
  { pattern: wordPattern("مشكلة"), suggestion: "استخدم: إشكال مهني، مخالفة محتملة، نزاع، أو ملاحظة بحسب السياق." }
];

const legalTerms = ["النظام", "اللائحة", "العقد", "الالتزام", "المسؤولية", "المخالفة", "الجهة المختصة", "الإجراء", "التنفيذ", "الموكل"];

function normalizeArabic(content: string) {
  return content
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[ـ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function matches(content: string, pattern: RegExp) {
  const scoped = new RegExp(pattern.source, pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`);
  const found: RegExpExecArray[] = [];
  let match: RegExpExecArray | null;
  while ((match = scoped.exec(content)) !== null) found.push(match);
  return found;
}

function addIssue(
  issues: LanguageQualityIssue[],
  category: LanguageIssueCategory,
  severity: LanguageIssueSeverity,
  message: string,
  excerpt: string,
  suggestion: string,
  start?: number,
  end?: number
) {
  issues.push({ id: `${category}-${issues.length + 1}`, category, severity, message, excerpt, suggestion, start, end });
}

function detectSpelling(content: string, issues: LanguageQualityIssue[]) {
  for (const rule of spellingRules) {
    for (const match of matches(content, rule.pattern)) {
      addIssue(issues, "spelling", "medium", rule.message, match[0], `استبدل "${match[0]}" بـ "${rule.correction}".`, match.index, match.index + match[0].length);
    }
  }
}

function detectGrammarAndPunctuation(content: string, issues: LanguageQualityIssue[]) {
  for (const match of matches(content, /[,;]/g)) {
    addIssue(
      issues,
      "grammar",
      "low",
      "استخدم علامات الترقيم العربية المناسبة داخل النص العربي.",
      match[0],
      match[0] === "," ? "استبدلها بالفاصلة العربية،" : "استبدلها بالفاصلة المنقوطة العربية؛",
      match.index,
      match.index + 1
    );
  }

  for (const match of matches(content, /[؟!،؛.](?=\S)/g)) {
    addIssue(issues, "grammar", "low", "تحتاج علامة الترقيم إلى مسافة بعدها.", content.slice(match.index, match.index + 8), "أضف مسافة بعد علامة الترقيم.", match.index, match.index + 1);
  }
}

function detectDuplication(content: string, issues: LanguageQualityIssue[]) {
  for (const match of matches(content, /(?<![\u0600-\u06FF])([\u0600-\u06FF]+)\s+\1(?![\u0600-\u06FF])/g)) {
    addIssue(issues, "readability", "medium", "توجد كلمة مكررة.", match[0], `احذف التكرار واستخدم "${match[1]}" مرة واحدة.`, match.index, match.index + match[0].length);
  }

  const seen = new Set<string>();
  for (const sentence of content.split(/(?<=[.!؟])\s+/).map((item) => item.trim()).filter(Boolean)) {
    const normalized = normalizeArabic(sentence);
    if (normalized.length > 20 && seen.has(normalized)) {
      addIssue(issues, "readability", "high", "توجد جملة مكررة.", sentence, "احذف الجملة المكررة أو ادمجها دون فقدان المعنى.");
    }
    seen.add(normalized);
  }
}

function detectStyle(content: string, issues: LanguageQualityIssue[]) {
  for (const rule of weakPhrases) {
    for (const match of matches(content, rule.pattern)) {
      addIssue(issues, "style", "medium", "العبارة ضعيفة أو غير محددة بما يكفي للمحتوى المهني.", match[0], rule.suggestion, match.index, match.index + match[0].length);
    }
  }

  for (const rule of nonProfessionalLegalWording) {
    for (const match of matches(content, rule.pattern)) {
      addIssue(issues, "style", "high", "الصياغة لا تناسب محتوى مهنياً موجهاً لجمهور قانوني أو إعلامي.", match[0], rule.suggestion, match.index, match.index + match[0].length);
    }
  }
}

function detectReadability(content: string, issues: LanguageQualityIssue[]) {
  const words = content.split(/\s+/).filter(Boolean);
  const sentences = content.split(/[.!؟]+/).filter((sentence) => sentence.trim().length > 0);
  const averageWordsPerSentence = sentences.length ? words.length / sentences.length : words.length;

  if (averageWordsPerSentence > 32) {
    addIssue(issues, "readability", "medium", "الجمل طويلة وقد تضعف وضوح الرسالة.", sentences[0]?.slice(0, 140) ?? content.slice(0, 140), "قسّم الجمل الطويلة إلى جمل أقصر مع الحفاظ على المعنى.");
  }

  if (!/[.!؟]$/.test(content.trim()) && words.length > 8) {
    addIssue(issues, "readability", "low", "ينتهي النص دون علامة ترقيم ختامية.", content.slice(-60), "أضف نقطة أو علامة استفهام مناسبة في نهاية النص.");
  }
}

function detectTerminology(input: LanguageQualityReviewInput, issues: LanguageQualityIssue[]) {
  const normalized = normalizeArabic(input.text);

  for (const term of input.requiredTerms ?? []) {
    if (!normalized.includes(normalizeArabic(term))) {
      addIssue(issues, "اتساق المصطلحات", "high", "مصطلح مطلوب غير مستخدم في النص.", term, `أدرج المصطلح "${term}" في الموضع المناسب أو وثق سبب عدم استخدامه.`);
    }
  }

  for (const [preferredTerm, variants] of Object.entries(input.terminologyMap ?? {})) {
    for (const variant of variants) {
      for (const match of matches(input.text, wordPattern(variant))) {
        addIssue(issues, "اتساق المصطلحات", "medium", "يوجد استخدام غير متسق للمصطلحات.", match[0], `وحّد المصطلح إلى "${preferredTerm}".`, match.index, match.index + match[0].length);
      }
    }
  }

  const hasLegalTerm = legalTerms.some((term) => normalized.includes(normalizeArabic(term)));
  if (!["title", "hashtag"].includes(input.kind) && !hasLegalTerm) {
    addIssue(issues, "اتساق المصطلحات", "low", "النص لا يحتوي على مصطلح مهني أو تنظيمي واضح.", input.text.slice(0, 100), "أضف المصطلح المهني الدقيق الذي يصف الالتزام أو الإجراء أو موضوع الرسالة.");
  }
}

function improvedDraft(content: string) {
  let draft = content.replace(/,/g, "،").replace(/;/g, "؛").replace(/\s+/g, " ").trim();
  for (const rule of spellingRules) draft = draft.replace(rule.pattern, rule.correction);
  draft = draft.replace(wordPattern("راح"), "سوف");
  draft = draft.replace(wordPattern("لازم"), "يجب");
  draft = draft.replace(wordPattern("مشكلة"), "إشكال مهني");
  draft = draft.replace(/(?<![\u0600-\u06FF])([\u0600-\u06FF]+)\s+\1(?![\u0600-\u06FF])/g, "$1");
  draft = draft.replace(/([؟!،؛.])(?=\S)/g, "$1 ");
  return !/[.!؟]$/.test(draft) && draft.split(/\s+/).length > 8 ? `${draft}.` : draft;
}

function calculateScores(issues: LanguageQualityIssue[]) {
  const weights: Record<LanguageIssueSeverity, number> = { low: 2, medium: 5, high: 9, critical: 16 };
  const categoryScores: Record<LanguageIssueCategory, number> = {
    spelling: 100,
    grammar: 100,
    style: 100,
    readability: 100,
    "اتساق المصطلحات": 100
  };

  for (const issue of issues) categoryScores[issue.category] = Math.max(0, categoryScores[issue.category] - weights[issue.severity]);
  const score = Math.max(0, 100 - issues.reduce((sum, issue) => sum + weights[issue.severity], 0));
  return { score, categoryScores };
}

export function reviewLanguageQuality(input: LanguageQualityReviewInput, threshold = DEFAULT_THRESHOLD): LanguageQualityReviewResult {
  const issues: LanguageQualityIssue[] = [];
  const text = input.text.trim();

  if (!text) {
    addIssue(issues, "readability", "critical", "لا يمكن مراجعة محتوى فارغ.", "", "أضف النص المطلوب مراجعته.");
  } else {
    detectSpelling(text, issues);
    detectGrammarAndPunctuation(text, issues);
    detectDuplication(text, issues);
    detectStyle(text, issues);
    detectReadability(text, issues);
    detectTerminology({ ...input, text }, issues);
  }

  const { score, categoryScores } = calculateScores(issues);
  return {
    passed: score >= threshold && !issues.some((issue) => issue.severity === "critical" || issue.category === "spelling"),
    score,
    threshold,
    normalizedText: normalizeArabic(text),
    improvedDraft: improvedDraft(text),
    issues,
    categoryScores,
    reviewedAt: new Date().toISOString()
  };
}

export function reviewManyLanguageQuality(items: Array<{ text: string; kind: ContentKind }>) {
  return items.map((item) => reviewLanguageQuality(item));
}
