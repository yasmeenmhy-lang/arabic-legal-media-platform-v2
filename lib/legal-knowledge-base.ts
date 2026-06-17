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
    articleTitle: "ضوابط الإعلان والصدق في التعريف بالخدمات المهنية",
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
    articleTitle: "حظر الوعود أو ضمان النتائج",
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
    articleTitle: "سرية معلومات العميل وخصوصية القضايا",
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
    articleTitle: "طلب العمل والتواصل المهني دون ضغط",
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
    articleTitle: "المزاولة والصفة المهنية",
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
    articleTitle: "التدريب والخبرة والادعاءات المهنية",
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
  },
  {
    id: "conduct-conflict-interest-indicators",
    sourceDocumentId: "rules-professional-conduct-lawyers",
    sourceDocument: "قواعد السلوك المهني للمحامين",
    articleOrRuleNumber: "قواعد تجنب تعارض المصالح",
    articleTitle: "مؤشرات تعارض المصالح واستقلالية المحامي",
    chapter: "العلاقة بين المحامي والعميل",
    section: "تعارض المصالح والاستقلال المهني",
    fullText:
      "يتعين على المحامي مراعاة الاستقلال المهني وتجنب ما قد يؤدي إلى تعارض مصالح أو الإيحاء بتمثيل أطراف متعارضة أو التأثير على حياده المهني.",
    pageNumber: 4,
    sourceUrl: "https://laws.moj.gov.sa/ar/legislation/JmI0BPgVlA5GuIxkJUi08A",
    version: "1447H",
    status: "ACTIVE",
    keywords: ["تعارض مصالح", "أطراف متعارضة", "استقلال", "حياد"],
    riskCategories: ["مؤشر تعارض مصالح", "إيحاء بتمثيل أطراف متعارضة"],
    severity: "مرتفع",
    prohibitedPatterns: ["نمثل الطرفين", "نضمن مصلحة جميع الأطراف", "لا يوجد تعارض مصالح", "تمثيل الخصوم"],
    recommendedAction: "احذف أي صياغة توحي بتمثيل أطراف متعارضة أو عالجها بعبارة مهنية تؤكد مراعاة الاستقلال وتحقق عدم التعارض."
  },
  {
    id: "conduct-professional-dignity",
    sourceDocumentId: "rules-professional-conduct-lawyers",
    sourceDocument: "قواعد السلوك المهني للمحامين",
    articleOrRuleNumber: "قواعد كرامة المهنة والظهور المهني",
    articleTitle: "متطلبات الكرامة المهنية في الخطاب العام",
    chapter: "الأحكام والقواعد العامة",
    section: "كرامة المهنة والظهور العام",
    fullText:
      "ينبغي أن يحافظ المحامي في حضوره الإعلامي والإعلاني على كرامة المهنة ورصانة الخطاب وألا يستخدم عبارات مبتذلة أو جارحة أو غير ملائمة لطبيعة المهنة.",
    pageNumber: 4,
    sourceUrl: "https://laws.moj.gov.sa/ar/legislation/JmI0BPgVlA5GuIxkJUi08A",
    version: "1447H",
    status: "ACTIVE",
    keywords: ["كرامة المهنة", "الظهور العام", "خطاب مهني", "إساءة"],
    riskCategories: ["مخالفة متطلبات الكرامة المهنية", "صياغة غير مناسبة للخطاب المهني"],
    severity: "متوسط",
    prohibitedPatterns: ["اسحق خصمك", "خلّص نفسك بأي طريقة", "لا ترحم خصمك", "فضيحة قانونية"],
    recommendedAction: "استبدل العبارات الحادة أو المثيرة بصياغة مهنية هادئة تحافظ على رصانة الخطاب."
  },
  {
    id: "regulations-advertising-controls",
    sourceDocumentId: "advocacy-law-executive-regulations",
    sourceDocument: "اللائحة التنفيذية لنظام المحاماة",
    articleOrRuleNumber: "ضوابط الإعلان المهني في اللائحة التنفيذية",
    articleTitle: "ضوابط الإعلان عن خدمات المحاماة",
    chapter: "مزاولة مهنة المحاماة",
    section: "الإعلان المهني والتواصل العام",
    fullText:
      "ينبغي أن يلتزم الإعلان عن الخدمات المهنية بالضوابط النظامية وألا يتضمن ما يوهم الجمهور بصفة غير صحيحة أو نتيجة مؤكدة أو ميزة غير قابلة للتحقق.",
    pageNumber: 2,
    sourceUrl: "https://laws.moj.gov.sa/ar/legislation/5huwCrAuvCK62BbuXv7fjg",
    version: "1446H",
    status: "ACTIVE",
    keywords: ["إعلان", "خدمات المحاماة", "ضوابط", "نتيجة مؤكدة", "ميزة"],
    riskCategories: ["ملاحظة على ضوابط الإعلان", "صياغة إعلانية غير منضبطة"],
    severity: "مرتفع",
    prohibitedPatterns: ["عرض حصري", "خصم قانوني مضمون", "أسرع محاماة", "نتائج مؤكدة"],
    recommendedAction: "حوّل الإعلان إلى تعريف مهني بالخدمة دون عبارات تجارية مطلقة أو وعود بنتائج."
  },
  {
    id: "regulations-permitted-communication",
    sourceDocumentId: "advocacy-law-executive-regulations",
    sourceDocument: "اللائحة التنفيذية لنظام المحاماة",
    articleOrRuleNumber: "ضوابط التواصل المهني المسموح",
    articleTitle: "التواصل المهني المسموح مع الجمهور",
    chapter: "مزاولة مهنة المحاماة",
    section: "التواصل المهني والمعلومات العامة",
    fullText:
      "يجوز أن يشتمل التواصل المهني على معلومات عامة عن نطاق الخدمات ووسائل التواصل متى كانت دقيقة وغير مضللة ولا تتضمن وعداً أو استغلالاً أو ادعاء صفة غير صحيحة.",
    pageNumber: 3,
    sourceUrl: "https://laws.moj.gov.sa/ar/legislation/5huwCrAuvCK62BbuXv7fjg",
    version: "1446H",
    status: "ACTIVE",
    keywords: ["تواصل مهني", "معلومات عامة", "وسائل التواصل", "غير مضللة"],
    riskCategories: ["خروج عن التواصل المهني المسموح", "معلومات مهنية قد تكون مضللة"],
    severity: "متوسط",
    prohibitedPatterns: ["تواصل معنا للفوز", "نحل قضيتك فوراً", "نتولى أي قضية بلا استثناء"],
    recommendedAction: "اجعل الدعوة للتواصل مهنية ومحددة، وابتعد عن صياغة تربط التواصل بنتيجة أو حل فوري."
  },
  {
    id: "regulations-prohibited-wording",
    sourceDocumentId: "advocacy-law-executive-regulations",
    sourceDocument: "اللائحة التنفيذية لنظام المحاماة",
    articleOrRuleNumber: "الألفاظ والعبارات المحظورة في التواصل المهني",
    articleTitle: "الصياغات المحظورة أو عالية الحساسية",
    chapter: "مزاولة مهنة المحاماة",
    section: "الصياغة المهنية والإعلانات",
    fullText:
      "تعد العبارات التي توحي بضمان النتيجة أو الصفة غير الصحيحة أو الأفضلية المطلقة أو الترخيص غير المثبت مؤشرات تستوجب المعالجة قبل النشر.",
    pageNumber: 3,
    sourceUrl: "https://laws.moj.gov.sa/ar/legislation/5huwCrAuvCK62BbuXv7fjg",
    version: "1446H",
    status: "ACTIVE",
    keywords: ["عبارات محظورة", "ترخيص", "أفضلية", "ضمان", "صفة"],
    riskCategories: ["عبارة محظورة أو عالية الحساسية", "إيحاء بميزة أو ترخيص غير مثبت"],
    severity: "مرتفع",
    prohibitedPatterns: ["مرخص من وزارة العدل", "معتمد من وزارة العدل", "موافقة وزارة العدل", "مصادق عليه رسمياً"],
    recommendedAction: "احذف أي عبارة توحي بترخيص أو اعتماد أو موافقة رسمية ما لم تكن الصفة ثابتة ومسموحاً بإظهارها نظاماً."
  },
  {
    id: "regulations-public-communication",
    sourceDocumentId: "advocacy-law-executive-regulations",
    sourceDocument: "اللائحة التنفيذية لنظام المحاماة",
    articleOrRuleNumber: "متطلبات التواصل العام",
    articleTitle: "متطلبات النشر والتواصل مع الجمهور",
    chapter: "مزاولة مهنة المحاماة",
    section: "التواصل العام والنشر المهني",
    fullText:
      "ينبغي أن يكون التواصل العام متزناً ومبنياً على معلومات صحيحة، وألا يخلط بين التثقيف العام وتقديم رأي قانوني نهائي في وقائع محددة للجمهور.",
    pageNumber: 4,
    sourceUrl: "https://laws.moj.gov.sa/ar/legislation/5huwCrAuvCK62BbuXv7fjg",
    version: "1446H",
    status: "ACTIVE",
    keywords: ["تواصل عام", "تثقيف", "رأي قانوني", "وقائع محددة", "الجمهور"],
    riskCategories: ["خلط بين التثقيف والرأي القانوني", "تواصل عام عالي الحساسية"],
    severity: "متوسط",
    prohibitedPatterns: ["رأيي القانوني النهائي", "هذا الحكم مضمون", "طبق هذه الخطوات وستكسب", "استشارة قانونية نهائية للجميع"],
    recommendedAction: "حوّل العبارة إلى تثقيف عام، ووضح أن الوقائع التفصيلية تحتاج مراجعة مهنية مستقلة."
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
