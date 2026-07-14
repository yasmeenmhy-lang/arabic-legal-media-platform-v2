// خريطة ربط مصادر المحتوى بالتخصص — طبقة عرض فقط (Conditional Filtering)
// المفاتيح هنا هي مفاتيح contentSources الفعلية في الكود دون إعادة تسمية،
// والقيم في visibleFor هي قيم التخصص المعروضة في حقل «التخصص».
// قابلة للتوسعة: أضف مصدراً مشروطاً أو وسّع visibleFor دون أي تعديل في مكوّنات الواجهة.

export const sourceSpecialtyMap = {
  alwaysVisible: [
    "ai-original",
    "global-news",
    "local-news",
    "rulings",
    "regulations",
    "bar-updates",
    "statistics",
    "academic",
    "events",
    "other",
  ],
  conditional: {
    deals: { visibleFor: ["الأنظمة التجارية والأعمال", "نظام الاستثمار"] },
  },
} as const;

type ConditionalRules = Record<string, { visibleFor: readonly string[] }>;

export function isConditionalSource(sourceKey: string): boolean {
  return sourceKey in (sourceSpecialtyMap.conditional as ConditionalRules);
}

// بلا تخصص مختار تُعرض جميع المصادر؛ ومع تخصص: العامة دائماً والمشروطة حسب خريطتها
export function isSourceVisible(sourceKey: string, specialty: string): boolean {
  if (!specialty) return true;
  const rule = (sourceSpecialtyMap.conditional as ConditionalRules)[sourceKey];
  if (!rule) return true;
  return rule.visibleFor.includes(specialty);
}
