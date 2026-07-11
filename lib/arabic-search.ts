// بحث عربي ذكي موحد للمنصة: تطبيع الحروف المتشابهة وتجاهل التشكيل والتطويل،
// ومطابقة كل كلمات الاستعلام بأي ترتيب عبر أي حقل من حقول المحتوى

export function normalizeArabic(value: string): string {
  return value
    .replace(/[ً-ْٰـ]/g, "") // التشكيل والتطويل
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .toLowerCase()
    .trim();
}

// تُطابق عندما ترد كل كلمة من الاستعلام (بعد التطبيع) في أي من الحقول — ترتيب الكلمات لا يهم
export function smartMatch(query: string, fields: Array<string | undefined | null>): boolean {
  const tokens = normalizeArabic(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  const haystack = normalizeArabic(fields.filter(Boolean).join(" \n "));
  return tokens.every((token) => haystack.includes(token));
}
