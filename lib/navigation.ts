import {
  CalendarDays,
  FileCheck2,
  FileClock,
  Link2,
  Sparkles
} from "lucide-react";

export const platformTitle = "إدارة المحتوى الإعلامي والإعلاني للمحامين";

// Lawyer-facing navigation only. The platform-owner /admin dashboard and any
// user/role management are intentionally absent here; regular users must never
// see platform-owner administration unless they access the protected /admin URL.
export const navItems = [
  { title: "مركز المحتوى الإعلامي والإعلاني", href: "/content-studio", icon: Sparkles, group: "الرئيسية" },
  { title: "التحليل التفصيلي للمحتوى المهني", href: "/content-review", icon: FileCheck2, group: "الرئيسية" },
  { title: "مركز التخطيط الإعلامي والإعلاني", href: "/calendar-v2", icon: CalendarDays, group: "الرئيسية" },
  { title: "سجل المحتوى المهني", href: "/content-management", icon: FileClock, group: "الرئيسية" },
  { title: "الوصول السريع", href: "/library", icon: Link2, group: "الحوكمة" }
];
