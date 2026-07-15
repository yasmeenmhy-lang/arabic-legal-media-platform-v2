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

// ربط فروع «تخصص الخبر العالمي» بالتخصص الحاكم — بقرار مالكة المنصة: التخصص يحكم
// كل شيء، وفرع الخبر العالمي زاوية مصدر يجب أن تكون من داخل مجال التخصص.
// الفروع غير المذكورة هنا عامة تصلح لكل التخصصات (تشريعات جديدة، أحكام دولية،
// مستجدات المهنة، مؤتمرات، جوائز) فتظهر دائماً.
export const globalSubSpecialtyMap: Record<string, readonly string[]> = {
  acquisitions: ["الأنظمة التجارية والأعمال", "نظام الاستثمار"],
  "trade-law": ["الأنظمة التجارية والأعمال", "نظام الاستثمار"],
  "investment-law": ["نظام الاستثمار", "الأنظمة التجارية والأعمال"],
  arbitration: ["التحكيم وتسوية المنازعات", "الأنظمة التجارية والأعمال"],
  "ip-law": ["الملكية الفكرية", "الأنظمة التقنية وحماية البيانات"],
  "tech-law": ["الأنظمة التقنية وحماية البيانات", "الملكية الفكرية"],
  "env-law": ["العقار والتطوير العمراني", "الأنظمة التجارية والأعمال"],
  "human-rights": ["الأنظمة الجزائية", "الأحوال الشخصية"],
};

export function isGlobalSubVisible(subKey: string, specialty: string): boolean {
  if (!specialty) return true;
  const allowed = globalSubSpecialtyMap[subKey];
  if (!allowed) return true;
  return allowed.includes(specialty);
}
