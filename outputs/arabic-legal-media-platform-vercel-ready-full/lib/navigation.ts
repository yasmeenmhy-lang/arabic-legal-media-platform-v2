import {
  AlertTriangle,
  BarChart3,
  Blocks,
  Bot,
  CalendarDays,
  FileCheck2,
  Files,
  Gauge,
  LayoutDashboard,
  Library,
  Megaphone,
  Send,
  Sparkles
} from "lucide-react";

export const platformTitle = "منصة إدارة وتمكين الحضور الإعلامي والإعلاني للمحامين";

export const navItems = [
  { title: "لوحة التحكم", href: "/dashboard", icon: LayoutDashboard },
  { title: "مساعد المحتوى", href: "/ai-assistant", icon: Bot },
  { title: "التخطيط الإعلامي", href: "/media-planning", icon: CalendarDays },
  { title: "مراجعة المحتوى", href: "/content-review", icon: FileCheck2 },
  { title: "إدارة المحتوى", href: "/content-management", icon: Files },
  { title: "إدارة النشر", href: "/publishing", icon: Send },
  { title: "الحملات", href: "/campaigns", icon: Megaphone },
  { title: "استوديو المحتوى", href: "/studio", icon: Blocks },
  { title: "مكتبة المحتوى", href: "/library", icon: Library },
  { title: "التحليلات", href: "/analytics", icon: BarChart3 },
  { title: "التوصيات", href: "/recommendations", icon: Sparkles },
  { title: "مركز التنبيهات", href: "/alerts", icon: AlertTriangle },
  { title: "مؤشرات القطاع", href: "/sector-analytics", icon: Gauge, permission: "sector:view" }
];
