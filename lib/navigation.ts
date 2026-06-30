import {
  Bell,
  CalendarRange,
  FileCheck2,
  FileClock,
  LayoutDashboard,
  Link2,
  Sparkles
} from "lucide-react";

export const platformTitle = "إدارة المحتوى الإعلامي والإعلاني للمحامين";

// Lawyer-facing navigation only. The platform-owner /admin dashboard and any
// user/role management are intentionally absent here; regular users must never
// see platform-owner administration unless they access the protected /admin URL.
export const navItems = [
  { title: "لوحة التحكم", href: "/dashboard", icon: LayoutDashboard, group: "الرئيسية" },
  { title: "استوديو المحتوى المهني", href: "/content-studio", icon: Sparkles, group: "الرئيسية" },
  { title: "التحليل التفصيلي للمحتوى المهني", href: "/content-review", icon: FileCheck2, group: "الرئيسية" },
  { title: "التخطيط والنشر", href: "/calendar", icon: CalendarRange, group: "الرئيسية" },
  { title: "سجل المحتوى المهني", href: "/content-management", icon: FileClock, group: "الرئيسية" },
  { title: "التنبيهات", href: "/alerts", icon: Bell, group: "المتابعة" },
  { title: "الوصول السريع", href: "/library", icon: Link2, group: "الحوكمة" }
];
