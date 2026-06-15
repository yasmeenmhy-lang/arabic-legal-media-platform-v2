import type { LegalKnowledgeEntry, LegalSourceDocument } from "@/lib/types";

export const legalSourceDocuments: LegalSourceDocument[] = [
  {
    id: "rules-professional-conduct-lawyers-pdf",
    title: "قواعد السلوك المهني للمحامين",
    documentType: "PDF",
    fileName: "قواعد السلوك المهني للمحامين.pdf",
    sourceUrl: "file:///C:/Users/Yasmeenmy/Desktop/قواعد السلوك المهني للمحامين.pdf",
    version: "1447H",
    status: "ACTIVE",
    pages: 10,
    issuedHijri: "24/12/1442",
    effectiveHijri: "26/01/1443",
    ministry: "وزارة العدل"
  },
  {
    id: "advocacy-law-executive-regulations-pdf",
    title: "اللائحة التنفيذية لنظام المحاماة",
    documentType: "PDF",
    fileName: "اللائحة التنفيذية لنظام المحاماة.pdf",
    sourceUrl: "file:///C:/Users/Yasmeenmy/Desktop/اللائحة التنفيذية لنظام المحاماة.pdf",
    version: "1446H",
    status: "ACTIVE",
    pages: 17,
    issuedHijri: "19/04/1446",
    effectiveHijri: "13/06/1446",
    ministry: "وزارة العدل"
  },
  {
    id: "moj-rules-professional-conduct-lawyers",
    title: "قواعد السلوك المهني للمحامين - وزارة العدل",
    documentType: "MOJ_URL",
    sourceUrl: "https://laws.moj.gov.sa/ar/legislation/JmI0BPgVlA5GuIxkJUi08A",
    version: "MOJ current",
    status: "ACTIVE",
    ministry: "وزارة العدل"
  },
  {
    id: "moj-advocacy-law-executive-regulations",
    title: "اللائحة التنفيذية لنظام المحاماة - وزارة العدل",
    documentType: "MOJ_URL",
    sourceUrl: "https://laws.moj.gov.sa/ar/legislation/5huwCrAuvCK62BbuXv7fjg",
    version: "MOJ current",
    status: "ACTIVE",
    ministry: "وزارة العدل"
  }
];

