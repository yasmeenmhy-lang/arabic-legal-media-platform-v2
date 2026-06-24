// INTERNAL COMPLIANCE FRAMEWORK — BACKEND ONLY
// Source: Internal Regulatory Framework for Lawyers' Media and Advertising Communications
// This file is NOT to be shown to users, cited in findings, or included in API responses.
// Used exclusively to enhance detection accuracy in the compliance analysis engine.

export type InternalRiskWeight = "critical" | "high" | "medium" | "low";

export interface InternalAbsoluteProhibition {
  id: string;
  category: string;
  patterns: string[];
  contextualSignals: string[];
  mapsToPublicEntryId: string;
  weight: InternalRiskWeight;
}

// محظورات مطلقة — Absolute Prohibitions
// Each prohibition maps to a public knowledge entry for citation purposes.
export const absoluteProhibitions: InternalAbsoluteProhibition[] = [
  {
    id: "abs-guaranteed-judicial-outcome",
    category: "ادعاء ضمان نتائج قضائية أو مآلات مقررة",
    patterns: [
      "نضمن لك الفوز", "نكفل النتيجة", "النتيجة مضمونة لك", "كلمتنا الكسب",
      "سنكسب بتأكيد", "فوزك مضمون", "لا يمكن أن تخسر", "الحكم لك مؤكد",
      "نعدك بالنتيجة", "تأكد من كسب قضيتك", "كسبنا بدون خسارة"
    ],
    contextualSignals: ["ضمان قضائي", "كفالة النتيجة", "تأكيد الفوز"],
    mapsToPublicEntryId: "conduct-no-guaranteed-outcomes",
    weight: "critical"
  },
  {
    id: "abs-denigrate-colleagues",
    category: "التقليل من شأن زملاء المهنة أو الطعن في كفاءتهم",
    patterns: [
      "محامون آخرون فاشلون", "غيرنا لا يعرف القانون", "المكاتب الأخرى ضعيفة",
      "سيضيع حقك مع غيرنا", "لا تثق بمحامٍ آخر", "المحامون الآخرون سيخذلونك",
      "غيرنا لن يستطيع", "المكاتب الأخرى تضر بقضيتك"
    ],
    contextualSignals: ["الطعن في المنافسين", "التقليل من الزملاء"],
    mapsToPublicEntryId: "conduct-professional-dignity",
    weight: "critical"
  },
  {
    id: "abs-judicial-connections-claim",
    category: "ادعاء علاقات خاصة أو استثنائية بالقضاء أو جهات التحقيق",
    patterns: [
      "لدينا علاقات بالقضاء", "نعرف القضاة", "لنا صلات بالمحكمة",
      "علاقاتنا الداخلية", "تأثيرنا في المحكمة", "نعرف كيف تسير الأمور بالداخل",
      "القضاء في متناولنا", "لنا وصول للقضاء", "لدينا تأثير على مجريات القضية",
      "نحن من الداخل", "لدينا معارف في الجهاز القضائي"
    ],
    contextualSignals: ["علاقة بالقضاء", "معرفة القضاة", "تأثير في المحكمة"],
    mapsToPublicEntryId: "conduct-judicial-integrity",
    weight: "critical"
  },
  {
    id: "abs-target-victims-directly",
    category: "استهداف الضحايا والمتضررين بعروض تمثيل مباشرة",
    patterns: [
      "للضحايا فقط اتصل بنا", "نستهدف قضايا الحوادث فقط",
      "للمتضررين من الحوادث اتصلوا فوراً", "إن كنت ضحية تواصل الآن",
      "هل أنت ضحية؟ اتصل بنا فوراً", "نتعامل مع ضحايا الحوادث مباشرة"
    ],
    contextualSignals: ["ضحية مباشرة", "متضرر من حادث", "تعويض فوري"],
    mapsToPublicEntryId: "conduct-client-solicitation",
    weight: "high"
  },
  {
    id: "abs-false-government-affiliation",
    category: "الإيهام بعلاقة مع جهات حكومية أو شبه حكومية",
    patterns: [
      "معتمدون من الحكومة", "شركاء وزارة العدل", "نعمل مع الجهات الحكومية",
      "موثقون رسمياً من الدولة", "معتمدون حكومياً", "بتفويض رسمي من الجهات المختصة",
      "مصنفون من قِبل وزارة العدل", "نعمل تحت إشراف حكومي مباشر"
    ],
    contextualSignals: ["اعتماد حكومي", "شراكة رسمية مع الدولة"],
    mapsToPublicEntryId: "regulations-prohibited-wording",
    weight: "critical"
  },
  {
    id: "abs-investigation-publication",
    category: "نشر وقائع التحقيقات والمحاكمات دون إذن الجهة المختصة",
    patterns: [
      "تفاصيل التحقيق في قضية", "نشر ملف القضية المنظورة",
      "كشف وقائع المحاكمة", "تسريب وقائع من المحضر",
      "وقائع التحقيق الجنائي في قضية بعينها", "تفاصيل قضية قيد التحقيق الآن"
    ],
    contextualSignals: ["تفاصيل قضائية سرية", "وقائع تحقيق جارٍ"],
    mapsToPublicEntryId: "conduct-no-investigation-publication",
    weight: "critical"
  },
  {
    id: "abs-judicial-career-reference",
    category: "الإشارة لعمل المحامي في السلك القضائي ضمن الإعلان",
    patterns: [
      "قاضٍ سابق", "مدعٍ عام سابق", "عضو نيابة سابق",
      "عملت في السلك القضائي", "خبرتي القضائية السابقة", "كنت قاضياً",
      "من داخل الجهاز القضائي", "سابق في النيابة العامة", "بحكم عملي السابق في القضاء"
    ],
    contextualSignals: ["سلك قضائي سابق", "خبرة قضائية معلنة"],
    mapsToPublicEntryId: "conduct-no-judicial-career-in-ads",
    weight: "high"
  },
  {
    id: "abs-paid-intermediary-broker",
    category: "استخدام وسطاء أو سماسرة مدفوعين لاستقطاب العملاء",
    patterns: [
      "تواصل مع وسيطنا", "تواصل مع وكيلنا", "سمسار قانوني",
      "وسيط قانوني معتمد", "وسيط موثوق للقضايا",
      "عمولة مقابل الإحالة", "أتعاب إحالة", "نكافئ من يحيل العملاء",
      "مكافأة على إحالة القضية", "عمولتك جاهزة عند إحالة موكل",
      "اكسب من كل إحالة قانونية", "شريكنا في الاستقطاب",
      "ابحث لنا عن عملاء وكسب", "من يجلب لنا موكلاً يحصل على نسبة"
    ],
    contextualSignals: [
      "وسيط مدفوع", "سمسرة قضائية", "عمولة إحالة",
      "استقطاب بالوساطة", "أتعاب وسيط", "اتفاقية إحالة مدفوعة"
    ],
    mapsToPublicEntryId: "conduct-client-solicitation",
    weight: "critical"
  }
];

