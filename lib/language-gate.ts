// ─────────────────────────────────────────────────────────────────────────────
// تمييز «الخطأ اللغوي القطعي» عن «الملاحظة الأسلوبية الذوقية» (بقرار مالكة المنصة).
// مصدرٌ واحد للحقيقة تقرؤه كل البوابات (الاعتماد، الجاهزية، إعادة الصياغة) فلا يتناقض
// حكمان: إملاء/نحو/اتساق مصطلحات = خطأ قطعي بقاعدة ⇒ حاجز؛ أسلوب/وضوح = تفضيل ذوقي
// ⇒ إرشادي يُعرض ولا يمنع النشر. لا يمسّ الكشف — يميّز الحاجز عن الإرشاد فقط.
// ─────────────────────────────────────────────────────────────────────────────

// الفئات القطعية الحاجزة — خطأ بقاعدة لغوية معيارية لا تفضيل ذوقي
export const HARD_LANGUAGE_CATEGORIES = ["spelling", "grammar", "اتساق المصطلحات"] as const;

export function countHardLanguageErrors(issues: ReadonlyArray<{ category?: string }>): number {
  return issues.filter((i) => (HARD_LANGUAGE_CATEGORIES as readonly string[]).includes(i.category ?? "")).length;
}

export function hasHardLanguageError(issues: ReadonlyArray<{ category?: string }>): boolean {
  return countHardLanguageErrors(issues) > 0;
}

// الملاحظات الأسلوبية الإرشادية — تُعرض ولا تمنع النشر.
export function countAdvisoryLanguageIssues(issues: ReadonlyArray<{ category?: string }>): number {
  return issues.length - countHardLanguageErrors(issues);
}

// نصّ بوابة «جودة اللغة» — مصدر واحد يمنع تناقض البطاقة مع البوابة: حين تُرصد
// ملاحظة أسلوبية إرشادية لا يصحّ أن تقول البوابة «اللغة سليمة» وكأن لا ملاحظة.
export function languageGateReason(advisoryCount: number): string {
  if (advisoryCount <= 0) return "اللغة سليمة ومناسبة للنشر.";
  const note =
    advisoryCount === 1
      ? "ملاحظة أسلوبية إرشادية واحدة"
      : advisoryCount === 2
      ? "ملاحظتان أسلوبيتان إرشاديتان"
      : `${advisoryCount} ملاحظات أسلوبية إرشادية`;
  return `سليمة إملائياً ونحوياً — ${note} لا تمنع النشر.`;
}
