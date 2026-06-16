import type { LegalKnowledgeEntry, LegalSourceDocument } from "@/lib/types";

// Single canonical entry per official Ministry of Justice document — every page
// that needs to show or link to a source reads from this list rather than
// keeping its own copy, so the same reference can never appear twice with
// different URLs.
export const legalSourceDocuments: LegalSourceDocument[] = [
  {
    id: "rules-professional-conduct-lawyers",
    title: "قواعد السلوك المهني للمحامين",
    documentType: "MOJ_URL",
    sourceUrl: "https://laws.moj.gov.sa/ar/legislation/JmI0BPgVlA5GuIxkJUi08A",
    version: "1447H",
    status: "ACTIVE",
    issuedHijri: "24/12/1442",
    effectiveHijri: "26/01/1443",
    ministry: "وزارة العدل"
  },
  {
    id: "advocacy-law-executive-regulations",
    title: "اللائحة التنفيذية لنظام المحاماة",
    documentType: "MOJ_URL",
    sourceUrl: "https://laws.moj.gov.sa/ar/legislation/5huwCrAuvCK62BbuXv7fjg",
    version: "1446H",
    status: "ACTIVE",
    issuedHijri: "19/04/1446",
    effectiveHijri: "13/06/1446",
    ministry: "وزارة العدل"
  }
];

