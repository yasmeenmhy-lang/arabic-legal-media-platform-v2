import {
  FileCheck2,
  FileClock,
  Link2,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";

export const platformTitle = "إدارة المحتوى الإعلامي والإعلاني للمحامين";

// Lawyer-facing navigation only. Platform-owner administration lives in
// `adminNavItems` below and is rendered exclusively for admin-role sessions;
// regular users must never see it.
export const navItems = [
  { title: "مركز المحتوى الإعلامي والإعلاني", href: "/content-center", icon: Sparkles, group: "الرئيسية" },
  { title: "التحليل التفصيلي للمحتوى المهني", href: "/analysis", icon: FileCheck2, group: "الرئيسية" },
  { title: "سجل المحتوى المهني", href: "/records", icon: FileClock, group: "الرئيسية" },
  { title: "الوصول السريع", href: "/library", icon: Link2, group: "الحوكمة" }
];

// ★ بنود المالكة (بقرارها): تظهر لحساب دوره «مدير» حصراً، ولا يراها أي حساب آخر.
// إخفاؤها هنا ليس هو الحماية — حارس المنصة يمنع غير المدير من /admin/access،
// ولوحة الإدارة تطلب كلمة مرور المدير فوق ذلك. البند اختصار طريق لا باب مفتوح.
export const adminNavItems = [
  { title: "لوحة الإدارة", href: "/admin", icon: ShieldCheck, group: "إدارة المنصة" },
  { title: "إدارة الوصول", href: "/admin/access", icon: Users, group: "إدارة المنصة" }
];
