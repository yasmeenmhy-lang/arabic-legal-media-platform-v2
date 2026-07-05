"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Award,
  BarChart2,
  BookOpen,
  Bot,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Edit3,
  FileCheck2,
  FileText,
  Globe,
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
  Upload,
  Video,
  XCircle,
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
import {
  DEMO_USER_NAME,
  loadContentRecords,
  saveContentRecords,
  setActiveContentSelection,
  upsertAnalyzedVersion,
  type StoredContentRecord,
  type StoredContentVersion,
} from "@/lib/content-record-store";
import { saveLatestReviewSnapshot } from "@/components/review-context-summary";
import { riskDisplayLabel, type ContentKind, type ReviewResult, type RiskAffectedParty, type RiskLevel } from "@/lib/types";

// ── Constants ──────────────────────────────────────────────────────────────

const studioContentTypes = contentKindOptions.filter((item) =>
  (
    [
      "post",
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
);

const channels = ["LinkedIn", "X", "Instagram", "TikTok", "Snapchat", "YouTube", "الموقع الإلكتروني"];

const CHANNEL_CHAR_LIMITS: Partial<Record<string, number>> = {
  X: 280,
  Snapchat: 250,
  Instagram: 2200,
  TikTok: 2200,
  LinkedIn: 3000,
  YouTube: 5000,
};

const charLimitPresets = [
  { key: "x", label: "X · ٢٨٠", value: 280 },
  { key: "snap", label: "Snapchat · ٢٥٠", value: 250 },
  { key: "insta-tiktok", label: "Instagram / TikTok · ٢٢٠٠", value: 2200 },
  { key: "li", label: "LinkedIn · ٣٠٠٠", value: 3000 },
];
const audiences = ["عملاء محتملون من الأفراد", "منشآت ورواد أعمال", "زملاء وقطاع قانوني", "الجمهور العام"];
const purposes = [
  "تثقيف الجمهور حول موضوع قانوني",
  "رفع الوعي بالخدمات المهنية",
  "تعزيز الحضور المهني والثقة",
  "حملة توعوية",
];
const specialties = [
  "قانون الأعمال والتجارة",
  "قانون العمل",
  "قانون الأسرة",
  "عقارات وتطوير",
  "ملكية فكرية",
  "تحكيم ونزاعات",
  "قانون التقنية",
  "القانون الجنائي",
  "قانون الاستثمار",
];

type SourceEntry = { key: string; label: string; icon: string; subs?: { key: string; label: string }[] };

const contentSources: SourceEntry[] = [
  { key: "ai-original", label: "ابتكر من الذكاء الاصطناعي", icon: "🤖" },
  {
    key: "global-news",
    label: "أخبار قانونية عالمية",
    icon: "🌐",
    subs: [
      { key: "acquisitions", label: "استحواذات وصفقات كبرى" },
      { key: "arbitration", label: "تحكيم دولي" },
      { key: "court-rulings", label: "أحكام محاكم دولية" },
      { key: "legislation", label: "تشريعات وأنظمة عالمية جديدة" },
      { key: "profession-news", label: "مستجدات مهنة المحاماة عالمياً" },
      { key: "human-rights", label: "قضايا حقوق الإنسان" },
      { key: "trade-law", label: "قانون التجارة الدولية" },
      { key: "ip-law", label: "قانون الملكية الفكرية" },
      { key: "tech-law", label: "قانون التقنية والذكاء الاصطناعي" },
      { key: "env-law", label: "قانون البيئة والاستدامة" },
      { key: "investment-law", label: "قانون الاستثمار الدولي" },
      { key: "conferences", label: "مؤتمرات وملتقيات قانونية" },
      { key: "awards", label: "جوائز وتكريمات قانونية" },
    ],
  },
  { key: "local-news", label: "أخبار قانونية محلية", icon: "📰" },
  { key: "rulings", label: "أحكام قضائية منشورة رسمياً", icon: "⚖️" },
  { key: "regulations", label: "أنظمة ولوائح جديدة", icon: "📜" },
  { key: "bar-updates", label: "مستجدات هيئة المحامين", icon: "🏛️" },
  { key: "deals", label: "صفقات واستحواذات", icon: "🤝" },
  { key: "statistics", label: "إحصائيات قانونية", icon: "📊" },
  { key: "academic", label: "مستجدات أكاديمية وبحثية", icon: "🎓" },
  { key: "events", label: "مناسبات ومحافل قانونية", icon: "📅" },
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
  LinkedIn: <LinkedInIcon size={13} />,
  X: <XIcon size={13} />,
  Instagram: <InstagramIcon size={13} />,
  TikTok: <TikTokIcon size={13} />,
  Snapchat: <SnapchatIcon size={13} />,
  YouTube: <YouTubeIcon size={13} />,
  "الموقع الإلكتروني": <Globe size={13} />,
};

const audienceIcons: Record<string, React.ReactNode> = {
  "عملاء محتملون من الأفراد": <User size={13} />,
  "منشآت ورواد أعمال": <Building2 size={13} />,
  "زملاء وقطاع قانوني": <Scale size={13} />,
  "الجمهور العام": <Users size={13} />,
};

const purposeIcons: Record<string, React.ReactNode> = {
  "تثقيف الجمهور حول موضوع قانوني": <BookOpen size={13} />,
  "رفع الوعي بالخدمات المهنية": <TrendingUp size={13} />,
  "تعزيز الحضور المهني والثقة": <Award size={13} />,
  "حملة توعوية": <Megaphone size={13} />,
};

// ── Helpers ────────────────────────────────────────────────────────────────

function qualLabel(score: number) {
  if (score >= 85) return { label: "ممتاز", cls: "bg-green-100 text-green-800" };
  if (score >= 70) return { label: "جيد", cls: "bg-blue-100 text-blue-800" };
  if (score >= 50) return { label: "متوسط", cls: "bg-amber-100 text-amber-800" };
  return { label: "ضعيف", cls: "bg-red-100 text-red-800" };
}

function toneBorder(tone: "good" | "gold" | "danger" | "neutral") {
  if (tone === "good") return "border-t-green-400";
  if (tone === "gold") return "border-t-amber-400";
  if (tone === "danger") return "border-t-red-400";
  return "border-t-slate-300";
}

function sevTag(severity: "critical" | "high" | "medium" | "low") {
  if (severity === "critical") return { label: "حرج", cls: "bg-red-100 text-red-800" };
  if (severity === "high") return { label: "مرتفع", cls: "bg-orange-100 text-orange-800" };
  if (severity === "medium") return { label: "متوسط", cls: "bg-amber-100 text-amber-800" };
  return { label: "منخفض", cls: "bg-slate-100 text-slate-600" };
}

function riskKpiTone(risk: RiskLevel) {
  if (risk === "بالغ" || risk === "حرج" || risk === "مرتفع") return "danger" as const;
  if (risk === "متوسط") return "gold" as const;
  return "good" as const;
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
  if (score >= 80) return { explanation: "الأسلوب رصين ويليق بمحامٍ مرخص.", action: "حافظ على هذا المستوى من الرصانة في جميع منشوراتك." };
  if (score >= 60) return { explanation: "الأسلوب بحاجة لتحسين ليعكس الرصانة المهنية المتوقعة من محامٍ.", action: "أعد صياغة النص بأسلوب أكاديمي رسمي يليق بالمهنة القانونية." };
  return { explanation: "الأسلوب لا يليق بمحامٍ مرخص — يحتاج إعادة كتابة كاملة.", action: "اكتب النص من جديد بلغة فصحى رصينة تخدم هدفاً مهنياً أو تثقيفياً واضحاً." };
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

function createDraftRecord(
  body: string,
  ctx: { kind: ContentKind | null; channel: string; audience: string; purpose: string }
): string {
  const id = `studio-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const timestamp = new Date().toISOString();
  const resolvedKind: ContentKind = ctx.kind ?? "post";
  const version: StoredContentVersion = {
    id: `${id}-v1`,
    contentId: id,
    version: 1,
    body,
    contentType: resolvedKind,
    contentTypeLabel: contentKindLabels[resolvedKind],
    channel: ctx.channel || "LinkedIn",
    audience: ctx.audience || "الجمهور العام",
    purpose: ctx.purpose || "تثقيف الجمهور حول موضوع قانوني",
    status: "مسودة",
    createdAt: timestamp,
    updatedAt: timestamp,
    references: [],
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
        label: "تم الإنشاء من استوديو المحتوى",
        actor: DEMO_USER_NAME,
        at: timestamp,
        toStatus: "مسودة",
      },
    ],
    sharingStatus: "غير متاح",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const existing = loadContentRecords();
  saveContentRecords([...existing, record]);
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
  const [planFrequency, setPlanFrequency] = useState("");
  const [planDateRange, setPlanDateRange] = useState("");
  const [visualMode, setVisualMode] = useState<"upload" | "describe">("upload");
  const [imageDesc, setImageDesc] = useState("");
  const [imageGenLoading, setImageGenLoading] = useState(false);
  const [imageGenUrl, setImageGenUrl] = useState("");
  const [imageGenPrompt, setImageGenPrompt] = useState("");
  const [imageGenError, setImageGenError] = useState("");
  const [charLimit, setCharLimit] = useState<number | null>(null);

  // Path
  const [path, setPath] = useState<"review" | "create" | null>(null);

  // Review path state
  const [reviewText, setReviewText] = useState("");

  // Create path state
  const [source, setSource] = useState("");
  const [globalSub, setGlobalSub] = useState("");
  const [topic, setTopic] = useState("");
  const [generatedText, setGeneratedText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");

  // Review result
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [contentId, setContentId] = useState<string | undefined>();

  // Action feedback
  const [actionMsg, setActionMsg] = useState("");

  const contextScore = [kind, channel, audience, purpose].filter(Boolean).length;
  const activeText = path === "create" ? generatedText : reviewText;

  // ── Generate content ──

  async function generateContent() {
    if (!source || topic.trim().length < 3) return;
    setGenerating(true);
    setGenerateError("");
    try {
      const sourceLabel =
        source === "global-news" && globalSub
          ? `أخبار قانونية عالمية — ${contentSources.find((s) => s.key === "global-news")?.subs?.find((sub) => sub.key === globalSub)?.label ?? globalSub}`
          : contentSources.find((s) => s.key === source)?.label ?? source;

      const res = await fetch("/api/content-studio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: kind ? contentKindLabels[kind] : "منشور",
          channel: channel || "LinkedIn",
          audience: audience || "الجمهور العام",
          purpose: purpose || "تثقيف الجمهور حول موضوع قانوني",
          specialty: specialty || undefined,
          source: sourceLabel,
          topic: topic.trim(),
        }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok || !data.text) {
        setGenerateError(data.error ?? "فشل في إنشاء المحتوى");
        return;
      }
      setGeneratedText(data.text);
    } finally {
      setGenerating(false);
    }
  }

  // ── Run review ──

  async function runReview() {
    const text = path === "create" ? generatedText : reviewText;
    if (text.trim().length < 5) return;
    if (!kind || !channel || !audience || !purpose) {
      setReviewError("اختر نوع المحتوى والقناة والجمهور والهدف قبل التحليل حتى ترتبط النتائج بالسياق الصحيح.");
      return;
    }
    setReviewing(true);
    setReviewError("");
    setReview(null);
    const contentTypeLabel = contentKindLabels[kind];
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), kind, contentType: contentTypeLabel, channel, audience, purpose }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({})) as { error?: string };
        setReviewError(payload.error ?? "تعذر إكمال المراجعة.");
        return;
      }
      const result = ((await res.json()).data) as ReviewResult;
      setReview(result);
      saveLatestReviewSnapshot(result);
      const saved = upsertAnalyzedVersion({
        contentId,
        body: text.trim(),
        contentType: kind,
        contentTypeLabel,
        channel,
        audience,
        purpose,
        review: result,
      });
      setContentId(saved.record.id);
      setReviewError("");
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "تعذر إكمال المراجعة.");
    } finally {
      setReviewing(false);
    }
  }

  // ── Save draft ──

  function saveDraft() {
    if (!activeText.trim()) return;
    try {
      createDraftRecord(activeText, { kind, channel, audience, purpose });
      router.push("/content-management");
    } catch {
      flash("فشل حفظ المسودة");
    }
  }

  function flash(msg: string) {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(""), 3000);
  }

  // ── Reset ──

  function resetPath() {
    setPath(null);
    setReview(null);
    setReviewText("");
    setGeneratedText("");
    setTopic("");
    setSource("");
    setGlobalSub("");
    setGenerateError("");
    setReviewError("");
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

  async function generateImage(descOverride?: string) {
    const description = descOverride ?? imageDesc;
    if (!description.trim()) return;
    setImageGenLoading(true);
    setImageGenError("");
    setImageGenUrl("");
    setImageGenPrompt("");
    try {
      const res = await fetch("/api/content-studio/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          style: imageStyle || undefined,
          dimensions: imageDimensions || undefined,
          channel: channel || undefined,
        }),
      });
      const data = (await res.json()) as { imageUrl?: string; prompt?: string; error?: string };
      if (!res.ok) {
        setImageGenError(data.error ?? "فشل في إنشاء الصورة");
        return;
      }
      setImageGenUrl(data.imageUrl ?? "");
      setImageGenPrompt(data.prompt ?? "");
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
    setPath("create");
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

  return (
    <div className="content-review-window space-y-6">
      <PageHeader
        eyebrow="الاستوديو"
        title="إعداد المحتوى المهني"
        description="راجع محتوى جاهزاً أو أنشئ محتوى جديداً — كلاهما يمر عبر محرك التحليل القانوني."
      />

      {/* ── 1. Context selectors ── */}
      <Panel>
        <SectionTitle
          title="1. السياق"
          subtitle="كلما اكتمل السياق ارتفعت موثوقية التوصية."
        />

        {/* Progress */}
        <div className="mb-5">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-ink/55">اكتمال السياق</span>
            <span className="font-semibold text-palm">{contextScore} من 4</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-paper">
            <div
              className="h-full rounded-full bg-palm opacity-80 transition-all duration-300"
              style={{ width: `${(contextScore / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Content type */}
        <div className="mb-4">
          <p className="mb-2 text-sm text-ink/65">نوع المحتوى</p>
          <div className="flex flex-wrap gap-2">
            {studioContentTypes.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => handleKindChange(item.value as ContentKind)}
                className={`${chipBase} ${kind === item.value ? chipSelected : chipIdle}`}
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

              {/* Describe mode — AI generates a real image via Pollinations */}
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
                    disabled={!imageDesc.trim() || imageGenLoading}
                    className="inline-flex items-center gap-2 rounded-lg bg-palm px-4 py-2 text-sm font-medium text-white transition hover:bg-palm/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <ImageIcon size={14} />
                    {imageGenLoading ? "جارٍ الإنشاء..." : "إنشاء صورة"}
                  </button>

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
                      <img
                        src={imageGenUrl}
                        alt="الصورة المُنشأة"
                        className="w-full object-cover"
                        onError={() => setImageGenError("تعذر تحميل الصورة — حاول مرة أخرى")}
                      />
                      <div className="flex items-center justify-between gap-3 border-t border-line px-3 py-2.5">
                        <p className="text-xs text-ink/40">أُنشئت بواسطة Flux AI</p>
                        <div className="flex gap-2">
                          <a
                            href={imageGenUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download="generated-image.jpg"
                            className="rounded-lg border border-line bg-paper px-3 py-1 text-xs font-medium text-ink/70 transition hover:border-palm hover:text-palm"
                          >
                            تنزيل
                          </a>
                          <button
                            type="button"
                            onClick={() => generateImage()}
                            className="rounded-lg border border-line bg-paper px-3 py-1 text-xs font-medium text-ink/70 transition hover:border-palm hover:text-palm"
                          >
                            إعادة الإنشاء
                          </button>
                        </div>
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
                    <p className="text-xs text-red-600">{imageGenError}</p>
                  )}
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
            <div className="space-y-4 p-4">
              <div>
                <p className="mb-2 text-xs font-medium text-ink/65">نداء الإجراء (CTA)</p>
                <div className="flex flex-wrap gap-2">
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
                <div className="flex flex-wrap gap-2">
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
                  onChange={(e) => { setInfographicDesc(e.target.value); setImageGenUrl(""); setImageGenError(""); }}
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

              {/* Generate button */}
              <button
                type="button"
                onClick={() => generateImage(buildInfographicDesc())}
                disabled={!infographicDesc.trim() || imageGenLoading}
                className="inline-flex items-center gap-2 rounded-lg bg-palm px-4 py-2 text-sm font-medium text-white transition hover:bg-palm/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <BarChart2 size={14} />
                {imageGenLoading ? "جارٍ الإنشاء..." :
                  infographicSubType === "chart" ? "إنشاء رسم بياني" :
                  infographicSubType === "mindmap" ? "إنشاء خريطة ذهنية" :
                  "إنشاء إنفوغراف"}
              </button>

              {/* Loading */}
              {imageGenLoading && (
                <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-white py-10">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-palm/20 border-t-palm" />
                  <p className="text-xs text-ink/50">الذكاء الاصطناعي يُنشئ الصورة — قد يستغرق ١٠–٣٠ ثانية</p>
                </div>
              )}

              {/* Result */}
              {imageGenUrl && !imageGenLoading && (
                <div className="overflow-hidden rounded-xl border border-line bg-white">
                  <img src={imageGenUrl} alt="المرئي المُنشأ" className="w-full object-cover"
                    onError={() => setImageGenError("تعذر تحميل الصورة — حاول مرة أخرى")} />
                  <div className="flex items-center justify-between gap-3 border-t border-line px-3 py-2.5">
                    <p className="text-xs text-ink/40">أُنشئ بواسطة Flux AI</p>
                    <div className="flex gap-2">
                      <a href={imageGenUrl} target="_blank" rel="noopener noreferrer" download="generated.jpg"
                        className="rounded-lg border border-line bg-paper px-3 py-1 text-xs font-medium text-ink/70 transition hover:border-palm hover:text-palm">
                        تنزيل
                      </a>
                      <button type="button" onClick={() => generateImage(buildInfographicDesc())}
                        className="rounded-lg border border-line bg-paper px-3 py-1 text-xs font-medium text-ink/70 transition hover:border-palm hover:text-palm">
                        إعادة الإنشاء
                      </button>
                    </div>
                  </div>
                  {imageGenPrompt && (
                    <details className="border-t border-line">
                      <summary className="cursor-pointer px-3 py-2 text-xs text-ink/40 hover:text-ink/60">
                        Prompt (DALL-E / Midjourney)
                      </summary>
                      <p className="select-all px-3 pb-3 pt-1 text-xs leading-5 text-ink/55">{imageGenPrompt}</p>
                    </details>
                  )}
                </div>
              )}
              {imageGenError && <p className="text-xs text-red-600">{imageGenError}</p>}
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

        {/* Channel */}
        <div className="mb-4">
          <p className="mb-2 text-sm text-ink/65">القناة</p>
          <div className="flex flex-wrap gap-2">
            {channels.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setChannel(item)}
                className={`${chipBase} ${channel === item ? chipSelected : chipIdle}`}
              >
                {channelIcons[item]}
                {item}
              </button>
            ))}
          </div>
        </div>

        {/* Audience */}
        <div className="mb-4">
          <p className="mb-2 text-sm text-ink/65">الجمهور</p>
          <div className="flex flex-wrap gap-2">
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
        <div className="mb-4">
          <p className="mb-2 text-sm text-ink/65">الهدف</p>
          <div className="flex flex-wrap gap-2">
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

        {/* Specialty (optional) */}
        <div>
          <p className="mb-2 text-sm text-ink/65">
            التخصص{" "}
            <span className="text-ink/40">(اختياري)</span>
          </p>
          <div className="flex flex-wrap gap-2">
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

        {/* Character limit — optional */}
        <div className="border-t border-line pt-4">
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
                {CHANNEL_CHAR_LIMITS[channel]!.toLocaleString("ar-SA")} حرف
              </button>
            </p>
          )}
        </div>
      </Panel>

      {/* ── 2. Path selection ── */}
      {!path && (
        <div>
          <p className="mb-3 text-sm font-semibold text-ink">2. كيف تريد البدء؟</p>
          <div className="grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => setPath("review")}
              className="flex flex-col items-start gap-3 rounded-xl border-2 border-line bg-white p-6 text-right transition hover:border-palm hover:shadow-md focus-ring"
            >
              <span className="rounded-lg bg-mint p-2.5 text-palm">
                <FileCheck2 size={24} aria-hidden="true" />
              </span>
              <span className="text-lg font-semibold text-ink">مراجعة محتوى</span>
              <span className="text-sm leading-6 text-ink/60">
                أدخل نصاً جاهزاً وراجعه قانونياً عبر محرك التحليل.
              </span>
            </button>

            <button
              type="button"
              onClick={startCreatePath}
              className="flex flex-col items-start gap-3 rounded-xl border-2 border-line bg-white p-6 text-right transition hover:border-violet hover:shadow-md focus-ring"
            >
              <span className="rounded-lg bg-violetSoft p-2.5 text-violet">
                <Sparkles size={24} aria-hidden="true" />
              </span>
              <span className="text-lg font-semibold text-ink">إنشاء محتوى</span>
              <span className="text-sm leading-6 text-ink/60">
                الذكاء الاصطناعي يُنشئ المحتوى بناءً على المصدر والسياق، ثم يراجعه قانونياً.
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ── 3a. Review path — text input ── */}
      {path === "review" && !review && !reviewing && (
        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <SectionTitle title="2. النص محل المراجعة" />
            <button
              type="button"
              onClick={resetPath}
              className="text-xs text-ink/50 transition hover:text-ink"
            >
              تغيير المسار
            </button>
          </div>

          <textarea
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="أدخل النص هنا أو اختر صيغة مقترحة أعلاه..."
            className={`min-h-44 w-full rounded-lg border p-4 leading-8 transition ${
              charLimit !== null && reviewText.length > charLimit
                ? "border-red-400 focus:border-red-400"
                : "border-line"
            }`}
          />
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
          <div className="mt-4 flex gap-3">
            <Button onClick={runReview} disabled={reviewText.trim().length < 5} leadingIcon={<FileCheck2 size={16} aria-hidden="true" />}>
              مراجعة المحتوى
            </Button>
          </div>
          {reviewError && <p className="mt-3 text-sm text-red-600">{reviewError}</p>}
        </Panel>
      )}

      {/* ── 3b. Create path — source + topic ── */}
      {path === "create" && !generatedText && !generating && !review && (
        <Panel>
          <div className="mb-4 flex items-center justify-between">
            <SectionTitle title="2. مصدر المحتوى" />
            <button
              type="button"
              onClick={resetPath}
              className="text-xs text-ink/50 transition hover:text-ink"
            >
              تغيير المسار
            </button>
          </div>

          {/* Source grid */}
          <div className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {contentSources.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => {
                  setSource(s.key);
                  if (s.key !== "global-news") setGlobalSub("");
                }}
                className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition ${
                  source === s.key
                    ? "border-palm bg-mint text-palm shadow-[0_0_0_1px_theme(colors.palm)]"
                    : "border-line bg-white text-ink/70 hover:border-palm hover:bg-mint hover:text-palm"
                }`}
              >
                <span className="text-base">{s.icon}</span>
                <span className="flex-1 text-right">{s.label}</span>
                {s.subs && <ChevronDown size={13} className="shrink-0 opacity-40" />}
              </button>
            ))}
          </div>

          {/* Global news sub-categories */}
          {source === "global-news" && (
            <div className="mb-4 rounded-lg border border-line bg-paper p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                تخصص الخبر العالمي
              </p>
              <div className="flex flex-wrap gap-2">
                {contentSources
                  .find((s) => s.key === "global-news")
                  ?.subs?.map((sub) => (
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

          {/* Topic */}
          <div className="mb-4">
            <p className="mb-2 text-sm text-ink/65">الموضوع أو الفكرة</p>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="اكتب موضوعك هنا... الذكاء يفهم ويُنشئ تلقائياً"
              className="min-h-24 w-full rounded-lg border border-line p-4 leading-8"
            />
          </div>

          <button
            type="button"
            onClick={generateContent}
            disabled={!source || topic.trim().length < 3}
            className="inline-flex items-center gap-2 rounded-lg bg-violet px-[11px] py-[9px] text-sm font-medium text-white transition hover:bg-violetDark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Sparkles size={16} aria-hidden="true" />
            إنشاء المحتوى
          </button>
          {generateError && <p className="mt-3 text-sm text-red-600">{generateError}</p>}
        </Panel>
      )}

      {/* Generating spinner */}
      {generating && (
        <Panel>
          <div className="flex flex-col items-center gap-4 py-8">
            <Bot size={32} className="animate-pulse text-violet" />
            <p className="text-sm text-ink/65">الذكاء الاصطناعي يُنشئ المحتوى...</p>
            <div className="h-2 w-48 overflow-hidden rounded-full bg-paper">
              <div className="h-full w-full rounded-full bg-gradient-to-r from-violetSoft via-violet/40 to-violetSoft bg-[length:200%] animate-[pulse_1.5s_ease-in-out_infinite]" />
            </div>
          </div>
        </Panel>
      )}

      {/* ── 4. Generated content preview ── */}
      {path === "create" && generatedText && !review && !reviewing && (
        <Panel className="bg-violetSoft">
          <div className="mb-4 flex items-center justify-between">
            <SectionTitle title="3. المحتوى المقترح" subtitle="راجع وعدّل قبل التحليل القانوني." />
            <button
              type="button"
              onClick={() => {
                setGeneratedText("");
                setTopic("");
              }}
              className="text-xs text-ink/50 transition hover:text-ink"
            >
              أعد الإنشاء
            </button>
          </div>
          <textarea
            value={generatedText}
            onChange={(e) => setGeneratedText(e.target.value)}
            className={`min-h-44 w-full rounded-lg border p-4 leading-8 transition ${
              charLimit !== null && generatedText.length > charLimit
                ? "border-red-400 focus:border-red-400"
                : "border-line"
            }`}
          />
          {charLimit !== null && (
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
            <Button variant="secondary-gray" onClick={() => { setGeneratedText(""); setTopic(""); }} leadingIcon={<Edit3 size={16} />}>
              عدّل الطلب
            </Button>
          </div>
        </Panel>
      )}

      {/* Reviewing spinner */}
      {reviewing && (
        <Panel>
          <div className="flex flex-col items-center gap-3 py-8">
            <FileCheck2 size={28} className="animate-pulse text-palm" />
            <p className="text-sm text-ink/65">محرك التحليل القانوني يعمل...</p>
          </div>
        </Panel>
      )}

      {/* ── 5. Results ── */}
      {review && !reviewing && (
        <>
          {/* النص المُحلَّل */}
          <Panel>
            <SectionTitle title="النص المُحلَّل" />
            <p className="whitespace-pre-wrap text-sm leading-8">{activeText}</p>
            <button
              type="button"
              onClick={() => setReview(null)}
              className="mt-3 text-xs text-ink/50 transition hover:text-ink"
            >
              تعديل النص
            </button>
          </Panel>

          {/* قرار النشر */}
          <Panel>
            <SectionTitle title="نتائج التحليل" />
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
          </Panel>

          {/* بطاقة الامتثال */}
          {(() => {
            const isCompliant = review.findings.length === 0;
            return (
              <Panel className={`border-t-4 shadow-md ${toneBorder(isCompliant ? "good" : "danger")}`}>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">الامتثال</p>
                <StatusBadge tone={isCompliant ? "good" : "danger"}>
                  {isCompliant ? "ملتزم" : "غير ملتزم"}
                </StatusBadge>
                {review.findings.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {review.findings.map((f) => {
                      const sev = f.businessSeverity ?? "low";
                      const tag = sevTag(sev);
                      return (
                        <div key={f.traceabilityId} className={`flex items-start gap-2.5 rounded-lg p-3 ${sev === "critical" || sev === "high" ? "border border-red-200 bg-red-50" : "border border-amber-200 bg-amber-50"}`}>
                          <span className={`shrink-0 rounded px-1.5 py-0.5 text-xs font-bold ${tag.cls}`}>{tag.label}</span>
                          <span className="text-sm leading-6">{f.title}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-7 text-slate-500">لم ترصد مخالفات مرتبطة بالمراجع المسجلة.</p>
                )}
              </Panel>
            );
          })()}

          {/* بطاقة المخاطر */}
          {(() => {
            const tone = riskKpiTone(review.riskLevel);
            const parties = review.riskScoreExplanation.affectedParties ?? [];
            const riskLevels = ["منخفض", "متوسط", "مرتفع", "بالغ"];
            const activeCount = riskLevels.indexOf(review.riskLevel) + 1;
            return (
              <Panel className={`border-t-4 shadow-md ${toneBorder(tone)}`}>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">المخاطر</p>
                <div className="flex items-center justify-between gap-3">
                  <StatusBadge tone={tone}>{riskDisplayLabel(review.riskLevel)}</StatusBadge>
                  <div className="flex gap-1.5">
                    {riskLevels.map((_, i) => (
                      <span key={i} className={`inline-block h-2.5 w-2.5 rounded-full ${i < activeCount ? (tone === "good" ? "bg-green-400" : tone === "gold" ? "bg-amber-400" : "bg-red-500") : "bg-slate-200"}`} />
                    ))}
                  </div>
                </div>
                {parties.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs text-slate-400">الجهات المتضررة</p>
                    <div className="flex flex-wrap gap-2">
                      {parties.map((p) => (
                        <span key={p} className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                          {partyIcon(p)}{p}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {review.riskScoreExplanation.explanation ? (
                  <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">{review.riskScoreExplanation.explanation}</p>
                ) : null}
              </Panel>
            );
          })()}

          {/* بطاقة الكتابة المهنية */}
          {(() => {
            const tone = professionalismKpiTone(review.professionalismScore);
            const passed = review.professionalismScore >= 80;
            const { explanation, action } = professionalismExplanation(review.professionalismScore);
            return (
              <Panel className={`border-t-4 shadow-md ${toneBorder(tone)}`}>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">الكتابة المهنية</p>
                <StatusBadge tone={tone}>{passed ? "ناجح" : "يحتاج تحسين"}</StatusBadge>
                <p className="mt-4 rounded-lg border-r-2 border-amber-300 bg-amber-50 p-3 text-sm leading-6">{explanation}</p>
                <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-slate-400">الإصلاح المقترح</span>
                  {action}
                </div>
              </Panel>
            );
          })()}

          {/* بطاقة اللغة والإملاء */}
          {(() => {
            const passed = review.languageQuality.passed;
            const tone = languageKpiTone(review.languageQuality.score);
            const issues = review.languageQuality.issues;
            return (
              <Panel className={`border-t-4 shadow-md ${toneBorder(passed ? "good" : tone)}`}>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">اللغة والإملاء</p>
                <StatusBadge tone={passed ? "good" : tone}>
                  {passed
                    ? issues.length === 0 ? "ناجح — لا ملاحظات" : `ناجح — ${issues.length} ملاحظة`
                    : `يحتاج تصحيح — ${issues.length} ملاحظة`}
                </StatusBadge>
                {issues.length > 0 ? (
                  <div className="mt-4 space-y-2">
                    {issues.map((issue, i) => (
                      <div key={issue.id ?? i} className="flex items-start gap-2.5 rounded-lg border border-line bg-paper p-3">
                        <span className="shrink-0 rounded bg-red-100 px-1.5 py-0.5 text-xs font-bold text-red-800">
                          {categoryLabel[issue.category] ?? issue.category}
                        </span>
                        <span className="text-sm leading-6">{issue.message}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-7 text-slate-500">لم ترصد ملاحظات لغوية أو إملائية.</p>
                )}
              </Panel>
            );
          })()}

          {/* بطاقة جودة المحتوى */}
          {(() => {
            const exp = review.contentQualityScoreExplanation;
            const hasViolations = review.findings.length > 0;
            const statusTone = (exp.redLine || hasViolations) ? "danger" as const : review.contentQualityScore >= 80 ? "good" as const : "gold" as const;
            const statusLabel = (exp.redLine || hasViolations) ? "خط أحمر مُفعَّل" : review.contentQualityScore >= 80 ? "متوازن" : "يحتاج تحسين";
            return (
              <Panel className={`border-t-4 shadow-md ${toneBorder(statusTone)}`}>
                <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">جودة المحتوى</p>
                <StatusBadge tone={statusTone}>{statusLabel}</StatusBadge>
                <div className="mt-4 space-y-2.5">
                  {exp.factors.map((factor) => {
                    const isCompliance = factor.key === "compliance";
                    const q = isCompliance
                      ? (review.findings.length === 0
                          ? { label: "ملتزم", cls: "bg-green-100 text-green-800" }
                          : { label: "غير ملتزم", cls: "bg-red-100 text-red-800" })
                      : qualLabel(factor.sourceScore);
                    return (
                      <div key={factor.key} className="flex items-center justify-between gap-3">
                        <span className="text-sm text-slate-600">{factor.label}</span>
                        <span className={`rounded px-2 py-0.5 text-xs font-bold ${q.cls}`}>{q.label}</span>
                      </div>
                    );
                  })}
                </div>
                {exp.redLine && (
                  <p className="mt-4 rounded-lg bg-red-50 p-3 text-xs font-medium leading-6 text-red-700">
                    يوجد مخالفة قانونية — النشر غير متاح حتى المعالجة
                  </p>
                )}
              </Panel>
            );
          })()}

          {/* بطاقة جاهزية النشر */}
          {(() => {
            const tone = review.analysisMode === "pattern-only" ? "neutral" as const
              : review.publicationDecision.outcome === "RECOMMENDED" ? "good" as const
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

          {/* ── نص مقترح محسّن — يظهر فقط عند مراجعة نص كتبه المستخدم ── */}
          {(() => {
            if (path === "create") return null;
            const improvedText = review.governedRewrites?.[0]?.suggestedText ?? review.languageQuality?.improvedDraft;
            if (!improvedText) return null;
            return (
              <Panel className="border-violetBorder bg-violetSoft">
                <div className="mb-3 flex items-center gap-2">
                  <Sparkles size={16} className="text-violet" aria-hidden="true" />
                  <p className="text-sm font-semibold text-violetText">نص مقترح محسّن</p>
                </div>
                <p className="mb-3 text-xs leading-6 text-violetText/70">
                  نص معاد صياغته وفق قواعد السلوك المهني للمحامي — يمكنك استخدامه مباشرة أو تعديله.
                </p>
                <p className="text-sm leading-8 text-violetText">{improvedText}</p>
                <button
                  type="button"
                  onClick={() => { setReviewText(improvedText); setReview(null); setPath("review"); }}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-violetBorder bg-white px-4 py-2 text-sm font-medium text-violetText transition hover:border-violet hover:bg-white/80 focus-ring"
                >
                  <Edit3 size={14} aria-hidden="true" />
                  استخدم هذا النص
                </button>
              </Panel>
            );
          })()}

          <Panel>
            <p className="mb-4 text-sm font-semibold text-ink">ماذا تريد؟</p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/social-media">📤 نشر مباشرة</ButtonLink>
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
        </>
      )}

      {reviewError && !reviewing && (
        <p className="text-sm text-red-600">{reviewError}</p>
      )}
    </div>
  );
}