export const legalKnowledgeEntries: LegalKnowledgeEntry[] = [
  {
    id: "conduct-advertising-accuracy",
    sourceDocumentId: "rules-professional-conduct-lawyers",
    sourceDocument: "قواعد السلوك المهني للمحامين",
    articleOrRuleNumber: "قواعد الإعلان والتواصل المهني",
    chapter: "الأحكام والقواعد العامة",
    section: "الإعلان والتسويق المهني",
    fullText:
      "يلتزم المحامي عند التعريف بخدماته أو نشر محتوى مهني بالصدق والدقة وتجنب الإيهام أو المبالغة أو عرض معلومات قد تضلل الجمهور بشأن النتائج أو الخبرة أو نطاق الخدمة.",
    pageNumber: 1,
    sourceUrl: "https://laws.moj.gov.sa/ar/legislation/JmI0BPgVlA5GuIxkJUi08A",
    version: "1447H",
    status: "ACTIVE",
    keywords: ["إعلان", "تسويق", "مبالغة", "تضليل", "الجمهور", "محتوى مهني"],
    riskCategories: ["ادعاء تفضيلي أو تسويقي", "احتمال تضليل الجمهور"],
    severity: "مرتفع",
    prohibitedPatterns: ["أفضل محام", "الأفضل", "رقم واحد", "الأقوى", "خبير مضمون", "سر مضمون"],
    recommendedAction: "استبدل الادعاءات التفضيلية أو المطلقة بوصف مهني محدد وقابل للتحقق."
  },
  {
    id: "conduct-no-guaranteed-outcomes",
    sourceDocumentId: "rules-professional-conduct-lawyers",
    sourceDocument: "قواعد السلوك المهني للمحامين",
    articleOrRuleNumber: "قواعد النزاهة والصدق في التواصل المهني",
    chapter: "الأحكام والقواعد العامة",
    section: "التواصل مع العملاء والجمهور",
    fullText:
      "لا ينبغي أن يتضمن المحتوى المهني وعداً بنتيجة محددة أو إيحاءً بضمان كسب النزاع، لأن نتيجة العمل القانوني تتوقف على الوقائع والمستندات والأنظمة وتقدير الجهة المختصة.",
    pageNumber: 2,
    sourceUrl: "https://laws.moj.gov.sa/ar/legislation/JmI0BPgVlA5GuIxkJUi08A",
    version: "1447H",
    status: "ACTIVE",
    keywords: ["ضمان النتيجة", "كسب القضية", "وعد", "نتيجة", "نزاع"],
    riskCategories: ["وعد بنتيجة", "إيحاء بضمان المخرجات"],
    severity: "مرتفع",
    prohibitedPatterns: ["نضمن", "مضمون", "اكسب قضيتك", "نضمن لك", "نتيجة مضمونة", "الفوز بالقضية"],
    recommendedAction: "استخدم صياغة احتمالية توضح أن النتائج تعتمد على الوقائع والمستندات والأنظمة."
  },
  {
    id: "conduct-confidentiality",
    sourceDocumentId: "rules-professional-conduct-lawyers",
    sourceDocument: "قواعد السلوك المهني للمحامين",
    articleOrRuleNumber: "قواعد السرية وحماية معلومات العميل",
    chapter: "العلاقة بين المحامي والعميل",
    section: "السرية والخصوصية",
    fullText:
      "يلتزم المحامي بالمحافظة على سرية معلومات العميل والامتناع عن نشر تفاصيل القضايا أو البيانات التي تكشف هوية العميل أو مركزه القانوني دون مسوغ نظامي.",
    pageNumber: 3,
    sourceUrl: "https://laws.moj.gov.sa/ar/legislation/JmI0BPgVlA5GuIxkJUi08A",
    version: "1447H",
    status: "ACTIVE",
    keywords: ["سرية", "خصوصية", "بيانات العميل", "تفاصيل القضية", "هوية العميل"],
    riskCategories: ["سرية وخصوصية", "كشف بيانات العميل"],
    severity: "مرتفع",
    prohibitedPatterns: ["اسم العميل", "تفاصيل القضية", "مستندات العميل", "رقم الهوية", "بيانات سرية"],
    recommendedAction: "احذف البيانات المحددة أو عمم المثال دون كشف هوية العميل أو تفاصيله."
  },
  {
    id: "conduct-client-solicitation",
    sourceDocumentId: "rules-professional-conduct-lawyers",
    sourceDocument: "قواعد السلوك المهني للمحامين",
    articleOrRuleNumber: "قواعد التعامل مع العملاء وطلب العمل",
    chapter: "العلاقة بين المحامي والعميل",
    section: "طلب العمل والتواصل المهني",
    fullText:
      "ينبغي أن يكون التواصل المهني مع العملاء والجمهور منضبطاً وخالياً من الضغط أو الاستغلال أو الإلحاح غير الملائم.",
    pageNumber: 3,
    sourceUrl: "https://laws.moj.gov.sa/ar/legislation/JmI0BPgVlA5GuIxkJUi08A",
    version: "1447H",
    status: "ACTIVE",
    keywords: ["استغلال", "ضغط", "إلحاح", "طلب العمل", "العميل"],
    riskCategories: ["ضغط تسويقي", "طلب عمل غير ملائم"],
    severity: "مرتفع",
    prohibitedPatterns: ["اتصل الآن قبل فوات الأوان", "لا تضيع حقك", "فرصتك الأخيرة", "سارع قبل أن تخسر"],
    recommendedAction: "استبدل عبارات الضغط بدعوة مهنية هادئة للحصول على مراجعة أو استشارة عند الحاجة."
  },
  {
    id: "regulations-license-and-capacity",
    sourceDocumentId: "advocacy-law-executive-regulations",
    sourceDocument: "اللائحة التنفيذية لنظام المحاماة",
    articleOrRuleNumber: "المادة الأولى وما يتصل بمزاولة المهنة",
    chapter: "التعريفات والأحكام العامة",
    section: "المزاولة والصفة المهنية",
    fullText:
      "ترتبط مزاولة مهنة المحاماة والظهور بصفة محام أو مستشار نظامي بالقيود النظامية الواردة في نظام المحاماة ولائحته التنفيذية.",
    pageNumber: 1,
    sourceUrl: "https://laws.moj.gov.sa/ar/legislation/5huwCrAuvCK62BbuXv7fjg",
    version: "1446H",
    status: "ACTIVE",
    keywords: ["مزاولة", "محام", "مستشار", "نظام المحاماة", "صفة مهنية"],
    riskCategories: ["ادعاء صفة مهنية", "صياغة صفة غير موثقة"],
    severity: "مرتفع",
    prohibitedPatterns: ["مستشار قانوني معتمد", "محام معتمد", "مرخص دوليا", "خبير قضائي معتمد"],
    recommendedAction: "اذكر الصفة المهنية بدقة ولا تستخدم أوصافاً توحي بصفة غير موثقة."
  },
  {
    id: "regulations-training-claims",
    sourceDocumentId: "advocacy-law-executive-regulations",
    sourceDocument: "اللائحة التنفيذية لنظام المحاماة",
    articleOrRuleNumber: "مواد التدريب والخبرة المهنية",
    chapter: "مزاولة مهنة المحاماة",
    section: "التدريب والخبرة",
    fullText:
      "تنظم اللائحة التنفيذية متطلبات التدريب والخبرة والقيد، وينبغي أن تكون أي إشارة إلى التأهيل أو الخبرة أو الصفة المهنية دقيقة وغير مضللة.",
    pageNumber: 2,
    sourceUrl: "https://laws.moj.gov.sa/ar/legislation/5huwCrAuvCK62BbuXv7fjg",
    version: "1446H",
    status: "ACTIVE",
    keywords: ["تدريب", "خبرة", "قيد", "تأهيل", "صفة مهنية"],
    riskCategories: ["ادعاء خبرة غير موثق", "مبالغة مهنية"],
    severity: "متوسط",
    prohibitedPatterns: ["خبرة لا مثيل لها", "الأكثر خبرة", "خبرة مضمونة", "خبير في كل القضايا"],
    recommendedAction: "حوّل ادعاء الخبرة إلى وصف محدد وقابل للتحقق دون مبالغة."
  }
];

export function getLegalSourceDocument(id: string) {
  return legalSourceDocuments.find((document) => document.id === id);
}

export function searchLegalKnowledgeBase(text: string) {
  return legalKnowledgeEntries.filter((entry) => {
    const haystack = `${text} ${entry.keywords.join(" ")}`;
    return entry.prohibitedPatterns.some((pattern) => text.includes(pattern)) || entry.keywords.some((keyword) => haystack.includes(keyword));
  });
}
