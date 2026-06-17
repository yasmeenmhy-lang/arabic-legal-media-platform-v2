import {
  BarChart3,
  Bell,
  CalendarRange,
  FileCheck2,
  FileClock,
  LayoutDashboard,
  Link2,
  Settings
} from "lucide-react";

export const platformTitle = "منصة تمكين وإدارة المحتوى الإعلامي والإعلاني للمحامين";

// Lawyer-facing navigation only. The platform-owner /admin dashboard and any
// user/role management are intentionally absent here; regular users must never
// see platform-owner administration unless they access the protected /admin URL.
export const navItems = [
  { title: "لوحة التحكم", href: "/dashboard", icon: LayoutDashboard, group: "الرئيسية" },
  { title: "المراجعة", href: "/content-review", icon: FileCheck2, group: "الرئيسية" },
  { title: "السجل", href: "/content-management", icon: FileClock, group: "الرئيسية" },
  { title: "التخطيط والنشر", href: "/calendar", icon: CalendarRange, group: "الرئيسية" },
  { title: "التقارير", href: "/analytics", icon: BarChart3, group: "المتابعة" },
  { title: "التنبيهات", href: "/alerts", icon: Bell, group: "المتابعة" },
  { title: "الإعدادات", href: "/administration", icon: Settings, group: "الحوكمة" },
  { title: "الوصول السريع", href: "/library", icon: Link2, group: "الحوكمة" }
];
