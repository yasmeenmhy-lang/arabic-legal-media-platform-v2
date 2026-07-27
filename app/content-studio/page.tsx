"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart2,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Edit3,
  Eye,
  FileCheck2,
  FileText,
  Globe,
  GraduationCap,
  HeartHandshake,
  Image as ImageIcon,
  Layers,
  Megaphone,
  MessageSquare,
  Save,
  Scale,
  Sparkles,
  TrendingUp,
  User,
  Users,
  Trash2,
  Upload,
  Video,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { Button, ButtonLink, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import {
  InstagramIcon,
  LinkedInIcon,
  SnapchatIcon,
  TikTokIcon,
  XIcon,
  YouTubeIcon,
} from "@/components/social-icons";
import { contentKindOptions, contentKindLabels } from "@/lib/content-types";
import { extractTextNodes, applyEdits } from "@/components/editable-visual";
import { QUOTE_INTEGRITY_NOTICE } from "@/lib/quote-notice";
import type { VisualPlan } from "@/lib/visual-translator";
import { isConditionalSource, isGlobalSubVisible, isSourceVisible, isSourceVisibleForContentType } from "@/lib/source-specialty-map";
import { FieldLabel } from "@/components/field-label";
import { SourcesPanel, type Source } from "@/components/sources-panel";
import type { SourceDossier } from "@/lib/source-dossier";
import { PublishAcknowledgment, acknowledgmentTextFor, type AckTier } from "@/components/publish-acknowledgment";
import { PreviewToggleButton, ReadingPreview } from "@/components/text-preview";
import { CostNotice } from "@/components/cost-notice";
import { MobileSelect, ChannelGlyph } from "@/components/mobile-select";
import { specialties } from "@/lib/specialties";
import {
  approveContentVersion,
  attachVisualsToVersion,
  DEMO_USER_NAME,
  getActiveContentSelection,
  loadContentRecords,
  markContentShared,
  saveContentRecords,
  setActiveContentSelection,
  upsertAnalyzedVersion,
  type StoredContentRecord,
  type StoredContentVersion,
  type StoredVisual,
} from "@/lib/content-record-store";
import { saveLatestReviewSnapshot } from "@/components/review-context-summary";
import { StudioResultsDashboard } from "@/components/content-studio/StudioResultsDashboard";
import { scopedKey } from "@/lib/user-scope";
import { normalizeReviewResult } from "@/lib/review-normalizer";
import { riskDisplayLabel, hasNoRisks, type ContentKind, type ReviewResult, type RiskAffectedParty, type RiskLevel } from "@/lib/types";

// ── Constants ──────────────────────────────────────────────────────────────

// تسميات محركات المرئيات — تُستخدم عند حفظ المرئيات مع المحتوى في السجل
const VISUAL_ENGINE_LABELS: Record<string, string> = {
  infographic: "إنفوغراف", chart: "رسم بياني", mindmap: "خريطة ذهنية",
  image: "صورة بالذكاء الاصطناعي", quote_card: "بطاقة اقتباس", carousel: "كاروسيل",
  storyboard: "ستوري بورد", motion_script: "مخطط موشن جرافيك",
};

// أنواع المرئيات موسومة «قريبًا» بقرار المالكة (جودتها تحتاج عملاً أكثر) — تُعرض معطّلة
// غير مفعّلة الآن، وتُفعَّل لاحقاً عند اكتمال جودتها.
const SOON_KINDS = new Set<ContentKind>(["visual_content", "infographic", "publishing_plan", "script"]);

const studioContentTypes = contentKindOptions
  .filter((item) =>
    (
      [
        "post",
        "statement",
        "diary",
        "advertisement",
        "campaign",
        "article",
        "script",
        "caption",
        "visual_content",
        "infographic",
        "publishing_plan",
      ] as ContentKind[]
    ).includes(item.value)
  )
  .map((item) => ({
    value: item.value,
    label: SOON_KINDS.has(item.value) ? `${item.label} · قريبًا` : item.label,
    disabled: SOON_KINDS.has(item.value),
  }));

const channels = ["LinkedIn", "X", "Instagram", "TikTok", "Snapchat", "YouTube", "الموقع الإلكتروني"];

// وجهات طويلة مفتوحة الطول (لا حدّ حروف) — الطول يقرّره الذكاء أو يُترك اختيارياً
const OPEN_LENGTH_CHANNELS = new Set(["الموقع الإلكتروني"]);

// مؤشّر تقدّم دائري بنسبة مئوية — النسبة تقديرية زمنية (المحرك لا يُبلّغ نسبة دقيقة):
// يرتفع بسرعة ثم يتباطأ ويتوقّف عند ٩٥٪ حتى يكتمل العمل فعلاً فتظهر النتيجة (نمط منتجات احترافية).
function ProgressRing({ label, sub, color = "palm", estMs = 45000 }: { label: string; sub?: string; color?: "palm" | "violet"; estMs?: number }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => {
      const elapsed = Date.now() - start;
      setPct(Math.min(95, Math.round(95 * (1 - Math.exp(-elapsed / (estMs / 2.5))))));
    }, 350);
    return () => clearInterval(id);
  }, [estMs]);
  const R = 42, C = 2 * Math.PI * R;
  const stroke = color === "violet" ? "#80519F" : "#25935F";
  const track = color === "violet" ? "#F9F5FA" : "#F3FCF6";
  return (
    <div className="flex flex-col items-center gap-3 py-8">
      <div className="relative h-28 w-28">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle cx="50" cy="50" r={R} fill="none" stroke={track} strokeWidth="8" />
          <circle cx="50" cy="50" r={R} fill="none" stroke={stroke} strokeWidth="8" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} style={{ transition: "stroke-dashoffset .35s ease" }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold tabular-nums text-ink">{pct}%</span>
        </div>
      </div>
      <p className="text-sm font-medium text-ink/70">{label}</p>
      {sub ? <p className="max-w-xs text-center text-xs leading-5 text-ink/45">{sub}</p> : null}
    </div>
  );
}

// ── خريطة المواءمة contentType → supportedVisualOutputs ──
// نوع المحتوى في أعلى الصفحة هو مصدر الحقيقة: كل نوع يرى مخرجاته الداعمة المناسبة فقط.
// engine = المحرك الموجود فعلاً الذي ينفذ الخيار؛ غيابه يعني «قريبًا» (يُعرض معطلاً بلا توليد).
// premium = يتطلب مزود المرئي الاحترافي (OpenAI) متحققاً — يُعطل تلقائياً عند تعطله.
type VisualOutputOption = {
  key: string;
  label: string;
  hint?: string;
  engine?: "infographic" | "chart" | "mindmap" | "image" | "quote_card" | "carousel" | "storyboard" | "motion_script";
  premium?: boolean;
};
type VisualOutputsSpec = { title: string; optIn: string; options: VisualOutputOption[] };

const VISUAL_KIND_OUTPUTS: VisualOutputsSpec = {
  // «رسم توضيحي»: امتداد قسم «إعداد المرئيات والمخططات» نفسه — لا قسم ترجمة منفصل
  title: "إعداد المرئيات والمخططات — التوليد",
  optIn: "",
  options: [
    { key: "infographic", label: "إنفوغراف", hint: "بطاقات منظّمة", engine: "infographic" },
    { key: "chart", label: "رسم بياني", hint: "Bar / Line / Pie", engine: "chart" },
    { key: "mindmap", label: "خريطة ذهنية", hint: "شبكة إشعاعية", engine: "mindmap" },
    { key: "image", label: "صورة", hint: "بالذكاء الاصطناعي", engine: "image", premium: true },
  ],
};

const GENERIC_TEXT_OUTPUTS: VisualOutputsSpec = {
  title: "حوّل هذا النص إلى مرئي داعم",
  optIn: "حوّل هذا النص إلى مرئي داعم (اختياري)",
  options: [
    { key: "infographic", label: "إنفوغراف داعم", hint: "بطاقات منظّمة", engine: "infographic" },
    { key: "chart", label: "رسم بياني", hint: "إذا وجدت أرقام", engine: "chart" },
    { key: "mindmap", label: "خريطة ذهنية", hint: "شبكة إشعاعية", engine: "mindmap" },
  ],
};

const SUPPORTED_VISUAL_OUTPUTS: Partial<Record<ContentKind, VisualOutputsSpec>> = {
  script: {
    title: "مخرجات داعمة للفيديو",
    optIn: "مخرجات داعمة للفيديو (اختياري)",
    options: [
      { key: "scene_summary", label: "ملخص بصري للمشاهد", engine: "infographic" },
      { key: "video_cover", label: "صورة غلاف للفيديو", engine: "image", premium: true },
      { key: "storyboard", label: "ستوري بورد", engine: "storyboard" },
      { key: "scene_cards", label: "بطاقات مشاهد", engine: "carousel" },
      { key: "motion_graphics", label: "موشن جرافيك", hint: "مخطط لقطات", engine: "motion_script" },
    ],
  },
  article: {
    title: "حوّل هذا النص إلى مرئي داعم",
    optIn: "حوّل هذا النص إلى مرئي داعم (اختياري)",
    options: [
      { key: "summary_infographic", label: "إنفوجرافيك ملخص", engine: "infographic" },
      { key: "concept_map", label: "خريطة مفاهيم", engine: "mindmap" },
      { key: "numbers_chart", label: "رسم بياني", hint: "إذا وجدت أرقام", engine: "chart" },
      { key: "quote_card", label: "بطاقة اقتباس", engine: "quote_card" },
      { key: "carousel", label: "كاروسيل", engine: "carousel" },
    ],
  },
  post: {
    title: "حوّل هذا النص إلى مرئي داعم",
    optIn: "حوّل هذا النص إلى مرئي داعم (اختياري)",
    options: [
      { key: "simple_infographic", label: "إنفوجرافيك مبسط", engine: "infographic" },
      { key: "cover_image", label: "صورة غلاف", engine: "image", premium: true },
      { key: "awareness_card", label: "بطاقة توعوية", engine: "quote_card" },
      { key: "short_carousel", label: "كاروسيل قصير", engine: "carousel" },
    ],
  },
  // «محتوى بصري»: المرئي هو المنتج — الكتالوج الخلاق الكامل لترجمة النص المقترح،
  // المتاح يعمل فوراً والقادم موسوم «قريبًا» حتى تُبنى مراحله بقرار مالكة المنصة
  visual_content: {
    title: "ترجمة المحتوى بصرياً — تحويل النص المقترح إلى مرئي",
    optIn: "",
    options: [
      { key: "infographic", label: "إنفوغراف", hint: "بطاقات منظّمة", engine: "infographic" },
      { key: "chart", label: "رسم بياني", hint: "Bar / Line / Pie", engine: "chart" },
      { key: "mindmap", label: "خريطة ذهنية", hint: "شبكة إشعاعية", engine: "mindmap" },
      { key: "image", label: "صورة", hint: "بالذكاء الاصطناعي", engine: "image", premium: true },
      { key: "quote_card", label: "بطاقة اقتباس", engine: "quote_card" },
      { key: "carousel", label: "كاروسيل", engine: "carousel" },
      { key: "storyboard", label: "ستوري بورد", engine: "storyboard" },
      { key: "motion_graphics", label: "موشن جرافيك", hint: "مخطط لقطات", engine: "motion_script" },
    ],
  },
};

const CHANNEL_CHAR_LIMITS: Partial<Record<string, number>> = {
  X: 280,
  Snapchat: 250,
  Instagram: 2200,
  TikTok: 2200,
  LinkedIn: 3000,
  YouTube: 5000,
};

const charLimitPresets = [
  { key: "x", label: "X · 280", value: 280 },
  { key: "snap", label: "Snapchat · 250", value: 250 },
  { key: "insta-tiktok", label: "Instagram / TikTok · 2200", value: 2200 },
  { key: "li", label: "LinkedIn · 3000", value: 3000 },
];
const audiences = ["عملاء محتملون من الأفراد", "منشآت ورواد أعمال", "زملاء والقطاع العدلي", "الجمهور العام"];
const purposes = [
  "تثقيف الجمهور حول موضوع نظامي",
  "رفع الوعي بالخدمات المهنية",
  "تعزيز الحضور المهني والثقة",
  "حملة توعوية",
  "التعليق على المستجدات النظامية والقضائية",
  "مشاركة معرفية وأكاديمية",
  "التعريف بالخبرات والمشاركات المهنية",
  "مساهمة مجتمعية وعمل تطوعي",
];


type SourceEntry = { key: string; label: string; icon: string; subs?: { key: string; label: string }[] };

// بنية المرئي المُعادة من محرك الرسم — تُستخدم لبناء PowerPoint بعناصر أصلية قابلة للتعديل
type VisualStructure =
  | { type: "chart"; chartType: string; data: { title: string; yLabel: string; data: { label: string; value: number }[] } }
  | { type: "mindmap"; data: { title?: string; center: string; branches: { label: string; sub1?: string; sub2?: string }[] } }
  | { type: "infographic"; data: { title: string; subtitle: string; sections: { heading: string; line1: string; line2: string; line3?: string; stat?: string }[]; source: string } }
  | { type: "carousel" | "storyboard" | "motion_script"; data: { title: string; subtitle?: string; cards: { tag?: string; heading?: string; line1?: string; line2?: string; meta?: string }[] } }
  | { type: "quote_card"; data: { title: string; quote: string; attribution?: string; note?: string } };

const contentSources: SourceEntry[] = [
  { key: "ai-original", label: "ابتكر من الذكاء الاصطناعي", icon: "🤖" },
  {
    key: "global-news",
    label: "أخبار نظامية عالمية",
    icon: "🌐",
    // زوايا خبر محايدة تنطبق على أي تخصص — مجال الخبر يأتي تلقائياً من «التخصص»
    // المختار أعلاه، فلا تظهر خيارات من خارج مجاله أبداً (بقرار مالكة المنصة).
    subs: [
      { key: "legislation", label: "تشريعات وأنظمة عالمية جديدة" },
      { key: "court-rulings", label: "حكم قضائي دولي بارز" },
      { key: "landmark-case", label: "قضية عالمية بارزة" },
      { key: "landmark-deal", label: "صفقة أو استحواذ عالمي بارز" },
      { key: "research", label: "دراسة أو اتجاه عالمي" },
      { key: "profession-news", label: "مستجدات مهنة المحاماة عالمياً" },
      { key: "conferences", label: "مؤتمر أو ملتقى دولي" },
      { key: "awards", label: "جائزة أو تكريم دولي" },
    ],
  },
  { key: "local-news", label: "أخبار نظامية محلية", icon: "📰" },
  { key: "rulings", label: "المبادئ والأحكام القضائية المنشورة", icon: "⚖️" },
  { key: "regulations", label: "أنظمة ولوائح جديدة", icon: "📜" },
  { key: "bar-updates", label: "مستجدات الهيئة السعودية للمحامين", icon: "🏛️" },
  { key: "deals", label: "صفقات واستحواذات", icon: "🤝" },
  { key: "statistics", label: "إحصائيات عدلية", icon: "📊" },
  { key: "academic", label: "مستجدات أكاديمية وبحثية", icon: "🎓" },
  { key: "events", label: "مناسبات ومحافل نظامية", icon: "📅" },
  { key: "other", label: "أخرى", icon: "🔍" },
];

// ── Suggested formats for review path ────────────────────────────────────

const suggestedFormats = [
  {
    key: "post-awareness",
    label: "منشور توعوي",
    template: `🔹 [عنوان الموضوع القانوني]

في إطار تعزيز الوعي القانوني، أشاركم اليوم حول [الموضوع]:

[اشرح المفهوم أو الإجراء القانوني بوضوح وإيجاز]

أبرز النقاط:
• [النقطة الأولى]
• [النقطة الثانية]
• [النقطة الثالثة]

📌 المرجع: [النظام أو اللائحة ذات الصلة]

للاستفسار أو الاستشارة المهنية، تواصلوا معنا.

#قانون #محاماة #السعودية`,
  },
  {
    key: "regulation-update",
    label: "تحديث نظامي",
    template: `📋 تحديث نظامي مهم

صدر مؤخراً [اسم النظام أو اللائحة] الذي يتضمن:

✅ [المستجد الأول]
✅ [المستجد الثاني]
✅ [المستجد الثالث]

⚠️ التأثير العملي: [كيف يؤثر هذا على الأفراد والمنشآت]

📅 تاريخ النفاذ: [التاريخ]

يُنصح بالاطلاع على النص الكامل والتواصل مع مستشار قانوني للتقييم.

#تشريع #نظام #المملكة_العربية_السعودية`,
  },
  {
    key: "professional-tip",
    label: "نصيحة مهنية",
    template: `💡 [العنوان: ما يجب أن يعرفه الجمهور]

كثيراً ما يغفل الناس عن [الموضوع]، وهذا قد يُعرّضهم لـ [العواقب القانونية].

الإجراء الصحيح:
[وضّح الخطوة أو الإجراء القانوني السليم]

الأساس القانوني: [النظام أو المادة ذات الصلة]

📌 هذه المعلومات للتوعية العامة ولا تُغني عن الاستشارة المتخصصة.

#نصيحة_قانونية #توعية_قانونية`,
  },
  {
    key: "case-summary",
    label: "خلاصة قضائية",
    template: `⚖️ خلاصة قضائية

موضوع القضية: [وصف موجز للنزاع أو الموضوع]

الوقائع الجوهرية:
[لخّص الوقائع الأساسية بموضوعية]

الحكم / الموقف القانوني:
[ما قررته المحكمة أو الجهة المختصة]

الدلالة القانونية:
[ما يمكن استخلاصه لصالح الممارسة القانونية]

📚 المصدر: [المحكمة — مع تجنب الكشف عن هوية الأطراف]

#قضاء #حكم_قضائي #قانون`,
  },
];

// ── Chip styles (mirror content-review) ───────────────────────────────────

const chipBase =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition focus-ring";
const chipIdle =
  "border-line bg-white text-ink/65 hover:border-palm hover:bg-mint hover:text-palm";
const chipSelected =
  "border-palm bg-mint text-palm shadow-[0_0_0_1px_theme(colors.palm)]";

