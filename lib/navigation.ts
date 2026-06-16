import { BarChart3, CalendarDays, FileCheck2, LayoutDashboard, Settings } from "lucide-react";

export const platformTitle = "منصة تمكين وإدارة المحتوى الإعلامي والإعلاني للمحامين";

export const navItems = [
  { title: "لوحة التحكم", href: "/dashboard", icon: LayoutDashboard },
  { title: "مراجعة المحتوى الإعلامي والإعلاني", href: "/content-review", icon: FileCheck2 },
  { title: "التخطيط الإعلامي", href: "/media-planning", icon: CalendarDays },
  { title: "التقارير والمؤشرات", href: "/analytics", icon: BarChart3 },
  { title: "الحوكمة والإعدادات", href: "/administration", icon: Settings, permission: "admin:manage" }
];
