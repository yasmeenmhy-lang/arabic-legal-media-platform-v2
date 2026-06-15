import {
  AlertTriangle,
  BarChart3,
  Bot,
  CalendarDays,
  CheckCircle2,
  FileCheck2,
  Files,
  Gauge,
  LayoutDashboard,
  Library,
  Megaphone,
  Settings,
  Share2,
  ShieldCheck,
  UploadCloud
} from "lucide-react";

export const platformTitle = "منصة تمكين الإعلام القانوني للمحامين";

export const navItems = [
  { title: "لوحة التحكم", href: "/dashboard", icon: LayoutDashboard },
  { title: "مقترحات التخطيط الإعلامي", href: "/media-planning", icon: CalendarDays },
  { title: "دعم تخطيط الحملات", href: "/campaigns", icon: Megaphone },
  { title: "مراجعة وتحسين المحتوى", href: "/studio", icon: Files },
  { title: "مساعد مراجعة المحتوى الإعلامي", href: "/ai-assistant", icon: Bot },
  { title: "مراجعة المحتوى الإعلامي", href: "/content-review", icon: FileCheck2 },
  { title: "ملاحظات الامتثال", href: "/legal-compliance", icon: ShieldCheck },
  { title: "مؤشرات المخاطر", href: "/risk-assessment", icon: AlertTriangle },
  { title: "ملخص المراجعة", href: "/approval-workflow", icon: CheckCircle2 },
  { title: "مركز التصدير", href: "/export-center", icon: UploadCloud },
  { title: "مركز المشاركة الاجتماعية", href: "/social-media", icon: Share2 },
  { title: "المراجع المهنية والتنظيمية", href: "/library", icon: Library },
  { title: "التحليلات والتقارير", href: "/analytics", icon: BarChart3 },
  { title: "فرص التحسين", href: "/recommendations", icon: Gauge },
  { title: "الحوكمة والإعدادات", href: "/administration", icon: Settings },
  { title: "مركز التنبيهات", href: "/alerts", icon: AlertTriangle },
  { title: "مؤشرات القطاع", href: "/sector-analytics", icon: Gauge, permission: "sector:view" }
];
