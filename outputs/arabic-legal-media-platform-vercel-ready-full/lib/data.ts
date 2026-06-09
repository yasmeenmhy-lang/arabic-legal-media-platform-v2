import type { ModuleCard } from "@/lib/types";

export const dashboardKpis = [
  { label: "مهام بانتظارك", value: "8", hint: "مراجعات وجدولة" },
  { label: "مسودات نشطة", value: "24", hint: "قابلة للتحسين" },
  { label: "منشورات مجدولة", value: "11", hint: "خلال 14 يوما" },
  { label: "تنبيهات عالية", value: "3", hint: "تحتاج إجراء" }
];

export const moduleCards: ModuleCard[] = [
  {
    title: "مساعد المحتوى الذكي",
    href: "/ai-assistant",
    description: "إنشاء وإعادة صياغة وتلخيص محتوى مهني وإعلاني.",
    metric: "42 طلبا",
    status: "نشط"
  },
  {
    title: "التخطيط الإعلامي",
    href: "/media-planning",
    description: "خطط أسبوعية وشهرية مع تقويم وقائمة ومسار زمني.",
    metric: "6 خطط",
    status: "قيد التنفيذ"
  },
  {
    title: "مراجعة المحتوى",
    href: "/content-review",
    description: "كشف العبارات عالية المخاطر والتوصية بتحسينات امتثالية.",
    metric: "15 مراجعة",
    status: "يتطلب متابعة"
  },
  {
    title: "إدارة النشر",
    href: "/publishing",
    description: "جدولة المحتوى ومتابعة الطابور وحالة النشر.",
    metric: "11 مجدول",
    status: "مستقر"
  }
];

export const contentRows = [
  { title: "كيف تحمي شركتك بعقد واضح", category: "توعوي", status: "تمت المراجعة", owner: "أحمد الحربي" },
  { title: "أخطاء شائعة في الإعلانات القانونية", category: "تعليمي", status: "مسودة", owner: "أحمد الحربي" },
  { title: "إعلان استشارة للشركات الناشئة", category: "إعلاني", status: "مجدول", owner: "أحمد الحربي" }
];

export const alerts = [
  { title: "محتوى عالي المخاطر", body: "عبارة تتضمن ضمان نتيجة تحتاج تعديل قبل النشر.", severity: "HIGH" },
  { title: "مراجعة معلقة", body: "يوجد 5 محتويات بانتظار قرار المشرف.", severity: "MEDIUM" },
  { title: "فشل نشر", body: "تعذر نشر منشور LinkedIn التجريبي بسبب اتصال غير مفعل.", severity: "MEDIUM" }
] as const;

export const recommendations = [
  "تحويل المقال الطويل إلى سلسلة منشورات تعليمية قصيرة.",
  "نشر محتوى توعوي يوم الثلاثاء صباحا بناء على التفاعل السابق.",
  "تخفيف اللغة الإعلانية واستبدال الوعود بنتائج محتملة بصياغة مهنية."
];

export const sectorMetrics = [
  { label: "حجم المحتوى", value: "12,840", trend: "+18%" },
  { label: "توزيع المخاطر المنخفضة", value: "71%", trend: "+6%" },
  { label: "معدل تبني الأدوات", value: "54%", trend: "+11%" },
  { label: "موضوعات ناشئة", value: "32", trend: "+9%" }
];
