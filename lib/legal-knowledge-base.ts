import type { LegalSourceDocument } from "@/lib/types";

// ★ قاعدة المعرفة (legalKnowledgeEntries — قوائم ألفاظ وتلميحات) حُذفت بقرار
// مالكة المنصة (٢٠٢٦-٠٧-٢٨): ثبت أنها تُرجّح كفة الحكم عند محرك الامتثال عبر
// التلميحات الملحقة بالمتن الرسمي («مناطق الرصد بالمعنى») فتُخطئ الحكم على نص
// بريء قريب من موضوع حساس — وهذا يخالف مبدأ المنصة «الحكم بالمعنى لا بالقوائم».
// الحكم اليوم من محرك الامتثال وحده، بقراءته المتن الرسمي الكامل بلا تلميح.
//
// هذه القائمة الباقية (legalSourceDocuments) ليست قاعدة معرفة حكمية — هي
// بيانات وصفية بحتة (عنوان ورابط رسمي) لوثيقتي المتن، ولا صلة لها بالحكم.

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


export function getLegalSourceDocument(id: string) {
  return legalSourceDocuments.find((document) => document.id === id);
}