// Channel-specific risk context
// Used to inform scoring — not exposed to users.
export const channelRiskContext: Record<string, { weight: number; riskNote: string }> = {
  "تيك توك":      { weight: 1.5, riskNote: "منصة عالية الانتشار، تخضع لضوابط إعلانية مشددة" },
  "TikTok":       { weight: 1.5, riskNote: "منصة عالية الانتشار، تخضع لضوابط إعلانية مشددة" },
  "انستغرام":    { weight: 1.3, riskNote: "محتوى بصري ترويجي واسع الانتشار" },
  "Instagram":    { weight: 1.3, riskNote: "محتوى بصري ترويجي واسع الانتشار" },
  "يوتيوب":      { weight: 1.2, riskNote: "محتوى مرئي يحتاج رقابة دقيقة" },
  "YouTube":      { weight: 1.2, riskNote: "محتوى مرئي يحتاج رقابة دقيقة" },
  "تويتر":        { weight: 1.2, riskNote: "انتشار سريع، يتطلب دقة صياغة" },
  "X":            { weight: 1.2, riskNote: "انتشار سريع، يتطلب دقة صياغة" },
  "لينكد إن":    { weight: 1.0, riskNote: "جمهور مهني، معايير قياسية" },
  "LinkedIn":     { weight: 1.0, riskNote: "جمهور مهني، معايير قياسية" },
  "موقع إلكتروني": { weight: 1.1, riskNote: "محتوى دائم يخضع لمتطلبات م19 من اللائحة" },
  "بودكاست":     { weight: 1.1, riskNote: "محتوى صوتي مسجل واسع التوزيع" },
  "سناب شات":   { weight: 1.4, riskNote: "منصة الفئة الشبابية، انتشار سريع جداً، محتوى مؤقت يصعب مراجعته لاحقاً" },
  "Snapchat":    { weight: 1.4, riskNote: "منصة الفئة الشبابية، انتشار سريع جداً، محتوى مؤقت يصعب مراجعته لاحقاً" },
  "فيسبوك":     { weight: 1.2, riskNote: "منصة واسعة الانتشار، تضم شرائح متنوعة من الجمهور" },
  "Facebook":    { weight: 1.2, riskNote: "منصة واسعة الانتشار، تضم شرائح متنوعة من الجمهور" },
  "واتساب":     { weight: 1.3, riskNote: "قناة مباشرة وشخصية، تحمل خطر الاستهداف الفردي المحظور" },
  "WhatsApp":    { weight: 1.3, riskNote: "قناة مباشرة وشخصية، تحمل خطر الاستهداف الفردي المحظور" }
};

