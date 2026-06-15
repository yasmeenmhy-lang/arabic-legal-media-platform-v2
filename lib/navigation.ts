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
  { title: "التخطيط الإعلامي", href: "/media-planning", icon: CalendarDays },
  { title: "إدارة الحملات", href: "/campaigns", icon: Megaphone },
  { title: "إنشاء المحتوى", href: "/studio", icon: Files },
  { title: "مساعد الإعلام القانوني", href: "/ai-assistant", icon: Bot },
  { title: "مراجعة المحتوى", href: "/content-review", icon: FileCheck2 },
  { title: "الامتثال القانوني", href: "/legal-compliance", icon: ShieldCheck },
  { title: "تقييم المخاطر", href: "/risk-assessment", icon: AlertTriangle },
  { title: "مسار الاعتماد", href: "/approval-workflow", icon: CheckCircle2 },
  { title: "مركز التصدير", href: "/export-center", icon: UploadCloud },
  { title: "مركز المشاركة الاجتماعية", href: "/social-media", icon: Share2 },
  { title: "قاعدة المعرفة القانونية", href: "/library", icon: Library },
  { title: "التحليلات والتقارير", href: "/analytics", icon: BarChart3 },
  { title: "التوصيات", href: "/recommendations", icon: Gauge },
  { title: "الإدارة والإعدادات", href: "/administration", icon: Settings },
  { title: "مركز التنبيهات", href: "/alerts", icon: AlertTriangle },
  { title: "مؤشرات القطاع", href: "/sector-analytics", icon: Gauge, permission: "sector:view" }
];
