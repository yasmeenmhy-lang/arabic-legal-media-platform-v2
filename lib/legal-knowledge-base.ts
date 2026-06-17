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
    title: "اللائحة التنفيذية لنظام المحاماة في المملكة العربية السعودية",
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
    legalReference: "القاعدة الثامنة والثلاثون، الفقرة (1)",
    articleTitle: "ضوابط الإعلان والصدق في التعريف بالخدمات المهنية",
    chapter: "الأحكام والقواعد العامة",
    section: "الإعلان والتسويق المهني",
    fullText:
      "عند إعلان المحامي عن نفسه بطريق مباشر أو غير مباشر؛ فعليه مراعاة ألا يكون الإعلان مضللاً أو كاذباً أو خادعاً، كالتضليل في الإشارة لتأهيل المحامي وخبراته.",
    pageNumber: 1,
    sourceUrl: "https://laws.moj.gov.sa/ar/legislation/JmI0BPgVlA5GuIxkJUi08A",
    version: "1447H",
    status: "ACTIVE",
    keywords: ["إعلان", "تسويق", "مبالغة", "تضليل", "الجمهور", "محتوى مهني"],
    riskCategories: ["ادعاء تفضيلي أو تسويقي", "احتمال تضليل الجمهور"],
    severity: "مرتفع",
    prohibitedPatterns: ["أفضل محام", "أفضل النتائج", "الأفضل", "رقم واحد", "الأقوى", "نسبة نجاح مرتفعة", "خبير مضمون", "سر مضمون"],
    contextualPatterns: ["تحقيق نتائج", "نسبة نجاح", "الأكثر نجاحاً", "خدمة لا تضاهى", "تميز مضمون"],
    recommendedAction: "استبدل الادعاءات التفضيلية أو المطلقة بوصف مهني محدد وقابل للتحقق."
  },
  {
    id: "conduct-no-guaranteed-outcomes",
    sourceDocumentId: "rules-professional-conduct-lawyers",
    sourceDocument: "قواعد السلوك المهني للمحامين",
    legalReference: "القاعدة السادسة عشرة، الفقرة (3)",
    articleTitle: "حظر الوعود أو ضمان النتائج",
    chapter: "الأحكام والقواعد العامة",
    section: "التواصل مع العملاء والجمهور",
    fullText:
      "لا يجوز للمحامي الوعد بتحقيق نتيجة فيما ليس تحت تصرفه أو فيما لا يمكن فيه ضمان تحقيق النتيجة.",
    pageNumber: 2,
    sourceUrl: "https://laws.moj.gov.sa/ar/legislation/JmI0BPgVlA5GuIxkJUi08A",
    version: "1447H",
    status: "ACTIVE",
    keywords: ["ضمان النتيجة", "كسب القضية", "وعد", "نتيجة", "نزاع"],
    riskCategories: ["وعد بنتيجة", "إيحاء بضمان المخرجات"],
    severity: "مرتفع",
    prohibitedPatterns: ["نضمن", "يضمن", "مضمون", "مضمونة", "اكسب قضيتك", "كسب قضيتك", "نضمن لك", "نتيجة مضمونة", "حلولاً قانونية مضمونة", "الفوز بالقضية"],
    contextualPatterns: ["تحقيق نتيجة", "تحقق نتيجة", "كسب الدعوى", "الفوز بالنزاع", "ضمان الحكم", "النتيجة لصالحك"],
    recommendedAction: "استخدم صياغة احتمالية توضح أن النتائج تعتمد على الوقائع والمستندات والأنظمة."
  },
  {
    id: "conduct-confidentiality",
    sourceDocumentId: "rules-professional-conduct-lawyers",
    sourceDocument: "قواعد السلوك المهني للمحامين",
    legalReference: "القاعدة السابعة والثلاثون، الفقرة (2)",
    articleTitle: "سرية معلومات العميل وخصوصية القضايا",
    chapter: "العلاقة بين المحامي والعميل",
    section: "السرية والخصوصية",
    fullText:
      "يلتزم المحامي في حال مشاركته في وسائل الإعلام والإعلان بما في ذلك وسائل النشر الإلكتروني بالمحافظة على خصوصية عملائه أو غيرهم، وسرية معلوماتهم وبياناتهم.",
    pageNumber: 3,
    sourceUrl: "https://laws.moj.gov.sa/ar/legislation/JmI0BPgVlA5GuIxkJUi08A",
    version: "1447H",
    status: "ACTIVE",
    keywords: ["سرية", "خصوصية", "بيانات العميل", "تفاصيل القضية", "هوية العميل"],
    riskCategories: ["سرية وخصوصية", "كشف بيانات العميل"],
    severity: "مرتفع",
    prohibitedPatterns: ["اسم العميل", "تفاصيل القضية", "مستندات العميل", "رقم الهوية", "بيانات سرية"],
    contextualPatterns: ["بيانات موكل", "معلومات العميل", "ملف القضية", "هوية العميل", "أوراق القضية"],
    recommendedAction: "احذف البيانات المحددة أو عمم المثال دون كشف هوية العميل أو تفاصيله."
  },
  {
    id: "conduct-client-solicitation",
    sourceDocumentId: "rules-professional-conduct-lawyers",
    sourceDocument: "قواعد السلوك المهني للمحامين",
    legalReference: "القاعدة السابعة والثلاثون، الفقرة (6)",
    articleTitle: "طلب العمل والتواصل المهني دون ضغط",
    chapter: "العلاقة بين المحامي والعميل",
    section: "طلب العمل والتواصل المهني",
    fullText:
      "يلتزم المحامي في حال مشاركته في وسائل الإعلام والإعلان بألا يجيب إجابة تفصيلية عن أسئلة محددة في دعوى منظورة أو قد تنظر أمام القضاء بهدف استجلاب عملاء في تلك الدعوى أو الحصول على توكيل فيها.",
    pageNumber: 3,
    sourceUrl: "https://laws.moj.gov.sa/ar/legislation/JmI0BPgVlA5GuIxkJUi08A",
    version: "1447H",
    status: "ACTIVE",
    keywords: ["استغلال", "ضغط", "إلحاح", "طلب العمل", "العميل"],
    riskCategories: ["ضغط تسويقي", "طلب عمل غير ملائم"],
    severity: "مرتفع",
    prohibitedPatterns: ["اتصل الآن قبل فوات الأوان", "لا تضيع حقك", "فرصتك الأخيرة", "سارع قبل أن تخسر"],
    contextualPatterns: ["احجز فوراً", "لا تنتظر", "قبل انتهاء الفرصة", "تواصل الآن"],
    recommendedAction: "استبدل عبارات الضغط بدعوة مهنية هادئة للحصول على مراجعة أو استشارة عند الحاجة."
  },
  {
    id: "regulations-license-and-capacity",
    sourceDocumentId: "advocacy-law-executive-regulations",
    sourceDocument: "اللائحة التنفيذية لنظام المحاماة في المملكة العربية السعودية",
    legalReference: "المادة الثانية والثلاثون، الفقرة (4)",
    articleTitle: "المزاولة والصفة المهنية",
    chapter: "التعريفات والأحكام العامة",
    section: "المزاولة والصفة المهنية",
    fullText:
      "يلتزم المتدرب بعدم انتحال صفة المحامي، أو التضليل بما يوهم كونه محامياً مرخصاً بأي وسيلة كانت.",
    pageNumber: 1,
    sourceUrl: "https://laws.moj.gov.sa/ar/legislation/5huwCrAuvCK62BbuXv7fjg",
    version: "1446H",
    status: "ACTIVE",
    keywords: ["مزاولة", "محام", "مستشار", "نظام المحاماة", "صفة مهنية"],
    riskCategories: ["ادعاء صفة مهنية", "صياغة صفة غير موثقة"],
    severity: "مرتفع",
    prohibitedPatterns: ["مستشار قانوني معتمد", "محام معتمد", "مرخص دوليا", "خبير قضائي معتمد"],
    contextualPatterns: ["اعتماد رسمي", "ترخيص رسمي", "مرخص من جهة رسمية", "صفة معتمدة"],
    recommendedAction: "اذكر الصفة المهنية بدقة ولا تستخدم أوصافاً توحي بصفة غير موثقة."
  },
  {
    id: "regulations-training-claims",
    sourceDocumentId: "advocacy-law-executive-regulations",
    sourceDocument: "اللائحة التنفيذية لنظام المحاماة في المملكة العربية السعودية",
    legalReference: null,
    articleTitle: "التدريب والخبرة والادعاءات المهنية",
    chapter: "مزاولة مهنة المحاماة",
    section: "التدريب والخبرة",
    fullText:
      "تنظم اللائحة التنفيذية متطلبات التدريب والخبرة والقيد، ولم يتم ربط هذا النطاق في قاعدة المعرفة الحالية بمادة محددة صالحة للاستشهاد الآلي.",
    pageNumber: 2,
    sourceUrl: "https://laws.moj.gov.sa/ar/legislation/5huwCrAuvCK62BbuXv7fjg",
    version: "1446H",
    status: "ACTIVE",
    keywords: ["تدريب", "خبرة", "قيد", "تأهيل", "صفة مهنية"],
    riskCategories: ["ادعاء خبرة غير موثق", "مبالغة مهنية"],
    severity: "متوسط",
    prohibitedPatterns: ["خبرة لا مثيل لها", "الأكثر خبرة", "خبرة استثنائية", "خبرة مضمونة", "خبير في كل القضايا"],
    contextualPatterns: ["خبرة واسعة جداً", "أفضل خبرة", "حل جميع القضايا", "تخصص في كل المجالات"],
    recommendedAction: "حوّل ادعاء الخبرة إلى وصف محدد وقابل للتحقق دون مبالغة."
  },
  {
    id: "conduct-conflict-interest-indicators",
    sourceDocumentId: "rules-professional-conduct-lawyers",
    sourceDocument: "قواعد السلوك المهني للمحامين",
    legalReference: "القاعدة الثامنة، الفقرة (1)",
    articleTitle: "مؤشرات تعارض المصالح واستقلالية المحامي",
    chapter: "العلاقة بين المحامي والعميل",
    section: "تعارض المصالح والاستقلال المهني",
    fullText:
      "يحظر على المحامي أي تصرف يمثل تعارضاً فعلياً أو محتملاً مع مصالح عملائه الحاليين أو السابقين، إلا بعد الموافقة المكتوبة من العميل ذي الصلة بالتصرف.",
    pageNumber: 4,
    sourceUrl: "https://laws.moj.gov.sa/ar/legislation/JmI0BPgVlA5GuIxkJUi08A",
    version: "1447H",
    status: "ACTIVE",
    keywords: ["تعارض مصالح", "أطراف متعارضة", "استقلال", "حياد"],
    riskCategories: ["مؤشر تعارض مصالح", "إيحاء بتمثيل أطراف متعارضة"],
    severity: "مرتفع",
    prohibitedPatterns: ["نمثل الطرفين", "نضمن مصلحة جميع الأطراف", "لا يوجد تعارض مصالح", "تمثيل الخصوم"],
    contextualPatterns: ["خدمة الطرفين", "مصالح جميع الأطراف", "نعمل مع الخصمين", "نمثل جميع الأطراف"],
    recommendedAction: "احذف أي صياغة توحي بتمثيل أطراف متعارضة أو عالجها بعبارة مهنية تؤكد مراعاة الاستقلال وتحقق عدم التعارض."
  },
  {
    id: "conduct-professional-dignity",
    sourceDocumentId: "rules-professional-conduct-lawyers",
    sourceDocument: "قواعد السلوك المهني للمحامين",
    legalReference: "القاعدة الثالثة",
    articleTitle: "متطلبات الكرامة المهنية في الخطاب العام",
    chapter: "الأحكام والقواعد العامة",
    section: "كرامة المهنة والظهور العام",
    fullText:
      "يحافظ المحامي على شرف المهنة ومكانتها، ولا يتصرف بما يخل بثقة الناس به أو بالمهنة.",
    pageNumber: 4,
    sourceUrl: "https://laws.moj.gov.sa/ar/legislation/JmI0BPgVlA5GuIxkJUi08A",
    version: "1447H",
    status: "ACTIVE",
    keywords: ["كرامة المهنة", "الظهور العام", "خطاب مهني", "إساءة"],
    riskCategories: ["مخالفة متطلبات الكرامة المهنية", "صياغة غير مناسبة للخطاب المهني"],
    severity: "متوسط",
    prohibitedPatterns: ["اسحق خصمك", "خلّص نفسك بأي طريقة", "لا ترحم خصمك", "فضيحة قانونية"],
    contextualPatterns: ["انتقم قانونياً", "اضغط على خصمك", "اهزم خصمك", "اكشف خصمك"],
    recommendedAction: "استبدل العبارات الحادة أو المثيرة بصياغة مهنية هادئة تحافظ على رصانة الخطاب."
  },
  {
    id: "regulations-advertising-controls",
    sourceDocumentId: "advocacy-law-executive-regulations",
    sourceDocument: "اللائحة التنفيذية لنظام المحاماة في المملكة العربية السعودية",
    legalReference: null,
    articleTitle: "ضوابط الإعلان عن خدمات المحاماة",
    chapter: "مزاولة مهنة المحاماة",
    section: "الإعلان المهني والتواصل العام",
    fullText:
      "لم يتم ربط هذا النطاق في قاعدة المعرفة الحالية بمادة محددة صالحة للاستشهاد الآلي من اللائحة التنفيذية.",
    pageNumber: 2,
    sourceUrl: "https://laws.moj.gov.sa/ar/legislation/5huwCrAuvCK62BbuXv7fjg",
    version: "1446H",
    status: "ACTIVE",
    keywords: ["إعلان", "خدمات المحاماة", "ضوابط", "نتيجة مؤكدة", "ميزة"],
    riskCategories: ["ملاحظة على ضوابط الإعلان", "صياغة إعلانية غير منضبطة"],
    severity: "مرتفع",
    prohibitedPatterns: ["عرض حصري", "خصم قانوني مضمون", "أسرع محاماة", "نتائج مؤكدة"],
    contextualPatterns: ["خدمة مضمونة", "حل سريع مضمون", "أسرع نتيجة", "أفضل عرض قانوني"],
    recommendedAction: "حوّل الإعلان إلى تعريف مهني بالخدمة دون عبارات تجارية مطلقة أو وعود بنتائج."
  },
  {
    id: "regulations-permitted-communication",
    sourceDocumentId: "advocacy-law-executive-regulations",
    sourceDocument: "اللائحة التنفيذية لنظام المحاماة في المملكة العربية السعودية",
    legalReference: null,
    articleTitle: "التواصل المهني المسموح مع الجمهور",
    chapter: "مزاولة مهنة المحاماة",
    section: "التواصل المهني والمعلومات العامة",
    fullText:
      "لم يتم ربط هذا النطاق في قاعدة المعرفة الحالية بمادة محددة صالحة للاستشهاد الآلي من اللائحة التنفيذية.",
    pageNumber: 3,
    sourceUrl: "https://laws.moj.gov.sa/ar/legislation/5huwCrAuvCK62BbuXv7fjg",
    version: "1446H",
    status: "ACTIVE",
    keywords: ["تواصل مهني", "معلومات عامة", "وسائل التواصل", "غير مضللة"],
    riskCategories: ["خروج عن التواصل المهني المسموح", "معلومات مهنية قد تكون مضللة"],
    severity: "متوسط",
    prohibitedPatterns: ["تواصل معنا للفوز", "نحل قضيتك فوراً", "نتولى أي قضية بلا استثناء"],
    contextualPatterns: ["راسلنا لتكسب", "حل فوري لقضيتك", "نعالج كل القضايا", "أي قضية نكسبها"],
    recommendedAction: "اجعل الدعوة للتواصل مهنية ومحددة، وابتعد عن صياغة تربط التواصل بنتيجة أو حل فوري."
  },
  {
    id: "regulations-prohibited-wording",
    sourceDocumentId: "advocacy-law-executive-regulations",
    sourceDocument: "اللائحة التنفيذية لنظام المحاماة في المملكة العربية السعودية",
    legalReference: null,
    articleTitle: "الصياغات المحظورة أو عالية الحساسية",
    chapter: "مزاولة مهنة المحاماة",
    section: "الصياغة المهنية والإعلانات",
    fullText:
      "لم يتم ربط هذا النطاق في قاعدة المعرفة الحالية بمادة محددة صالحة للاستشهاد الآلي من اللائحة التنفيذية.",
    pageNumber: 3,
    sourceUrl: "https://laws.moj.gov.sa/ar/legislation/5huwCrAuvCK62BbuXv7fjg",
    version: "1446H",
    status: "ACTIVE",
    keywords: ["عبارات محظورة", "ترخيص", "أفضلية", "ضمان", "صفة"],
    riskCategories: ["عبارة محظورة أو عالية الحساسية", "إيحاء بميزة أو ترخيص غير مثبت"],
    severity: "مرتفع",
    prohibitedPatterns: ["مرخص من وزارة العدل", "معتمد من وزارة العدل", "موافقة وزارة العدل", "مصادق عليه رسمياً"],
    contextualPatterns: ["إقرار رسمي", "موثق رسمياً", "مصادق من جهة رسمية", "معتمد حكومياً"],
    recommendedAction: "احذف أي عبارة توحي بترخيص أو اعتماد أو موافقة رسمية ما لم تكن الصفة ثابتة ومسموحاً بإظهارها نظاماً."
  },
  {
    id: "regulations-public-communication",
    sourceDocumentId: "advocacy-law-executive-regulations",
    sourceDocument: "اللائحة التنفيذية لنظام المحاماة في المملكة العربية السعودية",
    legalReference: null,
    articleTitle: "متطلبات النشر والتواصل مع الجمهور",
    chapter: "مزاولة مهنة المحاماة",
    section: "التواصل العام والنشر المهني",
    fullText:
      "لم يتم ربط هذا النطاق في قاعدة المعرفة الحالية بمادة محددة صالحة للاستشهاد الآلي من اللائحة التنفيذية.",
    pageNumber: 4,
    sourceUrl: "https://laws.moj.gov.sa/ar/legislation/5huwCrAuvCK62BbuXv7fjg",
    version: "1446H",
    status: "ACTIVE",
    keywords: ["تواصل عام", "تثقيف", "رأي قانوني", "وقائع محددة", "الجمهور"],
    riskCategories: ["خلط بين التثقيف والرأي القانوني", "تواصل عام عالي الحساسية"],
    severity: "متوسط",
    prohibitedPatterns: ["رأيي القانوني النهائي", "هذا الحكم مضمون", "طبق هذه الخطوات وستكسب", "استشارة قانونية نهائية للجميع"],
    contextualPatterns: ["الحل القانوني النهائي", "الحكم لصالحك", "هذه الاستشارة تكفي", "اتبعها وستربح"],
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
