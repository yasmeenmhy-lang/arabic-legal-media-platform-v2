import {
  BarChart3,
  CalendarRange,
  ClipboardCheck,
  FileCheck2,
  FileClock,
  LayoutDashboard,
  Lightbulb,
  Library,
  MessageSquareText,
  Radio,
  Settings,
  Share2,
  ShieldAlert,
  ShieldCheck
} from "lucide-react";

export const platformTitle = "منصة تمكين وإدارة المحتوى الإعلامي والإعلاني للمحامين";

// Lawyer-facing navigation only. The platform-owner /admin dashboard and any
// user/role management are intentionally absent here — regular users must
// never see them (reachable only via the password-gated /admin URL directly).
export const navItems = [
  { title: "لوحة التحكم", href: "/dashboard", icon: LayoutDashboard, group: "الرئيسية" },
  { title: "مراجعة المحتوى الإعلامي والإعلاني", href: "/content-review", icon: FileCheck2, group: "المراجعة" },
  { title: "نتائج المراجعة التنفيذية", href: "/review-results", icon: ClipboardCheck, group: "المراجعة" },
  { title: "مساعد المراجعة المهنية", href: "/ai-assistant", icon: MessageSquareText, group: "المراجعة" },
  { title: "سجل المراجعات والمسودات", href: "/content-management", icon: FileClock, group: "المراجعة" },
  { title: "ملاحظات الامتثال", href: "/legal-compliance", icon: ShieldCheck, group: "المراجعة" },
  { title: "مؤشرات المخاطر", href: "/risk-assessment", icon: ShieldAlert, group: "المراجعة" },
  { title: "فرص التحسين", href: "/recommendations", icon: Lightbulb, group: "المراجعة" },
  { title: "المراجع وقاعدة المعرفة القانونية", href: "/library", icon: Library, group: "المراجع" },
  { title: "التقويم والحملات الإعلامية", href: "/calendar", icon: CalendarRange, group: "التخطيط والنشر" },
  { title: "دعم النشر والجدولة", href: "/publishing", icon: Radio, group: "التخطيط والنشر" },
  { title: "المشاركة الاجتماعية والتصدير", href: "/social-media", icon: Share2, group: "التخطيط والنشر" },
  { title: "التقارير والمؤشرات", href: "/analytics", icon: BarChart3, group: "المؤشرات" },
  { title: "الحوكمة والتنبيهات", href: "/administration", icon: Settings, group: "الحوكمة" }
];
