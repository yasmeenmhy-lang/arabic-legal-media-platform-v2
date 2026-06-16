import {
  BarChart3,
  Bell,
  BookOpen,
  CalendarRange,
  ClipboardCheck,
  CalendarDays,
  FileCheck2,
  FileClock,
  Files,
  LayoutDashboard,
  Library,
  Lightbulb,
  Megaphone,
  MessageSquareText,
  Radio,
  Settings,
  Share2,
  ShieldAlert,
  ShieldCheck,
  UploadCloud,
  Users
} from "lucide-react";

export const platformTitle = "منصة تمكين وإدارة المحتوى الإعلامي والإعلاني للمحامين";

export const navItems = [
  { title: "لوحة التحكم", href: "/dashboard", icon: LayoutDashboard, group: "الرئيسية" },
  { title: "مراجعة المحتوى الإعلامي والإعلاني", href: "/content-review", icon: FileCheck2, group: "المراجعة" },
  { title: "نتائج المراجعة التنفيذية", href: "/review-results", icon: ClipboardCheck, group: "المراجعة" },
  { title: "مساعد المراجعة المهنية", href: "/ai-assistant", icon: MessageSquareText, group: "المراجعة" },
  { title: "سجل المراجعات والمسودات", href: "/content-management", icon: FileClock, group: "المراجعة" },
  { title: "ملاحظات الامتثال", href: "/legal-compliance", icon: ShieldCheck, group: "المراجعة" },
  { title: "مؤشرات المخاطر", href: "/risk-assessment", icon: ShieldAlert, group: "المراجعة" },
  { title: "فرص التحسين", href: "/recommendations", icon: Lightbulb, group: "المراجعة" },
  { title: "المراجع المهنية والتنظيمية", href: "/library", icon: Library, group: "المراجع" },
  { title: "قاعدة المعرفة القانونية", href: "/studio", icon: BookOpen, group: "المراجع" },
  { title: "التخطيط الإعلامي", href: "/media-planning", icon: CalendarDays, group: "التخطيط والنشر" },
  { title: "التقويم التفاعلي", href: "/calendar", icon: CalendarRange, group: "التخطيط والنشر" },
  { title: "دعم تخطيط الحملات", href: "/campaigns", icon: Megaphone, group: "التخطيط والنشر" },
  { title: "دعم النشر والجدولة", href: "/publishing", icon: Radio, group: "التخطيط والنشر" },
  { title: "مركز المشاركة الاجتماعية", href: "/social-media", icon: Share2, group: "التخطيط والنشر" },
  { title: "مركز التصدير", href: "/export-center", icon: UploadCloud, group: "التخطيط والنشر" },
  { title: "التقارير والمؤشرات", href: "/analytics", icon: BarChart3, group: "المؤشرات" },
  { title: "مؤشرات القطاع", href: "/sector-analytics", icon: Files, group: "المؤشرات" },
  { title: "التنبيهات", href: "/alerts", icon: Bell, group: "الحوكمة" },
  { title: "الحوكمة والإعدادات", href: "/administration", icon: Settings, group: "الحوكمة" },
  { title: "إدارة المستخدمين", href: "/approval-workflow", icon: Users, group: "الحوكمة" }
];