// نسخة سطح المكتب من القائمة المنسدلة — نفس مكوّن الجوال (MobileSelect) تنسيقاً وسلوكاً،
// لكنها تظهر على الحاسب فقط (hidden lg:block) بينما تبقى الشرائح على اللوحي والجوال.
// لا خيارات ولا قيم ولا دوال جديدة — نفس value/onChange/options للحقل نفسه.
function DesktopSelect({ value, onChange, placeholder, emptyLabel, options }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  options: { value: string; label: string; disabled?: boolean }[];
}) {
  return (
    <div className="relative hidden lg:block">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-line bg-white py-2.5 pl-9 pr-3 text-sm text-ink focus-ring"
      >
        {emptyLabel !== undefined ? (
          <option value="">{emptyLabel}</option>
        ) : (
          <option value="" disabled>{placeholder ?? "اختر"}</option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
    </div>
  );
}

// ── Icon maps ──────────────────────────────────────────────────────────────

const contentTypeIcons: Record<string, React.ReactNode> = {
  post: <FileText size={13} />,
  advertisement: <Megaphone size={13} />,
  campaign: <Layers size={13} />,
  article: <BookOpen size={13} />,
  script: <Video size={13} />,
  caption: <MessageSquare size={13} />,
  visual_content: <ImageIcon size={13} />,
  infographic: <BarChart2 size={13} />,
  publishing_plan: <CalendarDays size={13} />,
};

const channelIcons: Record<string, React.ReactNode> = {
  LinkedIn: <LinkedInIcon size={13} className="text-[#0A66C2]" />,
  X: <XIcon size={13} className="text-black" />,
  Instagram: <InstagramIcon size={13} className="text-[#E4405F]" />,
  TikTok: <TikTokIcon size={13} className="text-black" />,
  Snapchat: <SnapchatIcon size={13} className="text-[#E5CF00]" />,
  YouTube: <YouTubeIcon size={13} className="text-[#FF0000]" />,
  "الموقع الإلكتروني": <Globe size={13} className="text-palm" />,
};

const audienceIcons: Record<string, React.ReactNode> = {
  "عملاء محتملون من الأفراد": <User size={13} />,
  "منشآت ورواد أعمال": <Building2 size={13} />,
  "زملاء والقطاع العدلي": <Scale size={13} />,
  "الجمهور العام": <Users size={13} />,
};

const purposeIcons: Record<string, React.ReactNode> = {
  "تثقيف الجمهور حول موضوع نظامي": <BookOpen size={13} />,
  "رفع الوعي بالخدمات المهنية": <TrendingUp size={13} />,
  "تعزيز الحضور المهني والثقة": <Award size={13} />,
  "حملة توعوية": <Megaphone size={13} />,
  "التعليق على المستجدات النظامية والقضائية": <Scale size={13} />,
  "مشاركة معرفية وأكاديمية": <GraduationCap size={13} />,
  "التعريف بالخبرات والمشاركات المهنية": <Briefcase size={13} />,
  "مساهمة مجتمعية وعمل تطوعي": <HeartHandshake size={13} />,
};

// ── Helpers ────────────────────────────────────────────────────────────────

// تسميات معيارية قابلة للقياس — بقرار مالكة المنصة: لا أوصاف ذوقية (ممتاز/جيد/ضعيف)
function qualLabel(score: number) {
  if (score >= 85) return { label: "مستوفٍ بدرجة عالية", cls: "bg-green-100 text-green-800" };
  if (score >= 70) return { label: "مستوفٍ", cls: "bg-blue-100 text-blue-800" };
  if (score >= 50) return { label: "مستوفٍ جزئياً", cls: "bg-amber-100 text-amber-800" };
  return { label: "غير مستوفٍ", cls: "bg-red-100 text-red-800" };
}

function toneBorder(tone: "good" | "gold" | "warning" | "danger" | "neutral") {
  if (tone === "good") return "border-t-green-400";
  if (tone === "gold") return "border-t-amber-400";
  if (tone === "warning") return "border-t-[#F79009]";
  if (tone === "danger") return "border-t-red-400";
  return "border-t-slate-300";
}

function sevTag(severity: "critical" | "high" | "medium" | "low") {
  if (severity === "critical") return { label: "حرج", cls: "bg-red-100 text-red-800" };
  if (severity === "high") return { label: "مرتفع", cls: "bg-orange-100 text-orange-800" };
  if (severity === "medium") return { label: "متوسط", cls: "bg-amber-100 text-amber-800" };
  return { label: "منخفض", cls: "bg-slate-100 text-slate-600" };
}

// سلم المالكة: مرتفع أحمر، متوسط برتقالي، منخفض أصفر فاتح — والأخضر محجوز
// لانعدام المخاطر وحده (hasNoRisks)
function riskKpiTone(risk: RiskLevel) {
  if (risk === "بالغ" || risk === "حرج" || risk === "مرتفع") return "danger" as const;
  if (risk === "متوسط") return "warning" as const;
  return "gold" as const;
}

function languageKpiTone(value: number) {
  if (value >= 80) return "good" as const;
  if (value >= 60) return "neutral" as const;
  return "gold" as const;
}

function professionalismKpiTone(score: number): "good" | "gold" | "danger" {
  if (score >= 80) return "good";
  if (score >= 60) return "gold";
  return "danger";
}

function professionalismExplanation(score: number) {
  // عند الاستيفاء لا يُعرض «إصلاح مقترح» — بقرار مالكة المنصة: لا حاجة لتوجيه على نتيجة سليمة
  if (score >= 80) return { explanation: "الأسلوب يعكس الرصانة والوقار المهني وفق المعايير المهنية المعتمدة.", action: "" };
  // بقاعدة معادلة السياق التأسيسية: نوع المحتوى يحدد مقاييسه — لا يُطلب «أسلوب
  // أكاديمي» من منشور توعوي لجمهور عام؛ الإصلاح يوجَّه لمعايير النوع نفسه
  if (score >= 60) return { explanation: "الأسلوب بحاجة لتحسين ليعكس الرصانة والوقار المهني وفق المعايير المهنية المعتمدة.", action: "ارتقِ بالأسلوب ليعكس رصانة المهنة ووقارها بما يناسب نوع المحتوى وجمهوره وقناته — دون تغيير طبيعة النوع." };
  return { explanation: "الأسلوب لا يعكس الرصانة والوقار المهني اللائقين بمن يمثّل المهنة القانونية وفق المعايير المهنية المعتمدة.", action: "ارتقِ بالأسلوب ليعكس رصانة المهنة ووقارها وما يليق بمن يمثّل العدالة، بما يناسب نوع المحتوى وجمهوره وقناته." };
}

const categoryLabel: Record<string, string> = {
  spelling: "إملاء",
  grammar: "نحو",
  style: "أسلوب",
  readability: "وضوح",
  "اتساق المصطلحات": "مصطلحات",
};

function partyIcon(p: RiskAffectedParty) {
  if (p === "الموكل") return <User size={13} aria-hidden="true" />;
  if (p === "المحامي") return <Scale size={13} aria-hidden="true" />;
  return <Award size={13} aria-hidden="true" />;
}

// ضغط صورة للتخزين المحلي — علاج «المرئيات تختفي بعد الحفظ»: حصة المتصفح ~5MB
// والصورة الاحترافية الخام 1-3MB فكانت تُسقط عند الامتلاء؛ التصغير إلى 900px بصيغة JPEG
// يجعلها ~150KB فتُحفظ دائماً وتظهر في المسودة والسجل وكل المحطات.
function compressImageForStorage(url: string): Promise<string> {
  return new Promise((resolve) => {
    if (!url || (url.startsWith("data:") && url.length < 180_000)) { resolve(url); return; }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const maxSide = Math.max(img.naturalWidth || 1, img.naturalHeight || 1);
        const scale = Math.min(1, 900 / maxSide);
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round((img.naturalWidth || 900) * scale));
        canvas.height = Math.max(1, Math.round((img.naturalHeight || 900) * scale));
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(url); return; }
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const out = canvas.toDataURL("image/jpeg", 0.78);
        resolve(out.length < url.length ? out : url);
      } catch { resolve(url); }
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
}

function createDraftRecord(
  body: string,
  ctx: {
    kind: ContentKind | null; channel: string; audience: string; purpose: string;
    // كل معلومات السياق المدخلة تُحفظ مع المسودة — فلا تختفي عند فتحها لاحقاً
    specialty?: string; topic?: string; charLimit?: number | null; adCta?: string; adStyle?: string;
    scriptDuration?: string; scriptStyle?: string; articleLength?: string;
    // المصادر الموثوقة المرافقة — تنتقل مع المحتوى إلى التحليل التفصيلي
    webSources?: { title: string; url: string }[];
    // سجل حوكمة المصادر — تصريح المادة (١٠) وسياقه يُحفظان مع النسخة
    sourceGovernance?: StoredContentVersion["sourceGovernance"];
    sourceDossier?: SourceDossier;
  },
  // بقرار مالكة المنصة: المرئيات تنتقل مع المحتوى وتُحفظ في السجل فلا تختفي
  visuals: Omit<StoredVisual, "id" | "createdAt">[] = []
): string {
  const id = `studio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const timestamp = new Date().toISOString();
  const resolvedKind: ContentKind = ctx.kind ?? "post";
  const stampedVisuals: StoredVisual[] = visuals.map((v, i) => ({
    ...v,
    id: `${id}-visual-${i + 1}`,
    createdAt: timestamp,
  }));
  const version: StoredContentVersion = {
    id: `${id}-v1`,
    contentId: id,
    version: 1,
    body,
    contentType: resolvedKind,
    contentTypeLabel: contentKindLabels[resolvedKind],
    channel: ctx.channel || "LinkedIn",
    audience: ctx.audience || "الجمهور العام",
    purpose: ctx.purpose || "تثقيف الجمهور حول موضوع نظامي",
    specialty: ctx.specialty || undefined,
    topic: ctx.topic || undefined,
    charLimit: ctx.charLimit ?? null,
    adCta: ctx.adCta || undefined,
    adStyle: ctx.adStyle || undefined,
    scriptDuration: ctx.scriptDuration || undefined,
    scriptStyle: ctx.scriptStyle || undefined,
    articleLength: ctx.articleLength || undefined,
    status: "مسودة",
    createdAt: timestamp,
    updatedAt: timestamp,
    references: [],
    webSources: ctx.webSources,
    sourceGovernance: ctx.sourceGovernance,
    sourceDossier: ctx.sourceDossier,
    visuals: stampedVisuals.length ? stampedVisuals : undefined,
  };
  const record: StoredContentRecord = {
    id,
    title: body.slice(0, 60) + (body.length > 60 ? "..." : ""),
    currentVersion: 1,
    status: "مسودة",
    versions: [version],
    actions: [
      {
        id: `${id}-action-1`,
        action: "CREATED",
        label: "تم الإنشاء من مركز المحتوى",
        actor: DEMO_USER_NAME,
        at: timestamp,
        toStatus: "مسودة",
        details: stampedVisuals.length
          ? `حُفظت المرئيات مع المحتوى: ${stampedVisuals.map((v) => v.visualTypeLabel).join("، ")}`
          : undefined,
      },
    ],
    sharingStatus: "غير متاح",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const existing = loadContentRecords();
  try {
    saveContentRecords([...existing, record]);
  } catch {
    // حصة التخزين — تُسقط بيانات الصور الضخمة فقط ويبقى النص ومرئيات SVG
    version.visuals = version.visuals?.filter((v) => !v.imageUrl || v.imageUrl.length < 320_000);
    saveContentRecords([...existing, record]);
  }
  setActiveContentSelection(id, 1);
  return id;
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function ContentStudioPage() {
  const router = useRouter();

  // Shared context
  const [kind, setKind] = useState<ContentKind | null>(null);
  const [channel, setChannel] = useState("");
  const [audience, setAudience] = useState("");
  const [purpose, setPurpose] = useState("");
  const [specialty, setSpecialty] = useState("");

  // Type-specific fields
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>("");
  const [imageStyle, setImageStyle] = useState("");
  const [imageDimensions, setImageDimensions] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [campaignDuration, setCampaignDuration] = useState("");
  const [campaignGoal, setCampaignGoal] = useState("");
  const [adCta, setAdCta] = useState("");
  const [adStyle, setAdStyle] = useState("");
  const [scriptDuration, setScriptDuration] = useState("");
  const [scriptStyle, setScriptStyle] = useState("");
  const [articleLength, setArticleLength] = useState("");
  const [infographicStyle, setInfographicStyle] = useState("");
  const [infographicSubType, setInfographicSubType] = useState<"infographic" | "chart" | "mindmap">("infographic");
  const [infographicChartType, setInfographicChartType] = useState("");
  const [infographicMindStyle, setInfographicMindStyle] = useState("");
  const [infographicDesc, setInfographicDesc] = useState("");
  // Visual translation panel (step 3 — works for all content kinds)
  const [vtType, setVtType] = useState<"infographic" | "chart" | "mindmap" | "image" | "quote_card" | "carousel" | "storyboard" | "motion_script">("infographic");
  const [vtChartType, setVtChartType] = useState("");
  const [vtStyle, setVtStyle] = useState("");
  const [vtDimensions, setVtDimensions] = useState("");
  const [vtEditText, setVtEditText] = useState("");
  // تحرير نصوص المرئي SVG مباشرة (بأمر مالكة المنصة: كل نص قابل للتعديل)
  const [vtSvgEditing, setVtSvgEditing] = useState(false);
  const [vtSvgEdits, setVtSvgEdits] = useState<string[]>([]);
  const [vtConfirming, setVtConfirming] = useState(false);
  const [vtLoading, setVtLoading] = useState(false);
  const [vtSvg, setVtSvg] = useState("");
  const [vtUrl, setVtUrl] = useState("");
  // البنية الهيكلية للمرئي — تُمكّن تصدير PowerPoint بعناصر أصلية قابلة للتعديل
  const [vtVisual, setVtVisual] = useState<VisualStructure | null>(null);
  // وضع الإخراج: قابل للتعديل (الافتراضي) / صورة احترافية / الاثنان
  const [vtOutputMode, setVtOutputMode] = useState<"editable_svg" | "premium_image" | "both">("editable_svg");
  const [vtPremiumUrl, setVtPremiumUrl] = useState("");
  const [vtProvider, setVtProvider] = useState("");
  const [vtProviderNote, setVtProviderNote] = useState("");
  const [vtPremiumError, setVtPremiumError] = useState("");
  // مسار الاستوديو: ثلاث نسخ يختار منها المستخدم + نصوص الخطة للمقارنة (كشف تشويه العربي)
  const [vtVariants, setVtVariants] = useState<{ url: string; flagged?: boolean; extracted?: string; checked?: boolean }[]>([]);
  const [vtPlanTexts, setVtPlanTexts] = useState<{ title?: string; subtitle?: string; sections?: { heading: string; bullets: string[]; stat?: string }[]; importantNumbers?: string[] } | null>(null);
  // بأمر مالكة المنصة: لا تنزيل/اعتماد قبل تأكيد المستخدم صراحةً أنه قارن النصوص العربية
  const [vtTextConfirmed, setVtTextConfirmed] = useState(false);
  // المرئي مكمّل للنص: القسم يظهر مباشرة للأنواع البصرية فقط، وبقية الأنواع تفتحه اختيارياً بعد النص
  const [vtSectionOpen, setVtSectionOpen] = useState(false);
  const [vtPlanCollapsed, setVtPlanCollapsed] = useState(false);
  const [providerInfo, setProviderInfo] = useState<{ mode?: string; openai: boolean; gemini: boolean; premiumAvailable: boolean; openaiVerified?: boolean; verifyNote?: string } | null>(null);
  // الخيار المختار من خريطة المخرجات الداعمة (يميز مثلاً «إنفوجرافيك ملخص» عن «بطاقة توعوية»)
  const [vtOutputChoice, setVtOutputChoice] = useState("");
  // الخطة البصرية المقترحة — تُراجع وتُعدل ثم تُعتمد قبل التوليد
  const [vtPlan, setVtPlan] = useState<VisualPlan | null>(null);
  const [vtPlanEditing, setVtPlanEditing] = useState(false);
  const [vtPlanLoading, setVtPlanLoading] = useState(false);
  const [vtError, setVtError] = useState("");
  const [vtSuggesting, setVtSuggesting] = useState(false);
  const [vtSuggestionReason, setVtSuggestionReason] = useState("");
  const [imageGenEditText, setImageGenEditText] = useState("");
  const [planFrequency, setPlanFrequency] = useState("");
  const [planDateRange, setPlanDateRange] = useState("");
  const [visualMode, setVisualMode] = useState<"upload" | "describe">("upload");
  const [imageDesc, setImageDesc] = useState("");
  const [imageGenLoading, setImageGenLoading] = useState(false);
  const [imageGenUrl, setImageGenUrl] = useState("");
  const [imageGenPrompt, setImageGenPrompt] = useState("");
  const [imageGenError, setImageGenError] = useState("");
  const [imageGenSvg, setImageGenSvg] = useState("");
  const [charLimit, setCharLimit] = useState<number | null>(null);
  // تعزيز بمرجع موثّق (بقرارات الاعتماد النهائية الملزمة) — مفتاح المستخدم هو
  // القرار الوحيد، ويُحترم في الاتجاهين. وضعه الافتراضي يتبع نوع المحتوى
  // (المفعّل افتراضياً أدناه)، وللمستخدم قلبه متى شاء.
  const [wantSource, setWantSource] = useState(false);
  // إسناد مرجعي اختياري في المراجعة — يُعين تحرّي الذكاء (والقاعدة تتحرّى دائماً بلا اعتماد عليه)
  const [reviewHasSource, setReviewHasSource] = useState(false);
  const [reviewSourceHint, setReviewSourceHint] = useState("");

  // Path
  const [path, setPath] = useState<"review" | "create" | null>(null);
  // معالج الإدخال خطوة بخطوة: ١ النوع · ٢ الجمهور · ٣ الهدف · ٤ التخصص · ٥ المحتوى (المصدر/النص)
  // القيمة ٥ تعني اكتمال الإطار وظهور خطوة المحتوى؛ الاسترجاع من السجل/المسودة يقفز إليها مباشرة.
  const [frameStep, setFrameStep] = useState(1);
  const FRAME_TOTAL = 5;
  const frameLabels = ["النوع", "الجمهور", "الهدف", "التخصص", "المحتوى"];

  // Review path state
  const [reviewText, setReviewText] = useState("");

  // Create path state
  const [source, setSource] = useState("");
  const [globalSub, setGlobalSub] = useState("");
  // خيارات متقدمة (التخصص وحد الحروف) — مطوية افتراضياً وتبقى مفتوحة مع وجود اختيار
  const [advancedOpen, setAdvancedOpen] = useState(true);
  // تنبيه غير معيق عند تحديث المصادر تبعاً للتخصص
  const [sourceToast, setSourceToast] = useState("");
  // تمييز أول حقل إلزامي ناقص عند محاولة الإنشاء
  const [missingField, setMissingField] = useState<"" | "kind" | "channel" | "audience" | "purpose" | "specialty">("");
  const kindFieldRef = useRef<HTMLDivElement>(null);
  const channelFieldRef = useRef<HTMLDivElement>(null);
  const audienceFieldRef = useRef<HTMLDivElement>(null);
  const purposeFieldRef = useRef<HTMLDivElement>(null);
  const specialtyFieldRef = useRef<HTMLDivElement>(null);
  const [topic, setTopic] = useState("");
  const [generatedText, setGeneratedText] = useState("");
  // المصادر المعتمدة التي جلبها البحث الحي للمحتوى المُنشأ — تُعرض كأدلة مرئية
  const [generatedSources, setGeneratedSources] = useState<Source[]>([]);
  // سجل حوكمة المصادر للنص المولَّد — يُحفظ مع النسخة وينتقل للمراجعة والتصدير
  const [generatedGovernance, setGeneratedGovernance] = useState<ReturnType<typeof toStoredGovernance>>(undefined);
  // ملف المصادر — المرجع الوحيد: يُحفظ جزءاً من النسخة وينتقل معها (قاعدة المحرك الواحد)
  const [generatedDossier, setGeneratedDossier] = useState<SourceDossier | undefined>(undefined);
  // إشعار المصارحة: طُلب مرجع ولم يُعثر عليه — يُعرض صراحةً بدل الصمت (بقرار المالكة)
  const [generatedSourceNote, setGeneratedSourceNote] = useState("");
  // معاينة المحتوى المقترح بعرض قراءة نظيف بدل صندوق التحرير (بطلب مالكة المنصة)
  const [previewGenerated, setPreviewGenerated] = useState(false);
  // عدّاد التكلفة الداخلي (يصل من الخادم لمالكة المنصة وحدها — يبقى undefined لغيرها)
  const [opCostUsd, setOpCostUsd] = useState<number | undefined>(undefined);
  const [opBalanceUsd, setOpBalanceUsd] = useState<number | undefined>(undefined);
  const [generating, setGenerating] = useState(false);
  // مسودة معروضة والفحص النهائي يجري — شارة غير معطلة فوق النص
  const [finalizing, setFinalizing] = useState(false);
  const [generateError, setGenerateError] = useState("");
  // تقرير مراجعة كامل محسوب من حكم الإنشاء نفسه (توحيد القرار) — صالح فقط طالما
  // النص لم يُعدَّل حرفياً عن نص الإنشاء؛ أي تعديل يُسقطه فوراً فيعود التحليل العادي.
  const [pendingGeneratedReview, setPendingGeneratedReview] = useState<{ text: string; review: ReviewResult } | null>(null);

  // Review result
  const [review, setReview] = useState<ReviewResult | null>(null);
  // حارس تسلسل الطلبات: يمنع استجابة متأخرة من طلب تحليل قديم من الكتابة فوق نتيجة
  // أحدث — تُهمل استجابة أي طلب سبقه طلب أحدث بدل أن تظهر كأن «التحليل رجع نصاً قديماً».
  const reviewRequestIdRef = useRef(0);
  const [editingReviewedContent, setEditingReviewedContent] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [contentId, setContentId] = useState<string | undefined>();
  const [savedStudioVisuals, setSavedStudioVisuals] = useState<StoredVisual[]>([]);

  // AI full-rewrite suggestion (معالجة الملاحظات وإعادة الصياغة)
  const [improvedLoading, setImprovedLoading] = useState(false);
  const [improvedTextAI, setImprovedTextAI] = useState("");
  const [improvedError, setImprovedError] = useState("");
  // إقرار وجود مرجع في مسار إعادة الصياغة (بقرار مالكة المنصة) — يوجّه دعم الصياغة
  // بمرجع موثّق من المصادر المعتمدة، تماماً كنظيره في صفحة المراجعة.
  const [improvedHasSource, setImprovedHasSource] = useState(false);
  const [improvedSourceHint, setImprovedSourceHint] = useState("");
  // المصادر المعتمدة المجلوبة لإعادة الصياغة — تُعرض كأدلة مرئية
  const [improvedSources, setImprovedSources] = useState<Source[]>([]);
  // ★ بقرار مالكة المنصة: «المراجع لا تُخفى — تظهر وتنتقل للمراجعة ولا تختفي،
  // تبقى بالسجلات». فتُجمع مصادر الإنشاء وإعادة الصياغة معاً ولا يُسقط أحدهما
  // الآخر: كان الأحدث يحجب الأقدم فتضيع مصادر استند إليها النص فعلاً.
  // وتُحفظ مع كل إصدار فتنتقل إلى التحليل التفصيلي وتبقى في السجل.
  const activeWebSources = (() => {
    const merged: { title: string; url: string }[] = [];
    const seen = new Set<string>();
    for (const item of [...generatedSources, ...improvedSources]) {
      if (!item?.url || seen.has(item.url)) continue;
      seen.add(item.url);
      merged.push({ title: item.title, url: item.url });
    }
    return merged;
  })();
  const activeWebSourcesValue = activeWebSources.length > 0 ? activeWebSources : undefined;
  // إشعار المصارحة لمسار إعادة الصياغة — طُلب مرجع ولم يُعثر عليه
  const [improvedSourceNote, setImprovedSourceNote] = useState("");
  // معاينة القراءة النظيفة (بطلب مالكة المنصة) — للنص محل المراجعة وللصياغة التحسينية
  const [previewStudioReview, setPreviewStudioReview] = useState(false);
  const [previewImproved, setPreviewImproved] = useState(false);
  // بوابة الإقرار قبل النشر المباشر (بقرار مالكة المنصة)
  const [publishAckOpen, setPublishAckOpen] = useState(false);

  // Action feedback
  const [actionMsg, setActionMsg] = useState("");

  // مفتاح «تعزيز بمصدر» مطفأ افتراضياً لكل الأنواع — بقرار المالكة قبل جولة
  // التحقق: «يفتحه المستخدم نفسه». تغيير النوع يعيده مطفأً، وقلب المستخدم يُحترم.
  useEffect(() => {
    if (!kind) return;
    setWantSource(false);
  }, [kind]);

  // بقرارها: المصادر تتبع التخصص ونوع المحتوى — مصدر لم يعد متاحاً يُلغى اختياره تلقائياً
  useEffect(() => {
    const typeLabel = kind ? contentKindLabels[kind] : "";
    if (source && !isSourceVisible(source, specialty)) {
      setSource("");
      setGlobalSub("");
      setSourceToast("تم تحديث المصادر لتناسب التخصص المختار");
      const timer = setTimeout(() => setSourceToast(""), 3000);
      return () => clearTimeout(timer);
    }
    if (source && !isSourceVisibleForContentType(source, typeLabel)) {
      setSource("");
      setGlobalSub("");
      setSourceToast("تم تحديث المصادر لتناسب نوع المحتوى المختار");
      const timer = setTimeout(() => setSourceToast(""), 3000);
      return () => clearTimeout(timer);
    }
    if (globalSub && !isGlobalSubVisible(globalSub, specialty)) {
      setGlobalSub("");
      setSourceToast("تم تحديث فروع الخبر العالمي لتناسب التخصص المختار");
      const timer = setTimeout(() => setSourceToast(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [specialty, source, globalSub, kind]);

  // المصادر المشروطة تُعرض آخر الشبكة حتى تنطوي بسلاسة دون ثقوب في الصفوف
  const orderedSources = [...contentSources].sort(
    (a, b) => Number(isConditionalSource(a.key)) - Number(isConditionalSource(b.key))
  );
  const advancedIsOpen = advancedOpen || charLimit !== null || Boolean(channel);
  // «تعزيز بمصدر» — بقرارات الاعتماد النهائية الملزمة: المفتاح يظهر في كل الأنواع
  // إلا «خطة نشر» (جدول مواعيد لا نص موضوعي)، وقرار المستخدم فيه يُحترم في
  // الاتجاهين: «نعم» تبحث المنصة، و«لا» لا تبحث — لا تشغيل قسري ولا قوائم خفية.
  const NO_SOURCE_LABELS = new Set(["خطة نشر"]);
  const canSupportSource = Boolean(kind) && !NO_SOURCE_LABELS.has(kind ? contentKindLabels[kind] : "");
  // wantSource الفعّال المُرسَل للخادم: مفتاح المستخدم وحده — مشروطاً بنوع مؤهل.
  const effectiveWantSource = canSupportSource && wantSource;
  // سياق حوكمة المصادر المرافق لنداءات المرئي (أمر الإغلاق النهائي): الحد الأدنى
  // من سجل النسخة الأصلية — النص الأصلي نفسه يُرسل description ويطابق به الخادم.
  const visualSourceContext = generatedGovernance
    ? {
        stopped: generatedGovernance.article10Decision === "أوقف",
        article10Applied: generatedGovernance.article10Applied,
        officialSourceFound: generatedGovernance.officialSourceFound,
        notice: generatedGovernance.notice,
      }
    : undefined;
  const activeText = path === "create" ? generatedText : reviewText;
  // نوع المحتوى هو مصدر الحقيقة الوحيد — قسم بصري رئيسي واحد فقط لكل نوع:
  // «رسم توضيحي»: قسم «إعداد المرئيات والمخططات» وامتداده التوليدي (النوع من الإعداد، بلا اختيار مكرر)
  // «محتوى بصري»: المتطلبات أولاً ثم النص ثم «ترجمة المحتوى بصرياً» مباشرة — المرئي يترجم النص المقترح ويأتي بعده
  // بقية الأنواع: قسم داعم اختياري واحد بعد توليد النص
  const isVisualMain = kind === "infographic";
  const isVisualDirect = kind === "infographic" || kind === "visual_content";
  // المخرجات الداعمة المناسبة لنوع المحتوى المختار — من خريطة المواءمة
  const visualOutputs: VisualOutputsSpec = isVisualMain
    ? VISUAL_KIND_OUTPUTS
    : (kind && SUPPORTED_VISUAL_OUTPUTS[kind]) || GENERIC_TEXT_OUTPUTS;
  // المرئي الاحترافي متاح فعلياً فقط بعد تحقق الخادم من مفتاح OpenAI (أو وجود Gemini وحده)
  const premiumUsable = Boolean(
    providerInfo?.premiumAvailable &&
    ((providerInfo.openai && providerInfo.openaiVerified) || (!providerInfo.openai && providerInfo.gemini))
  );

  // الكونسبت بقرار مالكة المنصة: فتح تبويب الاستوديو من القائمة = صفحة جديدة نظيفة
  // دائماً؛ أما «العودة من التحليل التفصيلي» (results=1) فهي وحدها تعيد فتح نتائج
  // النص نفسه — التنقل داخل الدورة لا يضيع المعلومات، وبدء عمل جديد لا يُفرض عليه قديم.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("results") !== "1") return;
    const selection = getActiveContentSelection();
    if (!selection) return;
    // العودة تفتح المحتوى النشط نفسه حصراً — لا يُستبدل بمحتوى آخر أبداً (بقرارها:
    // «العودة = نفس النص»). إن كان بلا تحليل يُفتح نصه وسياقه بلا نتائج ليُحلَّل.
    const record = loadContentRecords().find((item) => item.id === selection.contentId);
    const version = record?.versions.find((item) => item.version === selection.version);
    if (!record || !version) return;

    // إبطال أي طلب تحليل ما زال معلّقاً: العودة لنتيجة محفوظة لا يجوز أن تكتب استجابته المتأخرة فوقها
    reviewRequestIdRef.current++;
    setPath("review");
    setReviewText(version.body);
    setKind(version.contentType);
    setChannel(version.channel);
    setAudience(version.audience);
    setPurpose(version.purpose);
    setSpecialty(version.specialty ?? "");
    setCharLimit(version.charLimit ?? null);
    // استرجاع بقية معلومات السياق المحفوظة — فلا «تختفي الخواص» عند العودة للنتيجة
    setAdCta(version.adCta ?? "");
    setAdStyle(version.adStyle ?? "");
    setScriptDuration(version.scriptDuration ?? "");
    setScriptStyle(version.scriptStyle ?? "");
    setArticleLength(version.articleLength ?? "");
    setContentId(record.id);
    setReview(version.analysis ? normalizeReviewResult(version.analysis) : null);

    // إن كان لهذا المحتوى نفسه تحليل ما زال يكتمل في الخلفية (بدأته صفحة المراجعة)،
    // يُتابَع هنا وتُعرض نتيجته فور اكتمالها — لا يُطلب «إعادة تحليل» لعملٍ يجري أصلاً.
    if (!version.analysis) {
      try {
        const rawPending = window.localStorage.getItem(scopedKey("lawyer-media:pending-review:review"));
        const pendingReview = rawPending ? (JSON.parse(rawPending) as { jobId?: string; contentId?: string }) : null;
        if (pendingReview?.jobId && pendingReview.contentId === record.id) {
          const requestId = ++reviewRequestIdRef.current;
          setReviewing(true);
          const adoptedJobId = pendingReview.jobId;
          void (async () => {
            const outcome = await pollReviewJob(adoptedJobId);
            if (requestId !== reviewRequestIdRef.current) return;
            if (outcome.data) {
              try { window.localStorage.removeItem(scopedKey("lawyer-media:pending-review:review")); } catch { /* تجاهل */ }
              const result = outcome.data;
              setReview(result);
              saveLatestReviewSnapshot(result);
              const saved = upsertAnalyzedVersion({
                contentId: record.id,
                body: version.body,
                contentType: version.contentType,
                contentTypeLabel: version.contentTypeLabel,
                channel: version.channel,
                audience: version.audience,
                purpose: version.purpose,
                specialty: version.specialty ?? "",
                charLimit: version.charLimit ?? null,
                adCta: version.adCta ?? "",
                adStyle: version.adStyle ?? "",
                scriptDuration: version.scriptDuration ?? "",
                scriptStyle: version.scriptStyle ?? "",
                articleLength: version.articleLength ?? "",
                review: result,
              });
              setContentId(saved.record.id);
            } else if (outcome.error) {
              setReviewError(outcome.error);
            }
            setReviewing(false);
          })();
        }
      } catch { /* قيمة معلّقة تالفة — تُتجاهل */ }
    }

    const visual = version.visuals?.[0];
    if (visual?.svg) setVtSvg(visual.svg);
    if (visual?.imageUrl) setVtPremiumUrl(visual.imageUrl);
    if (visual && ["infographic", "chart", "mindmap", "image", "quote_card", "carousel", "storyboard", "motion_script"].includes(visual.visualType)) {
      setVtType(visual.visualType as typeof vtType);
    }
  }, []);

  // لوحة النتائج تقرأ المرئيات من الإصدار المحفوظ نفسه الذي تستخدمه صفحتا التحليل والسجل.
  useEffect(() => {
    const refreshSavedVisuals = () => {
      if (!contentId) { setSavedStudioVisuals([]); return; }
      const record = loadContentRecords().find((item) => item.id === contentId);
      const version = record?.versions.find((item) => item.version === record.currentVersion);
      setSavedStudioVisuals(version?.visuals ?? []);
    };
    refreshSavedVisuals();
    window.addEventListener("lawyer-media:records-updated", refreshSavedVisuals);
    return () => window.removeEventListener("lawyer-media:records-updated", refreshSavedVisuals);
  }, [contentId, review]);

  useEffect(() => {
    fetch("/api/content-studio/generate-image")
      .then((r) => r.json())
      .then((d) => setProviderInfo(d))
      .catch(() => setProviderInfo(null));
  }, []);

  // معادلة السياق تسري على المرئيات أيضاً: المصدر بصيغته المقروءة يرافق كل طلب مرئي
  const contextSourceLabel = source
    ? source === "global-news" && globalSub
      ? `أخبار قانونية عالمية — ${contentSources.find((s) => s.key === "global-news")?.subs?.find((sub) => sub.key === globalSub)?.label ?? globalSub}`
      : contentSources.find((s) => s.key === source)?.label ?? source
    : "";

  // عند تعطل المرئي الاحترافي (مفتاح غير متحقق/401/403) يعود الإخراج قسرياً إلى SVG الافتراضي،
  // ونوع «صورة» (مرتبط بالمزود الاحترافي حصراً) يعود إلى إنفوغراف المتاح دائماً عبر SVG
  useEffect(() => {
    if (providerInfo && !premiumUsable) {
      if (vtOutputMode !== "editable_svg") setVtOutputMode("editable_svg");
      if (vtType === "image") { setVtType("infographic"); setVtOutputChoice(""); }
    }
  }, [providerInfo, premiumUsable, vtOutputMode, vtType]);

  // «رسم توضيحي»: قسم «إعداد المرئيات والمخططات» هو مصدر نوع المرئي — لا اختيار مكرر في التوليد
  useEffect(() => {
    if (kind !== "infographic") return;
    setVtType(infographicSubType === "chart" ? "chart" : infographicSubType === "mindmap" ? "mindmap" : "infographic");
    setVtChartType(infographicSubType === "chart" ? infographicChartType : "");
  }, [kind, infographicSubType, infographicChartType]);

  // رسالة نقص السياق تُمسح تلقائياً فور اكتمال الاختيار — لا تبقى معلّقة بعد استيفاء الشرط
  useEffect(() => {
    if (kind && channel && audience && purpose) {
      setReviewError((prev) => (prev.startsWith("اختر نوع المحتوى") ? "" : prev));
    }
  }, [kind, channel, audience, purpose]);

  // ── Generate content ──

  // مفتاح المهمة الخلفية المعلّقة — بقرارها: الإنشاء يستمر في الخادم ولو غادر المستخدم الصفحة،
  // وعند العودة يُستأنف تتبع المهمة تلقائياً وتُعرض النتيجة.
  const PENDING_GENERATION_KEY = "lawyer-media:pending-generation";


// ملخص إنفاذ المادة (١٠) القادم من الخادم (معقَّم — تسميات فئات بلا مقتطفات)
type ServerGovernance = {
  sourceFound?: boolean; sources?: { title: string; url: string }[];
  article10Applied?: boolean; generalAllowed?: boolean; stopped?: boolean;
  violations?: string[]; correctionRounds?: number; outcome?: string;
};
// تحويل ملخص الخادم إلى سجل الحوكمة المحفوظ مع النسخة (بقرار مالكة المنصة:
// التصريح وسياقه يُحفظان فلا يضيعان عند فتح النسخة لاحقاً)
function toStoredGovernance(gov: ServerGovernance | undefined, notice: string | undefined) {
  if (!gov && !notice) return undefined;
  return {
    notice: notice || undefined,
    article10Applied: gov?.article10Applied ?? Boolean(notice),
    article10Decision: gov?.stopped ? "أوقف" : gov?.generalAllowed ? "محتوى عام" : "لا تنطبق",
    officialSourceFound: gov?.sourceFound ?? false,
    officialSources: gov?.sources ?? [],
    enforcementReasons: gov?.violations ?? [],
  };
}

  function deliverGenerationOutcome(outcome: { text?: string; error?: string; truncated?: boolean; review?: ReviewResult; sources?: Source[]; sourceNote?: string; sourceGovernance?: ServerGovernance; sourceDossier?: SourceDossier; costUsd?: number; balanceUsd?: number }) {
    setFinalizing(false);
    if (outcome.costUsd !== undefined) setOpCostUsd(outcome.costUsd);
    if (outcome.balanceUsd !== undefined) setOpBalanceUsd(outcome.balanceUsd);
    if (outcome.text) {
      setGeneratedText(outcome.text);
      setGeneratedSources(outcome.sources ?? []);
      setGeneratedSourceNote(outcome.sourceNote ?? "");
      setGeneratedGovernance(toStoredGovernance(outcome.sourceGovernance, outcome.sourceNote));
      setGeneratedDossier(outcome.sourceDossier);
      setGenerateError(outcome.truncated ? "النص طويل وقد لا يكون مكتملاً تماماً — راجع نهايته أو أعد الإنشاء." : "");
      setVtSvg("");
      setVtUrl("");
      setVtVisual(null);
      setVtError("");
      // تقرير جاهز من حكم الإنشاء نفسه — يُعتمد لاحقاً عند طلب التحليل لو بقي النص كما هو حرفياً
      setPendingGeneratedReview(outcome.review ? { text: outcome.text, review: outcome.review } : null);
    } else {
      setGenerateError(outcome.error ?? "تعذر إنشاء المحتوى — حاول مرة أخرى.");
    }
  }

  async function pollGenerationJob(jobId: string, onDraft?: (text: string) => void, startedAt?: number): Promise<{ text?: string; error?: string; truncated?: boolean; review?: ReviewResult; sources?: Source[]; sourceNote?: string; sourceGovernance?: ServerGovernance; sourceDossier?: SourceDossier; costUsd?: number; balanceUsd?: number }> {
    // الحدّ الزمني مطلق من بدء المهمة لا من كل استطلاع — فمهمة ماتت على الخادم لا
    // يُعاد استطلاعها بلا نهاية عند كل تحديث أو دخول (سبب تعليق الصفحة). حدّ الخادم
    // ٣٠٠ ثانية، فأي مهمة تجاوزت نحو ست دقائق ميتة قطعاً. وعند البلوغ نُحرّر المهمة
    // المحفوظة كي لا تُستأنف ثانيةً.
    const deadline = (startedAt ?? Date.now()) + 6 * 60 * 1000;
    for (;;) {
      if (Date.now() > deadline) {
        try { window.localStorage.removeItem(scopedKey(PENDING_GENERATION_KEY)); } catch { /* بيئة بلا تخزين */ }
        return { error: "طالت المتابعة أكثر من المتوقع — أعد المحاولة." };
      }
      try {
        const res = await fetch(`/api/content-studio/generate-status?id=${encodeURIComponent(jobId)}`);
        const data = (await res.json()) as { status?: string; text?: string; error?: string; truncated?: boolean; partial?: string; review?: ReviewResult; sources?: Source[]; sourceNote?: string; sourceGovernance?: ServerGovernance; sourceDossier?: SourceDossier; costUsd?: number; balanceUsd?: number };
        // بأمر مالكة المنصة: لا تُعرض مسودة قبل اجتياز كل المؤشرات — المسودات
        // الجزئية المعلقة (من نشرات سابقة) تُتجاهل ولا تُعرض
        if (data.status === "done") {
          void fetch(`/api/content-studio/generate-status?id=${encodeURIComponent(jobId)}&ack=1`).catch(() => {});
          try { window.localStorage.removeItem(scopedKey(PENDING_GENERATION_KEY)); } catch { /* بيئة بلا تخزين */ }
          return { text: data.text ?? "", truncated: data.truncated, review: data.review, sources: data.sources, sourceNote: data.sourceNote, sourceGovernance: data.sourceGovernance, sourceDossier: data.sourceDossier, costUsd: data.costUsd, balanceUsd: data.balanceUsd };
        }
        if (data.status === "error" || data.status === "missing") {
          try { window.localStorage.removeItem(scopedKey(PENDING_GENERATION_KEY)); } catch { /* بيئة بلا تخزين */ }
          return { error: data.status === "missing" ? "انتهت صلاحية هذا الإنشاء — أعد المحاولة." : data.error ?? "تعذر إنشاء المحتوى — حاول مرة أخرى.", costUsd: data.costUsd, balanceUsd: data.balanceUsd };
        }
      } catch {
        /* انقطاع شبكة عابر — نواصل الاستطلاع */
      }
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }
  }

  // مدخلات نموذج الإنشاء التي تُحفظ مع المهمة المعلّقة وتُستعاد عند الاستئناف —
  // سدّ ثغرة رصدتها مالكة المنصة: الخروج فور «أنشئ» قبل وصول رقم المهمة كان يُضيع
  // المدخلات، وحتى الاستئناف برقم مهمة كان يعيد النص بلا سياقه (فيفشل التحليل بعده).
  type GenPendingInputs = {
    kind?: ContentKind | null; channel?: string; audience?: string; purpose?: string; specialty?: string;
    source?: string; globalSub?: string; topic?: string; charLimit?: number | null; wantSource?: boolean;
    scriptDuration?: string; scriptStyle?: string; articleLength?: string; adCta?: string; adStyle?: string;
    campaignName?: string; campaignDuration?: string; campaignGoal?: string; planFrequency?: string; planDateRange?: string;
  };
  function snapshotGenerationInputs(): GenPendingInputs {
    return {
      kind, channel, audience, purpose, specialty, source, globalSub, topic, charLimit, wantSource,
      scriptDuration, scriptStyle, articleLength, adCta, adStyle,
      campaignName, campaignDuration, campaignGoal, planFrequency, planDateRange,
    };
  }
  function restoreGenerationInputs(inputs: GenPendingInputs) {
    if (inputs.kind) setKind(inputs.kind);
    setChannel(inputs.channel ?? "");
    setAudience(inputs.audience ?? "");
    setPurpose(inputs.purpose ?? "");
    setSpecialty(inputs.specialty ?? "");
    setSource(inputs.source ?? "");
    setGlobalSub(inputs.globalSub ?? "");
    setTopic(inputs.topic ?? "");
    setCharLimit(inputs.charLimit ?? null);
    setWantSource(Boolean(inputs.wantSource));
    setScriptDuration(inputs.scriptDuration ?? "");
    setScriptStyle(inputs.scriptStyle ?? "");
    setArticleLength(inputs.articleLength ?? "");
    setAdCta(inputs.adCta ?? "");
    setAdStyle(inputs.adStyle ?? "");
    setCampaignName(inputs.campaignName ?? "");
    setCampaignDuration(inputs.campaignDuration ?? "");
    setCampaignGoal(inputs.campaignGoal ?? "");
    setPlanFrequency(inputs.planFrequency ?? "");
    setPlanDateRange(inputs.planDateRange ?? "");
  }

  // استئناف تلقائي عند فتح الصفحة: مهمة معلّقة محفوظة → نتابعها ونعرض نتيجتها
  useEffect(() => {
    let raw = "";
    try { raw = window.localStorage.getItem(scopedKey(PENDING_GENERATION_KEY)) ?? ""; } catch { return; }
    if (!raw) return;
    let jobId = "";
    let startedAt = 0;
    let inputs: GenPendingInputs | undefined;
    try {
      const parsed = JSON.parse(raw) as { jobId?: string; at?: number; inputs?: GenPendingInputs };
      jobId = parsed.jobId ?? "";
      startedAt = parsed.at ?? 0;
      inputs = parsed.inputs;
    } catch { /* قيمة تالفة */ }
    if (!jobId) {
      // بقرار المالكة قبل جولة التحقق: فتح الصفحة من جديد = نموذج نظيف دائماً —
      // لا استعادة لمدخلات قديمة. يُستثنى فقط استئناف مهمة ما زالت تعمل فعلاً
      // (أدناه) كي لا تضيع نتيجة إنشاء اكتمل في الخادم.
      try { window.localStorage.removeItem(scopedKey(PENDING_GENERATION_KEY)); } catch { /* تجاهل */ }
      return;
    }
    // مهمة قديمة تجاوزت حدّ الخادم (نحو ٦ دقائق) ميتة قطعاً — لا تُستأنف ولا
    // تُستعاد مدخلاتها (النموذج النظيف بقرار المالكة).
    const stale = startedAt > 0 && Date.now() - startedAt > 6 * 60 * 1000;
    if (stale) {
      try { window.localStorage.removeItem(scopedKey(PENDING_GENERATION_KEY)); } catch { /* تجاهل */ }
      return;
    }
    setPath("create");
    if (inputs) restoreGenerationInputs(inputs); // النص يعود بسياقه كاملاً لا وحيداً
    setGenerating(true);
    setGenerateError("");
    void (async () => {
      const outcome = await pollGenerationJob(jobId, showDraft, startedAt);
      deliverGenerationOutcome(outcome);
      setGenerating(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function showDraft(draft: string) {
    setGeneratedText(draft);
    setFinalizing(true);
    setGenerating(false);
  }

  async function generateContent() {
    // القناة اختيارية بقرارها — الإلزامي: النوع والجمهور والهدف والتخصص فقط.
    // عند نقص حقل إلزامي: تمرير لأول حقل ناقص وتمييزه بدل التعطيل الصامت.
    const missing = !kind ? "kind" : !audience ? "audience" : !purpose ? "purpose" : !specialty ? "specialty" : "";
    if (missing) {
      const refMap = { kind: kindFieldRef, audience: audienceFieldRef, purpose: purposeFieldRef, specialty: specialtyFieldRef } as const;
      refMap[missing as keyof typeof refMap].current?.scrollIntoView({ behavior: "smooth", block: "center" });
      setMissingField(missing as "kind" | "channel" | "audience" | "purpose" | "specialty");
      setTimeout(() => setMissingField(""), 2600);
      return;
    }
    // «ابتكر من الذكاء الاصطناعي»: الموضوع وحده اختياري — الذكاء يبتكره من مدخلات السياق
    if (!source) return;
    if (source !== "ai-original" && topic.trim().length < 3) return;
    setGenerating(true);
    setGenerateError("");
    setGeneratedSources([]);
    setGeneratedGovernance(undefined);
    setGeneratedDossier(undefined);
    setGeneratedSourceNote("");
    setPreviewGenerated(false);
    try {
      const sourceLabel =
        source === "global-news" && globalSub
          ? `أخبار قانونية عالمية — ${contentSources.find((s) => s.key === "global-news")?.subs?.find((sub) => sub.key === globalSub)?.label ?? globalSub}`
          : contentSources.find((s) => s.key === source)?.label ?? source;

      // ★ حفظ مُسبق قبل الإرسال (سدّ ثغرة رصدتها مالكة المنصة): الجوال يجمّد التنفيذ
      // لحظة المغادرة، فلو انتظرنا رقم المهمة لضاعت المدخلات إن خرجت قبل وصول الرد.
      // تُكتب المدخلات الآن، ويُلحق رقم المهمة فور وصوله — فلا يضيع عمل مهما كانت
      // لحظة الخروج.
      const genInputs = snapshotGenerationInputs();
      try {
        window.localStorage.setItem(scopedKey(PENDING_GENERATION_KEY), JSON.stringify({ at: Date.now(), inputs: genInputs }));
      } catch { /* بيئة بلا تخزين */ }

      const res = await fetch("/api/content-studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: kind ? contentKindLabels[kind] : "منشور",
          channel: channel || "غير محددة",
          audience: audience || "الجمهور العام",
          purpose: purpose || "تثقيف الجمهور حول موضوع نظامي",
          specialty: specialty || undefined,
          source: sourceLabel,
          topic: topic.trim(),
          // بقرارها: أُلغي حد الأحرف التلقائي للقناة — يُرسل فقط ما يحدده المستخدم يدوياً
          charLimit: charLimit ?? undefined,
          // إعدادات النوع تُرسل ليُبنى النص بمقاييس نوعه — السياق إطار للمحتوى لا تسمية
          scriptDuration: kind === "script" ? (scriptDuration || undefined) : undefined,
          scriptStyle: kind === "script" ? (scriptStyle || undefined) : undefined,
          articleLength: kind === "article" ? (articleLength || undefined) : undefined,
          adCta: kind === "advertisement" ? (adCta || undefined) : undefined,
          adStyle: kind === "advertisement" ? (adStyle || undefined) : undefined,
          campaignName: kind === "campaign" ? (campaignName || undefined) : undefined,
          campaignDuration: kind === "campaign" ? (campaignDuration || undefined) : undefined,
          campaignGoal: kind === "campaign" ? (campaignGoal || undefined) : undefined,
          planFrequency: kind === "publishing_plan" ? (planFrequency || undefined) : undefined,
          planDateRange: kind === "publishing_plan" ? (planDateRange || undefined) : undefined,
          // تعزيز بمرجع موثّق — تلقائي للمصادر المستندة لواقعة، أو بمفتاح المستخدم لغيرها
          wantSource: effectiveWantSource || undefined,
        }),
      });
      // الوضع الأساسي: الخادم يرد فوراً برقم مهمة خلفية — نحفظه ونستطلع حتى تكتمل،
      // ولو غادرتِ الصفحة تستمر المهمة في الخادم ويُستأنف التتبع عند العودة.
      let data: { text?: string; error?: string; truncated?: boolean; review?: ReviewResult; sources?: Source[]; sourceNote?: string } = {};
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const payload = (await res.json().catch(() => ({}))) as { jobId?: string; text?: string; error?: string; truncated?: boolean; review?: ReviewResult; sources?: Source[]; sourceNote?: string };
        if (payload.jobId) {
          try {
            // المدخلات تبقى مع رقم المهمة — فالاستئناف بعد إعادة التحميل يعيد النص بسياقه كاملاً
            window.localStorage.setItem(scopedKey(PENDING_GENERATION_KEY), JSON.stringify({ jobId: payload.jobId, at: Date.now(), inputs: genInputs }));
          } catch { /* بيئة بلا تخزين — تبقى المتابعة داخل الجلسة فقط */ }
          data = await pollGenerationJob(payload.jobId, showDraft);
        } else {
          data = payload;
          try { window.localStorage.removeItem(scopedKey(PENDING_GENERATION_KEY)); } catch { /* تجاهل */ }
        }
      } else if (contentType.includes("ndjson") && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let newline = buffer.indexOf("\n");
          while (newline >= 0) {
            const line = buffer.slice(0, newline).trim();
            buffer = buffer.slice(newline + 1);
            newline = buffer.indexOf("\n");
            if (!line) continue;
            try {
              const event = JSON.parse(line) as { type?: string; text?: string; error?: string; truncated?: boolean; review?: ReviewResult; sources?: Source[]; sourceNote?: string };
              // لا عرض للمسودات الجزئية — التسليم حتمي: الناتج النهائي المستوفي فقط
              if (event.type === "result" || event.type === "error") data = event;
            } catch {
              /* سطر غير مكتمل — يُتجاهل */
            }
          }
        }
      } else {
        data = (await res.json().catch(() => ({}))) as typeof data;
      }
      // وصلنا لنتيجة نهائية ضمن الجلسة — يُزال السجل المُسبق (مسار المهمة أزاله أصلاً؛
      // الإزالة الثانية آمنة، وتغطي مسارات الرد المباشر والبث)
      try { window.localStorage.removeItem(scopedKey(PENDING_GENERATION_KEY)); } catch { /* تجاهل */ }
      deliverGenerationOutcome(data);
    } finally {
      setGenerating(false);
    }
  }

  // ── Run review ──

  // مهمة التحليل الخلفية — بقرار مالكة المنصة: لا يلزم البقاء في الصفحة كي لا يتوقف
  // التحليل ولا تضيع نتيجته. نفس أسلوب مهام الإنشاء الخلفية تماماً: الخادم يسجّل مهمة
  // ويرد فوراً برقمها، ويكمل التحليل عبر waitUntil ولو غادرت المستخدمة الصفحة أو
  // أغلقت المتصفح؛ وعند العودة يُستأنف الاستطلاع تلقائياً وتظهر النتيجة بلا فقدان.
  // مفتاح خاص بالاستديو وحده — كل صفحة تستأنف مهامها المعلّقة هي فقط: مهمة بدأتها
  // صفحة المراجعة لا يخطفها الاستديو فيغطي نتائج محفوظة بشاشة «المحرك يعمل»
  const PENDING_REVIEW_KEY = "lawyer-media:pending-review:studio";

  async function pollReviewJob(jobId: string): Promise<{ data?: ReviewResult; error?: string; costUsd?: number; balanceUsd?: number }> {
    const deadline = Date.now() + 10 * 60 * 1000;
    for (;;) {
      if (Date.now() > deadline) return { error: "طالت المتابعة أكثر من المتوقع — أعد المحاولة." };
      try {
        const res = await fetch(`/api/reviews/status?id=${encodeURIComponent(jobId)}`);
        const data = (await res.json()) as { status?: string; data?: ReviewResult; error?: string; costUsd?: number; balanceUsd?: number };
        if (data.status === "done") {
          void fetch(`/api/reviews/status?id=${encodeURIComponent(jobId)}&ack=1`).catch(() => {});
          try { window.localStorage.removeItem(scopedKey(PENDING_REVIEW_KEY)); } catch { /* بيئة بلا تخزين */ }
          return { data: data.data, costUsd: data.costUsd, balanceUsd: data.balanceUsd };
        }
        if (data.status === "error" || data.status === "missing") {
          try { window.localStorage.removeItem(scopedKey(PENDING_REVIEW_KEY)); } catch { /* بيئة بلا تخزين */ }
          return { error: data.status === "missing" ? "انتهت صلاحية هذا التحليل — أعد المحاولة." : data.error ?? "تعذر إكمال المراجعة." };
        }
      } catch {
        /* انقطاع شبكة عابر — نواصل الاستطلاع */
      }
      await new Promise((resolve) => setTimeout(resolve, 2500));
    }
  }

  // استئناف تلقائي عند فتح الصفحة: مهمة تحليل معلّقة محفوظة → نتابعها ونعرض نتيجتها
  useEffect(() => {
    let raw = "";
    try { raw = window.localStorage.getItem(scopedKey(PENDING_REVIEW_KEY)) ?? ""; } catch { return; }
    if (!raw) return;
    let pending: { jobId?: string; at?: number; contentId?: string; body?: string; contentType?: ContentKind; contentTypeLabel?: string; channel?: string; audience?: string; purpose?: string; specialty?: string; charLimit?: number | null; adCta?: string; adStyle?: string; scriptDuration?: string; scriptStyle?: string; articleLength?: string; webSources?: { title: string; url: string }[]; sourceGovernance?: StoredContentVersion["sourceGovernance"]; sourceDossier?: SourceDossier } | null = null;
    try { pending = JSON.parse(raw); } catch { /* قيمة تالفة */ }
    if (!pending?.jobId) {
      // سجل مُسبق بلا رقم مهمة: خرجت المستخدمة قبل وصول الرد — النص يُستعاد بدل أن
      // يُرمى (الثغرة التي رصدتها مالكة المنصة: الخروج وقت التحليل كان يُضيع المحتوى).
      const fresh = (pending?.at ?? 0) > 0 && Date.now() - (pending?.at ?? 0) < 24 * 60 * 60 * 1000;
      if (pending?.body && fresh) {
        setPath("review");
        setReviewText(pending.body);
        if (pending.contentType) setKind(pending.contentType);
        setChannel(pending.channel ?? "");
        setAudience(pending.audience ?? "");
        setPurpose(pending.purpose ?? "");
        setSpecialty(pending.specialty ?? "");
        setCharLimit(pending.charLimit ?? null);
        setAdCta(pending.adCta ?? "");
        setAdStyle(pending.adStyle ?? "");
        setScriptDuration(pending.scriptDuration ?? "");
        setScriptStyle(pending.scriptStyle ?? "");
        setArticleLength(pending.articleLength ?? "");
        setContentId(pending.contentId);
        setReviewError("استُعيد نصك — انقطع بدء التحليل عند مغادرة الصفحة. اضغط «تحليل» للاستئناف.");
      } else {
        try { window.localStorage.removeItem(scopedKey(PENDING_REVIEW_KEY)); } catch { /* تجاهل */ }
      }
      return;
    }
    // استعادة كاملة ومتماسكة لسياق المهمة المعلّقة نفسها — لا يكفي عرض نتيجتها فوق أياً
    // كان النص المعروض حالياً (قد يكون نصاً آخر غير مرتبط كتبته المستخدمة لتوّها)، فتظهر
    // نتيجة تحليل لا تطابق النص المعروض. الاستئناف يُبدّل العرض بالكامل لسياق تلك المهمة.
    const requestId = ++reviewRequestIdRef.current;
    setPath("review");
    setReviewText(pending.body ?? "");
    if (pending.contentType) setKind(pending.contentType);
    setChannel(pending.channel ?? "");
    setAudience(pending.audience ?? "");
    setPurpose(pending.purpose ?? "");
    setSpecialty(pending.specialty ?? "");
    setCharLimit(pending.charLimit ?? null);
    setAdCta(pending.adCta ?? "");
    setAdStyle(pending.adStyle ?? "");
    setScriptDuration(pending.scriptDuration ?? "");
    setScriptStyle(pending.scriptStyle ?? "");
    setArticleLength(pending.articleLength ?? "");
    setContentId(pending.contentId);
    setReview(null);
    setReviewing(true);
    setReviewError("");
    void (async () => {
      const outcome = await pollReviewJob(pending!.jobId!);
      if (outcome.costUsd !== undefined) setOpCostUsd(outcome.costUsd);
      if (outcome.balanceUsd !== undefined) setOpBalanceUsd(outcome.balanceUsd);
      if (requestId !== reviewRequestIdRef.current) return;
      if (outcome.data) {
        const result = outcome.data;
        setReview(result);
        saveLatestReviewSnapshot(result);
        const saved = upsertAnalyzedVersion({
          contentId: pending!.contentId,
          body: pending!.body ?? "",
          contentType: pending!.contentType ?? "post",
          contentTypeLabel: pending!.contentTypeLabel ?? "",
          channel: pending!.channel ?? "",
          audience: pending!.audience ?? "",
          purpose: pending!.purpose ?? "",
          specialty: pending!.specialty ?? "",
          charLimit: pending!.charLimit ?? null,
          adCta: pending!.adCta ?? "",
          adStyle: pending!.adStyle ?? "",
          scriptDuration: pending!.scriptDuration ?? "",
          scriptStyle: pending!.scriptStyle ?? "",
          articleLength: pending!.articleLength ?? "",
          // المصادر وسجل الحوكمة المحفوظان مع الحمولة — لا يضيعان عند الاستئناف
          webSources: pending!.webSources,
          sourceGovernance: pending!.sourceGovernance,
          sourceDossier: pending!.sourceDossier,
          review: result,
        });
        setContentId(saved.record.id);
      } else {
        setReviewError(outcome.error ?? "تعذر إكمال المراجعة.");
      }
      setReviewing(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function runReview() {
    const text = path === "create" ? generatedText : reviewText;
    if (text.trim().length < 5) return;
    if (!kind || !audience || !purpose || !specialty) {
      setReviewError("اختر نوع المحتوى والجمهور والهدف والتخصص قبل التحليل حتى ترتبط النتائج بإطار المحتوى الصحيح.");
      return;
    }
    const requestId = ++reviewRequestIdRef.current;
    setReviewing(true);
    setEditingReviewedContent(false);
    setReviewError("");
    setReview(null);
    setImprovedTextAI("");
    setImprovedError("");
    // ★ (بقرار المالكة): المراجعة السريعة بلا إطار — لا تُنسب للنص صفة نوع لم
    // يخترها المستخدم («منشور توعوي» ونحوه): التسمية والسياق «نص للمراجعة» محايد،
    // فلا يحاكم القاضي النص بمقتضيات نوعٍ مفترض ولا يظهر في السجل نوع مزعوم.
    const contentTypeLabel = path === "review" ? "نص للمراجعة" : contentKindLabels[kind];
    const trimmed = text.trim();

    // توحيد القرار: النص نفسه حرفياً الذي وُلِّد وحُكم عليه بالامتثال لحظة الإنشاء —
    // تقرير المراجعة الكامل جاهز فعلاً من نفس ذلك الحكم، فلا داعٍ لاستدعاء ذكاء
    // مستقل ثانٍ قد يحكم حكماً مختلفاً على النص نفسه. أي تعديل على النص يُسقط هذا
    // المسار تلقائياً (pendingGeneratedReview يُمسح عند أي تعديل) فيعمل التحليل العادي.
    if (path === "create" && pendingGeneratedReview && pendingGeneratedReview.text === trimmed) {
      const result = pendingGeneratedReview.review;
      // عرض النتيجة أولاً وقبل أي حفظ محلي — فشل التخزين (حصة ممتلئة ونحوه) لا يجوز
      // أن يحجب نتيجة جاهزة أو يجمّد شارة «المحرك يعمل» إلى الأبد
      try {
        setReview(result);
        setReviewError("");
        saveLatestReviewSnapshot(result);
        const saved = upsertAnalyzedVersion({
          contentId,
          body: trimmed,
          contentType: kind,
          contentTypeLabel,
          channel,
          audience,
          purpose,
          specialty,
          charLimit,
          adCta,
          adStyle,
          scriptDuration,
          scriptStyle,
          articleLength,
          // ★ الملف والمصادر والحوكمة تسافر مع النسخة من هذا الموضع أيضاً —
          // كان هذا المسار يحفظ التحليل بلا ملف المصادر فتفتح النسخة «بلا مصادر»
          topic: topic.trim() || undefined,
          webSources: activeWebSourcesValue,
          sourceGovernance: generatedGovernance,
          sourceDossier: result.sourceDossier ?? generatedDossier,
          review: result,
        });
        setContentId(saved.record.id);
      } catch (error) {
        // النتيجة معروضة فعلاً — فشل الحفظ المحلي لا يعطّل العرض، لكنه لم يعد صامتاً:
        // يُبلَّغ المستخدم ويُعطَّل «التحليل التفصيلي» (contentId بقي فارغاً) بدل فتح سجل قديم
        console.error("[studio:unified-review-persist]", error);
        flash("تعذر حفظ النتيجة في سجل المحتوى — التحليل التفصيلي غير متاح لهذه النسخة حتى تعيد التحليل.");
      } finally {
        setReviewing(false);
      }
      return;
    }

    // ★ حفظ مُسبق قبل الإرسال (سدّ ثغرة رصدتها مالكة المنصة): الجوال يجمّد التنفيذ
    // لحظة المغادرة، فلو انتظرنا رقم المهمة لضاع النص إن خرجت قبل وصول الرد.
    // يُكتب السجل الآن، ويُحدَّث برقم المهمة فور وصوله، ويُزال عند اكتمال النتيجة.
    try {
      window.localStorage.setItem(scopedKey(PENDING_REVIEW_KEY), JSON.stringify({
        at: Date.now(), contentId, body: trimmed, contentType: kind, contentTypeLabel,
        channel, audience, purpose, specialty, topic: topic.trim() || undefined, webSources: activeWebSourcesValue, sourceGovernance: generatedGovernance, sourceDossier: generatedDossier, charLimit, adCta, adStyle, scriptDuration, scriptStyle, articleLength,
      }));
    } catch { /* بيئة بلا تخزين */ }
    try {
      const startRes = await fetch("/api/reviews/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentId, text: trimmed, kind, contentType: contentTypeLabel, channel, audience, purpose, sourceDossier: generatedDossier, sourceHint: (path === "review" && reviewHasSource && reviewSourceHint.trim()) ? reviewSourceHint.trim() : undefined }),
      });
      const startPayload = (await startRes.json().catch(() => ({}))) as { jobId?: string | null; error?: string };
      if (requestId !== reviewRequestIdRef.current) return;

      let outcome: { data?: ReviewResult; error?: string; costUsd?: number; balanceUsd?: number };
      if (startPayload.jobId) {
        try {
          window.localStorage.setItem(scopedKey(PENDING_REVIEW_KEY), JSON.stringify({
            jobId: startPayload.jobId, at: Date.now(), contentId, body: trimmed, contentType: kind, contentTypeLabel,
            channel, audience, purpose, specialty, topic: topic.trim() || undefined, webSources: activeWebSourcesValue, sourceGovernance: generatedGovernance, sourceDossier: generatedDossier, charLimit, adCta, adStyle, scriptDuration, scriptStyle, articleLength,
          }));
        } catch { /* بيئة بلا تخزين — تبقى المتابعة داخل الجلسة فقط */ }
        outcome = await pollReviewJob(startPayload.jobId);
        if (outcome.costUsd !== undefined) setOpCostUsd(outcome.costUsd);
        if (outcome.balanceUsd !== undefined) setOpBalanceUsd(outcome.balanceUsd);
      } else {
        // بلا قاعدة بيانات (مهام خلفية غير متاحة): تراجع للطلب المباشر القديم
        const res = await fetch("/api/reviews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: trimmed, kind, contentType: contentTypeLabel, channel, audience, purpose, sourceDossier: generatedDossier, sourceHint: (path === "review" && reviewHasSource && reviewSourceHint.trim()) ? reviewSourceHint.trim() : undefined }),
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => ({})) as { error?: string };
          outcome = { error: payload.error ?? "تعذر إكمال المراجعة." };
        } else {
          outcome = { data: ((await res.json()).data) as ReviewResult };
        }
      }

      // استجابة متأخرة لطلب سبقه طلب أحدث: تُهمل ولا تُطبَّق — لا تكتب فوق نتيجة أحدث
      if (requestId !== reviewRequestIdRef.current) return;
      // وصلنا لنتيجة نهائية ضمن الجلسة — يُزال السجل المُسبق (إزالة آمنة مكررة)
      try { window.localStorage.removeItem(scopedKey(PENDING_REVIEW_KEY)); } catch { /* تجاهل */ }
      if (!outcome.data) {
        setReviewError(outcome.error ?? "تعذر إكمال المراجعة.");
        return;
      }
      const result = outcome.data;
      setReview(result);
      setReviewError("");
      saveLatestReviewSnapshot(result);
      // الحفظ المحلي في عزلة عن عرض النتيجة: فشله (امتلاء ذاكرة المتصفح) لا يحجب
      // النتيجة المعروضة ولا يقذف رسالة المتصفح الخام بالإنجليزية للمستخدم —
      // رسالة عربية واضحة، ويبقى «التحليل التفصيلي» معطلاً حتى تنجح إعادة التحليل
      try {
        const saved = upsertAnalyzedVersion({
          contentId,
          body: trimmed,
          contentType: kind,
          contentTypeLabel,
          channel,
          audience,
          purpose,
          specialty,
          charLimit,
          adCta,
          adStyle,
          scriptDuration,
          scriptStyle,
          articleLength,
          // ★ الملف والمصادر والحوكمة تسافر مع النسخة من هذا الموضع أيضاً
          topic: topic.trim() || undefined,
          webSources: activeWebSourcesValue,
          sourceGovernance: generatedGovernance,
          sourceDossier: result.sourceDossier ?? generatedDossier,
          review: result,
        });
        setContentId(saved.record.id);
      } catch (persistError) {
        console.error("[studio:review-persist]", persistError);
        flash("تعذر حفظ النتيجة في سجل المحتوى (امتلأت ذاكرة المتصفح) — أعد التحليل لإتاحة التحليل التفصيلي.");
      }
    } catch (error) {
      if (requestId !== reviewRequestIdRef.current) return;
      const raw = error instanceof Error ? error.message : "";
      // لا تُعرض رسائل المتصفح/النظام الخام (وقد تكون بالإنجليزية) — عربية مفهومة دائماً
      setReviewError(raw && /[؀-ۿ]/.test(raw) ? raw : "تعذر إكمال المراجعة — حاول مرة أخرى.");
    } finally {
      if (requestId === reviewRequestIdRef.current) setReviewing(false);
    }
  }

  // ── AI full rewrite of the reviewed content ──

  async function requestImprovedText() {
    if (!review || improvedLoading) return;
    setImprovedLoading(true);
    setImprovedError("");
    setImprovedTextAI("");
    setImprovedSources([]);
    setImprovedSourceNote("");
    setPreviewImproved(false);
    try {
      const res = await fetch("/api/reformulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: activeText,
          contentType: kind ? contentKindLabels[kind] : undefined,
          channel: channel || undefined,
          audience: audience || undefined,
          purpose: purpose || undefined,
          // حد الأحرف الفعلي للقناة — الصياغة المقترحة تلتزم به مثل النص الأصلي
          charLimit: charLimit ?? (channel ? CHANNEL_CHAR_LIMITS[channel] : undefined) ?? undefined,
          findings: review.findings.map((f) => ({
            issue: f.issue,
            evidence: f.evidence,
            suggestedSaferWording: f.suggestedSaferWording,
            legalReference: f.legalReference,
          })),
          languageIssues: review.languageQuality.issues.map((i) => ({
            message: i.message,
            excerpt: i.excerpt ?? "",
            suggestion: i.suggestion ?? "",
          })),
          // إقرار المرجع — يُفعّل البحث الحي ودعم الصياغة بمصدر موثّق (اختياري)
          hasSource: improvedHasSource || undefined,
          sourceHint: improvedHasSource ? (improvedSourceHint.trim() || undefined) : undefined,
        }),
      });
      const payload = (await res.json().catch(() => null)) as { jobId?: string; data?: { suggestedText?: string; sources?: Source[]; sourceNote?: string }; error?: string } | null;
      if (!res.ok || !payload) {
        setImprovedError(payload?.error ?? "تعذر إنشاء الصياغة المقترحة — حاول مرة أخرى.");
        return;
      }
      // مهمة خلفية (كالإنشاء): نتابعها على نقطة الحالة نفسها فلا ينقطع الطلب على الجوال
      let suggested = payload.data?.suggestedText?.trim() ?? "";
      let srcs = payload.data?.sources ?? [];
      let note = payload.data?.sourceNote ?? "";
      if (payload.jobId) {
        const outcome = await pollGenerationJob(payload.jobId);
        if (outcome.error) { setImprovedError(outcome.error); return; }
        suggested = (outcome.text ?? "").trim();
        srcs = outcome.sources ?? [];
        note = outcome.sourceNote ?? "";
        if (outcome.costUsd !== undefined) setOpCostUsd(outcome.costUsd);
        if (outcome.balanceUsd !== undefined) setOpBalanceUsd(outcome.balanceUsd);
      }
      if (!suggested) { setImprovedError("تعذر إنشاء الصياغة المقترحة — حاول مرة أخرى."); return; }
      setImprovedTextAI(suggested);
      setImprovedSources(srcs);
      setImprovedSourceNote(note);
    } catch {
      setImprovedError("تعذر الاتصال بخدمة الصياغة.");
    } finally {
      setImprovedLoading(false);
    }
  }

  // ── Save draft ──

  // بقرار مالكة المنصة: المرئي المولّد بعد المراجعة القانونية يلتحق فوراً بالإصدار الحالي
  // في سجل المحتوى (إن وُجد سجل مُحلَّل في هذه الجلسة) فلا يختفي عند مغادرة الصفحة.
  // مفاتيح البصمة تمنع تكرار حفظ المرئي نفسه أكثر من مرة في السجل الواحد
  const persistedVisualKeysRef = useRef<Set<string>>(new Set());

  function persistVisualToRecord(visual: Omit<StoredVisual, "id" | "createdAt">, recordId?: string) {
    const targetId = recordId ?? contentId;
    if (!targetId) return;
    const key = `${targetId}::${visual.visualType}::${visual.svg?.length ?? 0}::${visual.imageUrl?.length ?? 0}`;
    if (persistedVisualKeysRef.current.has(key)) return;
    const record = loadContentRecords().find((item) => item.id === targetId);
    if (!record) return;
    const outcome = attachVisualsToVersion(targetId, record.currentVersion, [visual]);
    if (outcome !== "failed") {
      persistedVisualKeysRef.current.add(key);
      flash("حُفظ المرئي مع المحتوى في سجل المحتوى");
    }
  }

  // إن وُلّدت المرئيات قبل المراجعة القانونية: تلتحق بالسجل لحظة إنشائه بعد اكتمال المراجعة
  // (مراقبة خارجية للمعرّف — دون أي مساس بدالة المراجعة نفسها)
  useEffect(() => {
    if (!contentId) return;
    void (async () => {
      (await collectSessionVisuals()).forEach((visual) => persistVisualToRecord(visual));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId]);

  // بقرار مالكة المنصة: كل مرئي مولّد في الجلسة يُحفظ مع المحتوى في السجل فلا يختفي —
  // والصور تُضغط قبل الحفظ فلا تسقط بسبب حصة التخزين
  async function collectSessionVisuals(): Promise<Omit<StoredVisual, "id" | "createdAt">[]> {
    const visuals: Omit<StoredVisual, "id" | "createdAt">[] = [];
    if (vtSvg) visuals.push({ visualType: vtType, visualTypeLabel: VISUAL_ENGINE_LABELS[vtType] ?? "مرئي", svg: vtSvg });
    if (vtPremiumUrl) visuals.push({
      visualType: "image",
      visualTypeLabel: "مرئي احترافي",
      imageUrl: await compressImageForStorage(vtPremiumUrl),
      provider: vtProvider || undefined,
    });
    if (imageGenSvg) visuals.push({ visualType: "image", visualTypeLabel: "مرئي من وصف", svg: imageGenSvg });
    if (imageGenUrl) visuals.push({ visualType: "image", visualTypeLabel: "صورة من وصف", imageUrl: await compressImageForStorage(imageGenUrl) });
    return visuals;
  }

  async function saveDraft() {
    if (!activeText.trim()) return;
    try {
      const visuals = await collectSessionVisuals();
      // محتوى محفوظ ومحلَّل مسبقاً (contentId قائم): لا يُنشأ سجل جديد منفصل بلا تحليل —
      // كان ذلك يحوّل «الاختيار النشط» لنسخة فارغة فيختفي التقييم من الاستديو والسجل
      // والمراجعة معاً. تُلحق المرئيات بالسجل القائم ويبقى الاختيار النشط عليه بتحليله.
      if (contentId) {
        // محتوى محلَّل مسبقاً محفوظ أصلاً تلقائياً لحظة اكتمال التحليل — لا داعي
        // لطردها من شاشة النتائج بالانتقال للسجل؛ يكفي إلحاق مرئيات الجلسة وتأكيد
        // الحفظ في مكانها (زر «التحليل التفصيلي» موجود لمن تريد الانتقال فعلاً)
        visuals.forEach((visual) => persistVisualToRecord(visual));
        const record = loadContentRecords().find((item) => item.id === contentId);
        if (record) setActiveContentSelection(contentId, record.currentVersion);
        flash("محفوظ في سجل المحتوى.");
        return;
      }
      // ★ بأمر مالكة المنصة: الحفظ لا يُضيع التحليل القائم — إن كانت النتيجة معروضة
      // تُحفظ النسخة بتحليلها كاملاً (الحكم يسافر مع النص)، ولا يُطلب تحليل من جديد
      if (review && kind) {
        const saved = upsertAnalyzedVersion({
          contentId: contentId ?? undefined,
          body: activeText,
          contentType: kind,
          contentTypeLabel: contentKindLabels[kind],
          channel, audience, purpose, specialty, topic: topic.trim() || undefined, webSources: activeWebSourcesValue, sourceGovernance: generatedGovernance, sourceDossier: generatedDossier, charLimit,
          adCta, adStyle, scriptDuration, scriptStyle, articleLength,
          review,
        });
        setContentId(saved.record.id);
        visuals.forEach((visual) => persistVisualToRecord(visual, saved.record.id));
        // البقاء في شاشة النتائج — الحفظ يؤكد ولا يطرد (نفس سلوك الحفظ للمحتوى القائم)
        flash("محفوظ في سجل المحتوى بتحليله الكامل.");
        return;
      }
      createDraftRecord(
        activeText,
        { kind, channel, audience, purpose, specialty, topic: topic.trim() || undefined, webSources: activeWebSourcesValue, sourceGovernance: generatedGovernance, sourceDossier: generatedDossier, charLimit, adCta, adStyle, scriptDuration, scriptStyle, articleLength },
        visuals
      );
      router.push("/content-management");
    } catch {
      flash("تعذر حفظ المسودة — حاول مرة أخرى.");
    }
  }

  function flash(msg: string) {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(""), 3000);
  }

  // «نشر مباشرة»: لا يجوز الانتقال مباشرة لصفحة المشاركة (/social-media) دون اعتماد
  // صريح لهذه النسخة بعينها — تلك الصفحة تعرض أي نسخة معتمدة سابقة في السجل كبديل
  // احتياطي إن لم تجد نسخة معتمدة مطابقة للمحتوى النشط، فينتقل بها المستخدم دون علم
  // إلى نص آخر مختلف تماماً. الاعتماد هنا يمر بنفس بوابة صفحة المراجعة نفسها (لا
  // اعتماد بلا امتثال كامل ولا مخاطر عالية) فتصبح هذه النسخة تحديداً هي المطابقة.
  // بوابة الإقرار قبل النشر (بقرار مالكة المنصة): تفتح النافذة بعد اجتياز الحواجز،
  // وتأكيدها يستدعي النشر الفعلي. المرتفع/البالغ لا يكون RECOMMENDED فلا يصل هنا.
  function requestPublish() {
    if (!review || review.publicationDecision.outcome !== "RECOMMENDED") {
      flash("النشر المباشر متاح فقط بعد امتثال النص كاملاً — عالج الملاحظات الظاهرة أولاً.");
      return;
    }
    if (!contentId) {
      flash("لا توجد نسخة محفوظة مرتبطة بهذا التحليل — أعد التحليل ثم حاول مجدداً.");
      return;
    }
    if (!loadContentRecords().find((item) => item.id === contentId)) {
      flash("لا توجد نسخة محفوظة مرتبطة بهذا التحليل — أعد التحليل ثم حاول مجدداً.");
      return;
    }
    setPublishAckOpen(true);
  }

  async function publishNow() {
    if (!review || review.publicationDecision.outcome !== "RECOMMENDED") {
      flash("النشر المباشر متاح فقط بعد امتثال النص كاملاً — عالج الملاحظات الظاهرة أولاً.");
      return;
    }
    if (!contentId) {
      flash("لا توجد نسخة محفوظة مرتبطة بهذا التحليل — أعد التحليل ثم حاول مجدداً.");
      return;
    }
    const record = loadContentRecords().find((item) => item.id === contentId);
    if (!record) {
      flash("لا توجد نسخة محفوظة مرتبطة بهذا التحليل — أعد التحليل ثم حاول مجدداً.");
      return;
    }
    const versionNumber = record.currentVersion;
    const approvedSave = approveContentVersion(contentId, versionNumber);
    if (!approvedSave) {
      flash("تعذر الاعتماد: عالج الملاحظات والحواجز الظاهرة أولاً من صفحة المراجعة.");
      return;
    }
    // تسجيل واقعة الإقرار سنداً إثباتياً مع النسخة المعتمدة + سجلّ الخادم الدائم
    const ackTier: AckTier = review.riskLevel === "متوسط" ? "medium" : "low";
    const ackText = acknowledgmentTextFor(ackTier);
    if (approvedSave.version.analysis) {
      approvedSave.version.analysis = {
        ...approvedSave.version.analysis,
        approvalAcknowledgment: {
          text: ackText,
          at: new Date().toISOString(),
          riskLevel: review.riskLevel,
        },
      };
    }
    void fetch("/api/acknowledgments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contentId,
        version: versionNumber,
        riskLevel: review.riskLevel,
        tier: ackTier,
        affectedParties: review.riskScoreExplanation?.affectedParties ?? undefined,
        ackText,
      }),
    }).catch(() => {});
    if (!markContentShared(contentId, versionNumber)) {
      flash("تعذر تجهيز النسخة للمشاركة — حاول مرة أخرى.");
      return;
    }
    setActiveContentSelection(contentId, versionNumber);
    router.push("/social-media");
  }

  // ── Reset ──

  // رجوع مرحلي يحافظ على المدخلات والنتيجة السابقة؛ لا يعيد ضبط عمل المستخدم.
  function frameStepValid(s: number): boolean {
    if (s === 1) return Boolean(kind);
    if (s === 2) return Boolean(audience);
    if (s === 3) return Boolean(purpose);
    if (s === 4) return Boolean(specialty);
    return true;
  }

  function goBackOneStage() {
    if (editingReviewedContent) {
      setEditingReviewedContent(false);
      return;
    }
    if (review) {
      setPath(null);
      return;
    }
    setPath(null);
  }

  function clearTypeSpecificFields() {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(null);
    setImagePreviewUrl("");
    setImageStyle("");
    setImageDimensions("");
    setCampaignName("");
    setCampaignDuration("");
    setCampaignGoal("");
    setAdCta("");
    setAdStyle("");
    setScriptDuration("");
    setScriptStyle("");
    setArticleLength("");
    setInfographicStyle("");
    setInfographicSubType("infographic");
    setInfographicChartType("");
    setInfographicMindStyle("");
    setInfographicDesc("");
    setPlanFrequency("");
    setPlanDateRange("");
    setVisualMode("upload");
    setImageDesc("");
    setImageGenLoading(false);
    setImageGenUrl("");
    setImageGenPrompt("");
    setImageGenError("");
    setImageGenSvg("");
    setVtType("infographic");
    setVtChartType("");
    setVtStyle("");
    setVtDimensions("");
    setVtEditText("");
    setVtConfirming(false);
    setVtLoading(false);
    setVtSvg("");
    setVtUrl("");
    setVtVisual(null);
    setVtError("");
    setVtSuggesting(false);
    setVtSuggestionReason("");
    setImageGenEditText("");
    setVtSectionOpen(false);
    setVtOutputChoice("");
    setVtOutputMode("editable_svg");
    setVtPremiumUrl("");
    setVtProvider("");
    setVtProviderNote("");
    setVtPremiumError("");
    setVtPlan(null);
    setVtPlanEditing(false);
    setVtPlanCollapsed(false);
  }

  function buildInfographicDesc(): string {
    const typeLabel =
      infographicSubType === "chart" ? "رسم بياني" :
      infographicSubType === "mindmap" ? "خريطة ذهنية" : "إنفوغراف احترافي";
    const subDetail =
      infographicSubType === "infographic" && infographicStyle ? ` — ${infographicStyle}` :
      infographicSubType === "chart" && infographicChartType ? ` (${infographicChartType})` :
      infographicSubType === "mindmap" && infographicMindStyle ? ` بأسلوب ${infographicMindStyle}` : "";
    const body = infographicDesc.trim() ? `: ${infographicDesc.trim()}` : "";
    return `${typeLabel}${subDetail}${body} — أسلوب احترافي قانوني نظيف بخلفية بيضاء أو رمادية فاتحة`;
  }

  function downloadSvg(svg: string, filename: string) {
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadSvgAsPng(svg: string, filename: string) {
    // Parse viewBox dimensions from the SVG
    const match = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
    const W = match ? parseInt(match[1]) : 1200;
    const H = match ? parseInt(match[2]) : 628;
    const dataUrl = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, W, H);
      ctx.drawImage(img, 0, 0, W, H);
      const a = document.createElement("a");
      a.download = filename.replace(/\.svg$/, ".png");
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = dataUrl;
  }

  async function downloadUrlAsPng(url: string, filename: string) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      // Fallback: open in new tab
      window.open(url, "_blank");
    }
  }

  function patchPlan(patch: Partial<VisualPlan>) {
    setVtPlan((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  async function generateVisualPlanStep() {
    if (!generatedText.trim()) return;
    setVtPlanLoading(true);
    setVtError("");
    try {
      const res = await fetch("/api/content-studio/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: generatedText.trim(),
          visualType: vtType,
          chartType: vtType === "chart" ? (vtChartType || undefined) : undefined,
          channel: channel || undefined,
          audience: audience || undefined,
          purpose: purpose || undefined,
          contentType: kind ? contentKindLabels[kind] : undefined,
          specialty: specialty || undefined,
          source: contextSourceLabel || undefined,
          outputMode: "editable_svg",
          planOnly: true,
          sourceContext: visualSourceContext,
        }),
      });
      const data = (await res.json()) as { visualPlan?: VisualPlan; error?: string };
      if (!res.ok || !data.visualPlan) { setVtError(data.error ?? "تعذر توليد الخطة البصرية"); return; }
      // نوع مخرج الخطة يُواءم قسرياً مع النوع الذي حدده المستخدم — الاختيار يُعكس بدقة لا بالاسم فقط
      setVtPlan({ ...data.visualPlan, recommendedOutputFormat: vtType });
      setVtPlanEditing(false);
      setVtPlanCollapsed(false);
    } catch {
      setVtError("تعذر الاتصال بخدمة الخطة البصرية");
    } finally {
      setVtPlanLoading(false);
    }
  }

  async function generateVisualTranslation(editInstruction?: string, approvedPlan?: VisualPlan | null) {
    if (!generatedText.trim() && !approvedPlan) return;
    setVtLoading(true);
    setVtError("");
    setVtSvg("");
    setVtUrl("");
    setVtVisual(null);
    setVtPremiumUrl("");
    setVtProvider("");
    setVtProviderNote("");
    setVtPremiumError("");
    setVtVariants([]);
    setVtPlanTexts(null);
    if (!approvedPlan) { setVtPlan(null); setVtPlanEditing(false); }
    // منع دوران لا نهائي عند السقوط للمحرك المتجهي
    const forceVector = editInstruction === "__force_vector__";
    try {
      const res = await fetch("/api/content-studio/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // بعد اعتماد الخطة لا يُرسل النص الخام — الخطة مصدر الحقيقة
          // النص الأصلي كاملاً — مرجع مطابقة الادعاءات في بوابة حوكمة المرئي
          description: generatedText.trim() || (approvedPlan ? `${approvedPlan.title} — ${approvedPlan.centralMessage}`.slice(0, 400) : ""),
          approvedPlan: approvedPlan ?? undefined,
          visualType: vtType,
          chartType: vtType === "chart" ? (vtChartType || undefined) : undefined,
          style: vtType === "image" ? (vtStyle || undefined) : undefined,
          dimensions: vtType === "image" ? (vtDimensions || undefined) : undefined,
          channel: channel || undefined,
          editInstruction: forceVector ? undefined : (editInstruction?.trim() || undefined),
          // البنية الحالية تُرسل مع طلب التعديل ليُطبَّق عليها لا أن يعاد التوليد من الصفر
          previousVisual: !forceVector && editInstruction?.trim() && vtVisual ? vtVisual : undefined,
          // التوجيه الذكي: صورة الغلاف فقط تمر عبر نموذج الصور (٣ نسخ)؛ الأنواع الغنية
          // بالنص تبقى SVG (عربي مثالي + قابل للتعديل)؛ والسقوط يفرض SVG.
          outputMode: forceVector
            ? "editable_svg"
            : (vtType === "image" ? "premium_image" : vtOutputMode),
          audience: audience || undefined,
          purpose: purpose || undefined,
          contentType: kind ? contentKindLabels[kind] : undefined,
          specialty: specialty || undefined,
          source: contextSourceLabel || undefined,
          sourceContext: visualSourceContext,
        }),
      });
      const data = (await res.json()) as { svgCode?: string; imageUrl?: string; imageBase64?: string; provider?: string; providerNote?: string; premiumError?: string; visual?: VisualStructure; error?: string; variants?: { url: string; flagged?: boolean; extracted?: string; checked?: boolean }[]; planTexts?: typeof vtPlanTexts; variantsError?: string; fallbackToVector?: boolean };
      if (!res.ok) { setVtError(data.error ?? "تعذر إنشاء المرئي — حاول مرة أخرى."); return; }
      // مسار الاستوديو: ثلاث نسخ يختار منها المستخدم
      if (data.variants && data.variants.length) {
        setVtVariants(data.variants);
        setVtPlanTexts(data.planTexts ?? null);
        setVtTextConfirmed(false);
        setVtEditText("");
        return;
      }
      // فشل مزود الصور كلياً: سقوط تلقائي لشبكة الأمان المتجهية (SVG) بلا كسر
      if (data.fallbackToVector && !forceVector) {
        setVtPremiumError(data.variantsError ? `تعذّر توليد الصور (${data.variantsError}) — عُرضت النسخة القابلة للتعديل بدلاً منها.` : "");
        await generateVisualTranslation("__force_vector__", approvedPlan);
        return;
      }
      if (data.svgCode) {
        setVtSvg(data.svgCode);
        setVtVisual(data.visual ?? null);
      } else if (!data.imageBase64 && !data.provider && !data.premiumError) {
        setVtUrl(data.imageUrl ?? "");
      }
      // الصورة الاحترافية (premium_image أو both) — أو بطاقة حالة الفشل بلا صورة بديلة
      const premiumUrl = data.imageBase64 ?? (data.provider ? data.imageUrl ?? "" : "");
      setVtPremiumUrl(premiumUrl);
      setVtProvider(data.provider ?? "");
      setVtProviderNote(data.providerNote ?? "");
      setVtPremiumError(data.premiumError ?? "");
      setVtEditText("");
      // بقرار مالكة المنصة: المرئي المولّد بعد المراجعة القانونية يلتحق فوراً بسجل المحتوى فلا يختفي
      if (data.svgCode) persistVisualToRecord({ visualType: vtType, visualTypeLabel: VISUAL_ENGINE_LABELS[vtType] ?? "مرئي", svg: data.svgCode });
      if (premiumUrl) persistVisualToRecord({ visualType: "image", visualTypeLabel: "مرئي احترافي", imageUrl: premiumUrl, provider: data.provider || undefined });
    } catch {
      setVtError("تعذر الاتصال بخدمة إنشاء المرئيات");
    } finally {
      setVtLoading(false);
    }
  }

  // ── PPTX export: renders the visual into a PowerPoint slide ──

  function svgToPngData(svg: string): Promise<{ dataUrl: string; w: number; h: number }> {
    return new Promise((resolve, reject) => {
      const match = svg.match(/viewBox="0 0 (\d+) (\d+)"/);
      const W = match ? parseInt(match[1]) : 1200;
      const H = match ? parseInt(match[2]) : 628;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("canvas")); return; }
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(img, 0, 0, W, H);
        resolve({ dataUrl: canvas.toDataURL("image/png"), w: W, h: H });
      };
      img.onerror = () => reject(new Error("svg"));
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    });
  }

  function urlToPngData(url: string): Promise<{ dataUrl: string; w: number; h: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || 1024;
        canvas.height = img.naturalHeight || 1024;
        const ctx = canvas.getContext("2d");
        if (!ctx) { reject(new Error("canvas")); return; }
        ctx.drawImage(img, 0, 0);
        resolve({ dataUrl: canvas.toDataURL("image/png"), w: canvas.width, h: canvas.height });
      };
      img.onerror = () => reject(new Error("image"));
      img.src = url;
    });
  }

  // pptxgenjs يُحمّل من CDN وقت الحاجة — تضمينه في الحزمة يكسر بناء Next (يستورد وحدات Node)
  function loadPptxGen(): Promise<new () => any> {
    const w = window as unknown as { PptxGenJS?: new () => any };
    if (w.PptxGenJS) return Promise.resolve(w.PptxGenJS);
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/pptxgenjs@4.0.1/dist/pptxgen.bundle.js";
      script.onload = () => {
        if (w.PptxGenJS) resolve(w.PptxGenJS);
        else reject(new Error("PptxGenJS unavailable"));
      };
      script.onerror = () => reject(new Error("script load failed"));
      document.head.appendChild(script);
    });
  }

  // ألوان العلامة داخل PowerPoint (hex بدون #)
  const PPT = {
    palm: "25935F", palmDeep: "166A45", ink: "0D121C", inkSec: "384250",
    line: "E5E7EB", bg: "F4F7F6", white: "FFFFFF",
    accents: ["25935F", "DBA102", "80519F", "2E90FA", "1B8354"],
  };
  const PPT_W = 13.33, PPT_H = 7.5;

  function pptxHeader(slide: any, title: string) {
    slide.background = { color: PPT.bg };
    slide.addShape("rect", { x: 0, y: 0, w: PPT_W, h: 0.85, fill: { color: PPT.palmDeep } });
    slide.addText(title, {
      x: 0.4, y: 0, w: PPT_W - 0.8, h: 0.85, align: "center", valign: "middle",
      color: PPT.white, bold: true, fontSize: 20, rtlMode: true, lang: "ar-SA",
    });
  }

  // خط مستقيم بين نقطتين — pptxgenjs يرسم داخل صندوق، لذا نحسب flip
  function pptxLine(slide: any, x1: number, y1: number, x2: number, y2: number, color: string, width = 1.5) {
    slide.addShape("line", {
      x: Math.min(x1, x2), y: Math.min(y1, y2),
      w: Math.abs(x2 - x1) || 0.01, h: Math.abs(y2 - y1) || 0.01,
      flipV: (x2 - x1) * (y2 - y1) < 0,
      line: { color, width },
    });
  }

  // بطاقة الاقتباس شريحة أصلية قابلة للتعديل — نصوص وأشكال حقيقية بهوية البطاقة الفاتحة
  function buildQuoteCardSlide(pptx: any, v: Extract<VisualStructure, { type: "quote_card" }>) {
    const slide = pptx.addSlide();
    slide.background = { color: "FCFCFD" };
    slide.addText("بطاقة اقتباس", { x: PPT_W - 5.9, y: 0.55, w: 5, h: 0.4, align: "right", color: "B87B02", bold: true, fontSize: 14, rtlMode: true, lang: "ar-SA" });
    slide.addText(v.data.title, { x: 0.9, y: 1.05, w: PPT_W - 1.8, h: 0.75, align: "right", color: PPT.ink, bold: true, fontSize: 24, rtlMode: true, lang: "ar-SA" });
    slide.addShape("roundRect", { x: PPT_W - 1.9, y: 1.9, w: 1.0, h: 0.07, rectRadius: 0.035, fill: { color: "DBA102" } });
    const qLen = (v.data.quote ?? "").length;
    const qSize = qLen > 110 ? 26 : qLen > 70 ? 30 : 36;
    slide.addText(v.data.quote, { x: 0.9, y: 2.2, w: PPT_W - 1.8, h: 3.0, align: "right", valign: "top", color: PPT.ink, bold: true, fontSize: qSize, rtlMode: true, lang: "ar-SA", lineSpacingMultiple: 1.3 });
    if (v.data.attribution) slide.addText(`✦ ${v.data.attribution}`, { x: 0.9, y: 5.35, w: PPT_W - 1.8, h: 0.5, align: "right", color: "B87B02", bold: true, fontSize: 15, rtlMode: true, lang: "ar-SA" });
    if (v.data.note) slide.addText(v.data.note, { x: 0.9, y: 5.95, w: PPT_W - 1.8, h: 0.8, align: "right", color: PPT.inkSec, fontSize: 12.5, rtlMode: true, lang: "ar-SA" });
    slide.addShape("roundRect", { x: PPT_W - 1.8, y: 6.95, w: 0.9, h: 0.06, rectRadius: 0.03, fill: { color: "DBA102" } });
  }

  function buildChartSlide(pptx: any, v: Extract<VisualStructure, { type: "chart" }>) {
    const slide = pptx.addSlide();
    pptxHeader(slide, v.data.title);
    const t = (v.chartType || "").toLowerCase();
    let chartName: string = pptx.ChartType.bar;
    let barDir: "col" | "bar" = "col";
    if (t.includes("خطي") || t.includes("line")) chartName = pptx.ChartType.line;
    else if (t.includes("دائري") || t.includes("pie")) chartName = pptx.ChartType.pie;
    else if (t.includes("حلقي") || t.includes("donut") || t.includes("doughnut")) chartName = pptx.ChartType.doughnut;
    else if (t.includes("مساحة") || t.includes("area")) chartName = pptx.ChartType.area;
    else if (t.includes("أفقية") || t.includes("hbar") || t.includes("h-bar")) barDir = "bar";
    const isRound = chartName === pptx.ChartType.pie || chartName === pptx.ChartType.doughnut;
    slide.addChart(chartName, [{
      name: v.data.yLabel || v.data.title,
      labels: v.data.data.map((p) => p.label),
      values: v.data.data.map((p) => p.value),
    }], {
      x: 0.7, y: 1.15, w: PPT_W - 1.4, h: PPT_H - 1.7,
      barDir,
      chartColors: isRound ? PPT.accents : [PPT.palm],
      showValue: true,
      dataLabelColor: PPT.inkSec, dataLabelFontSize: 12,
      catAxisLabelColor: PPT.inkSec, valAxisLabelColor: PPT.inkSec,
      showLegend: isRound, legendPos: "b", legendColor: PPT.inkSec,
      showTitle: false,
    });
  }

  function buildMindMapSlides(pptx: any, v: Extract<VisualStructure, { type: "mindmap" }>) {
    const slide = pptx.addSlide();
    pptxHeader(slide, v.data.title || v.data.center);
    const branches = (v.data.branches || []).slice(0, 5);
    const top = 1.1, areaH = PPT_H - top - 0.3;
    const rootW = 2.4, rootH = 1.0, rootX = PPT_W - 0.4 - rootW, rootCy = top + areaH / 2;
    const brW = 2.9, brH = 0.8, brX = rootX - 0.55 - brW;
    const subW = 3.3, subH = 0.62, subX = brX - 0.55 - subW;
    const n = Math.max(branches.length, 1);
    const groupH = areaH / n;

    branches.forEach((b, i) => {
      const acc = PPT.accents[i % PPT.accents.length];
      const gy = top + groupH * (i + 0.5);
      pptxLine(slide, brX + brW, gy, rootX, rootCy, acc, 1.75);
      slide.addText(b.label, {
        shape: "roundRect", rectRadius: 0.12,
        x: brX, y: gy - brH / 2, w: brW, h: brH,
        fill: { color: PPT.white }, line: { color: acc, width: 1.5 },
        align: "center", valign: "middle", color: PPT.ink, bold: true,
        fontSize: 13, rtlMode: true, lang: "ar-SA", shadow: { type: "outer", blur: 3, offset: 1, angle: 90, color: "9AA4B2", opacity: 0.35 },
      });
      const subs = [b.sub1, b.sub2].filter(Boolean) as string[];
      subs.forEach((s, si) => {
        const scy = subs.length === 1 ? gy : gy + (si === 0 ? -(subH / 2 + 0.06) : subH / 2 + 0.06);
        pptxLine(slide, subX + subW, scy, brX, gy, acc, 1.1);
        slide.addText(s, {
          shape: "roundRect", rectRadius: 0.08,
          x: subX, y: scy - subH / 2, w: subW, h: subH,
          fill: { color: PPT.white }, line: { color: PPT.line, width: 1 },
          align: "center", valign: "middle", color: PPT.inkSec,
          fontSize: 11, rtlMode: true, lang: "ar-SA",
        });
      });
    });

    slide.addText(v.data.center, {
      shape: "roundRect", rectRadius: 0.18,
      x: rootX, y: rootCy - rootH / 2, w: rootW, h: rootH,
      fill: { color: PPT.palm }, line: { color: PPT.palmDeep, width: 1.5 },
      align: "center", valign: "middle", color: PPT.white, bold: true,
      fontSize: 15, rtlMode: true, lang: "ar-SA", shadow: { type: "outer", blur: 4, offset: 2, angle: 90, color: PPT.palmDeep, opacity: 0.4 },
    });
  }

  // كاروسيل/ستوري بورد/موشن: شريحة غلاف + شريحة مستقلة لكل بطاقة — جاهزة للنشر المتتابع
  function buildCardsSlides(pptx: any, v: Extract<VisualStructure, { type: "carousel" | "storyboard" | "motion_script" }>) {
    const cover = pptx.addSlide();
    cover.background = { color: PPT.palmDeep };
    cover.addText(v.data.title ?? "", {
      x: 0.8, y: 2.3, w: PPT_W - 1.6, h: 1.4, align: "center", valign: "middle",
      color: PPT.white, bold: true, fontSize: 34, rtlMode: true, lang: "ar-SA",
    });
    if (v.data.subtitle) cover.addText(v.data.subtitle, {
      x: 0.8, y: 3.9, w: PPT_W - 1.6, h: 0.9, align: "center", valign: "middle",
      color: "DFF6E7", fontSize: 18, rtlMode: true, lang: "ar-SA",
    });
    (v.data.cards ?? []).slice(0, 8).forEach((c, i) => {
      const slide = pptx.addSlide();
      const acc = PPT.accents[i % PPT.accents.length];
      slide.background = { color: PPT.white };
      slide.addShape("rect", { x: 0, y: 0, w: PPT_W, h: 0.55, fill: { color: PPT.palmDeep } });
      slide.addText(c.tag ?? String(i + 1), {
        x: PPT_W - 2.2, y: 0.08, w: 1.9, h: 0.4, align: "right",
        color: PPT.white, bold: true, fontSize: 15, rtlMode: true, lang: "ar-SA",
      });
      if (c.meta) slide.addText(c.meta, {
        x: 0.3, y: 0.08, w: 1.9, h: 0.4, align: "left",
        color: "DFF6E7", fontSize: 13, rtlMode: true, lang: "ar-SA",
      });
      slide.addShape("rect", { x: PPT_W - 0.55, y: 1.15, w: 0.14, h: 1.1, fill: { color: acc } });
      slide.addText(c.heading ?? "", {
        x: 0.7, y: 1.1, w: PPT_W - 1.6, h: 1.0, align: "right", valign: "middle",
        color: PPT.ink, bold: true, fontSize: 28, rtlMode: true, lang: "ar-SA",
      });
      if (c.line1) slide.addText(c.line1, {
        x: 0.7, y: 2.4, w: PPT_W - 1.6, h: 1.6, align: "right", valign: "top",
        color: PPT.inkSec, fontSize: 19, rtlMode: true, lang: "ar-SA",
      });
      if (c.line2) slide.addText(c.line2, {
        x: 0.7, y: 4.1, w: PPT_W - 1.6, h: 1.4, align: "right", valign: "top",
        color: "4D5761", fontSize: 17, italic: true, rtlMode: true, lang: "ar-SA",
      });
      slide.addShape("rect", { x: 0.7, y: PPT_H - 0.5, w: 1.1, h: 0.07, fill: { color: acc } });
    });
  }

  function buildInfographicSlides(pptx: any, v: Extract<VisualStructure, { type: "infographic" }>) {
    // شريحة غلاف
    const cover = pptx.addSlide();
    cover.background = { color: PPT.palmDeep };
    cover.addText(v.data.title, {
      x: 0.8, y: 2.3, w: PPT_W - 1.6, h: 1.4, align: "center", valign: "middle",
      color: PPT.white, bold: true, fontSize: 34, rtlMode: true, lang: "ar-SA",
    });
    cover.addText(v.data.subtitle, {
      x: 0.8, y: 3.9, w: PPT_W - 1.6, h: 0.9, align: "center", valign: "middle",
      color: "DFF6E7", fontSize: 18, rtlMode: true, lang: "ar-SA",
    });
    // شريحة لكل قسم — نص أصلي قابل للتعديل بالكامل
    const sections = (v.data.sections || []).slice(0, 6);
    sections.forEach((s, i) => {
      const slide = pptx.addSlide();
      pptxHeader(slide, v.data.title);
      const acc = PPT.accents[i % PPT.accents.length];
      slide.addShape("rect", { x: PPT_W - 0.55, y: 1.3, w: 0.14, h: 1.1, fill: { color: acc } });
      slide.addText(s.heading, {
        x: 0.7, y: 1.25, w: PPT_W - 1.6, h: 0.9, align: "right", valign: "middle",
        color: PPT.ink, bold: true, fontSize: 24, rtlMode: true, lang: "ar-SA",
      });
      if (s.stat) {
        slide.addText(s.stat, {
          x: 0.7, y: 2.3, w: PPT_W - 1.6, h: 0.8, align: "right", valign: "middle",
          color: acc, bold: true, fontSize: 30, rtlMode: true, lang: "ar-SA",
        });
      }
      const lines = [s.line1, s.line2, s.line3].filter(Boolean) as string[];
      slide.addText(lines.map((l) => ({ text: l, options: { bullet: { code: "2022" }, breakLine: true } })), {
        x: 0.7, y: s.stat ? 3.3 : 2.5, w: PPT_W - 1.6, h: 3.2, align: "right", valign: "top",
        color: PPT.inkSec, fontSize: 16, rtlMode: true, lang: "ar-SA", lineSpacing: 30,
      });
      if (i === sections.length - 1 && v.data.source) {
        slide.addText(v.data.source, {
          x: 0.7, y: PPT_H - 0.75, w: PPT_W - 1.4, h: 0.5, align: "center", valign: "middle",
          color: "6C737F", fontSize: 11, rtlMode: true, lang: "ar-SA",
        });
      }
    });
  }

  async function downloadPptx(
    source: { svg?: string; url?: string; visual?: VisualStructure | null },
    filename: string
  ) {
    try {
      const PptxGen = await loadPptxGen();
      const pptx = new PptxGen();

      // بنية معروفة → عناصر PowerPoint أصلية (نصوص وأشكال ورسوم بيانية قابلة للتعديل)
      // البناة الأصليون للأنواع الثلاثة المعروفة فقط — الأنواع الجديدة تُصدَّر شريحة صورة من SVG
      if (source.visual && ["chart", "mindmap", "infographic", "carousel", "storyboard", "motion_script", "quote_card"].includes(source.visual.type)) {
        pptx.defineLayout({ name: "VIS_WIDE", width: PPT_W, height: PPT_H });
        pptx.layout = "VIS_WIDE";
        pptx.rtlMode = true;
        if (source.visual.type === "chart") buildChartSlide(pptx, source.visual);
        else if (source.visual.type === "mindmap") buildMindMapSlides(pptx, source.visual);
        else if (source.visual.type === "infographic") buildInfographicSlides(pptx, source.visual);
        else if (source.visual.type === "quote_card") buildQuoteCardSlide(pptx, source.visual);
        else buildCardsSlides(pptx, source.visual as Extract<VisualStructure, { type: "carousel" | "storyboard" | "motion_script" }>);
        await pptx.writeFile({ fileName: filename });
        return;
      }

      // صور المزودات (فوتوغرافية) — لا بنية لها، تُدرج كصورة
      const { dataUrl, w, h } = source.svg
        ? await svgToPngData(source.svg)
        : await urlToPngData(source.url ?? "");
      pptx.defineLayout({ name: "VIS", width: 10, height: 7.5 });
      pptx.layout = "VIS";
      const slide = pptx.addSlide();
      const hIn = Math.min(7.5, (h / w) * 10);
      const wIn = hIn >= 7.5 ? (w / h) * 7.5 : 10;
      slide.addImage({ data: dataUrl, x: (10 - wIn) / 2, y: (7.5 - hIn) / 2, w: wIn, h: hIn });
      // بقرار مالكة المنصة: الصورة النقطية لا يُعدَّل ما بداخلها — فتُرفق شريحة ثانية
      // تحمل نصوص الخطة البصرية كاملة كنصوص أصلية قابلة للتعديل والنسخ
      if (vtPlan) {
        const ts = pptx.addSlide();
        ts.background = { color: "FCFCFD" };
        ts.addText("نصوص المرئي — قابلة للتعديل", { x: 0.5, y: 0.3, w: 9, h: 0.4, align: "right", color: "B87B02", bold: true, fontSize: 13, rtlMode: true, lang: "ar-SA" });
        ts.addText(vtPlan.title, { x: 0.5, y: 0.75, w: 9, h: 0.6, align: "right", color: PPT.ink, bold: true, fontSize: 22, rtlMode: true, lang: "ar-SA" });
        if (vtPlan.subtitle) ts.addText(vtPlan.subtitle, { x: 0.5, y: 1.35, w: 9, h: 0.45, align: "right", color: PPT.inkSec, fontSize: 14, rtlMode: true, lang: "ar-SA" });
        const rows = (vtPlan.keySections ?? []).slice(0, 5).flatMap((sec) => [
          { text: sec.heading + (sec.stat ? ` — ${sec.stat}` : ""), options: { bold: true, color: PPT.palmDeep, fontSize: 14, breakLine: true } },
          ...(sec.bullets ?? []).slice(0, 3).map((b) => ({ text: b, options: { color: PPT.inkSec, fontSize: 12.5, bullet: true, breakLine: true } })),
        ]);
        if (rows.length) ts.addText(rows, { x: 0.5, y: 1.95, w: 9, h: 5.0, align: "right", valign: "top", rtlMode: true, lang: "ar-SA", lineSpacingMultiple: 1.25 });
      }
      await pptx.writeFile({ fileName: filename });
    } catch {
      flash("تعذر إنشاء ملف PowerPoint");
    }
  }

  async function suggestVisualType() {
    if (!generatedText.trim()) return;
    setVtSuggesting(true);
    setVtSuggestionReason("");
    try {
      const res = await fetch("/api/content-studio/suggest-visual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: generatedText.trim() }),
      });
      const data = (await res.json()) as {
        visualType?: "infographic" | "chart" | "mindmap" | "image";
        chartType?: string;
        reason?: string;
        error?: string;
      };
      if (!res.ok || !data.visualType) return;
      // نوع «صورة» مرتبط بالمزود الاحترافي حصراً — لا يُطبق الاقتراح إذا كان المزود معطلاً
      if (data.visualType === "image" && !premiumUsable) {
        setVtSuggestionReason("اقترح الذكاء صورة، لكن المرئي الاحترافي غير متاح حالياً — اختر نوعاً آخر");
        return;
      }
      setVtType(data.visualType);
      setVtOutputChoice(data.visualType);
      if (data.visualType === "image") setVtOutputMode("premium_image");
      if (data.visualType === "chart" && data.chartType) setVtChartType(data.chartType);
      if (data.reason) setVtSuggestionReason(data.reason);
      setVtSvg("");
      setVtUrl("");
      setVtVisual(null);
      setVtError("");
      setVtConfirming(false);
    } catch {
      // silent failure — user can still pick manually
    } finally {
      setVtSuggesting(false);
    }
  }

  async function generateImage(descOverride?: string, editInstruction?: string) {
    const description = descOverride ?? imageDesc;
    if (!description.trim()) return;

    const visualType =
      kind === "infographic"
        ? infographicSubType === "chart"
          ? "chart"
          : infographicSubType === "mindmap"
          ? "mindmap"
          : "infographic"
        : "image";

    setImageGenLoading(true);
    setImageGenError("");
    setImageGenUrl("");
    setImageGenPrompt("");
    setImageGenSvg("");
    try {
      const res = await fetch("/api/content-studio/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          sourceContext: visualSourceContext,
          visualType,
          chartType: visualType === "chart" ? (infographicChartType || undefined) : undefined,
          style: imageStyle || undefined,
          dimensions: imageDimensions || undefined,
          channel: channel || undefined,
          editInstruction: editInstruction?.trim() || undefined,
          audience: audience || undefined,
          purpose: purpose || undefined,
          contentType: kind ? contentKindLabels[kind] : undefined,
          specialty: specialty || undefined,
          source: contextSourceLabel || undefined,
        }),
      });
      const data = (await res.json()) as { svgCode?: string; imageUrl?: string; imageBase64?: string; premiumError?: string; providerNote?: string; prompt?: string; error?: string };
      if (!res.ok) {
        setImageGenError(data.error ?? "تعذر إنشاء الصورة — حاول مرة أخرى.");
        return;
      }
      if (data.svgCode) {
        setImageGenSvg(data.svgCode);
        // بقرار مالكة المنصة: المرئي المولّد يلتحق بسجل المحتوى فور توليده فلا يختفي
        persistVisualToRecord({ visualType: "image", visualTypeLabel: "مرئي من وصف", svg: data.svgCode });
      } else if (data.premiumError) {
        // فشل المزود: بطاقة حالة صادقة فقط — لا صورة بديلة ولا احتياط قديم
        setImageGenError(`${data.premiumError}${data.providerNote ? ` السبب: ${data.providerNote}` : ""}`);
      } else {
        const genUrl = data.imageBase64 ?? data.imageUrl ?? "";
        setImageGenUrl(genUrl);
        setImageGenPrompt(data.prompt ?? "");
        if (genUrl) persistVisualToRecord({ visualType: "image", visualTypeLabel: "صورة من وصف", imageUrl: genUrl });
      }
      setImageGenEditText("");
    } catch {
      setImageGenError("تعذر الاتصال بخدمة إنشاء الصور");
    } finally {
      setImageGenLoading(false);
    }
  }

  function startCreatePath() {
    if (kind === "visual_content" && visualMode === "describe" && imageDesc.trim() && !topic) {
      setTopic(imageDesc.trim());
    }
    // «رسم توضيحي»: وصف المحتوى المطلوب هو أساس النص — يُمرَّر موضوعاً للتوليد
    if (kind === "infographic" && infographicDesc.trim() && !topic) {
      setTopic(infographicDesc.trim());
    }
    // بدء صريح لمحتوى جديد — يقطع أي ارتباط بسجل سابق (معتمد أو محلَّل) كان قائماً
    // في هذه الجلسة، وإلا التصق تحليل ونشر النص الجديد بسجل نص قديم غير مرتبط.
    setReview(null);
    setContentId(undefined);
    setPath("create");
    setFrameStep(1);
  }

  function handleKindChange(newKind: ContentKind) {
    if (newKind !== kind) clearTypeSpecificFields();
    setKind(newKind);
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(file);
    setImagePreviewUrl(URL.createObjectURL(file));
  }

  // ── Render ──

  // الاسترجاع/ما بعد التوليد: وجود نتيجة أو نص محمَّل يعني اكتمال الإطار → اعرض خطوة المحتوى مباشرة
  // (لا يتداخل مع التنقّل الطازج خطوة بخطوة لأن هذه القيم فارغة أثناء خطوات ١..٤)
  useEffect(() => {
    if (path && (review || generatedText || reviewText.trim())) {
      setFrameStep((s) => (s < FRAME_TOTAL ? FRAME_TOTAL : s));
    }
  }, [path, review, generatedText, reviewText]);

  // ★ (بقرار المالكة): مسار المراجعة بلا نموذج إطار إطلاقاً — مراجعة سريعة دائماً:
  // سياق مهني عام محايد يُهيأ تلقائياً، والنص يُدخل مباشرة، والفحوص كاملة كما هي.
  // القيم لا تُكتب فوق قيم محتوى محمَّل من السجل (تُملأ فقط إن كانت فارغة).
  useEffect(() => {
    if (path !== "review") return;
    setFrameStep(FRAME_TOTAL);
    // سياق محايد حقاً — لا يدّعي نوعاً ولا غرضاً توعوياً لم يختره المستخدم
    setKind((v) => v || "post");
    setAudience((v) => v || "عام");
    setPurpose((v) => v || "مراجعة النص قانونياً");
    setSpecialty((v) => v || "عام — لا يقتصر على تخصص محدد");
  }, [path]);

  return (
    <div className="content-review-window space-y-6">
      <PageHeader
        eyebrow="مركز المحتوى الإعلامي والإعلاني"
        title={path === "review" ? "مراجعة المحتوى المهني" : path === "create" ? "إنشاء المحتوى المهني" : "إعداد المحتوى المهني"}
        illustration={path ? undefined : <p className="text-center text-xl font-semibold leading-9 text-palm">مرحباً بك</p>}
        action={path ? <Button variant="secondary-gray" onClick={goBackOneStage} leadingIcon={<ArrowRight size={16} />}>رجوع</Button> : undefined}
      />

      {/* (بقرار المالكة): زر «المراجعة السريعة» أُلغي — المسار كله صار سريعاً تلقائياً */}

      {/* ── 1. Context selectors ── (مسار المراجعة بلا إطار إطلاقاً — بقرار المالكة) */}
      {path && path !== "review" && (
      <Panel>
        <SectionTitle
          title="إطار المحتوى"
        />

        {/* بقرار مالكة المنصة: السياق أكورديون يُطوى تلقائياً عند عرض النتائج (نص مُنشأ
            أو مراجعة جاهزة) فلا يشغل مساحة فوق المحتوى — ويبقى مفتوحاً أثناء الإدخال */}
        <details open={!review && !generatedText} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg border border-line bg-paper px-4 py-3 text-sm font-semibold text-ink focus-ring">
            <span>{review || generatedText ? "عرض إطار المحتوى أو تعديله" : "إدخال إطار المحتوى"}</span>
            <span className="flex items-center gap-2 text-xs font-normal text-ink/50">
              {review || generatedText ? "معبأ وجاهز" : "أكمل الحقول المطلوبة"}
              <ChevronDown size={16} className="transition-transform group-open:rotate-180" aria-hidden="true" />
            </span>
          </summary>
          <div className="pt-5">

        {/* مؤشّر المراحل — كل الخطوات قابلة للنقر للانتقال المباشر (بقرار المالكة)،
            وزر «التالي» باقٍ كما هو؛ اكتمال الحقول المطلوبة يُفحص عند التوليد لا هنا */}
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-ink">خطوة {frameStep} من {FRAME_TOTAL} · {frameLabels[frameStep - 1]}</span>
          </div>
          <div className="mb-3 flex gap-1">
            {frameLabels.map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i < frameStep ? "bg-palm" : "bg-paper"}`} />
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {frameLabels.map((lbl, i) => {
              const n = i + 1;
              const done = n < frameStep;
              const current = n === frameStep;
              return (
                <button
                  key={lbl}
                  type="button"
                  onClick={() => setFrameStep(n)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition focus-ring ${current ? "bg-palm text-white" : done ? "bg-mint text-palm hover:bg-mintDeep" : "bg-paper text-ink/55 hover:bg-mint/40 hover:text-palm"}`}
                >
                  {n}. {lbl}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content type */}
        <div className={frameStep === 1 ? "" : "hidden"}>
        <div ref={kindFieldRef} className={`mb-4 rounded-xl transition-all ${missingField === "kind" ? "bg-warningSoft/60 p-3 ring-2 ring-amber-400" : ""}`}>
          <FieldLabel label="نوع المحتوى" hint="— ماذا تريد أن تنشئ أولًا" required />
          <MobileSelect value={kind ?? ""} onChange={(v) => handleKindChange(v as ContentKind)} placeholder="اختر نوع المحتوى" options={studioContentTypes} />
          <DesktopSelect value={kind ?? ""} onChange={(v) => handleKindChange(v as ContentKind)} placeholder="اختر نوع المحتوى" options={studioContentTypes} />
          <div className="hidden flex-wrap gap-2 sm:flex lg:hidden">
            {studioContentTypes.map((item) => (
              <button
                key={item.value}
                type="button"
                disabled={item.disabled}
                onClick={() => handleKindChange(item.value as ContentKind)}
                className={`${chipBase} ${item.disabled ? "cursor-not-allowed border-line bg-paper/60 text-ink/35" : kind === item.value ? chipSelected : chipIdle}`}
              >
                {contentTypeIcons[item.value]}
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* محتوى بصري — رفع تصميم أو وصف للذكاء الاصطناعي */}
        {kind === "visual_content" && (
          <div className="mb-4 overflow-hidden rounded-xl border border-palm/20 bg-mint/30">
            <div className="flex items-center gap-2 border-b border-palm/10 bg-mint/60 px-4 py-3">
              <ImageIcon size={14} className="text-palm" />
              <p className="text-sm font-semibold text-palm">متطلبات المحتوى البصري</p>
            </div>
            <div className="space-y-4 p-4">
              {/* Mode toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setVisualMode("upload")}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    visualMode === "upload"
                      ? "border-palm bg-white text-palm shadow-[0_0_0_1px_theme(colors.palm)]"
                      : "border-line bg-white/60 text-ink/55 hover:border-palm hover:text-palm"
                  }`}
                >
                  <Upload size={12} />
                  رفع تصميم
                </button>
                <button
                  type="button"
                  onClick={() => setVisualMode("describe")}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    visualMode === "describe"
                      ? "border-palm bg-white text-palm shadow-[0_0_0_1px_theme(colors.palm)]"
                      : "border-line bg-white/60 text-ink/55 hover:border-palm hover:text-palm"
                  }`}
                >
                  <Sparkles size={12} />
                  وصف للذكاء الاصطناعي
                </button>
              </div>

              {/* Upload mode */}
              {visualMode === "upload" && (
                <div>
                  <p className="mb-2 text-xs font-medium text-ink/65">
                    الصورة أو التصميم <span className="font-bold text-red-500">*</span>
                  </p>
                  {imagePreviewUrl ? (
                    <div className="relative inline-block">
                      <img
                        src={imagePreviewUrl}
                        alt="معاينة التصميم"
                        className="max-h-48 rounded-lg border border-line object-contain shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => { setImageFile(null); setImagePreviewUrl(""); }}
                        className="absolute -left-2 -top-2 rounded-full bg-red-500 p-0.5 text-white shadow-md transition hover:bg-red-600"
                        aria-label="إزالة الصورة"
                      >
                        <XCircle size={16} />
                      </button>
                      <p className="mt-1.5 text-xs text-ink/50">{imageFile?.name}</p>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-palm/30 bg-white p-6 text-center transition hover:border-palm hover:bg-mint/40">
                      <Upload size={28} className="text-palm/50" />
                      <div>
                        <p className="text-sm text-ink/70">
                          اسحب التصميم هنا أو{" "}
                          <span className="font-semibold text-palm">اختر من جهازك</span>
                        </p>
                        <p className="mt-1 text-xs text-ink/40">PNG · JPG · SVG · WebP — حتى ١٠ ميجابايت</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*,.svg"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              )}

              {/* Describe mode — توليد عبر المزود الاحترافي الموحّد (بطاقة حالة عند الفشل، لا احتياط) */}
              {visualMode === "describe" && (
                <div className="space-y-3">
                  <div>
                    <p className="mb-2 text-xs font-medium text-ink/65">
                      صف التصميم المطلوب <span className="font-bold text-red-500">*</span>
                    </p>
                    <textarea
                      value={imageDesc}
                      onChange={(e) => { setImageDesc(e.target.value); setImageGenUrl(""); setImageGenError(""); }}
                      placeholder="مثال: تصميم احترافي بخلفية فاتحة يشرح خطوات تسوية النزاعات العمالية بأسلوب بصري منظم، مناسب لـ LinkedIn..."
                      className="min-h-24 w-full rounded-lg border border-line bg-white p-3 text-sm leading-7"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => generateImage()}
                    disabled={!imageDesc.trim() || imageGenLoading || Boolean(providerInfo && !premiumUsable && providerInfo.mode !== "mock")}
                    className="inline-flex items-center gap-2 rounded-lg bg-palm px-4 py-2 text-sm font-medium text-white transition hover:bg-palm/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ImageIcon size={14} />
                    {imageGenLoading ? "جارٍ الإنشاء..." : "إنشاء مرئي"}
                  </button>
                  {!imageDesc.trim() && (
                    <p className="text-xs leading-5 text-ink/45">
                      أدخل وصف المحتوى المطلوب أولًا؛ لأن المرئي يجب أن يكون مبنيًا على النص.
                    </p>
                  )}
                  {providerInfo && !premiumUsable && providerInfo.mode !== "mock" && (
                    <p className="rounded-lg bg-warningSoft px-3 py-2 text-xs font-medium leading-5 text-warningDark">
                      OpenAI غير متاح حاليًا — استخدم SVG القابل للتعديل.
                      {providerInfo.verifyNote ? ` ${providerInfo.verifyNote}` : ""}
                    </p>
                  )}

                  {/* Loading skeleton */}
                  {imageGenLoading && (
                    <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-white py-10">
                      <div className="h-10 w-10 animate-spin rounded-full border-4 border-palm/20 border-t-palm" />
                      <p className="text-xs text-ink/50">الذكاء الاصطناعي يُنشئ الصورة — قد يستغرق ١٠–٣٠ ثانية</p>
                    </div>
                  )}

                  {/* Generated image */}
                  {imageGenUrl && !imageGenLoading && (
                    <div className="overflow-hidden rounded-xl border border-line bg-white">
                      <div className="flex justify-center bg-paper/40 p-3">
                        <img
                          src={imageGenUrl}
                          alt="الصورة المُنشأة"
                          className="max-h-[440px] w-auto max-w-full rounded-lg object-contain shadow-sm"
                          onError={() => { setImageGenUrl(""); setImageGenError("تعذر تحميل المرئي الناتج"); }}
                        />
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2.5">
                        <p className="text-xs text-ink/40">صورة مُنشأة بالذكاء الاصطناعي</p>
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={imageGenUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download="generated-image.jpg"
                            className="shrink-0 whitespace-nowrap rounded-lg border border-line bg-paper px-3 py-1 text-xs font-medium text-ink/70 transition hover:border-palm hover:text-palm"
                          >
                            JPG
                          </a>
                          <button
                            type="button"
                            onClick={() => void downloadUrlAsPng(imageGenUrl, "generated-image.png")}
                            className="shrink-0 whitespace-nowrap rounded-lg border border-line bg-paper px-3 py-1 text-xs font-medium text-ink/70 transition hover:border-palm hover:text-palm"
                          >
                            PNG
                          </button>
                          <button
                            type="button"
                            onClick={() => void downloadPptx({ url: imageGenUrl }, "generated-image.pptx")}
                            className="shrink-0 whitespace-nowrap rounded-lg border border-line bg-paper px-3 py-1 text-xs font-medium text-ink/70 transition hover:border-palm hover:text-palm"
                            title="تنزيل شريحة PowerPoint قابلة للتحرير"
                          >
                            PowerPoint
                          </button>
                          <button
                            type="button"
                            onClick={() => generateImage()}
                            className="shrink-0 whitespace-nowrap rounded-lg border border-line bg-paper px-3 py-1 text-xs font-medium text-ink/70 transition hover:border-palm hover:text-palm"
                          >
                            إعادة الإنشاء
                          </button>
                          <button
                            type="button"
                            onClick={() => { setImageGenUrl(""); setImageGenPrompt(""); setImageGenError(""); }}
                            className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-line bg-paper px-3 py-1 text-xs font-medium text-red-500/70 transition hover:border-red-300 hover:text-red-600"
                            title="مسح الصورة"
                          >
                            <Trash2 size={12} />
                            مسح
                          </button>
                        </div>
                      </div>
                      {/* طلب تعديل على الصورة الحالية */}
                      <div className="flex flex-wrap items-center gap-2 border-t border-line bg-paper/60 px-3 py-2.5">
                        <input
                          type="text"
                          value={imageGenEditText}
                          onChange={(e) => setImageGenEditText(e.target.value)}
                          placeholder="اطلب تعديلاً — مثال: خلفية أفتح، زاوية مختلفة، إضاءة أقوى..."
                          className="min-w-40 flex-1 rounded-lg border border-line bg-white px-3 py-1.5 text-xs focus:border-palm focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => void generateImage(undefined, imageGenEditText)}
                          disabled={!imageGenEditText.trim()}
                          className="shrink-0 whitespace-nowrap rounded-lg bg-palm px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-palm/90 disabled:opacity-40"
                        >
                          تطبيق التعديل
                        </button>
                      </div>
                      {imageGenPrompt && (
                        <details className="border-t border-line">
                          <summary className="cursor-pointer px-3 py-2 text-xs text-ink/40 hover:text-ink/60">
                            Prompt المستخدم (للاستخدام مع DALL-E أو Midjourney)
                          </summary>
                          <p className="px-3 pb-3 pt-1 text-xs leading-5 text-ink/55 select-all">
                            {imageGenPrompt}
                          </p>
                        </details>
                      )}
                    </div>
                  )}

                  {imageGenError && (
                    <div className="rounded-xl border border-warningBorder bg-warningSoft p-3">
                      <p className="text-xs font-medium leading-5 text-warningDark">{imageGenError}</p>
                    </div>
                  )}

                  {/* مساران: صورة مباشرة من الوصف هنا، أو «إنشاء محتوى» فيتولد النص أولاً ثم قسم الترجمة البصرية الكامل */}
                  <p className="rounded-lg bg-infoSoft px-3 py-2 text-xs font-medium leading-6 text-infoDark">
                    لإنتاج مخرجات أوسع من صورة واحدة: اختر «إنشاء محتوى» — يُمرَّر هذا الوصف تلقائياً لكتابة نص المحتوى أولاً، ثم يتيح قسم «ترجمة المحتوى بصرياً» تحويله إلى إنفوغراف أو رسم بياني أو خريطة ذهنية أو صورة.
                  </p>
                </div>
              )}

              {/* Style + dimensions (shared between modes) */}
              <div>
                <p className="mb-2 text-xs font-medium text-ink/65">أسلوب التصميم</p>
                <div className="flex flex-wrap gap-2">
                  {["احترافي رسمي", "إبداعي ملوّن", "بسيط ونظيف", "إخباري صارم"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setImageStyle(imageStyle === s ? "" : s)}
                      className={`${chipBase} text-xs ${imageStyle === s ? chipSelected : chipIdle}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-ink/65">نسبة الأبعاد</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "1:1", label: "مربع ١:١", hint: "منشورات" },
                    { key: "16:9", label: "أفقي ١٦:٩", hint: "بانرات" },
                    { key: "9:16", label: "عمودي ٩:١٦", hint: "قصص" },
                    { key: "4:5", label: "٤:٥", hint: "إنستغرام" },
                  ].map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setImageDimensions(imageDimensions === d.key ? "" : d.key)}
                      className={`${chipBase} text-xs ${imageDimensions === d.key ? chipSelected : chipIdle}`}
                    >
                      {d.label}
                      <span className="opacity-40">·</span>
                      <span className="opacity-50">{d.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* حملة — اسم ومدة وهدف */}
        {kind === "campaign" && (
          <div className="mb-4 overflow-hidden rounded-xl border border-palm/20 bg-mint/30">
            <div className="flex items-center gap-2 border-b border-palm/10 bg-mint/60 px-4 py-3">
              <Layers size={14} className="text-palm" />
              <p className="text-sm font-semibold text-palm">إعداد الحملة</p>
            </div>
            <div className="space-y-4 p-4">
              <div>
                <p className="mb-2 text-xs font-medium text-ink/65">
                  اسم الحملة <span className="font-bold text-red-500">*</span>
                </p>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="مثال: حملة الوعي بحقوق العمال ٢٠٢٥"
                  className="w-full rounded-lg border border-line bg-white px-4 py-2.5 text-sm transition focus:border-palm focus:outline-none"
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-ink/65">مدة الحملة</p>
                <div className="flex flex-wrap gap-2">
                  {["أسبوع", "أسبوعان", "شهر", "شهران", "ثلاثة أشهر"].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setCampaignDuration(campaignDuration === d ? "" : d)}
                      className={`${chipBase} text-xs ${campaignDuration === d ? chipSelected : chipIdle}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-ink/65">هدف الحملة</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    "تعزيز الوعي القانوني",
                    "توليد عملاء محتملين",
                    "إطلاق خدمة جديدة",
                    "ترسيخ العلامة المهنية",
                    "تثقيف قانوني متخصص",
                  ].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setCampaignGoal(campaignGoal === g ? "" : g)}
                      className={`${chipBase} text-xs ${campaignGoal === g ? chipSelected : chipIdle}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* إعلان — نداء الإجراء وأسلوب الإعلان */}
        {kind === "advertisement" && (
          <div className="mb-4 overflow-hidden rounded-xl border border-palm/20 bg-mint/30">
            <div className="flex items-center gap-2 border-b border-palm/10 bg-mint/60 px-4 py-3">
              <Megaphone size={14} className="text-palm" />
              <p className="text-sm font-semibold text-palm">إعداد الإعلان المهني</p>
            </div>
            <div className="space-y-4 p-4 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
              <div>
                <p className="mb-2 text-xs font-medium text-ink/65">نداء الإجراء (CTA)</p>
                <DesktopSelect value={adCta} onChange={setAdCta} emptyLabel="بلا تحديد" options={["تواصل معنا", "احجز استشارة مجانية", "اقرأ المقال كاملاً", "زر الموقع الإلكتروني", "شاهد الفيديو"].map((c) => ({ value: c, label: c }))} />
                <div className="flex flex-wrap gap-2 lg:hidden">
                  {["تواصل معنا", "احجز استشارة مجانية", "اقرأ المقال كاملاً", "زر الموقع الإلكتروني", "شاهد الفيديو"].map((cta) => (
                    <button
                      key={cta}
                      type="button"
                      onClick={() => setAdCta(adCta === cta ? "" : cta)}
                      className={`${chipBase} text-xs ${adCta === cta ? chipSelected : chipIdle}`}
                    >
                      {cta}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-ink/65">أسلوب الإعلان</p>
                <DesktopSelect value={adStyle} onChange={setAdStyle} emptyLabel="بلا تحديد" options={["مهني رسمي", "احترافي محايد", "توعوي تثقيفي", "ترويجي جذاب"].map((s) => ({ value: s, label: s }))} />
                <div className="flex flex-wrap gap-2 lg:hidden">
                  {["مهني رسمي", "احترافي محايد", "توعوي تثقيفي", "ترويجي جذاب"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setAdStyle(adStyle === s ? "" : s)}
                      className={`${chipBase} text-xs ${adStyle === s ? chipSelected : chipIdle}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* نص فيديو — مدة وأسلوب */}
        {kind === "script" && (
          <div className="mb-4 overflow-hidden rounded-xl border border-palm/20 bg-mint/30">
            <div className="flex items-center gap-2 border-b border-palm/10 bg-mint/60 px-4 py-3">
              <Video size={14} className="text-palm" />
              <p className="text-sm font-semibold text-palm">إعداد نص الفيديو</p>
            </div>
            <div className="space-y-4 p-4">
              <div>
                <p className="mb-2 text-xs font-medium text-ink/65">المدة المستهدفة للفيديو</p>
                <div className="flex flex-wrap gap-2">
                  {["٣٠ ثانية", "دقيقة واحدة", "٣ دقائق", "٥ دقائق", "+١٠ دقائق"].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setScriptDuration(scriptDuration === d ? "" : d)}
                      className={`${chipBase} text-xs ${scriptDuration === d ? chipSelected : chipIdle}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-ink/65">أسلوب النص</p>
                <div className="flex flex-wrap gap-2">
                  {["تقديمي رسمي", "حواري تفاعلي", "توضيحي خطوة بخطوة", "إعلامي إخباري"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setScriptStyle(scriptStyle === s ? "" : s)}
                      className={`${chipBase} text-xs ${scriptStyle === s ? chipSelected : chipIdle}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* مقال — الطول المستهدف */}
        {kind === "article" && (
          <div className="mb-4 overflow-hidden rounded-xl border border-palm/20 bg-mint/30">
            <div className="flex items-center gap-2 border-b border-palm/10 bg-mint/60 px-4 py-3">
              <BookOpen size={14} className="text-palm" />
              <p className="text-sm font-semibold text-palm">إعداد المقال</p>
            </div>
            <div className="p-4">
              <p className="mb-2 text-xs font-medium text-ink/65">الطول المستهدف</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "short", label: "قصير", hint: "٥٠٠–٨٠٠ كلمة" },
                  { key: "medium", label: "متوسط", hint: "٨٠٠–١٥٠٠ كلمة" },
                  { key: "long", label: "معمّق", hint: "+١٥٠٠ كلمة" },
                ].map((l) => (
                  <button
                    key={l.key}
                    type="button"
                    onClick={() => setArticleLength(articleLength === l.key ? "" : l.key)}
                    className={`${chipBase} flex-col items-start gap-0.5 py-2 text-xs ${articleLength === l.key ? chipSelected : chipIdle}`}
                  >
                    <span className="font-medium">{l.label}</span>
                    <span className="opacity-55">{l.hint}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* رسم توضيحي / بياني / خريطة ذهنية */}
        {kind === "infographic" && (
          <div className="mb-4 overflow-hidden rounded-xl border border-palm/20 bg-mint/30">
            <div className="flex items-center gap-2 border-b border-palm/10 bg-mint/60 px-4 py-3">
              <BarChart2 size={14} className="text-palm" />
              <p className="text-sm font-semibold text-palm">إعداد المرئيات والمخططات</p>
            </div>
            <div className="space-y-4 p-4">

              {/* Sub-type selector */}
              <div>
                <p className="mb-2 text-xs font-medium text-ink/65">نوع المرئي</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "infographic" as const, label: "إنفوغراف" },
                    { key: "chart" as const, label: "رسم بياني / شارت" },
                    { key: "mindmap" as const, label: "خريطة ذهنية" },
                  ].map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => {
                        setInfographicSubType(t.key);
                        setInfographicChartType("");
                        setInfographicMindStyle("");
                        setImageGenUrl("");
                        setImageGenSvg("");
                        setImageGenError("");
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                        infographicSubType === t.key
                          ? "border-palm bg-white text-palm shadow-[0_0_0_1px_theme(colors.palm)]"
                          : "border-line bg-white/60 text-ink/55 hover:border-palm hover:text-palm"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Infographic — layout options */}
              {infographicSubType === "infographic" && (
                <div>
                  <p className="mb-2 text-xs font-medium text-ink/65">نوع التخطيط</p>
                  <div className="flex flex-wrap gap-2">
                    {["خطوات متسلسلة", "إحصائيات ومقارنات", "شجرة قرارات", "خط زمني", "قائمة بصرية"].map((s) => (
                      <button key={s} type="button"
                        onClick={() => setInfographicStyle(infographicStyle === s ? "" : s)}
                        className={`${chipBase} text-xs ${infographicStyle === s ? chipSelected : chipIdle}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chart — chart type */}
              {infographicSubType === "chart" && (
                <div>
                  <p className="mb-2 text-xs font-medium text-ink/65">نوع الرسم البياني</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: "أعمدة", hint: "Bar" },
                      { key: "خطي", hint: "Line" },
                      { key: "دائري", hint: "Pie" },
                      { key: "حلقي", hint: "Donut" },
                      { key: "مساحة", hint: "Area" },
                      { key: "أعمدة أفقية", hint: "H-Bar" },
                    ].map((c) => (
                      <button key={c.key} type="button"
                        onClick={() => setInfographicChartType(infographicChartType === c.key ? "" : c.key)}
                        className={`${chipBase} text-xs ${infographicChartType === c.key ? chipSelected : chipIdle}`}>
                        {c.key}
                        <span className="opacity-40">·</span>
                        <span className="opacity-50">{c.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Mind map — style */}
              {infographicSubType === "mindmap" && (
                <div>
                  <p className="mb-2 text-xs font-medium text-ink/65">أسلوب الخريطة</p>
                  <div className="flex flex-wrap gap-2">
                    {["إشعاعي من المركز", "هرمي من الأعلى", "شجرة أفقية", "عنقودي"].map((s) => (
                      <button key={s} type="button"
                        onClick={() => setInfographicMindStyle(infographicMindStyle === s ? "" : s)}
                        className={`${chipBase} text-xs ${infographicMindStyle === s ? chipSelected : chipIdle}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <p className="mb-2 text-xs font-medium text-ink/65">
                  صف المحتوى المطلوب <span className="font-bold text-red-500">*</span>
                </p>
                <textarea
                  value={infographicDesc}
                  onChange={(e) => { setInfographicDesc(e.target.value); setImageGenUrl(""); setImageGenSvg(""); setImageGenError(""); }}
                  placeholder={
                    infographicSubType === "infographic"
                      ? "مثال: إنفوغراف يوضح خطوات إنهاء عقد العمل وفق نظام العمل السعودي..."
                      : infographicSubType === "chart"
                      ? "مثال: رسم بياني يُظهر توزيع أنواع النزاعات العمالية عبر خمس سنوات..."
                      : "مثال: خريطة ذهنية تُلخص حقوق المستثمر الأجنبي في نظام الاستثمار السعودي..."
                  }
                  className="min-h-24 w-full rounded-lg border border-line bg-white p-3 text-sm leading-7"
                />
              </div>

            </div>
          </div>
        )}

        {/* خطة نشر — مدة وتكرار */}
        {kind === "publishing_plan" && (
          <div className="mb-4 overflow-hidden rounded-xl border border-palm/20 bg-mint/30">
            <div className="flex items-center gap-2 border-b border-palm/10 bg-mint/60 px-4 py-3">
              <CalendarDays size={14} className="text-palm" />
              <p className="text-sm font-semibold text-palm">إعداد خطة النشر</p>
            </div>
            <div className="space-y-4 p-4">
              <div>
                <p className="mb-2 text-xs font-medium text-ink/65">المدة الزمنية للخطة</p>
                <div className="flex flex-wrap gap-2">
                  {["أسبوع", "أسبوعان", "شهر", "ثلاثة أشهر", "ستة أشهر"].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setPlanDateRange(planDateRange === d ? "" : d)}
                      className={`${chipBase} text-xs ${planDateRange === d ? chipSelected : chipIdle}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-ink/65">تكرار النشر</p>
                <div className="flex flex-wrap gap-2">
                  {["يومي", "مرتان أسبوعياً", "أسبوعي", "كل أسبوعين"].map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setPlanFrequency(planFrequency === f ? "" : f)}
                      className={`${chipBase} text-xs ${planFrequency === f ? chipSelected : chipIdle}`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        </div>
        {/* الجمهور والهدف والتخصص — كل حقل خطوة مستقلة */}
        <div>
        {/* Audience */}
        <div ref={audienceFieldRef} className={`mb-4 rounded-xl transition-all ${frameStep === 2 ? "" : "hidden"} ${missingField === "audience" ? "bg-warningSoft/60 p-3 ring-2 ring-amber-400" : ""}`}>
          <FieldLabel label="الجمهور" required />
          <MobileSelect value={audience} onChange={setAudience} placeholder="اختر الجمهور" options={audiences.map((a) => ({ value: a, label: a }))} />
          <DesktopSelect value={audience} onChange={setAudience} placeholder="اختر الجمهور" options={audiences.map((a) => ({ value: a, label: a }))} />
          <div className="hidden flex-wrap gap-2 sm:flex lg:hidden">
            {audiences.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setAudience(item)}
                className={`${chipBase} ${audience === item ? chipSelected : chipIdle}`}
              >
                {audienceIcons[item]}
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Purpose */}
        <div ref={purposeFieldRef} className={`mb-4 rounded-xl transition-all ${frameStep === 3 ? "" : "hidden"} ${missingField === "purpose" ? "bg-warningSoft/60 p-3 ring-2 ring-amber-400" : ""}`}>
          <FieldLabel label="الهدف" required />
          <MobileSelect value={purpose} onChange={setPurpose} placeholder="اختر الهدف" options={purposes.map((p) => ({ value: p, label: p }))} />
          <DesktopSelect value={purpose} onChange={setPurpose} placeholder="اختر الهدف" options={purposes.map((p) => ({ value: p, label: p }))} />
          <div className="hidden flex-wrap gap-2 sm:flex lg:hidden">
            {purposes.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setPurpose(item)}
                className={`${chipBase} ${purpose === item ? chipSelected : chipIdle}`}
              >
                {purposeIcons[item]}
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Specialty — إجباري بقرارها: حقل خامس ظاهر دائماً ضمن السياق */}
        <div ref={specialtyFieldRef} className={`mb-4 rounded-xl transition-all ${frameStep === 4 ? "" : "hidden"} ${missingField === "specialty" ? "bg-warningSoft/60 p-3 ring-2 ring-amber-400" : ""}`}>
          <FieldLabel label="التخصص" required />
          <MobileSelect value={specialty} onChange={setSpecialty} placeholder="اختر التخصص" options={specialties.map((s) => ({ value: s, label: s }))} />
          <DesktopSelect value={specialty} onChange={setSpecialty} placeholder="اختر التخصص" options={specialties.map((s) => ({ value: s, label: s }))} />
          <div className="hidden flex-wrap gap-2 sm:flex lg:hidden">
            {specialties.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setSpecialty(specialty === item ? "" : item)}
                className={`${chipBase} ${specialty === item ? chipSelected : chipIdle}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        </div>

        {/* خيارات متقدمة (اختياري): حد الحروف — تظهر مع خطوة التخصص */}
        <div className={`border-t border-line pt-3 ${frameStep === 4 ? "" : "hidden"}`}>
          <button
            type="button"
            onClick={() => setAdvancedOpen((open) => !open)}
            aria-expanded={advancedIsOpen}
            className="flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-sm text-ink/65 transition hover:text-palm focus-ring"
          >
            <span>
              خيارات متقدمة <span className="text-ink/40">(اختياري)</span>
              {channel ? <span className="mr-2 inline-flex items-center gap-1 rounded-full bg-mint px-2 py-0.5 text-xs text-palm"><ChannelGlyph name={channel} size={12} />{channel}</span> : null}
              {charLimit !== null ? <span className="mr-2 rounded-full bg-mint px-2 py-0.5 text-xs text-palm">حد {charLimit} حرف</span> : null}
            </span>
            <ChevronDown size={15} className={`shrink-0 transition-transform duration-300 ${advancedIsOpen ? "rotate-180" : ""}`} />
          </button>

          <div className={`overflow-hidden transition-all duration-300 ${advancedIsOpen ? "mt-3 max-h-[1600px] opacity-100" : "max-h-0 opacity-0"}`}>
        {/* Channel — اختيارية بقرارها: بلا قناة يُكتب النص بصيغة عامة صالحة لأي منصة.
            شعارات القنوات الملونة ظاهرة دائماً على كل أحجام الشاشات — بلا قائمة منسدلة بديلة. */}
        <div className="mb-1">
          <FieldLabel label="القناة" optional />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {channels.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  const next = channel === item ? "" : item;
                  setChannel(next);
                  // ملء حدّ الحروف تلقائياً حسب القناة — الوجهات المفتوحة بلا حدّ (مفتوحة الطول)
                  setCharLimit(next && CHANNEL_CHAR_LIMITS[next] ? CHANNEL_CHAR_LIMITS[next]! : null);
                }}
                className={`${chipBase} justify-center ${OPEN_LENGTH_CHANNELS.has(item) ? "col-span-2 sm:col-span-3" : ""} ${channel === item ? chipSelected : chipIdle}`}
              >
                {channelIcons[item]}
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Character limit — optional */}
        <div className="mt-4 border-t border-line pt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm text-ink/65">
              حد الحروف{" "}
              <span className="text-ink/40">(اختياري)</span>
            </p>
            {charLimit !== null && (
              <button
                type="button"
                onClick={() => setCharLimit(null)}
                className="text-xs text-ink/40 transition hover:text-red-500"
              >
                مسح
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {charLimitPresets.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setCharLimit(charLimit === p.value ? null : p.value)}
                className={`${chipBase} text-xs ${charLimit === p.value ? chipSelected : chipIdle}`}
              >
                {p.label}
              </button>
            ))}
            <div className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-3 py-1.5 text-xs transition focus-within:border-palm">
              <input
                type="number"
                min={1}
                max={10000}
                value={charLimit ?? ""}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setCharLimit(isNaN(v) || v <= 0 ? null : v);
                }}
                placeholder="مخصص"
                className="w-16 bg-transparent text-right text-xs focus:outline-none"
              />
              <span className="text-ink/40">حرف</span>
            </div>
          </div>
          {channel && CHANNEL_CHAR_LIMITS[channel] && charLimit !== CHANNEL_CHAR_LIMITS[channel] && (
            <p className="mt-2 text-xs text-ink/45">
              الحد المعتاد لـ {channel}:{" "}
              <button
                type="button"
                onClick={() => setCharLimit(CHANNEL_CHAR_LIMITS[channel]!)}
                className="font-semibold text-palm underline-offset-2 hover:underline"
              >
                {CHANNEL_CHAR_LIMITS[channel]!} حرف
              </button>
            </p>
          )}
        </div>

          </div>
        </div>

        {/* أزرار التنقّل بين المراحل — رجوع / التالي */}
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
          <button
            type="button"
            onClick={() => { if (frameStep > 1) setFrameStep(frameStep - 1); else goBackOneStage(); }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-4 py-2.5 text-sm font-medium text-ink/70 transition hover:border-palm hover:text-palm focus-ring"
          >
            <ArrowRight size={16} aria-hidden="true" />
            {frameStep > 1 ? "السابق" : "تغيير (مراجعة/إنشاء)"}
          </button>
          {frameStep < FRAME_TOTAL && (
            <button
              type="button"
              disabled={!frameStepValid(frameStep)}
              onClick={() => { if (frameStepValid(frameStep)) setFrameStep(frameStep + 1); }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-palm px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-palmDark focus-ring disabled:opacity-40"
            >
              التالي
              <ArrowLeft size={16} aria-hidden="true" />
            </button>
          )}
        </div>
          </div>
        </details>
      </Panel>
      )}

      {/* ── 2. Path selection ── */}
      {!path && (
        <div>
          <p className="mb-3 text-sm font-semibold text-ink">كيف تريد البدء؟</p>
          {/* auto-rows-fr يوحّد ارتفاع البطاقتين مهما اختلف طول الوصف */}
          <div className="grid auto-rows-fr gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => { setReview(null); setContentId(undefined); setPath("review"); setFrameStep(1); }}
              className="flex flex-col items-start gap-3 rounded-xl border border-line border-r-2 border-r-palm bg-white p-6 text-right shadow-sm transition hover:shadow-md focus-ring"
            >
              <span className="grid h-14 w-14 place-items-center rounded-full bg-mint text-palm">
                <FileCheck2 size={26} aria-hidden="true" />
              </span>
              <span className="text-lg font-semibold text-ink">مراجعة محتوى</span>
              <span className="text-sm leading-6 text-ink/60">
                أدخل نصاً جاهزاً وراجعه قانونياً عبر محرك التحليل.
              </span>
            </button>

            <button
              type="button"
              onClick={startCreatePath}
              className="flex flex-col items-start gap-3 rounded-xl border border-line border-r-2 border-r-violet bg-white p-6 text-right shadow-sm transition hover:shadow-md focus-ring"
            >
              <span className="grid h-14 w-14 place-items-center rounded-full bg-violetSoft text-violet">
                <Sparkles size={26} aria-hidden="true" />
              </span>
              <span className="text-lg font-semibold text-ink">إنشاء محتوى</span>
              <span className="text-sm leading-6 text-ink/60">
                الذكاء الاصطناعي يُنشئ المحتوى بناءً على المصدر وإطار المحتوى، ثم يراجعه قانونياً.
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ── 3a. Review path — text input ── */}
      {path === "review" && frameStep >= FRAME_TOTAL && (!review || editingReviewedContent) && !reviewing && (
        <Panel id="studio-text-editor">
          <div className="mb-4 flex items-center justify-between">
            <SectionTitle title="مراجعة المحتوى" />
            <div className="flex items-center gap-3">
              <PreviewToggleButton preview={previewStudioReview} onToggle={() => setPreviewStudioReview((v) => !v)} />
              <button
                type="button"
                onClick={goBackOneStage}
                className="text-xs text-ink/50 transition hover:text-ink"
              >
                رجوع
              </button>
            </div>
          </div>

          {previewStudioReview ? (
            <ReadingPreview text={reviewText} />
          ) : (
          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            // أثناء التحليل يُقفل النص — تعديل نص يجري تحليله يجعل النتيجة عن نص غير المعروض
            disabled={reviewing}
            placeholder="أدخل النص هنا أو اختر صيغة مقترحة أعلاه..."
            className={`min-h-44 w-full rounded-lg border p-4 leading-8 transition disabled:bg-paper disabled:text-ink/60 ${
              charLimit !== null && reviewText.length > charLimit
                ? "border-red-400 focus:border-red-400"
                : "border-line"
            }`}
          />
          )}
          {charLimit !== null && (
            <div className={`mt-1 text-left text-xs tabular-nums ${
              reviewText.length > charLimit
                ? "font-bold text-red-500"
                : reviewText.length > charLimit * 0.9
                ? "text-amber-500"
                : "text-ink/35"
            }`}>
              {reviewText.length} / {charLimit}
              {reviewText.length > charLimit && (
                <span className="mr-2">(تجاوز بـ {reviewText.length - charLimit} حرف)</span>
              )}
            </div>
          )}
          {/* إسناد مرجعي اختياري — يُعين التحرّي، غير مانع؛ والقاعدة تتحرّى دائماً */}
          <div className="mt-4 rounded-lg border border-line bg-paper/50 p-3">
            <label className="flex cursor-pointer items-start gap-2.5">
              <input type="checkbox" checked={reviewHasSource} onChange={(e) => setReviewHasSource(e.target.checked)} className="mt-0.5 h-4 w-4 accent-palm" />
              <span className="text-sm text-ink/80">هل يستند نصك إلى مرجع أو مادة نظامية؟ <span className="text-ink/40">(اختياري — يعزّز دقة التحقق)</span></span>
            </label>
            {reviewHasSource && (
              <input
                type="text"
                value={reviewSourceHint}
                onChange={(e) => setReviewSourceHint(e.target.value)}
                placeholder="اذكر رقم المادة أو المصدر أو الصق الرابط"
                className="mt-2.5 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm focus:border-palm focus:outline-none"
              />
            )}
            <p className="mt-2 text-xs leading-5 text-ink/45">يُتحقَّق من صحّة المعلومات ومصداقيتها في كل الأحوال، حتى دون الإشارة إلى مرجع.</p>
          </div>
          <div className="mt-4 flex gap-3">
            <Button onClick={runReview} disabled={reviewText.trim().length < 5} leadingIcon={<FileCheck2 size={16} aria-hidden="true" />}>
              مراجعة المحتوى
            </Button>
          </div>
          {reviewError && <p className="mt-3 text-sm text-red-600">{reviewError}</p>}
        </Panel>
      )}

      {/* ── 3b. Create path — source + topic ── */}
      {path === "create" && frameStep >= FRAME_TOTAL && !generatedText && !generating && !review && (
        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <SectionTitle title="مصدر المحتوى" />
            <button
              type="button"
              onClick={goBackOneStage}
              className="text-xs text-ink/50 transition hover:text-ink"
            >
              رجوع
            </button>
          </div>

          {/* Source grid — عمود على الجوال، عمودان على المتوسطة، ثلاثة على الكبيرة، بارتفاع موحد.
              المصادر المشروطة بالتخصص (خريطة lib/source-specialty-map) تنطوي بحركة fade+collapse دون قفز */}
          <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {orderedSources
              .filter((s) => isSourceVisible(s.key, specialty)
                && isSourceVisibleForContentType(s.key, kind ? contentKindLabels[kind] : ""))
              .map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => {
                    setSource(s.key);
                    if (s.key !== "global-news") setGlobalSub("");
                  }}
                  className={`flex h-12 w-full items-center gap-2.5 rounded-lg border px-3 text-sm transition focus-ring ${
                    source === s.key
                      ? "border-palm bg-mint text-palm shadow-[0_0_0_1px_theme(colors.palm)]"
                      : "border-line bg-white text-ink/70 hover:border-palm hover:bg-mint hover:text-palm"
                  }`}
                >
                  <span className="text-base">{s.icon}</span>
                  <span className="flex-1 truncate text-right">{s.label}</span>
                  {s.subs && <ChevronDown size={13} className="shrink-0 opacity-40" />}
                </button>
              ))}
          </div>

          {/* تنبيه غير معيق عند تحديث المصادر تبعاً للتخصص */}
          {sourceToast ? (
            <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center">
              <div className="rounded-full border border-line bg-white px-4 py-2 text-sm text-ink shadow-lg">
                {sourceToast}
              </div>
            </div>
          ) : null}

          {/* Global news sub-categories */}
          {source === "global-news" && (
            <div className="mb-4 rounded-lg border border-line bg-paper p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                زاوية الخبر العالمي{specialty ? ` — في مجال «${specialty}»` : ""}
              </p>
              <div className="flex flex-wrap gap-2">
                {contentSources
                  .find((s) => s.key === "global-news")
                  ?.subs?.filter((sub) => isGlobalSubVisible(sub.key, specialty))
                  .map((sub) => (
                    <button
                      key={sub.key}
                      type="button"
                      onClick={() => setGlobalSub(sub.key)}
                      className={`${chipBase} ${globalSub === sub.key ? chipSelected : chipIdle}`}
                    >
                      {sub.label}
                    </button>
                  ))}
              </div>
            </div>
          )}

          {/* Topic — اختياري مع «ابتكر من الذكاء الاصطناعي» */}
          <div className="mb-4">
            <FieldLabel label="الموضوع أو الفكرة" hint={source === "ai-original" ? "(اختياري)" : undefined} />
            <textarea
              value={topic}
              rows={3}
              onChange={(e) => {
                setTopic(e.target.value);
                e.currentTarget.style.height = "auto";
                e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
              }}
              placeholder={source === "ai-original"
                ? "اكتب فكرتك — أو اتركه فارغاً."
                : "اكتب موضوعك هنا."}
              className="w-full resize-none overflow-hidden rounded-lg border border-line p-4 leading-8"
            />
          </div>

          {/* تعزيز بمصدر — مفتاح واحد ظاهر في كل الأنواع المؤهلة، وقرار المستخدم
              فيه هو المرجع الوحيد ويُحترم في الاتجاهين. مطفأ افتراضياً لكل الأنواع
              (بقرار المالكة: يفتحه المستخدم نفسه)، والبحث محكوم بوثيقة حوكمة
              المصادر في الخادم. */}
          {canSupportSource && source && (
            <div className="mb-4 rounded-lg border border-line bg-paper/40 p-4">
              <label className="flex cursor-pointer items-start justify-between gap-3">
                <span>
                  <span className="text-sm font-medium text-ink/85">تعزيز المحتوى بمصادر ومراجع موثّقة</span>
                  <span className="mt-0.5 block text-xs leading-5 text-ink/50">
                    عند التفعيل، تبحث المنصة في المصادر الرسمية المعتمدة ويُستند إليها بروابطها. وإذا لم يوجد مصدر رسمي، يُصرَّح بذلك أعلى المحتوى ولا يُذكر أي حكم أو رقم أو مدة بلا مصدر. وعند الإيقاف لا تبحث المنصة — وتبقى قواعد حوكمة المصادر ملزمة في الحالين.
                  </span>
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={wantSource}
                  onClick={() => setWantSource((v) => !v)}
                  className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${wantSource ? "bg-palm" : "bg-line"}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${wantSource ? "right-0.5" : "right-[22px]"}`} />
                </button>
              </label>
            </div>
          )}

          <button
            type="button"
            onClick={generateContent}
            disabled={!source || (source !== "ai-original" && topic.trim().length < 3)}
            className="inline-flex items-center gap-2 rounded-lg bg-violet px-[11px] py-[9px] text-sm font-medium text-white transition hover:bg-violetDark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles size={16} aria-hidden="true" />
            إنشاء المحتوى
          </button>
          {(!kind || !audience || !purpose || !specialty) && (
            <p className="mt-3 rounded-lg bg-warningSoft px-3 py-2 text-xs font-medium leading-5 text-warningDark">
              أكمل السياق أولًا في القسم ١ — نوع المحتوى والجمهور والهدف والتخصص مطلوبة قبل إنشاء المحتوى ليُكتب على مقاس سياقه.
            </p>
          )}
          {generateError && <p className="mt-3 text-sm text-red-600">{generateError}</p>}
        </Panel>
      )}

      {/* Generating spinner */}
      {path === "create" && generating && (
        <Panel>
          <ProgressRing color="violet" estMs={150000} label="الذكاء الاصطناعي يُنشئ المحتوى…" sub="تستغرق دقيقتين أو ثلاثاً فقط — لا تُغلق الصفحة." />
        </Panel>
      )}

      {/* ── 4. Generated content preview ── */}
      {path === "create" && generatedText && (!review || editingReviewedContent) && !reviewing && (
        <Panel id="studio-text-editor" className="bg-violetSoft">
          {finalizing && (
            <p className="mb-3 rounded-lg bg-goldSoft px-3 py-2 text-xs font-medium leading-5 text-gold">
              تحقق نهائي يجري الآن — قد يُحدَّث النص تلقائياً خلال لحظات.
            </p>
          )}
          <div className="mb-4 flex items-center justify-between">
            <SectionTitle title="المحتوى المقترح" />
            <div className="flex items-center gap-3">
              {/* معاينة القراءة النظيفة (بطلب مالكة المنصة) — تبديل بين التحرير والمعاينة */}
              <button
                type="button"
                onClick={() => setPreviewGenerated((v) => !v)}
                className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition ${previewGenerated ? "border-palm bg-mint/30 text-palm" : "border-line text-ink/60 hover:border-palm hover:text-palm"}`}
              >
                <Eye size={13} aria-hidden="true" />
                {previewGenerated ? "تحرير" : "معاينة"}
              </button>
              <button
                type="button"
                onClick={() => { setGeneratedText(""); setTopic(""); setPreviewGenerated(false); setVtSvg(""); setVtUrl(""); setVtVisual(null); setVtError(""); setVtConfirming(false); setVtSuggestionReason(""); setVtSectionOpen(false); setVtOutputChoice(""); setVtPremiumUrl(""); setVtProvider(""); setVtProviderNote(""); setVtPremiumError(""); setVtVariants([]); setVtPlanTexts(null); setVtPlan(null); setVtPlanEditing(false); }}
                className="text-xs text-ink/50 transition hover:text-ink"
              >
                أعد الإنشاء
              </button>
            </div>
          </div>

          {/* توزيع رأسي: المحرّر أولاً، ثم ترجمة المحتوى بصرياً أسفله — بلا عمود جانبي
              يترك مساحة فارغة حين يقصر أحد القسمين عن الآخر (بقرار مالكة المنصة) */}
          <div>
          <div className="min-w-0">
          {/* Text — always shown first. وضع المعاينة: عرض قراءة نظيف بلا صندوق تحرير */}
          {previewGenerated ? (
            <div className="whitespace-pre-wrap rounded-xl border border-line bg-white p-5 text-[15px] leading-9 text-ink shadow-sm">
              {generatedText}
            </div>
          ) : (
          <textarea
            value={generatedText}
            onChange={(e) => { setGeneratedText(e.target.value); setPendingGeneratedReview(null); }}
            // أثناء التحليل يُقفل النص — تعديل نص يجري تحليله يجعل النتيجة عن نص غير المعروض
            disabled={reviewing}
            className={`min-h-44 w-full rounded-lg border p-4 leading-8 transition disabled:bg-paper disabled:text-ink/60 ${
              charLimit !== null && generatedText.length > charLimit
                ? "border-red-400 focus:border-red-400"
                : "border-line"
            }`}
          />
          )}
          {!previewGenerated && charLimit !== null && (
            <div className={`mt-1 text-left text-xs tabular-nums ${
              generatedText.length > charLimit
                ? "font-bold text-red-500"
                : generatedText.length > charLimit * 0.9
                ? "text-amber-500"
                : "text-ink/35"
            }`}>
              {generatedText.length} / {charLimit}
              {generatedText.length > charLimit && (
                <span className="mr-2">(تجاوز بـ {generatedText.length - charLimit} حرف)</span>
              )}
            </div>
          )}
          {/* إشعار المصارحة: طُلب مرجع ولم يُعثر عليه — يظهر صراحةً بدل الصمت */}
          {generatedSourceNote && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-7 text-amber-800">
              <AlertTriangle size={16} className="mt-1 shrink-0" aria-hidden="true" />
              <span>{generatedSourceNote}</span>
            </div>
          )}
          <SourcesPanel
            sources={generatedSources}
            onInsert={(block) => { setGeneratedText((prev) => prev + block); setPendingGeneratedReview(null); }}
          />
          <CostNotice costUsd={opCostUsd} balanceUsd={opBalanceUsd} />
          </div>
          {/* عمود جانبي: ترجمة المحتوى بصرياً — بالمكوّنات الحالية نفسها */}
          <div className="min-w-0">
          {/* ── قسم بصري رئيسي واحد فقط حسب نوع المحتوى — «محتوى بصري» مساره قسم المتطلبات وحده ── */}
          {!isVisualDirect && !vtSectionOpen && (
            <div className="mt-5 rounded-xl border border-dashed border-palm/30 bg-mint/10 p-4">
              <button
                type="button"
                disabled
                title="قريبًا"
                className="flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-line bg-paper/60 px-4 py-2 text-xs font-semibold text-ink/40"
              >
                <BarChart2 size={13} aria-hidden="true" />
                {visualOutputs.optIn}
                <span className="mr-1 opacity-40">·</span>
                <span className="opacity-70">قريبًا</span>
              </button>
              <p className="mt-2 text-xs leading-5 text-ink/45">
                {generatedText.trim()
                  ? "المحتوى هو الأصل — المرئي مخرج داعم يوضّح النص."
                  : "أدخل المحتوى أو ولّد النص أولًا؛ لأن المرئي يجب أن يكون مبنيًا على النص."}
              </p>
            </div>
          )}
          {(isVisualDirect || vtSectionOpen) && (
          <div className="mt-5 overflow-hidden rounded-xl border border-palm/20 bg-mint/10">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-palm/10 bg-mint/30 px-4 py-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-palm">
                <BarChart2 size={13} aria-hidden="true" />
                {visualOutputs.title}
              </p>
              {!isVisualDirect && (
                <button
                  type="button"
                  onClick={() => setVtSectionOpen(false)}
                  className="text-xs text-ink/50 transition hover:text-ink"
                >
                  إخفاء القسم
                </button>
              )}
            </div>
            <div className="space-y-3 p-4">
              {!generatedText.trim() && (
                <p className="rounded-lg bg-warningSoft px-3 py-2 text-xs font-medium text-warningDark">
                  أدخل المحتوى أو ولّد النص أولًا؛ لأن المرئي يجب أن يكون مبنيًا على النص.
                </p>
              )}
              {/* خيارات المخرج حسب نوع المحتوى — «رسم توضيحي» نوعه محدد في إعداد المرئيات فلا اختيار مكرر */}
              {!isVisualMain && (
              <div className="flex flex-wrap gap-2">
                {visualOutputs.options.map((t) => {
                  const soon = !t.engine;
                  const needsProvider = Boolean(t.premium) && !premiumUsable;
                  const disabled = soon || needsProvider;
                  const selected = !disabled && (vtOutputChoice ? vtOutputChoice === t.key : t.engine === vtType);
                  return (
                    <button
                      key={t.key}
                      type="button"
                      disabled={disabled}
                      title={soon ? "قريبًا — لم يُفعّل بعد" : needsProvider ? "غير مفعّل حالياً — المرئي الاحترافي غير متاح" : undefined}
                      onClick={() => { if (disabled || !t.engine) return; setVtOutputChoice(t.key); setVtType(t.engine); if (t.engine === "image" || (premiumUsable && (t.engine === "carousel" || t.engine === "storyboard"))) setVtOutputMode("premium_image"); setVtSvg(""); setVtUrl(""); setVtVisual(null); setVtPremiumUrl(""); setVtProvider(""); setVtProviderNote(""); setVtPremiumError(""); setVtPlan(null); setVtPlanEditing(false); setVtError(""); setVtConfirming(false); setVtSuggestionReason(""); }}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                        selected
                          ? "border-palm bg-white text-palm shadow-[0_0_0_1px_theme(colors.palm)]"
                          : disabled
                          ? "cursor-not-allowed border-line bg-paper/60 text-ink/30"
                          : "border-line bg-white/70 text-ink/55 hover:border-palm hover:text-palm"
                      }`}
                    >
                      {t.label}
                      {(t.hint || soon || needsProvider) && (
                        <>
                          <span className="mr-1 opacity-40">·</span>
                          <span className="opacity-60">{soon ? "قريبًا" : needsProvider ? "غير مفعّل حاليًا" : t.hint}</span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
              )}

              {/* وضع الإخراج — للأنواع البصرية المباشرة؛ بقية الأنواع تلتزم SVG الافتراضي ضمنياً */}
              {isVisualDirect && (
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-ink/50">الإخراج:</span>
                    {([
                      { key: "editable_svg" as const,  label: "قابل للتعديل SVG" },
                      { key: "premium_image" as const, label: "مرئي احترافي بالذكاء الاصطناعي" },
                      { key: "both" as const,          label: "الاثنان معًا" },
                    ]).map((m) => {
                      const locked = m.key !== "editable_svg" && !premiumUsable;
                      const imageOnly = vtType === "image" && m.key === "editable_svg"; // نوع «صورة» بلا محرك SVG
                      return (
                        <button key={m.key} type="button"
                          disabled={locked || imageOnly}
                          title={locked ? "غير متاح حالياً — تواصل مع مسؤول المنصة" : imageOnly ? "نوع «صورة» يُنتج عبر المزود الاحترافي فقط" : undefined}
                          onClick={() => setVtOutputMode(m.key)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                            vtOutputMode === m.key
                              ? "border-palm bg-white text-palm shadow-[0_0_0_1px_theme(colors.palm)]"
                              : locked || imageOnly
                              ? "cursor-not-allowed border-line bg-paper/60 text-ink/30"
                              : "border-line bg-white/70 text-ink/55 hover:border-palm hover:text-palm"
                          }`}>
                          {m.label}
                        </button>
                      );
                    })}
                    {premiumUsable && providerInfo && (
                      <span className="text-xs text-palm">
                        المرئي الاحترافي جاهز
                      </span>
                    )}
                  </div>
                  {providerInfo && !premiumUsable && (
                    providerInfo.mode === "mock" ? (
                      <p className="rounded-lg bg-warningSoft px-3 py-2 text-xs font-medium leading-5 text-warningDark">
                        الوضع التجريبي مفعّل — المرئي الاحترافي معطل مؤقتاً والناتج للعرض فقط.
                      </p>
                    ) : (
                      <p className="rounded-lg bg-warningSoft px-3 py-2 text-xs font-medium leading-5 text-warningDark">
                        المرئي الاحترافي غير متاح حالياً — استخدم المخرج القابل للتعديل، أو تواصل مع مسؤول المنصة.
                      </p>
                    )
                  )}
                </div>
              )}

              {/* Chart sub-type — «رسم توضيحي» يحدده في إعداد المرئيات فلا يتكرر هنا */}
              {vtType === "chart" && !isVisualMain && (
                <div className="flex flex-wrap gap-2">
                  {["أعمدة", "خطي", "دائري", "حلقي", "مساحة", "أعمدة أفقية"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setVtChartType(vtChartType === c ? "" : c)}
                      className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                        vtChartType === c
                          ? "border-palm bg-white text-palm"
                          : "border-line bg-white/60 text-ink/50 hover:border-palm hover:text-palm"
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}

              {/* Image options: style + dimensions */}
              {vtType === "image" && (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-ink/45">الأسلوب:</span>
                    {["احترافي رسمي", "إبداعي ملوّن", "بسيط ونظيف", "إخباري صارم"].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setVtStyle(vtStyle === s ? "" : s)}
                        className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                          vtStyle === s
                            ? "border-palm bg-white text-palm"
                            : "border-line bg-white/60 text-ink/50 hover:border-palm hover:text-palm"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-ink/45">الأبعاد:</span>
                    {[
                      { key: "1:1", label: "مربع ١:١" },
                      { key: "16:9", label: "أفقي ١٦:٩" },
                      { key: "9:16", label: "عمودي ٩:١٦" },
                      { key: "4:5", label: "٤:٥ إنستغرام" },
                    ].map((d) => (
                      <button
                        key={d.key}
                        type="button"
                        onClick={() => setVtDimensions(vtDimensions === d.key ? "" : d.key)}
                        className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                          vtDimensions === d.key
                            ? "border-palm bg-white text-palm"
                            : "border-line bg-white/60 text-ink/50 hover:border-palm hover:text-palm"
                        }`}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* المسار الوحيد للتوليد: خطة بصرية → مراجعة واعتماد → توليد (لا زر توليد عام) */}
              {vtLoading && (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-white py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-palm/20 border-t-palm" />
                  <p className="text-xs text-ink/50">جارٍ ترجمة المحتوى إلى مرئي...</p>
                </div>
              )}

              {/* انعكاس دقيق للاختيار: بيان ما سيُولَّد بالضبط — لا اسماً مظللاً فقط */}
              {generatedText.trim() && !vtSvg && !vtPremiumUrl && (
                <p className="rounded-lg bg-paper px-3 py-2 text-xs font-semibold text-ink/70">
                  الناتج المحدد للتوليد: {(() => {
                    const sel = visualOutputs.options.find((o) => (vtOutputChoice ? o.key === vtOutputChoice : o.engine === vtType));
                    const base = sel?.label ?? (vtType === "chart" ? "رسم بياني" : vtType === "mindmap" ? "خريطة ذهنية" : vtType === "image" ? "صورة" : vtType === "quote_card" ? "بطاقة اقتباس" : vtType === "carousel" ? "كاروسيل" : vtType === "storyboard" ? "ستوري بورد" : vtType === "motion_script" ? "مخطط موشن" : "إنفوغراف");
                    return `${base}${vtType === "chart" && vtChartType ? ` (${vtChartType})` : ""}`;
                  })()} — وضع الإخراج: {vtOutputMode === "editable_svg" ? "SVG قابل للتعديل" : vtOutputMode === "premium_image" ? "مرئي احترافي بالذكاء الاصطناعي" : "الاثنان معًا (SVG + مرئي احترافي)"}
                </p>
              )}
              {/* الخطة البصرية المقترحة — مراجعة وتعديل واعتماد قبل التوليد */}
              {!vtPlan && !vtSvg && !vtPremiumUrl && !vtPremiumError && !vtLoading && (
                <button type="button" onClick={() => void generateVisualPlanStep()} disabled={vtPlanLoading || !generatedText.trim()}
                  className="inline-flex items-center gap-2 rounded-lg border border-palm bg-mint px-3 py-2 text-sm font-medium text-palm transition hover:bg-mint/70 disabled:opacity-50">
                  <Sparkles size={14} /> {vtPlanLoading ? "جارٍ توليد الخطة..." : "توليد الخطة البصرية"}
                </button>
              )}
              {vtPlan && (
                <div className="rounded-xl border border-infoBorder bg-infoSoft p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-infoDark">الخطة البصرية المقترحة</p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setVtPlanCollapsed((v) => !v)}
                        className="rounded-lg border border-line bg-white px-3 py-1 text-xs font-medium text-ink/70 hover:border-palm hover:text-palm">
                        {vtPlanCollapsed ? "عرض التفاصيل" : "إخفاء التفاصيل"}
                      </button>
                      <button type="button" onClick={() => { setVtPlanCollapsed(false); setVtPlanEditing((v) => !v); }}
                        className="rounded-lg border border-line bg-white px-3 py-1 text-xs font-medium text-ink/70 hover:border-palm hover:text-palm">
                        {vtPlanEditing ? "إنهاء التعديل" : "تعديل الخطة"}
                      </button>
                      <button type="button" disabled={vtPlanLoading} onClick={() => void generateVisualPlanStep()}
                        className="rounded-lg border border-line bg-white px-3 py-1 text-xs font-medium text-ink/70 hover:border-palm hover:text-palm disabled:opacity-50">
                        {vtPlanLoading ? "..." : "إعادة توليد الخطة"}
                      </button>
                      <button type="button" onClick={() => { setVtPlanEditing(false); setVtPlanCollapsed(true); void generateVisualTranslation(undefined, vtPlan); }}
                        className="rounded-lg bg-palm px-3 py-1 text-xs font-medium text-white hover:bg-palmDark">
                        {/* التسمية بحسب الإخراج — الاحترافي لا يظهر كزر إلا وOpenAI يعمل فعلاً */}
                        {vtOutputMode === "editable_svg" ? "اعتماد الخطة وتوليد SVG" : "اعتماد الخطة وتوليد المرئي الاحترافي"}
                      </button>
                    </div>
                  </div>
                  {vtPlanCollapsed ? (
                    <p className="text-sm leading-7 text-ink/75">
                      <span className="font-medium">{vtPlan.title}</span> · {vtPlan.centralMessage} ·{" "}
                      {vtPlan.recommendedOutputFormat === "mindmap" ? "خريطة ذهنية" : vtPlan.recommendedOutputFormat === "chart" ? "رسم بياني" : vtPlan.recommendedOutputFormat === "image" ? "صورة" : vtPlan.recommendedOutputFormat === "quote_card" ? "بطاقة اقتباس" : vtPlan.recommendedOutputFormat === "carousel" ? "كاروسيل" : vtPlan.recommendedOutputFormat === "storyboard" ? "ستوري بورد" : vtPlan.recommendedOutputFormat === "motion_script" ? "مخطط موشن" : "إنفوغراف"} · {vtPlan.layoutStrategy}
                    </p>
                  ) : (() => {
                    const ro = !vtPlanEditing;
                    const inp = "w-full rounded-lg border border-line bg-white p-2 text-sm disabled:bg-paper/60 disabled:text-ink/70";
                    return (
                      <div className="space-y-2.5 text-sm">
                        <div className="grid gap-2.5 sm:grid-cols-2">
                          <label className="block"><span className="text-xs text-ink/55">العنوان</span>
                            <input disabled={ro} className={inp} value={vtPlan.title} onChange={(e) => patchPlan({ title: e.target.value })} /></label>
                          <label className="block"><span className="text-xs text-ink/55">العنوان الفرعي</span>
                            <input disabled={ro} className={inp} value={vtPlan.subtitle} onChange={(e) => patchPlan({ subtitle: e.target.value })} /></label>
                        </div>
                        <label className="block"><span className="text-xs text-ink/55">الرسالة المركزية</span>
                          <input disabled={ro} className={inp} value={vtPlan.centralMessage} onChange={(e) => patchPlan({ centralMessage: e.target.value })} /></label>
                        <label className="block"><span className="text-xs text-ink/55">النص القصير داخل المرئي</span>
                          <input disabled={ro} className={inp} value={vtPlan.shortVisualCopy} onChange={(e) => patchPlan({ shortVisualCopy: e.target.value })} /></label>
                        <div className="grid gap-2.5 sm:grid-cols-3">
                          <label className="block"><span className="text-xs text-ink/55">نوع المخرج</span>
                            <select disabled={ro} className={inp} value={vtPlan.recommendedOutputFormat}
                              onChange={(e) => patchPlan({ recommendedOutputFormat: e.target.value as VisualPlan["recommendedOutputFormat"] })}>
                              {["infographic", "chart", "mindmap", "image", "quote_card", "carousel", "storyboard", "motion_script"].map((o) => <option key={o} value={o}>{o === "infographic" ? "إنفوغراف" : o === "chart" ? "رسم بياني" : o === "mindmap" ? "خريطة ذهنية" : o === "image" ? "صورة" : o === "quote_card" ? "بطاقة اقتباس" : o === "carousel" ? "كاروسيل" : o === "storyboard" ? "ستوري بورد" : "مخطط موشن"}</option>)}
                            </select></label>
                          <label className="block"><span className="text-xs text-ink/55">النمط البصري</span>
                            <select disabled={ro} className={inp} value={vtPlan.visualStyle}
                              onChange={(e) => patchPlan({ visualStyle: e.target.value as VisualPlan["visualStyle"] })}>
                              <option value="رسمي">رسمي</option><option value="تعليمي">تعليمي</option>
                            </select></label>
                          <label className="block"><span className="text-xs text-ink/55">استراتيجية التخطيط</span>
                            <input disabled={ro} className={inp} value={vtPlan.layoutStrategy} onChange={(e) => patchPlan({ layoutStrategy: e.target.value })} /></label>
                        </div>
                        <div>
                          <span className="text-xs text-ink/55">الأقسام (عنوان القسم ثم نقاطه — نقطة في كل سطر)</span>
                          <div className="mt-1 space-y-2">
                            {vtPlan.keySections.map((sec, i) => (
                              <div key={i} className="rounded-lg border border-line bg-white p-2">
                                <input disabled={ro} className={inp + " mb-1.5 font-medium"} value={sec.heading}
                                  onChange={(e) => { const ks = [...vtPlan.keySections]; ks[i] = { ...ks[i], heading: e.target.value }; patchPlan({ keySections: ks }); }} />
                                <textarea disabled={ro} className={inp + " min-h-16 leading-6"} value={sec.bullets.join("\n")}
                                  onChange={(e) => { const ks = [...vtPlan.keySections]; ks[i] = { ...ks[i], bullets: e.target.value.split("\n").filter(Boolean) }; patchPlan({ keySections: ks }); }} />
                                <input disabled={ro} className={inp + " mt-1.5"} placeholder="رقم/مادة بارزة (اختياري)" value={sec.stat ?? ""}
                                  onChange={(e) => { const ks = [...vtPlan.keySections]; ks[i] = { ...ks[i], stat: e.target.value }; patchPlan({ keySections: ks }); }} />
                              </div>
                            ))}
                          </div>
                        </div>
                        <label className="block"><span className="text-xs text-ink/55">الأرقام المهمة (سطر لكل رقم)</span>
                          <textarea disabled={ro} className={inp + " min-h-14 leading-6"} value={(vtPlan.importantNumbers ?? []).join("\n")}
                            onChange={(e) => patchPlan({ importantNumbers: e.target.value.split("\n").filter(Boolean) })} /></label>
                        <label className="block"><span className="text-xs text-ink/55">ملاحظات الامتثال</span>
                          <input disabled={ro} className={inp} value={vtPlan.complianceNotes} onChange={(e) => patchPlan({ complianceNotes: e.target.value })} /></label>
                      </div>
                    );
                  })()}
                </div>
              )}

              {vtSvg && !vtLoading && (
                <div className="overflow-hidden rounded-xl border border-line bg-white">
                  <p className="border-b border-line bg-paper/70 px-3 py-1.5 text-xs font-bold text-ink/60">SVG القابل للتعديل</p>
                  <div className="w-full p-2" dangerouslySetInnerHTML={{ __html: vtSvg }} />
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2">
                    <p className="text-xs text-ink/40">مرئي SVG — جودة عالية قابل للتكبير</p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => { setVtSvgEdits(extractTextNodes(vtSvg).nodes.map((n) => n.value)); setVtSvgEditing((v) => !v); }}
                        className="shrink-0 whitespace-nowrap rounded-lg border border-palm bg-white px-3 py-1 text-xs font-semibold text-palm transition hover:bg-mint">✎ تعديل النصوص</button>
                      <button type="button" onClick={() => downloadSvg(vtSvg, `${vtType}.svg`)}
                        className="shrink-0 whitespace-nowrap rounded-lg border border-line bg-paper px-3 py-1 text-xs font-medium text-ink/70 transition hover:border-palm hover:text-palm">SVG</button>
                      <button type="button" onClick={() => downloadSvgAsPng(vtSvg, `${vtType}.svg`)}
                        className="shrink-0 whitespace-nowrap rounded-lg border border-line bg-paper px-3 py-1 text-xs font-medium text-ink/70 transition hover:border-palm hover:text-palm">PNG</button>
                      <button type="button" onClick={() => void downloadPptx({ svg: vtSvg, visual: vtVisual }, `${vtType}.pptx`)}
                        className="shrink-0 whitespace-nowrap rounded-lg border border-line bg-paper px-3 py-1 text-xs font-medium text-ink/70 transition hover:border-palm hover:text-palm"
                        title="تنزيل شريحة PowerPoint قابلة للتحرير">PowerPoint</button>
                      <button type="button" onClick={() => { setVtSvg(""); setVtUrl(""); setVtSvgEditing(false); void generateVisualTranslation(); }}
                        className="shrink-0 whitespace-nowrap rounded-lg border border-line bg-paper px-3 py-1 text-xs font-medium text-ink/70 transition hover:border-palm hover:text-palm">إعادة الإنشاء</button>
                      <button type="button" onClick={() => { setVtSvg(""); setVtUrl(""); setVtVisual(null); setVtSvgEditing(false); setVtPremiumUrl(""); setVtProvider(""); setVtProviderNote(""); setVtPremiumError(""); setVtPlan(null); setVtPlanEditing(false); setVtError(""); }}
                        className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-line bg-paper px-3 py-1 text-xs font-medium text-red-500/70 transition hover:border-red-300 hover:text-red-600"
                        title="مسح المرئي">
                        <Trash2 size={12} />
                        مسح
                      </button>
                    </div>
                  </div>
                  {/* تحرير نصوص المرئي مباشرة — كل نص ظاهر يُعدَّل والتصميم يبقى كما هو */}
                  {vtSvgEditing && (
                    <div className="space-y-2 border-t border-palm/30 bg-mint/40 p-3">
                      <p className="text-xs font-semibold text-palm">حرّر أي نص في المرئي — التصميم (الألوان والأحجام) قالب احترافي ثابت، والنص فقط يتغيّر:</p>
                      <div className="max-h-[280px] space-y-2 overflow-y-auto">
                        {vtSvgEdits.map((value, i) => (
                          <input key={i} value={value} dir="rtl"
                            onChange={(e) => setVtSvgEdits((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))}
                            className="w-full rounded border border-line bg-white px-2 py-1.5 text-sm focus:border-palm focus:outline-none" />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => { const next = applyEdits(vtSvg, vtSvgEdits); setVtSvg(next); setVtSvgEditing(false); persistVisualToRecord({ visualType: vtType, visualTypeLabel: VISUAL_ENGINE_LABELS[vtType] ?? "مرئي", svg: next }); }}
                          className="rounded-md bg-palm px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-palmDark">حفظ التعديلات</button>
                        <button type="button" onClick={() => setVtSvgEditing(false)}
                          className="rounded-md border border-line px-3 py-1.5 text-xs text-ink/60">إلغاء</button>
                      </div>
                    </div>
                  )}
                  {/* إعادة صياغة المحتوى بالذكاء (لا تصميم — التصميم قالب ثابت) */}
                  <div className="flex flex-wrap items-center gap-2 border-t border-line bg-paper/60 px-3 py-2.5">
                    <input
                      type="text"
                      value={vtEditText}
                      onChange={(e) => setVtEditText(e.target.value)}
                      placeholder="إعادة صياغة بالذكاء — مثال: اجعل العنوان أقصر، بدّل المثال النظامي، بسّط الصياغة..."
                      className="min-w-40 flex-1 rounded-lg border border-line bg-white px-3 py-1.5 text-xs focus:border-palm focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => void generateVisualTranslation(vtEditText)}
                      disabled={!vtEditText.trim()}
                      className="shrink-0 whitespace-nowrap rounded-lg bg-palm px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-palm/90 disabled:opacity-40"
                    >
                      إعادة الصياغة
                    </button>
                  </div>
                </div>
              )}

              {/* بطاقة حالة فشل المرئي الاحترافي — لا صورة بديلة تُعرض عند تعطل المزود */}
              {vtPremiumError && !vtLoading && (
                <div className="rounded-xl border border-warningBorder bg-warningSoft p-4">
                  <p className="text-sm font-semibold text-warningDark">{vtPremiumError}</p>
                  {vtProviderNote && (
                    <p className="mt-1.5 text-xs leading-5 text-warningDark">السبب: {vtProviderNote}</p>
                  )}
                  <p className="mt-1.5 text-xs leading-5 text-ink/60">يمكنك استخدام SVG القابل للتعديل حاليًا.</p>
                </div>
              )}

              {/* مسار الاستوديو: ثلاث نسخ يختار منها المستخدم + نصوص الخطة للمقارنة (كشف تشويه العربي) */}
              {vtVariants.length > 0 && !vtPremiumUrl && !vtLoading && (
                <div className="space-y-3 rounded-xl border border-line bg-white p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-ink">اختر النسخة الأنسب ({vtVariants.length})</p>
                    <button type="button" onClick={() => generateVisualTranslation(undefined, vtPlan)}
                      className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-palm transition hover:border-palm hover:bg-mint focus-ring">
                      <RefreshCw size={13} /> إعادة توليد ٣ نسخ جديدة
                    </button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {vtVariants.map((v, i) => (
                      <div key={i} className={`overflow-hidden rounded-lg border p-1 ${v.flagged ? "border-red-400" : "border-line"} bg-paper/40`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={v.url} alt={`نسخة ${i + 1}`} className="h-auto w-full rounded object-contain" />
                        {v.flagged ? (
                          <p className="mt-1 flex items-center gap-1 px-1 text-[11px] font-semibold text-red-600"><XCircle size={12} /> قد يحتوي نصاً عربياً مشوّهاً — راجعه بعناية</p>
                        ) : v.checked ? (
                          <p className="mt-1 px-1 text-[11px] font-medium text-palm">✓ النص العربي مطابق للخطة (فحص آلي)</p>
                        ) : (
                          <p className="mt-1 px-1 text-[11px] text-ink/45">تعذّر الفحص الآلي — قارن يدوياً</p>
                        )}
                        <button type="button" disabled={!vtTextConfirmed}
                          onClick={() => { setVtPremiumUrl(v.url); setVtProvider("openai"); persistVisualToRecord({ visualType: "image", visualTypeLabel: "مرئي احترافي", imageUrl: v.url, provider: "openai" }); }}
                          className={`mt-1 w-full rounded px-2 py-1.5 text-xs font-medium transition focus-ring ${vtTextConfirmed ? "bg-palm text-white hover:bg-palmDark" : "cursor-not-allowed bg-warmGraySoft text-ink/40"}`}>
                          {v.flagged && vtTextConfirmed ? "اختر رغم التحذير ←" : "اختر هذه النسخة ←"}
                        </button>
                      </div>
                    ))}
                  </div>
                  {vtPlanTexts && (
                    <div className="rounded-lg border border-palm/25 bg-mint/40 p-3">
                      <p className="mb-2 text-xs font-semibold text-palmDeep">النصوص المعتمدة في الخطة — قارن كل حرف بالصورة قبل الاعتماد:</p>
                      <div className="space-y-1 text-xs leading-6 text-ink/80" dir="rtl">
                        {vtPlanTexts.title && <p><span className="font-semibold">العنوان:</span> {vtPlanTexts.title}</p>}
                        {vtPlanTexts.subtitle && <p><span className="font-semibold">الوصف:</span> {vtPlanTexts.subtitle}</p>}
                        {vtPlanTexts.sections?.map((s, i) => (
                          <p key={i}>• <span className="font-semibold">{s.heading}</span>{s.stat ? ` — ${s.stat}` : ""}{s.bullets?.length ? `: ${s.bullets.join(" · ")}` : ""}</p>
                        ))}
                        {vtPlanTexts.importantNumbers?.length ? <p><span className="font-semibold">أرقام:</span> {vtPlanTexts.importantNumbers.join(" | ")}</p> : null}
                      </div>
                      <p className="mt-2 text-[11px] leading-5 text-ink/55">نماذج الصور قد تخطئ رسم العربية. إن ظهر أي حرف مشوّهاً، اختر «إعادة توليد» بدل الاعتماد.</p>
                    </div>
                  )}
                  {/* بوابة التنزيل: لا اعتماد قبل تأكيد المطابقة صراحةً */}
                  <label className="flex items-start gap-2 rounded-lg border border-line bg-white p-3 text-xs leading-6 text-ink/80">
                    <input type="checkbox" checked={vtTextConfirmed} onChange={(e) => setVtTextConfirmed(e.target.checked)} className="mt-1 h-4 w-4 accent-[color:theme(colors.palm)]" />
                    <span>تحققت من مطابقة النصوص العربية في الصورة لنصوص الخطة حرفاً بحرف، وأتحمّل مسؤولية اعتماد النسخة. (زر الاختيار لا يعمل قبل هذا التأكيد.)</span>
                  </label>
                </div>
              )}

              {/* الصورة الاحترافية بالذكاء الاصطناعي — أو عنصر demo النائب بوضع mock الصريح فقط */}
              {vtPremiumUrl && !vtLoading && (() => {
                const real = vtProvider === "openai" || vtProvider === "gemini";
                return (
                <div className={`overflow-hidden rounded-xl border ${real ? "border-line" : "border-warningBorder"} bg-white`}>
                  <p className={`border-b px-3 py-1.5 text-xs font-bold ${real ? "border-line bg-paper/70 text-ink/60" : "border-warningBorder bg-warningSoft text-warningDark"}`}>
                    {real ? "المرئي الاحترافي" : "تجريبي فقط — غير مخصص للاعتماد"}
                  </p>
                  {/* معاينة مضبوطة تناسب المنصة — التنزيل يحفظ الملف الأصلي بدقته الكاملة */}
                  <div className="flex justify-center bg-paper/40 p-3">
                    <img src={vtPremiumUrl} alt={real ? "مرئي احترافي بالذكاء الاصطناعي" : "عنصر نائب تجريبي"}
                      className="max-h-[440px] w-auto max-w-full rounded-lg object-contain shadow-sm"
                      onError={() => { setVtPremiumUrl(""); setVtProvider(""); setVtPremiumError("تعذر تحميل المرئي الناتج"); }} />
                  </div>
                  <div className="space-y-1 border-t border-line bg-paper/60 px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-ink/55">
                        {real
                          ? "مرئي احترافي بالذكاء الاصطناعي"
                          : "عنصر نائب تجريبي — للعرض فقط"}
                      </span>
                      {real && (
                        <a href={vtPremiumUrl} download="premium-visual.png" target="_blank" rel="noopener noreferrer"
                          className="mr-auto shrink-0 whitespace-nowrap rounded-lg border border-line bg-white px-3 py-1 text-xs font-medium text-ink/70 transition hover:border-palm hover:text-palm">تنزيل</a>
                      )}
                    </div>
                    {!real && (
                      <p className="text-xs leading-5 text-warningDark">
                        وضع تجريبي للعرض فقط — لا يصلح للاعتماد النهائي.
                      </p>
                    )}
                  </div>
                </div>
                );
              })()}


              {vtUrl && !vtLoading && (
                <div className="overflow-hidden rounded-xl border border-line bg-white">
                  {/* عند فشل التحميل تُمسح الصورة نهائياً — بطاقة حالة بدل أيقونة صورة مكسورة */}
                  <div className="flex justify-center bg-paper/40 p-3">
                    <img src={vtUrl} alt="الترجمة البصرية" className="max-h-[440px] w-auto max-w-full rounded-lg object-contain shadow-sm"
                      onError={() => { setVtUrl(""); setVtError("تعذر تحميل المرئي الناتج"); }} />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2">
                    <p className="text-xs text-ink/40">صورة مُنشأة بالذكاء الاصطناعي</p>
                    <div className="flex flex-wrap gap-2">
                      <a href={vtUrl} download="visual.jpg" target="_blank" rel="noopener noreferrer"
                        className="shrink-0 whitespace-nowrap rounded-lg border border-line bg-paper px-3 py-1 text-xs font-medium text-ink/70 transition hover:border-palm hover:text-palm">JPG</a>
                      <button type="button" onClick={() => void downloadUrlAsPng(vtUrl, "visual.png")}
                        className="shrink-0 whitespace-nowrap rounded-lg border border-line bg-paper px-3 py-1 text-xs font-medium text-ink/70 transition hover:border-palm hover:text-palm">PNG</button>
                      <button type="button" onClick={() => void downloadPptx({ url: vtUrl }, "visual.pptx")}
                        className="shrink-0 whitespace-nowrap rounded-lg border border-line bg-paper px-3 py-1 text-xs font-medium text-ink/70 transition hover:border-palm hover:text-palm"
                        title="تنزيل شريحة PowerPoint قابلة للتحرير">PowerPoint</button>
                      <button type="button" onClick={() => { setVtSvg(""); setVtUrl(""); void generateVisualTranslation(); }}
                        className="shrink-0 whitespace-nowrap rounded-lg border border-line bg-paper px-3 py-1 text-xs font-medium text-ink/70 transition hover:border-palm hover:text-palm">إعادة الإنشاء</button>
                      <button type="button" onClick={() => { setVtSvg(""); setVtUrl(""); setVtVisual(null); setVtPremiumUrl(""); setVtProvider(""); setVtProviderNote(""); setVtPremiumError(""); setVtPlan(null); setVtPlanEditing(false); setVtError(""); }}
                        className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-line bg-paper px-3 py-1 text-xs font-medium text-red-500/70 transition hover:border-red-300 hover:text-red-600"
                        title="مسح الصورة">
                        <Trash2 size={12} />
                        مسح
                      </button>
                    </div>
                  </div>
                  {/* طلب تعديل على الصورة الحالية */}
                  <div className="flex flex-wrap items-center gap-2 border-t border-line bg-paper/60 px-3 py-2.5">
                    <input
                      type="text"
                      value={vtEditText}
                      onChange={(e) => setVtEditText(e.target.value)}
                      placeholder="اطلب تعديلاً — مثال: خلفية أفتح، ألوان زرقاء، أسلوب أبسط..."
                      className="min-w-40 flex-1 rounded-lg border border-line bg-white px-3 py-1.5 text-xs focus:border-palm focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => void generateVisualTranslation(vtEditText)}
                      disabled={!vtEditText.trim()}
                      className="shrink-0 whitespace-nowrap rounded-lg bg-palm px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-palm/90 disabled:opacity-40"
                    >
                      تطبيق التعديل
                    </button>
                  </div>
                </div>
              )}

              {vtError && <p className="text-xs text-red-600">{vtError}</p>}
            </div>
          </div>
          )}
          </div>
          </div>

          <div className="mt-3 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
            <div className="text-sm leading-7 text-amber-900">
              <p className="font-semibold">هذا المحتوى استرشادي — يجب مراجعته قبل النشر</p>
              <p className="mt-1 text-xs leading-6 text-amber-800">أنشأ الذكاء الاصطناعي هذا النص بناءً على المدخلات فقط، وهو لا يُغني عن المراجعة القانونية والمهنية الشخصية. تقع مسؤولية التحقق والاعتماد والنشر على المحامي وحده.</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button onClick={runReview} disabled={generatedText.trim().length < 5} leadingIcon={<FileCheck2 size={16} aria-hidden="true" />}>
              راجع قانونياً
            </Button>
            <Button variant="secondary-gray" onClick={() => { setGeneratedText(""); setTopic(""); setVtSvg(""); setVtUrl(""); setVtVisual(null); setVtError(""); setVtConfirming(false); setVtSuggestionReason(""); setVtSectionOpen(false); setVtOutputChoice(""); setVtPremiumUrl(""); setVtProvider(""); setVtProviderNote(""); setVtPremiumError(""); setVtVariants([]); setVtPlanTexts(null); setVtPlan(null); setVtPlanEditing(false); }} leadingIcon={<Edit3 size={16} />}>
              عدّل الطلب
            </Button>
          </div>
        </Panel>
      )}

      {/* Reviewing spinner */}
      {path && reviewing && (
        <Panel>
          <ProgressRing color="palm" estMs={45000} label="محرك التحليل النظامي يعمل…" sub="يفحص الامتثال والمخاطر والمعايير المهنية وجودة اللغة." />
        </Panel>
      )}

      {/* ── 5. Results ── */}
      {path && review && !reviewing && (
        <StudioResultsDashboard
          review={review}
          text={activeText}
          visuals={(() => {
            const stored = savedStudioVisuals;
            if (stored.length) return stored.map((visual) => ({ svg: visual.svg, imageUrl: visual.imageUrl, label: visual.visualTypeLabel }));
            if (vtSvg) return [{ svg: vtSvg, label: VISUAL_ENGINE_LABELS[vtType] ?? "مرئي" }];
            if (vtPremiumUrl) return [{ imageUrl: vtPremiumUrl, label: "مرئي احترافي" }];
            if (imageGenSvg) return [{ svg: imageGenSvg, label: "مرئي من وصف" }];
            if (imageGenUrl) return [{ imageUrl: imageGenUrl, label: "صورة من وصف" }];
            return [];
          })()}
          onEdit={() => {
            setEditingReviewedContent(true);
            window.requestAnimationFrame(() => document.getElementById("studio-text-editor")?.scrollIntoView({ behavior: "smooth", block: "start" }));
          }}
          onSaveDraft={saveDraft}
          onPublish={() => requestPublish()}
          actionMessage={actionMsg}
          detailedAnalysisAvailable={Boolean(contentId)}
        />
      )}

      {false && ((review: ReviewResult) => {
        return (
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-6">
          <div className="min-w-0 space-y-6">
          {/* النص المُحلَّل */}
          <Panel>
            <SectionTitle title="النص المُحلَّل" />
            <p className="whitespace-pre-wrap text-sm leading-8">{activeText}</p>
            {/* توعوي بحت عند رصد اقتباس — كشف عرضي حتمي، لا يمس المؤشرات ولا محرك التحليل */}
            <details className="group mt-3 rounded-xl border border-infoBorder bg-infoSoft">
              {/* الـ flex على div داخلي لا على summary — لتفادي عطل فتح/إغلاق details في Safari (iOS) */}
              <summary className="cursor-pointer list-none p-4 text-sm font-semibold text-infoDark focus-ring">
                <div className="flex items-center justify-between gap-2">
                  <span>{QUOTE_INTEGRITY_NOTICE.title}</span>
                  <ChevronDown size={16} className="shrink-0 text-infoDark/60 transition-transform group-open:rotate-180" aria-hidden="true" />
                </div>
              </summary>
              <div className="px-4 pb-4">
                <p className="text-xs leading-6 text-ink/70">{QUOTE_INTEGRITY_NOTICE.body}</p>
                <p className="mt-1.5 text-xs leading-6 text-ink/50">{QUOTE_INTEGRITY_NOTICE.disclaimer}</p>
              </div>
            </details>
            <button
              type="button"
              onClick={() => setReview(null)}
              className="mt-3 text-xs text-ink/50 transition hover:text-ink"
            >
              تعديل النص
            </button>
          </Panel>

          {/* توصية النشر */}
          <Panel>
            <SectionTitle title="نتائج التحليل" />
            <CostNotice costUsd={opCostUsd} balanceUsd={opBalanceUsd} />
            {review.analysisMode === "pattern-only" || review.evaluationIncomplete ? (
              <div className="flex items-start gap-3 rounded-lg border border-line bg-paper p-3">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-ink/50" aria-hidden="true" />
                <div>
                  <p className="text-sm font-semibold text-ink/75">التحليل غير مكتمل — أعد التحليل</p>
                  <p className="mt-0.5 text-xs leading-5 text-ink/65">تعذر إكمال التحليل بسبب عطل، ولا تصدر أي توصية نشر قبل إعادة التحليل بنجاح.</p>
                </div>
              </div>
            ) : (
            <div
              className={`flex items-start gap-3 rounded-lg border p-3 ${
                review.publicationDecision.recommended
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <span
                className={`mt-0.5 shrink-0 ${
                  review.publicationDecision.recommended ? "text-green-600" : "text-red-600"
                }`}
              >
                {review.publicationDecision.recommended ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <XCircle size={18} />
                )}
              </span>
              <div>
                <p
                  className={`text-sm font-semibold ${
                    review.publicationDecision.recommended ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {review.publicationDecision.label}
                </p>
                <p className="mt-0.5 text-xs leading-5 text-ink/65">
                  {review.publicationDecision.reason}
                </p>
              </div>
            </div>
            )}
          </Panel>

          {/* بطاقة الامتثال */}
          {(() => {
            const isCompliant = review.findings.length === 0;
            // عطل التحليل + لا مخالفات مرصودة ⇒ لا يجوز ادعاء "ملتزم" — تظهر محايدة
            const degraded = review.analysisMode === "pattern-only" && isCompliant;
            const tone = degraded ? ("neutral" as const) : isCompliant ? ("good" as const) : ("danger" as const);
            return (
              <Panel className={`border-t-4 shadow-md ${toneBorder(tone)}`}>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">الامتثال</p>
                <StatusBadge tone={tone}>
                  {degraded ? "تعذّر التحليل" : isCompliant ? "ملتزم" : "غير ملتزم"}
                </StatusBadge>
                {review.findings.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {review.findings.map((f) => (
                      <div key={f.traceabilityId} className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3">
                        <span className="text-sm leading-6">{f.title}</span>
                      </div>
                    ))}
                  </div>
                ) : degraded ? (
                  <p className="mt-4 text-sm leading-7 text-slate-500">التحليل غير مكتمل بسبب عطل — أعد التحليل قبل الاعتماد على نتيجة الامتثال.</p>
                ) : (
                  <p className="mt-4 text-sm leading-7 text-slate-500">لم ترصد مخالفات مرتبطة بالمراجع المسجلة.</p>
                )}
              </Panel>
            );
          })()}

          {/* بطاقة المخاطر */}
          {(() => {
            if (review.analysisMode === "pattern-only") return (
              <Panel className={`border-t-4 shadow-md ${toneBorder("neutral")}`}>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">المخاطر</p>
                <StatusBadge tone="neutral">تعذّر التحليل</StatusBadge>
                <p className="mt-4 text-sm leading-7 text-slate-500">التحليل غير مكتمل بسبب عطل — أعد التحليل قبل الاعتماد على هذه النتيجة.</p>
              </Panel>
            );
            // تقييم متعذر ≠ منخفض: يُعرض محايداً رمادياً لا أخضر
            const assessmentFailed = (review.riskScoreExplanation.explanation ?? "").includes("تعذّر");
            const parties = review.riskScoreExplanation.affectedParties ?? [];
            // بقرار مالكة المنصة: انعدام المخاطر يُسمى «لا يوجد مخاطر» ويُعرض أخضر —
            // والأخضر محجوز له وحده؛ منخفض أصفر فاتح، متوسط برتقالي، مرتفع أحمر
            const noRisks = !assessmentFailed && hasNoRisks(review.riskLevel, parties.length, review.findings.length);
            const tone = assessmentFailed ? ("neutral" as const) : noRisks ? ("good" as const) : riskKpiTone(review.riskLevel);
            // ثلاثة مستويات معتمدة فقط — بعدد الجهات المتضررة
            const riskLevels = ["منخفض", "متوسط", "مرتفع"];
            const activeCount = assessmentFailed || noRisks ? 0 : riskLevels.indexOf(riskDisplayLabel(review.riskLevel)) + 1;
            return (
              <Panel className={`border-t-4 shadow-md ${toneBorder(tone)}`}>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">المخاطر</p>
                <div className="flex items-center justify-between gap-3">
                  <StatusBadge tone={tone}>{assessmentFailed ? "تعذّر التقييم" : noRisks ? "لا يوجد مخاطر" : riskDisplayLabel(review.riskLevel)}</StatusBadge>
                  <div className="flex gap-1.5">
                    {riskLevels.map((_, i) => (
                      <span key={i} className={`inline-block h-2.5 w-2.5 rounded-full ${i < activeCount ? (tone === "gold" ? "bg-amber-300" : tone === "warning" ? "bg-[#F79009]" : "bg-red-500") : "bg-slate-200"}`} />
                    ))}
                  </div>
                </div>
                <div className="mt-4">
                  <p className="mb-2 text-xs text-slate-400">الجهات المتضررة</p>
                  <div className="flex flex-wrap gap-2">
                    {(["الموكل", "المحامي", "المهنة"] as RiskAffectedParty[]).map((p) => {
                      const affected = parties.includes(p);
                      const label = p === "الموكل" ? "المستفيد" : p;
                      return (
                        <span
                          key={p}
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                            affected
                              ? "border-red-200 bg-red-50 text-red-700"
                              : "border-line bg-paper text-ink/40"
                          }`}
                        >
                          {partyIcon(p)}{label}
                        </span>
                      );
                    })}
                  </div>
                </div>
                {review.riskScoreExplanation.explanation ? (
                  <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">{review.riskScoreExplanation.explanation}</p>
                ) : null}
              </Panel>
            );
          })()}

          {/* بطاقة الجوانب المهنية */}
          {(() => {
            if (review.analysisMode === "pattern-only") return (
              <Panel className={`border-t-4 shadow-md ${toneBorder("neutral")}`}>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">الجوانب المهنية</p>
                <StatusBadge tone="neutral">تعذّر التحليل</StatusBadge>
                <p className="mt-4 text-sm leading-7 text-slate-500">التحليل غير مكتمل بسبب عطل — أعد التحليل قبل الاعتماد على هذه النتيجة.</p>
              </Panel>
            );
            const tone = professionalismKpiTone(review.professionalismScore);
            const passed = review.professionalismScore >= 80;
            const { explanation, action } = professionalismExplanation(review.professionalismScore);
            return (
              <Panel className={`border-t-4 shadow-md ${toneBorder(tone)}`}>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">الجوانب المهنية</p>
                <StatusBadge tone={tone}>{passed ? "مستوفٍ للمعايير" : "يتطلب تحسيناً"}</StatusBadge>
                <p className="mt-4 rounded-lg border-r-2 border-amber-300 bg-amber-50 p-3 text-sm leading-6">{explanation}</p>
                {action ? (
                  <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6">
                    <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">الإصلاح المقترح</span>
                    {action}
                  </div>
                ) : null}
              </Panel>
            );
          })()}

          {/* بطاقة اللغة والإملاء */}
          {(() => {
            if (review.analysisMode === "pattern-only") return (
              <Panel className={`border-t-4 shadow-md ${toneBorder("neutral")}`}>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">اللغة والإملاء</p>
                <StatusBadge tone="neutral">تعذّر التحليل</StatusBadge>
                <p className="mt-4 text-sm leading-7 text-slate-500">التحليل غير مكتمل بسبب عطل — أعد التحليل قبل الاعتماد على هذه النتيجة.</p>
              </Panel>
            );
            const issues = review.languageQuality.issues;
            // تمييز صادق: الإملاء والنحو أخطاء تُصحّح (أحمر)؛ الأسلوب والوضوح والمصطلحات
            // ملاحظات تحسينية (كهرماني) — فلا يوحي العرض بخطأ إملائي غير موجود
            const hardIssues = issues.filter((i) => i.category === "spelling" || i.category === "grammar");
            const softIssues = issues.filter((i) => i.category !== "spelling" && i.category !== "grammar");
            const hasHard = hardIssues.length > 0 || !review.languageQuality.passed;
            const tone = hasHard ? ("danger" as const) : softIssues.length > 0 ? ("gold" as const) : ("good" as const);
            const label = hasHard
              ? `يحتاج تصحيح — ${hardIssues.length || issues.length} ملاحظة`
              : softIssues.length > 0
                ? `سليم إملائياً ونحوياً — ${softIssues.length} ملاحظة أسلوبية`
                : "سليم لغوياً";
            return (
              <Panel className={`border-t-4 shadow-md ${toneBorder(tone)}`}>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">اللغة والإملاء</p>
                <StatusBadge tone={tone}>{label}</StatusBadge>
                {issues.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {issues.map((issue, i) => {
                      const isHard = issue.category === "spelling" || issue.category === "grammar";
                      return (
                        <div key={issue.id ?? i} className="flex items-start gap-2.5 rounded-lg border border-line bg-paper p-3">
                          <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-bold ${isHard ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
                            {categoryLabel[issue.category] ?? issue.category}
                          </span>
                          <span className="text-sm leading-6">{issue.message}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-7 text-slate-500">لم ترصد ملاحظات لغوية أو إملائية.</p>
                )}
              </Panel>
            );
          })()}

          {/* بطاقة جاهزية النشر — الجوال في المنتصف كما هو؛ الحاسب تنتقل للعمود الجانبي تحت توصية النشر */}
          <div className="lg:hidden">
          {(() => {
            if (review.analysisMode === "pattern-only" || review.evaluationIncomplete) return (
              <Panel className={`border-t-4 shadow-md ${toneBorder("neutral")}`}>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">جاهزية النشر</p>
                <StatusBadge tone="neutral">تعذّر التحليل</StatusBadge>
                <p className="mt-4 text-sm leading-7 text-slate-500">التحليل غير مكتمل بسبب عطل — أعد التحليل قبل الاعتماد على هذه النتيجة.</p>
              </Panel>
            );
            const tone = review.publicationDecision.outcome === "RECOMMENDED" ? "good" as const
              : review.publicationDecision.outcome === "NOT_RECOMMENDED" ? "danger" as const
              : review.publishingReadinessScore < 60 ? "danger" as const
              : "gold" as const;
            const gates = review.publishingReadinessExplanation.gates;
            return (
              <Panel className={`border-t-4 shadow-md ${toneBorder(tone)}`}>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">جاهزية النشر</p>
                <StatusBadge tone={tone}>{review.readinessDecision.level}</StatusBadge>
                <div className="mt-4 space-y-3">
                  {gates.map((gate) => (
                    <div key={gate.key} className="flex items-start gap-3">
                      <span className={`mt-0.5 shrink-0 text-sm font-bold ${gate.passed ? "text-green-600" : "text-red-500"}`}>
                        {gate.passed ? "✓" : "✗"}
                      </span>
                      <div>
                        <p className="text-sm font-medium leading-6">{gate.label}</p>
                        <p className="text-xs leading-5 text-slate-400">{gate.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            );
          })()}
          </div>

          {/* ── نص مقترح محسّن — إعادة صياغة كاملة بالذكاء الاصطناعي ── */}
          {(() => {
            if (path === "create") return null;
            const hasIssues = review.findings.length > 0 || review.languageQuality.issues.length > 0;
            if (!hasIssues) return null;
            return (
              <Panel className="border-violetBorder bg-violetSoft">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles size={16} className="text-violet" aria-hidden="true" />
                  <p className="text-sm font-semibold text-violetText">معالجة الملاحظات وإعادة الصياغة</p>
                </div>
                <p className="mb-3 text-xs leading-6 text-violetText/70">
                  صياغة تعالج الملاحظات وفق الضوابط المهنية، وتُفحص آلياً قبل عرضها.
                </p>

                {/* إقرار وجود مرجع (بقرار مالكة المنصة) — يوجّه إعادة الصياغة قبل توليدها:
                    عند التفعيل تُعزَّز بمرجع موثّق من المصادر المعتمدة ويُوثّق برابطه.
                    مطابق لنظيره في صفحة المراجعة ليتوحّد القسم اسماً ووظيفةً. */}
                <div className="mb-4 rounded-lg border border-line bg-white/70 p-3">
                  <label className="flex cursor-pointer items-start justify-between gap-3">
                    <span>
                      <span className="text-sm text-ink/80">هل يتضمن نصك مرجعاً أو دراسة؟</span>
                      <span className="mt-0.5 block text-xs leading-5 text-ink/45">
                        تُدعَّم الصياغة بمرجع موثّق من المصادر المعتمدة برابطه الرسمي.
                      </span>
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={improvedHasSource}
                      onClick={() => setImprovedHasSource((v) => !v)}
                      className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition ${improvedHasSource ? "bg-palm" : "bg-line"}`}
                    >
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${improvedHasSource ? "right-0.5" : "right-[22px]"}`} />
                    </button>
                  </label>

                  {improvedHasSource && (
                    <div className="mt-3 border-t border-line pt-3">
                      <p className="mb-1.5 text-xs leading-5 text-ink/50">
                        صِف المرجع أو الصق رابطه — الاستناد محصور في المصادر المعتمدة.
                      </p>
                      <input
                        type="text"
                        value={improvedSourceHint}
                        onChange={(e) => setImprovedSourceHint(e.target.value)}
                        placeholder="مثال: دراسة عن أثر شرط التحكيم — أو الصق رابط المرجع"
                        maxLength={500}
                        className="w-full rounded-lg border border-line p-2.5 text-sm transition focus:border-palm focus:outline-none"
                      />
                    </div>
                  )}
                </div>

                {improvedTextAI ? (
                  <>
                    <div className="mb-2 flex justify-end">
                      <PreviewToggleButton preview={previewImproved} onToggle={() => setPreviewImproved((v) => !v)} />
                    </div>
                    {previewImproved ? (
                      <ReadingPreview text={improvedTextAI} />
                    ) : (
                      <p className="whitespace-pre-wrap rounded-lg bg-white/70 p-4 text-sm leading-8 text-violetText">{improvedTextAI}</p>
                    )}
                    {improvedSourceNote && (
                      <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-7 text-amber-800">
                        <AlertTriangle size={16} className="mt-1 shrink-0" aria-hidden="true" />
                        <span>{improvedSourceNote}</span>
                      </div>
                    )}
                    <SourcesPanel
                      sources={improvedSources}
                      onInsert={(block) => setImprovedTextAI((prev) => prev + block)}
                    />
                    <div className="mt-3 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => { setReviewText(improvedTextAI); setReview(null); setPath("review"); }}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-violetBorder bg-white px-4 py-2 text-sm font-medium text-violetText transition hover:border-violet hover:bg-white/80 focus-ring"
                      >
                        <Edit3 size={14} aria-hidden="true" />
                        استخدم هذا النص
                      </button>
                      <button
                        type="button"
                        onClick={() => void requestImprovedText()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-violetBorder bg-white/60 px-4 py-2 text-sm text-violetText/80 transition hover:border-violet hover:text-violetText focus-ring"
                      >
                        <Sparkles size={14} aria-hidden="true" />
                        صياغة جديدة
                      </button>
                    </div>
                  </>
                ) : improvedLoading ? (
                  <div className="flex items-center gap-3 rounded-lg bg-white/70 p-4 text-sm leading-7 text-violetText/75">
                    <span className="inline-block h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-violet/20 border-t-violet" />
                    جارٍ إعادة الصياغة والتحقق…
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => void requestImprovedText()}
                    className="inline-flex items-center gap-2 rounded-lg bg-violet px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violetDark focus-ring"
                  >
                    <Sparkles size={15} aria-hidden="true" />
                    أعد صياغة المحتوى
                  </button>
                )}
                {improvedError && <p className="mt-3 text-xs leading-6 text-red-600">{improvedError}</p>}
              </Panel>
            );
          })()}

          <Panel className="lg:hidden">
            <p className="mb-4 text-sm font-semibold text-ink">ماذا تريد؟</p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => void publishNow()}>📤 نشر مباشرة</Button>
              <ButtonLink href="/calendar" variant="secondary">📅 جدولة</ButtonLink>
              <Button variant="secondary-gray" onClick={saveDraft} leadingIcon={<Save size={16} />}>
                حفظ مسودة
              </Button>
              <Button variant="secondary-gray" onClick={() => setReview(null)} leadingIcon={<Edit3 size={16} />}>
                تعديل
              </Button>
            </div>
            {actionMsg && <p className="mt-3 text-sm text-palm">{actionMsg}</p>}
          </Panel>
          </div>

          {/* الريل الأيسر — الحاسب فقط (lg+): ملخّص ثابت للتوصية والمؤشرات بجانب المحتوى.
              إضافة لا حذف؛ التفاصيل الكاملة تبقى في المنتصف، والجوال لا يظهر هذا الريل. */}
          <aside className="hidden space-y-4 lg:sticky lg:top-20 lg:block">
            <Panel className={`border-t-4 shadow-md ${
              review.publicationDecision.outcome === "RECOMMENDED"
                ? "border-t-green-400"
                : review.publicationDecision.outcome === "NOT_RECOMMENDED" || review.publicationDecision.outcome === "LEGAL_REVIEW_REQUIRED"
                  ? "border-t-red-400"
                  : "border-t-amber-400"
            }`}>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">توصية النشر</p>
              <div className="mt-2">
                {(() => {
                  const decTone: "good" | "gold" | "danger" = review.publicationDecision.outcome === "RECOMMENDED"
                    ? "good"
                    : review.publicationDecision.outcome === "NOT_RECOMMENDED" || review.publicationDecision.outcome === "LEGAL_REVIEW_REQUIRED"
                      ? "danger"
                      : "gold";
                  return <StatusBadge tone={decTone}>{review.publicationDecision.label}</StatusBadge>;
                })()}
              </div>
              <div className="mt-4 space-y-2.5 border-t border-line pt-3">
                {(() => {
                  const riskTone: "good" | "gold" | "danger" = ["بالغ", "حرج", "مرتفع"].includes(review.riskLevel)
                    ? "danger"
                    : review.riskLevel === "متوسط"
                      ? "gold"
                      : "good";
                  const rows: { label: string; val: string; tone: "good" | "gold" | "danger" | "neutral" }[] = [
                    { label: "الامتثال", val: review.findings.length === 0 ? "ملتزم" : "غير ملتزم", tone: review.findings.length === 0 ? "good" : "danger" },
                    { label: "المخاطر", val: review.riskLevel, tone: riskTone },
                    { label: "الجوانب المهنية", val: review.professionalismScore >= 80 ? "مستوفٍ للمعايير" : "يتطلب تحسيناً", tone: review.professionalismScore >= 80 ? "good" : "gold" },
                    { label: "اللغة والإملاء", val: review.languageQuality.passed ? "سليم لغويًا" : "يحتاج تصحيحًا", tone: review.languageQuality.passed ? "good" : "danger" },
                    { label: "جاهزية النشر", val: review.publicationDecision.outcome === "RECOMMENDED" ? "جاهز" : "غير جاهز", tone: review.publicationDecision.outcome === "RECOMMENDED" ? "good" : "danger" },
                  ];
                  return rows.map((r) => (
                    <div key={r.label} className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-ink/70">{r.label}</span>
                      <StatusBadge tone={r.tone}>{r.val}</StatusBadge>
                    </div>
                  ));
                })()}
              </div>
            </Panel>

            {/* جاهزية النشر — تحت توصية النشر في العمود الجانبي (حاسب) */}
            {(() => {
              if (review.analysisMode === "pattern-only" || review.evaluationIncomplete) return (
                <Panel className={`border-t-4 shadow-md ${toneBorder("neutral")}`}>
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">جاهزية النشر</p>
                  <StatusBadge tone="neutral">تعذّر التحليل</StatusBadge>
                  <p className="mt-4 text-sm leading-7 text-slate-500">التحليل غير مكتمل بسبب عطل — أعد التحليل قبل الاعتماد على هذه النتيجة.</p>
                </Panel>
              );
              const tone = review.publicationDecision.outcome === "RECOMMENDED" ? "good" as const
                : review.publicationDecision.outcome === "NOT_RECOMMENDED" ? "danger" as const
                : review.publishingReadinessScore < 60 ? "danger" as const
                : "gold" as const;
              const gates = review.publishingReadinessExplanation.gates;
              return (
                <Panel className={`border-t-4 shadow-md ${toneBorder(tone)}`}>
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">جاهزية النشر</p>
                  <StatusBadge tone={tone}>{review.readinessDecision.level}</StatusBadge>
                  <div className="mt-4 space-y-3">
                    {gates.map((gate) => (
                      <div key={gate.key} className="flex items-start gap-3">
                        <span className={`mt-0.5 shrink-0 text-sm font-bold ${gate.passed ? "text-green-600" : "text-red-500"}`}>
                          {gate.passed ? "✓" : "✗"}
                        </span>
                        <div>
                          <p className="text-sm font-medium leading-6">{gate.label}</p>
                          <p className="text-xs leading-5 text-slate-400">{gate.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              );
            })()}

            {/* ماذا تريد؟ — في العمود الجانبي (حاسب) */}
            <Panel>
              <p className="mb-4 text-sm font-semibold text-ink">ماذا تريد؟</p>
              <div className="flex flex-wrap gap-3">
                <Button onClick={() => void publishNow()}>📤 نشر مباشرة</Button>
                <ButtonLink href="/calendar" variant="secondary">📅 جدولة</ButtonLink>
                <Button variant="secondary-gray" onClick={saveDraft} leadingIcon={<Save size={16} />}>
                  حفظ مسودة
                </Button>
                <Button variant="secondary-gray" onClick={() => setReview(null)} leadingIcon={<Edit3 size={16} />}>
                  تعديل
                </Button>
              </div>
              {actionMsg && <p className="mt-3 text-sm text-palm">{actionMsg}</p>}
            </Panel>
          </aside>
        </div>
        );
      })(review!)}

      {reviewError && !reviewing && (
        <p className="text-sm text-red-600">{reviewError}</p>
      )}

      {/* بوابة الإقرار قبل النشر المباشر (بقرار مالكة المنصة) */}
      {review && (
        <PublishAcknowledgment
          open={publishAckOpen}
          tier={review.riskLevel === "متوسط" ? "medium" : "low"}
          lawyerNotice={
            (review.riskScoreExplanation?.affectedParties?.length === 1 &&
              review.riskScoreExplanation.affectedParties[0] === "المحامي") || undefined
          }
          parties={review.riskScoreExplanation?.affectedParties}
          reason={review.riskScoreExplanation?.explanation}
          action={review.riskScoreExplanation?.fix}
          onCancel={() => setPublishAckOpen(false)}
          onConfirm={() => { setPublishAckOpen(false); void publishNow(); }}
        />
      )}
    </div>
  );
}

