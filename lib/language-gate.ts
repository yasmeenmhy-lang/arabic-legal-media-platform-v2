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