// Content scope classification (internal use only)
export type ContentScope = "ضمن النطاق بالكامل" | "ضمن النطاق مشروط" | "خارج النطاق";

const outOfScopeSignals = ["مراسلة داخلية", "وثيقة قانونية رسمية", "محادثة خاصة", "عقد خاص"];
const conditionalScopeSignals = ["مقابلة إعلامية", "تعليق قانوني عام", "مشاركة في مؤتمر", "ندوة علمية", "مؤتمر مهني"];

export function classifyContentScope(text: string): ContentScope {
  if (outOfScopeSignals.some(s => text.includes(s))) return "خارج النطاق";
  if (conditionalScopeSignals.some(s => text.includes(s))) return "ضمن النطاق مشروط";
  return "ضمن النطاق بالكامل";
}

// Vulnerability context detector
// Content addressing vulnerable groups may warrant different handling.
const vulnerabilitySignals = [
  "ذوي الاحتياجات الخاصة", "المرأة المعنفة", "الأطفال المتضررون",
  "اللاجئون", "ذوي الدخل المحدود", "الأيتام", "الأرامل"
];

export function isVulnerabilityContext(text: string): boolean {
  return vulnerabilitySignals.some(signal => text.includes(signal));
}

// Get channel risk weight for a given channel string (defaults to 1.0)
export function getChannelRiskWeight(channel?: string): number {
  if (!channel) return 1.0;
  return channelRiskContext[channel]?.weight ?? 1.0;
}

// Run internal audit: returns matches from absolute prohibitions mapped to public entry IDs.
// The matched phrase comes from the user's text — it is safe to surface as evidence.
// The internal prohibition ID and category are NEVER exposed to users.
export function runInternalAudit(text: string): Array<{
  publicEntryId: string;
  matchedPhrase: string;
  weight: InternalRiskWeight;
}> {
  const results: Array<{ publicEntryId: string; matchedPhrase: string; weight: InternalRiskWeight }> = [];
  for (const prohibition of absoluteProhibitions) {
    const matched = prohibition.patterns.find(p => text.includes(p));
    if (matched) {
      results.push({
        publicEntryId: prohibition.mapsToPublicEntryId,
        matchedPhrase: matched,
        weight: prohibition.weight
      });
    }
  }
  return results;
}