export const legalKnowledgeEntries: LegalKnowledgeEntry[] = [
  {
    id: "conduct-advertising-accuracy",
    sourceDocumentId: "rules-professional-conduct-lawyers-pdf",
    sourceDocument: "قواعد السلوك المهني للمحامين",
    articleOrRuleNumber: "القواعد العامة للإعلان والتسويق المهني",
    chapter: "الأحكام والقواعد العامة",
    section: "الإعلان والاستشارات والتعامل مع الجمهور",
    fullText:
      "يلتزم المحامي عند التعريف بخدماته أو نشر محتوى مهني بالصدق والدقة وتجنب الإيهام أو المبالغة أو عرض معلومات قد تضلل الجمهور بشأن النتائج أو الخبرة أو نطاق الخدمة.",
    pageNumber: 1,
    sourceUrl: "https://laws.moj.gov.sa/ar/legislation/JmI0BPgVlA5GuIxkJUi08A",
    version: "1447H",
    status: "ACTIVE",
    keywords: ["إعلان", "تسويق", "مبالغة", "تضليل", "الجمهور", "محتوى مهني"],
    riskCategories: ["MISLEADING_ADVERTISING", "UNVERIFIED_CLAIM"],
    severity: "HIGH",
    prohibitedPatterns: ["أفضل محام", "الأفضل", "رقم واحد", "الأقوى", "خبير مضمون", "سر مضمون", "ط£ظپط¶ظ„ ظ…ط­ط§ظ…", "ط³ط± ظ…ط¶ظ…ظˆظ†"],
    recommendedAction: "استبدل الادعاءات التفضيلية أو المطلقة بوصف مهني محدد وقابل للتحقق."
  },
  {
    id: "conduct-no-guaranteed-outcomes",
    sourceDocumentId: "rules-professional-conduct-lawyers-pdf",
    sourceDocument: "قواعد السلوك المهني للمحامين",
    articleOrRuleNumber: "قواعد النزاهة والصدق في التواصل المهني",
    chapter: "الأحكام والقواعد العامة",
    section: "التواصل مع العملاء والجمهور",
    fullText:
      "لا يجوز للمحامي أن يقدم للجمهور أو العميل وعدا بنتيجة محددة أو يوحي بضمان كسب النزاع، لأن نتيجة العمل القانوني تتوقف على الوقائع والمستندات والأنظمة وتقدير الجهة المختصة.",
    pageNumber: 2,
    sourceUrl: "https://laws.moj.gov.sa/ar/legislation/JmI0BPgVlA5GuIxkJUi08A",
    version: "1447H",
    status: "ACTIVE",
    keywords: ["ضمان النتيجة", "كسب القضية", "وعد", "نتيجة", "نزاع"],
    riskCategories: ["GUARANTEED_OUTCOME", "CLIENT_MISLEADING"],
    severity: "CRITICAL",
    prohibitedPatterns: ["نضمن", "مضمون", "اكسب قضيتك", "نضمن لك", "نتيجة مضمونة", "الفوز بالقضية", "ظ†ط¶ظ…ظ†", "ط§ظƒط³ط¨ ظ‚ط¶ظٹطھظƒ"],
    recommendedAction: "استخدم صياغة احتمالية توضح أن النتائج تعتمد على الوقائع والمستندات والأنظمة."
  },
  {
    id: "conduct-confidentiality",
    sourceDocumentId: "rules-professional-conduct-lawyers-pdf",
    sourceDocument: "قواعد السلوك المهني للمحامين",
    articleOrRuleNumber: "قواعد السرية وحماية معلومات العميل",
    chapter: "العلاقة بين المحامي والعميل",
    section: "السرية والخصوصية",
    fullText:
      "يلتزم المحامي بالمحافظة على سرية معلومات العميل والامتناع عن نشر تفاصيل القضايا أو البيانات التي تكشف هوية العميل أو مركزه القانوني دون سند نظامي أو موافقة معتبرة.",
    pageNumber: 3,
    sourceUrl: "https://laws.moj.gov.sa/ar/legislation/JmI0BPgVlA5GuIxkJUi08A",
    version: "1447H",
    status: "ACTIVE",
    keywords: ["سرية", "خصوصية", "بيانات العميل", "تفاصيل القضية", "هوية العميل"],
    riskCategories: ["CONFIDENTIALITY", "PRIVACY"],
    severity: "CRITICAL",
    prohibitedPatterns: ["اسم العميل", "تفاصيل القضية", "مستندات العميل", "رقم الهوية", "بيانات سرية"],
    recommendedAction: "احذف البيانات المحددة أو عمم المثال دون كشف هوية العميل أو تفاصيله."
  },
  {
    id: "conduct-client-solicitation",
    sourceDocumentId: "rules-professional-conduct-lawyers-pdf",
    sourceDocument: "قواعد السلوك المهني للمحامين",
    articleOrRuleNumber: "قواعد التعامل مع العملاء وطلب العمل",
    chapter: "العلاقة بين المحامي والعميل",
    section: "طلب العمل والتواصل المهني",
    fullText:
      "ينبغي أن يكون التواصل المهني مع العملاء والجمهور منضبطا وخاليا من الضغط أو الاستغلال أو الإلحاح غير الملائم، وألا يستغل المحامي حاجة الشخص أو ظرفه لجذب العمل.",
    pageNumber: 3,
    sourceUrl: "https://laws.moj.gov.sa/ar/legislation/JmI0BPgVlA5GuIxkJUi08A",
    version: "1447H",
    status: "ACTIVE",
    keywords: ["استغلال", "ضغط", "إلحاح", "طلب العمل", "العميل"],
    riskCategories: ["IMPROPER_SOLICITATION", "CLIENT_PRESSURE"],
    severity: "HIGH",
    prohibitedPatterns: ["اتصل الآن قبل فوات الأوان", "لا تضيع حقك", "فرصتك الأخيرة", "سارع قبل أن تخسر"],
    recommendedAction: "استبدل عبارات الضغط بدعوة مهنية هادئة للحصول على استشارة عند الحاجة."
  },
  {
    id: "regulations-license-and-capacity",
    sourceDocumentId: "advocacy-law-executive-regulations-pdf",
    sourceDocument: "اللائحة التنفيذية لنظام المحاماة",
    articleOrRuleNumber: "المادة الأولى وما يتصل بمزاولة المهنة",
    chapter: "التعريفات والأحكام العامة",
    section: "المزاولة والترخيص",
    fullText:
      "ترتبط مزاولة مهنة المحاماة والظهور بصفة محام أو مستشار نظامي بالترخيص والقيود النظامية الواردة في نظام المحاماة ولائحته التنفيذية.",
    pageNumber: 1,
    sourceUrl: "https://laws.moj.gov.sa/ar/legislation/5huwCrAuvCK62BbuXv7fjg",
    version: "1446H",
    status: "ACTIVE",
    keywords: ["ترخيص", "مزاولة", "محام", "مستشار", "نظام المحاماة"],
    riskCategories: ["LICENSE_CLAIM", "UNAUTHORIZED_PRACTICE"],
    severity: "HIGH",
    prohibitedPatterns: ["مستشار قانوني معتمد", "محام معتمد", "مرخص دوليا", "خبير قضائي معتمد"],
    recommendedAction: "اذكر الصفة المهنية بدقة ولا تستخدم اعتمادا أو ترخيصا ما لم يكن موثقا."
  },
  {
    id: "regulations-training-claims",
    sourceDocumentId: "advocacy-law-executive-regulations-pdf",
    sourceDocument: "اللائحة التنفيذية لنظام المحاماة",
    articleOrRuleNumber: "مواد التدريب والخبرة المهنية",
    chapter: "مزاولة مهنة المحاماة",
    section: "التدريب والخبرة",
    fullText:
      "تنظم اللائحة التنفيذية متطلبات التدريب والخبرة والقيد، ويجب أن تكون أي إشارة إلى التأهيل أو الخبرة أو الصفة المهنية دقيقة وغير مضللة.",
    pageNumber: 2,
    sourceUrl: "https://laws.moj.gov.sa/ar/legislation/5huwCrAuvCK62BbuXv7fjg",
    version: "1446H",
    status: "ACTIVE",
    keywords: ["تدريب", "خبرة", "قيد", "تأهيل", "صفة مهنية"],
    riskCategories: ["UNVERIFIED_EXPERIENCE", "CREDENTIAL_CLAIM"],
    severity: "MEDIUM",
    prohibitedPatterns: ["خبرة لا مثيل لها", "الأكثر خبرة", "اعتماد مضمون", "خبير في كل القضايا"],
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
