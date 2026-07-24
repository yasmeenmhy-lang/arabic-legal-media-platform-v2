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

// مطابقة بداية الكلمة: «م» تُطابق «مراجعة» و«منشأة» ولا تُطابق «مما» داخل جملة.
// يُستعمل في البحث بالموضوع حيث الحرف الأول يجب أن يبدأ منه الموضوع لا أن يرد في وسطه.
export function prefixMatch(query: string, subject: string | undefined | null): boolean {
  const tokens = normalizeArabic(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  const words = normalizeArabic(subject ?? "").split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (!words.length) return false;
  return tokens.every((token) => words.some((word) => word.startsWith(token)));
}
