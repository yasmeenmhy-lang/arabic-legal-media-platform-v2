"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BarChart2,
  BookOpen,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  Edit3,
  ExternalLink,
  FileDown,
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
  Share2,
  ShieldAlert,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  User,
  Users,
  Video,
  XCircle,
  ChevronDown,
  X
} from "lucide-react";
import { Button, DgaSpinner, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import { FieldLabel } from "@/components/field-label";
import { MobileSelect, ChannelSelect } from "@/components/mobile-select";
import { specialties } from "@/lib/specialties";
import {
  LinkedInIcon,
  XIcon,
  InstagramIcon,
  TikTokIcon,
  SnapchatIcon,
  YouTubeIcon,
  socialBrandIcons,
  socialBrandStyles
} from "@/components/social-icons";
import { OfficialLogo, officialEntityFromUrl } from "@/components/official-logos";
import { contentKindOptions } from "@/lib/content-types";
import { QUOTE_INTEGRITY_NOTICE } from "@/lib/quote-notice";
import {
  approveContentVersion,
  clearActiveContentSelection,
  getActiveContentSelection,
  loadContentRecords,
  markContentShared,
  saveContentDraft,
  upsertAnalyzedVersion,
  type StoredVisual,
  type StoredContentRecord
} from "@/lib/content-record-store";
import { normalizeReviewResult } from "@/lib/review-normalizer";
import { smartMatch } from "@/lib/arabic-search";
import { Search } from "lucide-react";
import { saveLatestReviewSnapshot } from "@/components/review-context-summary";
import { riskDisplayLabel, type ContentKind, type ReviewResult, type RiskLevel } from "@/lib/types";
import { FindingsList } from "@/components/content-review/FindingCard";
import {
  ComplianceIndicatorCard,
  LanguageIndicatorCard,
  ProfessionalismIndicatorCard,
  ReadinessIndicatorCard,
  RiskIndicatorCard
} from "@/components/content-review/IndicatorCards";
import { InlineContentGuidance } from "@/components/content-review/InlineGuidance";

const contentTypes = contentKindOptions.filter((item) =>
  (["post", "caption", "statement", "diary", "advertisement", "campaign", "article", "script", "visual_content", "infographic", "publishing_plan"] as ContentKind[]).includes(item.value)
);
const channels = ["LinkedIn", "X", "Instagram", "TikTok", "Snapchat", "YouTube", "الموقع الإلكتروني"];
const audiences = ["عملاء محتملون من الأفراد", "منشآت ورواد أعمال", "زملاء والقطاع العدلي", "الجمهور العام"];
const purposes = [
  "تثقيف الجمهور حول موضوع نظامي",
  "رفع الوعي بالخدمات المهنية",
  "تعزيز الحضور المهني والثقة",
  "حملة توعوية",
  "التعليق على المستجدات النظامية والقضائية",
  "مشاركة معرفية وأكاديمية",
  "التعريف بالخبرات والمشاركات المهنية",
  "مساهمة مجتمعية وعمل تطوعي"
];

const CHANNEL_CHAR_LIMITS: Partial<Record<string, number>> = {
  X: 280,
  Snapchat: 250,
  Instagram: 2200,
  TikTok: 2200,
  LinkedIn: 3000,
  YouTube: 5000
};
const charLimitPresets = [
  { key: "x", label: "X · 280", value: 280 },
  { key: "snap", label: "Snapchat · 250", value: 250 },
  { key: "insta-tiktok", label: "Instagram / TikTok · 2200", value: 2200 },
  { key: "li", label: "LinkedIn · 3000", value: 3000 }
];

const contentTypeIcons: Record<string, React.ReactNode> = {
  post: <FileText size={13} />,
  advertisement: <Megaphone size={13} />,
  campaign: <Layers size={13} />,
  article: <BookOpen size={13} />,
  script: <Video size={13} />,
  caption: <MessageSquare size={13} />,
  visual_content: <ImageIcon size={13} />,
  infographic: <BarChart2 size={13} />,
  publishing_plan: <CalendarDays size={13} />
};

const channelIcons: Record<string, React.ReactNode> = {
  LinkedIn: <LinkedInIcon size={13} />,
  X: <XIcon size={13} />,
  Instagram: <InstagramIcon size={13} />,
  TikTok: <TikTokIcon size={13} />,
  Snapchat: <SnapchatIcon size={13} />,
  YouTube: <YouTubeIcon size={13} />,
  "الموقع الإلكتروني": <Globe size={13} />
};

const audienceIcons: Record<string, React.ReactNode> = {
  "عملاء محتملون من الأفراد": <User size={13} />,
  "منشآت ورواد أعمال": <Building2 size={13} />,
  "زملاء والقطاع العدلي": <Scale size={13} />,
  "الجمهور العام": <Users size={13} />
};

const purposeIcons: Record<string, React.ReactNode> = {
  "تثقيف الجمهور حول موضوع نظامي": <BookOpen size={13} />,
  "رفع الوعي بالخدمات المهنية": <TrendingUp size={13} />,
  "تعزيز الحضور المهني والثقة": <Award size={13} />,
  "حملة توعوية": <Megaphone size={13} />,
  "التعليق على المستجدات النظامية والقضائية": <Scale size={13} />,
  "مشاركة معرفية وأكاديمية": <GraduationCap size={13} />,
  "التعريف بالخبرات والمشاركات المهنية": <Briefcase size={13} />,
  "مساهمة مجتمعية وعمل تطوعي": <HeartHandshake size={13} />
};

const chipBase = "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition focus-ring";
const chipIdle = "border-line bg-white text-ink/65 hover:border-palm hover:bg-mint hover:text-palm";
const chipSelected = "border-palm bg-mint text-palm shadow-[0_0_0_1px_theme(colors.palm)]";

// نسخة سطح المكتب من القائمة المنسدلة — نفس مكوّن الجوال (MobileSelect) تنسيقاً وسلوكاً،
// لكنها تظهر على الحاسب فقط (hidden lg:block) بينما تبقى الشرائح على اللوحي والجوال.
// لا خيارات ولا قيم ولا دوال جديدة — نفس value/onChange/options للحقل نفسه.
function DesktopSelect({ value, onChange, placeholder, emptyLabel, options }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  options: { value: string; label: string }[];
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
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
    </div>
  );
}

const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 } as const;
const reviewTabs = [
  { key: "findings", label: "الملاحظات" },
  { key: "compliance", label: "الامتثال" },
  { key: "risk", label: "المخاطر" },
  { key: "improvements", label: "فرص التحسين" },
  { key: "sharing", label: "المشاركة" }
] as const;
type ReviewTab = (typeof reviewTabs)[number]["key"];

function decisionTone(review: ReviewResult) {
  if (review.analysisMode === "pattern-only" || review.evaluationIncomplete) return "neutral" as const;
  if (review.publicationDecision.outcome === "RECOMMENDED") return "good" as const;
  if (review.publicationDecision.outcome === "RECOMMENDED_AFTER_FINDINGS") return "neutral" as const;
  // غير موصى بالنشر / يتطلب مراجعة — كلاهما حالة "لا نشر قبل المعالجة" بالأحمر
  return "danger" as const;
}

function downloadBlob(name: string, type: string, body: string) {
  const blob = new Blob([body], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export default function ContentReviewPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [contentTitle, setContentTitle] = useState("");
  const [titleSuggesting, setTitleSuggesting] = useState(false);
  const [kind, setKind] = useState<ContentKind | "">("");
  const [channel, setChannel] = useState("");
  const [audience, setAudience] = useState("");
  const [purpose, setPurpose] = useState("");
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [contentId, setContentId] = useState<string>();
  const [versionNumber, setVersionNumber] = useState<number>();
  // بقرار مالكة المنصة: المرئيات تنتقل مع المحتوى — تُعرض في المراجعة القانونية مع إصدارها
  const [savedVisuals, setSavedVisuals] = useState<StoredVisual[]>([]);
  const [approved, setApproved] = useState(false);
  const [approving, setApproving] = useState(false);
  // رسالة فورية تحت زر الاعتماد — لا صمت عند أي عائق
  const [approveMsg, setApproveMsg] = useState("");
  const [activeTab, setActiveTab] = useState<ReviewTab>("findings");
  const [isEditing, setIsEditing] = useState(false);
  const [editSnapshot, setEditSnapshot] = useState<{
    text: string;
    kind: ContentKind | "";
    channel: string;
    audience: string;
    purpose: string;
  } | null>(null);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [suggestingAI, setSuggestingAI] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [charLimit, setCharLimit] = useState<number | null>(null);

  // حقول متطلبات نوع المحتوى — مطابقة لقسم السياق في الاستوديو
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState("");
  const [imageStyle, setImageStyle] = useState("");
  const [imageDimensions, setImageDimensions] = useState("");
  const [visualMode, setVisualMode] = useState<"upload" | "describe">("upload");
  const [imageDesc, setImageDesc] = useState("");
  const [imageGenLoading, setImageGenLoading] = useState(false);
  const [imageGenUrl, setImageGenUrl] = useState("");
  const [imageGenPrompt, setImageGenPrompt] = useState("");
  const [imageGenError, setImageGenError] = useState("");
  const [imageGenEditText, setImageGenEditText] = useState("");
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

  function clearTypeSpecificFields() {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setImageFile(null);
    setImagePreviewUrl("");
    setImageStyle("");
    setImageDimensions("");
    setVisualMode("upload");
    setImageDesc("");
    setImageGenLoading(false);
    setImageGenUrl("");
    setImageGenPrompt("");
    setImageGenError("");
    setImageGenEditText("");
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
      window.open(url, "_blank");
    }
  }

  async function generateImage(descOverride?: string, editInstruction?: string) {
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
          visualType: "image",
          style: imageStyle || undefined,
          dimensions: imageDimensions || undefined,
          channel: channel || undefined,
          editInstruction: editInstruction?.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { imageUrl?: string; prompt?: string; error?: string };
      if (!res.ok) {
        setImageGenError(data.error ?? "تعذر إنشاء الصورة — حاول مرة أخرى.");
        return;
      }
      setImageGenUrl(data.imageUrl ?? "");
      setImageGenPrompt(data.prompt ?? "");
      setImageGenEditText("");
    } catch {
      setImageGenError("تعذر الاتصال بخدمة إنشاء الصور");
    } finally {
      setImageGenLoading(false);
    }
  }

  // رسالة نقص السياق تُمسح تلقائياً فور اكتمال الاختيار — لا تبقى معلّقة بعد استيفاء الشرط
  useEffect(() => {
    if (kind && channel && audience && purpose) {
      setMessage((prev) => (prev.startsWith("اختر نوع المحتوى") ? "" : prev));
    }
  }, [kind, channel, audience, purpose]);

  // بحث منسدل لفتح محتوى محفوظ سابقاً وتحميله للمراجعة
  const [savedRecords, setSavedRecords] = useState<StoredContentRecord[]>([]);
  const [recordSearch, setRecordSearch] = useState("");
  const [recordSearchFocus, setRecordSearchFocus] = useState(false);

  // محمّل مشترك: يفتح إصداراً محدداً من السجل في نموذج المراجعة
  function loadRecordVersion(record: StoredContentRecord, versionNo: number) {
    const version = record.versions.find((item) => item.version === versionNo);
    if (!version) return;
    setContentId(record.id);
    setVersionNumber(version.version);
    setContentTitle(record.title === "محتوى دون عنوان" ? "" : record.title);
    setText(version.body);
    setKind(version.contentType);
    setChannel(version.channel);
    setAudience(version.audience);
    setPurpose(version.purpose);
    // استرجاع بقية المعلومات المدخلة كما حُفظت — فلا يُطلب من المستخدم إعادة إدخالها
    setSpecialty(version.specialty ?? "");
    setCharLimit(version.charLimit ?? null);
    setAdCta(version.adCta ?? "");
    setAdStyle(version.adStyle ?? "");
    setScriptDuration(version.scriptDuration ?? "");
    setScriptStyle(version.scriptStyle ?? "");
    setArticleLength(version.articleLength ?? "");
    setReview(version.analysis ? normalizeReviewResult(version.analysis) : null);
    setApproved(Boolean(version.approvedAt));
    setIsEditing(false);
    setMessage(version.analysis
      ? ""
      : "تم فتح محتوى محفوظ من إصدار سابق. أعد تحليل المحتوى لعرض قرار النشر والنتائج بصيغتها الحالية.");
  }

  useEffect(() => {
    setSavedRecords(loadContentRecords());
    const selection = getActiveContentSelection();
    if (!selection) return;
    const record = loadContentRecords().find((item) => item.id === selection.contentId);
    if (record) loadRecordVersion(record, selection.version);
  }, []);

  // المرئيات المحفوظة تتبع الإصدار الحالي — تُعاد قراءتها كلما تغيّر (تحليل جديد يرثها من سابقه)
  useEffect(() => {
    if (!contentId || !versionNumber) { setSavedVisuals([]); return; }
    const record = loadContentRecords().find((item) => item.id === contentId);
    const version = record?.versions.find((item) => item.version === versionNumber);
    setSavedVisuals(version?.visuals ?? []);
  }, [contentId, versionNumber]);

  const hasReviewContext = Boolean(kind && audience && purpose && specialty);
  const contextScore = [kind, audience, purpose, specialty].filter(Boolean).length;
  const contentTypeLabel = kind ? contentTypes.find((item) => item.value === kind)?.label ?? "محتوى مهني" : "";
  const sortedFindings = useMemo(
    () => [...(review?.findings ?? [])].sort((a, b) => severityOrder[a.businessSeverity ?? "low"] - severityOrder[b.businessSeverity ?? "low"]),
    [review]
  );

  async function requestReview(reviewStatus?: "READY_FOR_PUBLISHING") {
    if (!kind || !audience || !purpose || !specialty) {
      throw new Error("اختر نوع المحتوى والجمهور والهدف والتخصص قبل التحليل حتى ترتبط النتائج بالسياق الصحيح.");
    }
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, kind, contentType: contentTypeLabel, channel: channel || "غير محددة", audience, purpose, reviewStatus })
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(payload.error ?? "تعذر إكمال المراجعة.");
    }
    return (await response.json()).data as ReviewResult;
  }

  async function runReview() {
    if (!kind || !audience || !purpose || !specialty) {
      setMessage("اختر نوع المحتوى والجمهور والهدف والتخصص قبل التحليل حتى ترتبط النتائج بالسياق الصحيح.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const result = await requestReview();
      setReview(result);
      saveLatestReviewSnapshot(result);
      const saved = upsertAnalyzedVersion({
        contentId,
        title: contentTitle,
        body: text,
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
        review: result
      });
      setContentId(saved.record.id);
      setVersionNumber(saved.version.version);
      setApproved(false);
      setIsEditing(false);
      setEditSnapshot(null);
      setAiSuggestion(null);
      setSuggestionError(null);
      setMessage("اكتمل التحليل. ابدأ بقرار النشر ثم عالج الملاحظات حسب الأولوية.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر إكمال المراجعة.");
    } finally {
      setLoading(false);
    }
  }

  async function applyRewrite() {
    const rewrite = review?.governedRewrites[0];
    // كسابقتها: التطبيق بعد المراجعة ولا يُرسل «التخصص»، فلا يُشترط هنا كي لا يتوقف الزر بصمت.
    if (!rewrite || !kind || !audience || !purpose) return;
    const enhancedRewrite = review.aiEnhancement?.rewriteSuggestions.find((item) => item.rewriteId === rewrite.id);
    const rewriteText = enhancedRewrite?.suggestedText ?? rewrite.suggestedText;
    setText(rewriteText);
    setMessage("تم تطبيق الصياغة المقترحة. جار إعادة التقييم للتحقق من النتيجة الفعلية.");
    setLoading(true);
    try {
      const result = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rewriteText, kind, contentType: contentTypeLabel, channel, audience, purpose })
      }).then((response) => response.json()).then((payload) => payload.data as ReviewResult);
      setReview(result);
      saveLatestReviewSnapshot(result);
      const saved = upsertAnalyzedVersion({
        contentId,
        title: contentTitle,
        body: rewriteText,
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
        review: result
      });
      setVersionNumber(saved.version.version);
      setApproved(false);
      setMessage("تم تطبيق الصياغة وإعادة تقييمها. راجع قرار النشر الجديد قبل الاعتماد.");
    } finally {
      setLoading(false);
    }
  }

  function beginEditing() {
    setEditSnapshot({ text, kind, channel, audience, purpose });
    setIsEditing(true);
    setMessage("يمكنك الآن تعديل المحتوى والسياق. احفظ المسودة أو أعد التحليل مباشرة.");
    document.getElementById("input")?.scrollIntoView({ behavior: "smooth" });
  }

  function cancelEditing() {
    if (editSnapshot) {
      setText(editSnapshot.text);
      setKind(editSnapshot.kind);
      setChannel(editSnapshot.channel);
      setAudience(editSnapshot.audience);
      setPurpose(editSnapshot.purpose);
    }
    setEditSnapshot(null);
    setIsEditing(false);
    setMessage("تم إلغاء التعديلات غير المحفوظة.");
  }

  function saveEdits() {
    if (!contentId || text.trim().length < 5 || !kind || !audience || !purpose || !specialty) {
      setMessage("تعذر الحفظ: أدخل نصًا من خمسة أحرف على الأقل واختر نوع المحتوى والجمهور والهدف والتخصص.");
      return;
    }
    const saved = saveContentDraft({
      contentId,
      title: contentTitle,
      body: text,
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
      articleLength
    });
    if (!saved) {
      setMessage("تعذر حفظ التعديلات لأن سجل المحتوى غير متاح.");
      return;
    }
    setVersionNumber(saved.version.version);
    setReview(null);
    setApproved(false);
    setEditSnapshot(null);
    setIsEditing(false);
    setMessage("تم حفظ التعديلات كمسودة. أعد التحليل لعرض قرار النشر المحدث.");
  }

  async function approveCurrentVersion() {
    if (!review || approving || approved) return;
    // لا صمت: غياب النسخة المحفوظة يُقال صراحة بدل تجاهل الضغطة
    if (!contentId || !versionNumber) {
      setApproveMsg("هذه المراجعة غير مرتبطة بنسخة محفوظة — أعد التحليل ثم جرّب الاعتماد.");
      return;
    }
    setApproving(true);
    setMessage("");
    setApproveMsg("");
    try {
      const saved = approveContentVersion(contentId, versionNumber);
      if (!saved) {
        setApproveMsg("تعذر الاعتماد: عالج الملاحظات والحواجز الظاهرة أولاً.");
        return;
      }
      const approvedReview = await requestReview("READY_FOR_PUBLISHING");
      saved.version.analysis = approvedReview;
      setReview(approvedReview);
      saveLatestReviewSnapshot(approvedReview);
      setApproved(true);
      setMessage("تم اعتماد الإصدار النهائي. أصبحت خيارات المشاركة والتصدير متاحة.");
    } catch (error) {
      setApproveMsg(error instanceof Error ? error.message : "تعذر إكمال الاعتماد.");
    } finally {
      setApproving(false);
    }
  }

  const report = review ? {
    "قرار النشر": review.publicationDecision.label,
    "سبب القرار": review.publicationDecision.reason,
    "الملاحظات": sortedFindings.map((finding) => ({
      "الملاحظة": finding.issue,
      "الدليل": finding.evidence,
      "المرجع": `${finding.sourceDocument} — ${finding.legalReference}`,
      "المخاطر": finding.potentialImpact,
      "الإجراء": finding.suggestedSaferWording
    })),
    "متطلبات ما قبل النشر": review.readinessDecision.blockers,
    "القنوات المقترحة": review.channelRecommendations.map((item) => ({
      "القناة": item.channel,
      "السبب": item.reason,
      "الجمهور": item.targetAudience,
      "الفائدة المتوقعة": item.expectedBenefit,
      "القيود": item.risks
    }))
  } : null;

  async function copyReport() {
    if (!report) return;
    await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setMessage("تم نسخ التقرير المهني.");
  }

  function downloadAnalysis() {
    if (!report) return;
    downloadBlob("تحليل-المحتوى.json", "application/json;charset=utf-8", JSON.stringify(report, null, 2));
    setMessage("تم تنزيل حزمة التحليل.");
  }

  function downloadWord() {
    if (!report) return;
    const findings = sortedFindings.map((item) => `<h3>${item.title}</h3><p><b>الدليل:</b> ${item.evidence}</p><p><b>المرجع:</b> ${item.sourceDocument} — ${item.legalReference}</p><p><b>الإجراء:</b> ${item.suggestedSaferWording}</p>`).join("");
    const html = `<html dir="rtl"><meta charset="utf-8"><body><h1>تقرير قرار النشر</h1><h2>${review?.publicationDecision.label}</h2><p>${review?.publicationDecision.reason}</p>${findings}</body></html>`;
    downloadBlob("تقرير-قرار-النشر.doc", "application/msword;charset=utf-8", html);
    setMessage("تم تنزيل تقرير Word.");
  }

  function prepareSharing() {
    if (!approved) {
      setShareMessage("المشاركة متاحة بعد اعتماد النسخة — اعتمد النسخة من قسم اعتماد النسخة أولاً.");
      return;
    }
    if (!contentId || !versionNumber) {
      setShareMessage("لا توجد نسخة محفوظة مرتبطة بهذه المراجعة — أعد التحليل ثم اعتمد النسخة وحاول مجدداً.");
      return;
    }
    const shared = markContentShared(contentId, versionNumber);
    if (!shared) {
      setShareMessage("تعذر تجهيز المشاركة: النسخة المحفوظة غير معتمدة — اعتمد النسخة ثم حاول مجدداً.");
      return;
    }
    setShareMessage("");
    setMessage("تم تجهيز النسخة المعتمدة للمشاركة وتسجيل الإجراء.");
    router.push("/social-media");
  }

  function clearContentInput() {
    clearActiveContentSelection();
    setText("");
    setReview(null);
    setApproved(false);
    setVersionNumber(undefined);
    setContentId(undefined);
    setIsEditing(false);
    setEditSnapshot(null);
    setAiSuggestion(null);
    setSuggestionError(null);
    setMessage("تم مسح محتوى مربع النص فقط. لم تتغير بقية الحقول أو السجلات المحفوظة.");
  }

  async function requestAISuggestion() {
    if (!review || suggestingAI) return;
    setSuggestingAI(true);
    setAiSuggestion(null);
    setSuggestionError(null);
    try {
      const response = await fetch("/api/reformulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          contentType: contentTypeLabel,
          channel,
          audience,
          purpose,
          // حد الأحرف الفعلي للقناة — الصياغة المقترحة تلتزم به مثل النص الأصلي
          charLimit: charLimit ?? (channel ? CHANNEL_CHAR_LIMITS[channel] : undefined) ?? undefined,
          findings: review.findings.map((f) => ({
            issue: f.issue,
            evidence: f.evidence,
            suggestedSaferWording: f.suggestedSaferWording,
            legalReference: f.legalReference
          })),
          languageIssues: review.languageQuality.issues.map((i) => ({
            message: i.message,
            excerpt: i.excerpt ?? "",
            suggestion: i.suggestion ?? ""
          }))
        })
      });
      const payload = await response.json().catch(() => null) as { data?: { suggestedText?: string }; error?: string } | null;
      if (!response.ok || !payload) {
        throw new Error(payload?.error ?? "تعذر إنشاء الصياغة المقترحة — حاول مرة أخرى.");
      }
      const suggested = payload.data?.suggestedText?.trim() ?? "";
      if (!suggested) throw new Error("أعاد النموذج نصًا فارغًا، حاول مرة أخرى.");
      setAiSuggestion(suggested);
    } catch (error) {
      setSuggestionError(error instanceof Error ? error.message : "تعذر إنشاء الصياغة المقترحة.");
    } finally {
      setSuggestingAI(false);
    }
  }

  async function applyAISuggestion() {
    // التطبيق يجري بعد اكتمال المراجعة ولا يُرسل «التخصص» إلى الخدمة، فلا يُشترط هنا —
    // اشتراطه كان يُوقف الزر بصمت دون أي إشعار للمستخدم.
    if (!aiSuggestion || !kind || !audience || !purpose) return;
    const suggestionText = aiSuggestion;
    setText(suggestionText);
    setAiSuggestion(null);
    setSuggestionError(null);
    setLoading(true);
    setMessage("تم استبدال المحتوى بالصياغة المقترحة. جار إعادة التقييم...");
    try {
      const result = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: suggestionText, kind, contentType: contentTypeLabel, channel, audience, purpose })
      }).then((r) => r.json()).then((p) => p.data as ReviewResult);
      setReview(result);
      saveLatestReviewSnapshot(result);
      const saved = upsertAnalyzedVersion({
        contentId,
        body: suggestionText,
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
        review: result
      });
      setContentId(saved.record.id);
      setVersionNumber(saved.version.version);
      setApproved(false);
      setMessage("تم تطبيق الصياغة المقترحة وإعادة تقييمها. راجع النتائج واعتمد عند اكتمال الشروط.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر إعادة التقييم بعد تطبيق الصياغة.");
    } finally {
      setLoading(false);
    }
  }

  function navigateToReviewSection(tab: ReviewTab) {
    setActiveTab(tab);
    window.requestAnimationFrame(() => {
      document.getElementById(tab)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <div className="content-review-window space-y-6">
      <PageHeader
        eyebrow="مساعد قرار النشر للمحامي"
        title="إدارة المحتوى الإعلامي والإعلاني للمحامين"
        description="ابدأ بما يحتاج إلى قرار: الملاحظات، الأدلة، الأثر، والإجراء الموصى به. الدرجات مؤشرات مساندة وليست النتيجة الأساسية."
        action={<Button variant="secondary-gray" onClick={() => router.back()} leadingIcon={<ArrowRight size={16} />}>رجوع</Button>}
      />

      {/* الحاسب: الإدخال + النتائج في العمود الأيسر، والرَّيل عمود يمين بمحاذاته (كالمخطّط).
          قبل التحليل عمود واحد بعرض كامل؛ بعده عمودان. الجوال/اللوحي عمود واحد كما هو. */}
      <div className={`lg:grid lg:items-start lg:gap-6 ${review ? "lg:grid-cols-[minmax(0,1fr)_24rem]" : ""}`}>
        <div className="min-w-0 space-y-6">
      <Panel id="input">
        <SectionTitle title="1. إدخال المحتوى والسياق" subtitle="كلما اكتمل السياق ارتفعت موثوقية التوصية." />

        {/* شريط اكتمال السياق */}
        <div className="mb-5">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-ink/55">اكتمال السياق</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-paper" role="progressbar" aria-valuemin={0} aria-valuemax={4} aria-valuenow={contextScore}>
            <div className="h-full rounded-full bg-gradient-to-l from-mint via-palm/70 to-palm transition-all duration-500" style={{ width: `${contextScore * 25}%` }} />
          </div>
        </div>

        {/* بحث منسدل لفتح محتوى محفوظ سابقاً وتحميله للمراجعة */}
        {savedRecords.length > 0 ? (
          <div className="relative mb-4">
            <FieldLabel label="فتح محتوى محفوظ" optional />
            <div className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 py-2.5">
              <Search size={15} className="shrink-0 text-ink/40" />
              <input
                type="text"
                placeholder="اختر أو ابحث في محتوى سابق لتحميله للمراجعة..."
                value={recordSearch}
                onChange={(e) => setRecordSearch(e.target.value)}
                onFocus={() => setRecordSearchFocus(true)}
                onBlur={() => setTimeout(() => setRecordSearchFocus(false), 150)}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35"
              />
              {recordSearch ? (
                <button type="button" onClick={() => setRecordSearch("")} className="text-ink/35 transition hover:text-ink/70" aria-label="مسح البحث">
                  <X size={14} />
                </button>
              ) : null}
              <ChevronDown size={15} className={`shrink-0 text-ink/40 transition-transform ${recordSearchFocus ? "rotate-180" : ""}`} aria-hidden="true" />
            </div>
            {recordSearchFocus ? (
              <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-lg border border-line bg-white shadow-lg">
                {(() => {
                  const matches = savedRecords.filter((r) => {
                    if (!recordSearch.trim()) return true;
                    const v = r.versions.find((x) => x.version === r.currentVersion) ?? r.versions.at(-1);
                    return smartMatch(recordSearch, [r.title, v?.body, v?.contentTypeLabel]);
                  }).slice(0, 12);
                  return matches.length ? matches.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); loadRecordVersion(r, r.currentVersion); setRecordSearchFocus(false); setRecordSearch(""); }}
                      className="flex w-full items-center gap-2.5 border-b border-line/50 px-3 py-2.5 text-right transition last:border-b-0 hover:bg-mint/30"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm text-ink">{r.title}</span>
                      <StatusBadge tone={r.approvedVersion ? "good" : "gold"}>{r.approvedVersion ? "معتمد" : "مسودة"}</StatusBadge>
                    </button>
                  )) : <p className="px-3 py-3 text-sm text-ink/50">لا نتائج مطابقة.</p>;
                })()}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* نوع المحتوى */}
        <div className={`mb-4 ${Boolean(review) && !isEditing ? "pointer-events-none opacity-60" : ""}`}>
          <FieldLabel label="نوع المحتوى" required />
          <MobileSelect value={kind} onChange={(v) => handleKindChange(v as ContentKind)} placeholder="اختر نوع المحتوى" options={contentTypes} />
          <DesktopSelect value={kind} onChange={(v) => handleKindChange(v as ContentKind)} placeholder="اختر نوع المحتوى" options={contentTypes} />
          <div className="hidden flex-wrap gap-2 sm:flex lg:hidden">
            {contentTypes.map((item) => (
              <button key={item.value} type="button" onClick={() => handleKindChange(item.value as ContentKind)} className={`${chipBase} ${kind === item.value ? chipSelected : chipIdle}`}>
                {contentTypeIcons[item.value]}{item.label}
              </button>
            ))}
          </div>
        </div>

        <div className={Boolean(review) && !isEditing ? "pointer-events-none opacity-60" : ""}>
        {/* محتوى بصري — رفع تصميم أو وصف للذكاء الاصطناعي */}
        {kind === "visual_content" && (
          <div className="mb-4 overflow-hidden rounded-xl border border-palm/20 bg-mint/30">
            <div className="flex items-center gap-2 border-b border-palm/10 bg-mint/60 px-4 py-3">
              <ImageIcon size={14} className="text-palm" />
              <p className="text-sm font-semibold text-palm">متطلبات المحتوى البصري</p>
            </div>
            <div className="space-y-4 p-4">
              <div className="flex gap-2">
                <button type="button" onClick={() => setVisualMode("upload")} className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${visualMode === "upload" ? "border-palm bg-white text-palm shadow-[0_0_0_1px_theme(colors.palm)]" : "border-line bg-white/60 text-ink/55 hover:border-palm hover:text-palm"}`}>
                  <Upload size={12} />
                  رفع تصميم
                </button>
                <button type="button" onClick={() => setVisualMode("describe")} className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${visualMode === "describe" ? "border-palm bg-white text-palm shadow-[0_0_0_1px_theme(colors.palm)]" : "border-line bg-white/60 text-ink/55 hover:border-palm hover:text-palm"}`}>
                  <Sparkles size={12} />
                  وصف للذكاء الاصطناعي
                </button>
              </div>

              {visualMode === "upload" && (
                <div>
                  <p className="mb-2 text-xs font-medium text-ink/65">
                    الصورة أو التصميم <span className="font-bold text-red-500">*</span>
                  </p>
                  {imagePreviewUrl ? (
                    <div className="relative inline-block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imagePreviewUrl} alt="معاينة التصميم" className="max-h-48 rounded-lg border border-line object-contain shadow-sm" />
                      <button type="button" onClick={() => { setImageFile(null); setImagePreviewUrl(""); }} className="absolute -left-2 -top-2 rounded-full bg-red-500 p-0.5 text-white shadow-md transition hover:bg-red-600" aria-label="إزالة الصورة">
                        <XCircle size={16} />
                      </button>
                      <p className="mt-1.5 text-xs text-ink/50">{imageFile?.name}</p>
                    </div>
                  ) : (
                    <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-palm/30 bg-white p-6 text-center transition hover:border-palm hover:bg-mint/40">
                      <Upload size={28} className="text-palm/50" />
                      <div>
                        <p className="text-sm text-ink/70">
                          اسحب التصميم هنا أو <span className="font-semibold text-palm">اختر من جهازك</span>
                        </p>
                        <p className="mt-1 text-xs text-ink/40">PNG · JPG · SVG · WebP — حتى ١٠ ميجابايت</p>
                      </div>
                      <input type="file" accept="image/*,.svg" onChange={handleImageUpload} className="hidden" />
                    </label>
                  )}
                </div>
              )}

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

                  <button type="button" onClick={() => void generateImage()} disabled={!imageDesc.trim() || imageGenLoading} className="inline-flex items-center gap-2 rounded-lg bg-palm px-4 py-2 text-sm font-medium text-white transition hover:bg-palm/90 disabled:cursor-not-allowed disabled:opacity-50">
                    <ImageIcon size={14} />
                    {imageGenLoading ? "جارٍ الإنشاء..." : "إنشاء صورة"}
                  </button>

                  {imageGenLoading && (
                    <div className="flex flex-col items-center gap-3 rounded-xl border border-line bg-white py-10">
                      <div className="h-10 w-10 animate-spin rounded-full border-4 border-palm/20 border-t-palm" />
                      <p className="text-xs text-ink/50">الذكاء الاصطناعي يُنشئ الصورة — قد يستغرق ١٠–٣٠ ثانية</p>
                    </div>
                  )}

                  {imageGenUrl && !imageGenLoading && (
                    <div className="overflow-hidden rounded-xl border border-line bg-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageGenUrl} alt="الصورة المُنشأة" className="w-full object-cover" onError={() => setImageGenError("تعذر تحميل الصورة — حاول مرة أخرى")} />
                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2.5">
                        <p className="text-xs text-ink/40">صورة مُنشأة بالذكاء الاصطناعي</p>
                        <div className="flex flex-wrap gap-2">
                          <a href={imageGenUrl} target="_blank" rel="noopener noreferrer" download="generated-image.jpg" className="shrink-0 whitespace-nowrap rounded-lg border border-line bg-paper px-3 py-1 text-xs font-medium text-ink/70 transition hover:border-palm hover:text-palm">JPG</a>
                          <button type="button" onClick={() => void downloadUrlAsPng(imageGenUrl, "generated-image.png")} className="shrink-0 whitespace-nowrap rounded-lg border border-line bg-paper px-3 py-1 text-xs font-medium text-ink/70 transition hover:border-palm hover:text-palm">PNG</button>
                          <button type="button" onClick={() => void generateImage()} className="shrink-0 whitespace-nowrap rounded-lg border border-line bg-paper px-3 py-1 text-xs font-medium text-ink/70 transition hover:border-palm hover:text-palm">إعادة الإنشاء</button>
                          <button type="button" onClick={() => { setImageGenUrl(""); setImageGenPrompt(""); setImageGenError(""); }} className="flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg border border-line bg-paper px-3 py-1 text-xs font-medium text-red-500/70 transition hover:border-red-300 hover:text-red-600" title="مسح الصورة">
                            <Trash2 size={12} />
                            مسح
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 border-t border-line bg-paper/60 px-3 py-2.5">
                        <input
                          type="text"
                          value={imageGenEditText}
                          onChange={(e) => setImageGenEditText(e.target.value)}
                          placeholder="اطلب تعديلاً — مثال: خلفية أفتح، زاوية مختلفة، إضاءة أقوى..."
                          className="min-w-40 flex-1 rounded-lg border border-line bg-white px-3 py-1.5 text-xs focus:border-palm focus:outline-none"
                        />
                        <button type="button" onClick={() => void generateImage(undefined, imageGenEditText)} disabled={!imageGenEditText.trim()} className="shrink-0 whitespace-nowrap rounded-lg bg-palm px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-palm/90 disabled:opacity-40">
                          تطبيق التعديل
                        </button>
                      </div>
                      {imageGenPrompt && (
                        <details className="border-t border-line">
                          <summary className="cursor-pointer px-3 py-2 text-xs text-ink/40 hover:text-ink/60">وصف الصورة لأدوات التوليد الخارجية</summary>
                          <p className="select-all px-3 pb-3 pt-1 text-xs leading-5 text-ink/55">{imageGenPrompt}</p>
                        </details>
                      )}
                    </div>
                  )}

                  {imageGenError && <p className="text-xs text-red-600">{imageGenError}</p>}
                </div>
              )}

              <div>
                <p className="mb-2 text-xs font-medium text-ink/65">أسلوب التصميم</p>
                <div className="flex flex-wrap gap-2">
                  {["احترافي رسمي", "إبداعي ملوّن", "بسيط ونظيف", "إخباري صارم"].map((s) => (
                    <button key={s} type="button" onClick={() => setImageStyle(imageStyle === s ? "" : s)} className={`${chipBase} text-xs ${imageStyle === s ? chipSelected : chipIdle}`}>
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
                    <button key={d.key} type="button" onClick={() => setImageDimensions(imageDimensions === d.key ? "" : d.key)} className={`${chipBase} text-xs ${imageDimensions === d.key ? chipSelected : chipIdle}`}>
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
                <input type="text" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="مثال: حملة الوعي بحقوق العمال ٢٠٢٥" className="w-full rounded-lg border border-line bg-white px-4 py-2.5 text-sm transition focus:border-palm focus:outline-none" />
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-ink/65">مدة الحملة</p>
                <div className="flex flex-wrap gap-2">
                  {["أسبوع", "أسبوعان", "شهر", "شهران", "ثلاثة أشهر"].map((d) => (
                    <button key={d} type="button" onClick={() => setCampaignDuration(campaignDuration === d ? "" : d)} className={`${chipBase} text-xs ${campaignDuration === d ? chipSelected : chipIdle}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-ink/65">هدف الحملة</p>
                <div className="flex flex-wrap gap-2">
                  {["تعزيز الوعي القانوني", "توليد عملاء محتملين", "إطلاق خدمة جديدة", "ترسيخ العلامة المهنية", "تثقيف قانوني متخصص"].map((g) => (
                    <button key={g} type="button" onClick={() => setCampaignGoal(campaignGoal === g ? "" : g)} className={`${chipBase} text-xs ${campaignGoal === g ? chipSelected : chipIdle}`}>
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
                    <button key={cta} type="button" onClick={() => setAdCta(adCta === cta ? "" : cta)} className={`${chipBase} text-xs ${adCta === cta ? chipSelected : chipIdle}`}>
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
                    <button key={s} type="button" onClick={() => setAdStyle(adStyle === s ? "" : s)} className={`${chipBase} text-xs ${adStyle === s ? chipSelected : chipIdle}`}>
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
                    <button key={d} type="button" onClick={() => setScriptDuration(scriptDuration === d ? "" : d)} className={`${chipBase} text-xs ${scriptDuration === d ? chipSelected : chipIdle}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-ink/65">أسلوب النص</p>
                <div className="flex flex-wrap gap-2">
                  {["تقديمي رسمي", "حواري تفاعلي", "توضيحي خطوة بخطوة", "إعلامي إخباري"].map((s) => (
                    <button key={s} type="button" onClick={() => setScriptStyle(scriptStyle === s ? "" : s)} className={`${chipBase} text-xs ${scriptStyle === s ? chipSelected : chipIdle}`}>
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
                  <button key={l.key} type="button" onClick={() => setArticleLength(articleLength === l.key ? "" : l.key)} className={`${chipBase} flex-col items-start gap-0.5 py-2 text-xs ${articleLength === l.key ? chipSelected : chipIdle}`}>
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
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${infographicSubType === t.key ? "border-palm bg-white text-palm shadow-[0_0_0_1px_theme(colors.palm)]" : "border-line bg-white/60 text-ink/55 hover:border-palm hover:text-palm"}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {infographicSubType === "infographic" && (
                <div>
                  <p className="mb-2 text-xs font-medium text-ink/65">نوع التخطيط</p>
                  <div className="flex flex-wrap gap-2">
                    {["خطوات متسلسلة", "إحصائيات ومقارنات", "شجرة قرارات", "خط زمني", "قائمة بصرية"].map((s) => (
                      <button key={s} type="button" onClick={() => setInfographicStyle(infographicStyle === s ? "" : s)} className={`${chipBase} text-xs ${infographicStyle === s ? chipSelected : chipIdle}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
                      <button key={c.key} type="button" onClick={() => setInfographicChartType(infographicChartType === c.key ? "" : c.key)} className={`${chipBase} text-xs ${infographicChartType === c.key ? chipSelected : chipIdle}`}>
                        {c.key}
                        <span className="opacity-40">·</span>
                        <span className="opacity-50">{c.hint}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {infographicSubType === "mindmap" && (
                <div>
                  <p className="mb-2 text-xs font-medium text-ink/65">أسلوب الخريطة</p>
                  <div className="flex flex-wrap gap-2">
                    {["إشعاعي من المركز", "هرمي من الأعلى", "شجرة أفقية", "عنقودي"].map((s) => (
                      <button key={s} type="button" onClick={() => setInfographicMindStyle(infographicMindStyle === s ? "" : s)} className={`${chipBase} text-xs ${infographicMindStyle === s ? chipSelected : chipIdle}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <p className="mb-2 text-xs font-medium text-ink/65">
                  صف المحتوى المطلوب <span className="font-bold text-red-500">*</span>
                </p>
                <textarea
                  value={infographicDesc}
                  onChange={(e) => setInfographicDesc(e.target.value)}
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
                    <button key={d} type="button" onClick={() => setPlanDateRange(planDateRange === d ? "" : d)} className={`${chipBase} text-xs ${planDateRange === d ? chipSelected : chipIdle}`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-ink/65">تكرار النشر</p>
                <div className="flex flex-wrap gap-2">
                  {["يومي", "مرتان أسبوعياً", "أسبوعي", "كل أسبوعين"].map((f) => (
                    <button key={f} type="button" onClick={() => setPlanFrequency(planFrequency === f ? "" : f)} className={`${chipBase} text-xs ${planFrequency === f ? chipSelected : chipIdle}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        </div>


        {/* الجمهور والهدف والتخصص — شبكة كثيفة على الحاسب فقط */}
        <div className="lg:grid lg:grid-cols-3 lg:gap-4">
        {/* الجمهور */}
        <div className={`mb-4 lg:mb-0 ${Boolean(review) && !isEditing ? "pointer-events-none opacity-60" : ""}`}>
          <FieldLabel label="الجمهور" required />
          <MobileSelect value={audience} onChange={setAudience} placeholder="اختر الجمهور" options={audiences.map((a) => ({ value: a, label: a }))} />
          <DesktopSelect value={audience} onChange={setAudience} placeholder="اختر الجمهور" options={audiences.map((a) => ({ value: a, label: a }))} />
          <div className="hidden flex-wrap gap-2 sm:flex lg:hidden">
            {audiences.map((item) => (
              <button key={item} type="button" onClick={() => setAudience(item)} className={`${chipBase} ${audience === item ? chipSelected : chipIdle}`}>
                {audienceIcons[item]}{item}
              </button>
            ))}
          </div>
        </div>

        {/* الهدف */}
        <div className={`mb-4 lg:mb-0 ${Boolean(review) && !isEditing ? "pointer-events-none opacity-60" : ""}`}>
          <FieldLabel label="الهدف" required />
          <MobileSelect value={purpose} onChange={setPurpose} placeholder="اختر الهدف" options={purposes.map((p) => ({ value: p, label: p }))} />
          <DesktopSelect value={purpose} onChange={setPurpose} placeholder="اختر الهدف" options={purposes.map((p) => ({ value: p, label: p }))} />
          <div className="hidden flex-wrap gap-2 sm:flex lg:hidden">
            {purposes.map((item) => (
              <button key={item} type="button" onClick={() => setPurpose(item)} className={`${chipBase} ${purpose === item ? chipSelected : chipIdle}`}>
                {purposeIcons[item]}{item}
              </button>
            ))}
          </div>
        </div>
        {/* التخصص — إجباري بقرارها، متوائم مع الاستوديو */}
        <div className={`mb-4 lg:mb-0 ${Boolean(review) && !isEditing ? "pointer-events-none opacity-60" : ""}`}>
          <FieldLabel label="التخصص" required />
          <MobileSelect value={specialty} onChange={setSpecialty} placeholder="اختر التخصص" options={specialties.map((s) => ({ value: s, label: s }))} />
          <DesktopSelect value={specialty} onChange={setSpecialty} placeholder="اختر التخصص" options={specialties.map((s) => ({ value: s, label: s }))} />
          <div className="hidden flex-wrap gap-2 sm:flex lg:hidden">
            {specialties.map((item) => (
              <button key={item} type="button" onClick={() => setSpecialty(specialty === item ? "" : item)} className={`${chipBase} ${specialty === item ? chipSelected : chipIdle}`}>
                {item}
              </button>
            ))}
          </div>
        </div>
        </div>

        {/* خيارات متقدمة (اختياري): القناة وحد الحروف — تُعرض مباشرةً بلا سهم طيّ */}
        <div className={`border-t border-line pt-3 ${Boolean(review) && !isEditing ? "pointer-events-none opacity-60" : ""}`}>
          <div className="flex items-center justify-between rounded-lg px-1 py-1.5 text-sm text-ink/65">
            <span>
              خيارات متقدمة <span className="text-ink/40">(اختياري)</span>
              {channel ? <span className="mr-2 rounded-full bg-mint px-2 py-0.5 text-xs text-palm">{channel}</span> : null}
              {charLimit !== null ? <span className="mr-2 rounded-full bg-mint px-2 py-0.5 text-xs text-palm">حد {charLimit} حرف</span> : null}
            </span>
          </div>
          <div className="mt-3">
        {/* القناة (اختياري) */}
        <div className="mb-4">
          <FieldLabel label="القناة" optional />
          <ChannelSelect value={channel} onChange={setChannel} channels={channels} />
          <div className="hidden flex-wrap gap-2 sm:flex">
            {channels.map((item) => (
              <button key={item} type="button" onClick={() => setChannel(channel === item ? "" : item)} className={`${chipBase} ${channel === item ? chipSelected : chipIdle}`}>
                {channelIcons[item]}{item}
              </button>
            ))}
          </div>
        </div>

        {/* حد الحروف (اختياري) */}
        <div className="border-t border-line pt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm text-ink/65">
              حد الحروف <span className="text-ink/40">(اختياري)</span>
            </p>
            {charLimit !== null && (
              <button type="button" onClick={() => setCharLimit(null)} className="text-xs text-ink/40 transition hover:text-red-500">
                مسح
              </button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {charLimitPresets.map((p) => (
              <button key={p.key} type="button" onClick={() => setCharLimit(charLimit === p.value ? null : p.value)} className={`${chipBase} text-xs ${charLimit === p.value ? chipSelected : chipIdle}`}>
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
              <button type="button" onClick={() => setCharLimit(CHANNEL_CHAR_LIMITS[channel]!)} className="font-semibold text-palm underline-offset-2 hover:underline">
                {CHANNEL_CHAR_LIMITS[channel]!} حرف
              </button>
            </p>
          )}
        </div>
          </div>
        </div>

        {!hasReviewContext ? (
          <p className="mt-2 text-xs leading-6 text-ink/60">اختر نوع المحتوى والجمهور والهدف والتخصص حتى يكون التحليل مرتبطًا بالسياق الصحيح.</p>
        ) : null}
        {/* عنوان المحتوى — بقرار مالكة المنصة: بجوار النص الذي يصفه، فوق النص محل المراجعة */}
        <label className="mt-4 block text-sm">
          <span className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <FieldLabel as="span" label="عنوان المحتوى" className="mb-0" />
            <Button
              size="sm"
              variant="secondary-gray"
              disabled={text.trim().length < 20 || titleSuggesting || (Boolean(review) && !isEditing)}
              onClick={async () => {
                setTitleSuggesting(true);
                try {
                  const res = await fetch("/api/suggest-title", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text }),
                  });
                  const data = (await res.json()) as { title?: string };
                  if (res.ok && data.title) setContentTitle(data.title);
                } catch { /* يبقى الحقل كما هو */ } finally {
                  setTitleSuggesting(false);
                }
              }}
              leadingIcon={<Sparkles size={14} aria-hidden="true" />}
            >
              {titleSuggesting ? "جارٍ الاقتراح..." : "اقتراح تلقائي"}
            </Button>
          </span>
          <input
            type="text"
            value={contentTitle}
            disabled={Boolean(review) && !isEditing}
            onChange={(event) => setContentTitle(event.target.value)}
            placeholder="مثال: توعية بحقوق العامل عند انتهاء العقد"
            className="mt-2 w-full rounded-lg border border-line p-3 text-sm leading-7 transition disabled:bg-paper disabled:text-ink/65"
            maxLength={90}
          />
        </label>
        <label className="mt-4 block text-sm">
          <span className="flex flex-wrap items-center justify-between gap-2">
            <span>النص محل المراجعة</span>
            <Button size="sm" variant="secondary-gray" onClick={clearContentInput} disabled={loading || text.length === 0} leadingIcon={<XCircle size={14} aria-hidden="true" />}>مسح المحتوى</Button>
          </span>
          <textarea
            value={text}
            disabled={Boolean(review) && !isEditing}
            onChange={(event) => setText(event.target.value)}
            className={`mt-2 min-h-44 w-full rounded-lg border p-4 leading-8 transition disabled:bg-paper disabled:text-ink/65 ${
              charLimit !== null && text.length > charLimit ? "border-red-400 focus:border-red-400" : "border-line"
            }`}
          />
        </label>
        {charLimit !== null && (
          <div className={`mt-1 text-left text-xs tabular-nums ${
            text.length > charLimit
              ? "font-bold text-red-500"
              : text.length > charLimit * 0.9
              ? "text-amber-500"
              : "text-ink/35"
          }`}>
            {text.length} / {charLimit}
            {text.length > charLimit && (
              <span className="mr-2">(تجاوز بـ {text.length - charLimit} حرف)</span>
            )}
          </div>
        )}
        <div className="mt-3">
          <InlineContentGuidance review={review} draftText={text} onApplyRewrite={applyRewrite} loading={loading} />
        </div>
        {/* توعوي بحت عند رصد اقتباس في النص الملصق — كشف عرضي حتمي، لا يمس المؤشرات ولا محرك التحليل */}
        {review ? (
          <div className="mt-3 rounded-xl border border-infoBorder bg-infoSoft p-4">
            <p className="text-sm font-semibold text-infoDark">{QUOTE_INTEGRITY_NOTICE.title}</p>
            <p className="mt-1.5 text-xs leading-6 text-ink/70">{QUOTE_INTEGRITY_NOTICE.body}</p>
            <p className="mt-1.5 text-xs leading-6 text-ink/50">{QUOTE_INTEGRITY_NOTICE.disclaimer}</p>
          </div>
        ) : null}
        {/* بقرار مالكة المنصة: المرئيات المحفوظة تنتقل مع المحتوى وتظهر في المراجعة القانونية مع إصدارها */}
        {savedVisuals.length ? (
          <details className="mt-3 rounded-xl border border-line bg-white p-4" open>
            <summary className="cursor-pointer text-sm font-semibold text-palm">
              المرئيات المحفوظة مع هذا الإصدار ({savedVisuals.length})
            </summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {savedVisuals.map((visual) => (
                <figure key={visual.id} className="rounded-md border border-line bg-white p-2">
                  <figcaption className="mb-2 px-1 text-xs font-medium text-ink/70">{visual.visualTypeLabel}</figcaption>
                  {visual.svg ? (
                    <div className="rounded bg-paper/40 p-2 [&_svg]:mx-auto [&_svg]:block [&_svg]:h-auto [&_svg]:max-h-[360px] [&_svg]:w-full"
                      dangerouslySetInnerHTML={{ __html: visual.svg }} />
                  ) : visual.imageUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <div className="flex justify-center rounded bg-paper/40 p-2">
                      <img src={visual.imageUrl} alt={visual.visualTypeLabel} className="max-h-[360px] w-auto max-w-full object-contain" />
                    </div>
                  ) : null}
                </figure>
              ))}
            </div>
          </details>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-3">
          {/* زر التحليل ظاهر دائماً — بعد ظهور النتائج يصبح «إعادة التحليل» بلا حاجة لدخول وضع التعديل */}
          <Button size="lg" onClick={runReview} disabled={loading || text.trim().length < 5 || !hasReviewContext} leadingIcon={loading ? <DgaSpinner size="sm" tone="violet" /> : <FileText size={17} />}>{loading ? "جار التحليل..." : review || contentId ? "إعادة التحليل" : "تحليل المحتوى"}</Button>
          {review && !isEditing ? <Button variant="secondary" onClick={beginEditing} leadingIcon={<Edit3 size={16} />}>تعديل</Button> : null}
          {isEditing && contentId ? <Button variant="secondary" onClick={saveEdits} disabled={loading || text.trim().length < 5 || !hasReviewContext} leadingIcon={<Save size={16} />}>حفظ التعديلات</Button> : null}
          {isEditing ? <Button variant="secondary-gray" onClick={cancelEditing} disabled={loading} leadingIcon={<AlertTriangle size={16} />}>إلغاء</Button> : null}
        </div>
        {message ? <p className="mt-3 text-sm text-palm">{message}</p> : null}
      </Panel>

      {review ? (
        <>
          {review.analysisMode === "pattern-only" ? (
            <div
              dir="rtl"
              role="alert"
              className="sticky top-0 z-20 flex items-start gap-3 rounded-b-lg border-2 border-warningDark bg-warningSoft px-5 py-4 text-base font-semibold text-warningDark shadow-lg"
            >
              <span aria-hidden="true" className="mt-0.5 shrink-0 text-xl">⚠️</span>
              <span>{"تنبيه: يوجد عطل، والتحليل غير مكتمل حالياً، وقد لا تشمل النتيجة كل المخالفات — أعد التحليل قبل الاعتماد على هذه النتيجة."}</span>
            </div>
          ) : null}

          <Panel
            id="decision"
            className={`border-t-4 shadow-md lg:hidden ${
              review.analysisMode === "pattern-only" || review.evaluationIncomplete
                ? "border-t-slate-300 bg-white"
                : review.publicationDecision.outcome === "RECOMMENDED"
                  ? "border-t-green-400 bg-green-50/40"
                  : review.publicationDecision.outcome === "NOT_RECOMMENDED" || review.publicationDecision.outcome === "LEGAL_REVIEW_REQUIRED"
                    ? "border-t-red-400 bg-red-50/40"
                    : "border-t-amber-400 bg-amber-50/40"
            }`}
          >
            {review.analysisMode === "pattern-only" || review.evaluationIncomplete ? (
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">2. قرار النشر</p>
                  <h2 className="mt-2 text-xl font-bold">التحليل غير مكتمل — أعد التحليل</h2>
                  <p className="mt-3 max-w-4xl leading-8 text-ink/75">تعذر إكمال التحليل بسبب عطل، ولا تصدر أي توصية نشر قبل إعادة التحليل بنجاح.</p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <StatusBadge tone="neutral">أعد التحليل</StatusBadge>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setDecisionOpen((o) => !o)}
                  aria-expanded={decisionOpen}
                  className="flex w-full flex-col gap-4 text-right focus-ring lg:flex-row lg:items-start lg:justify-between"
                >
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">2. قرار النشر</p>
                    <h2 className="mt-2 text-xl font-bold">{review.publicationDecision.label}</h2>
                    <p className="mt-3 max-w-4xl leading-8 text-ink/75">{review.publicationDecision.reason}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <StatusBadge tone={decisionTone(review)}>{review.publicationDecision.label}</StatusBadge>
                    <ChevronDown size={18} className={`text-slate-400 transition-transform ${decisionOpen ? "rotate-180" : ""}`} aria-hidden="true" />
                  </div>
                </button>
                {decisionOpen ? (
                  <div className="mt-5 grid gap-4 lg:grid-cols-2">
                    <div className="rounded-lg bg-white/70 p-4 ring-1 ring-line"><p className="text-xs text-ink/55">لماذا هذه التوصية؟</p><p className="mt-2 leading-8">{review.confidence.reason}</p></div>
                    <div className="rounded-lg bg-white/70 p-4 ring-1 ring-line"><p className="text-xs text-ink/55">ما المطلوب قبل النشر؟</p><ul className="mt-2 list-disc space-y-2 pr-5 leading-7">{review.readinessDecision.blockers.length ? review.readinessDecision.blockers.map((item) => <li key={item}>{item}</li>) : <li>لا توجد متطلبات مانعة متبقية.</li>}</ul></div>
                  </div>
                ) : null}
              </>
            )}
          </Panel>

          {/* المؤشرات المساندة — تبقى في العمود الرئيسي على الجوال/اللوحي كما هي.
              على الحاسب (lg+) تُنقل إلى العمود الجانبي تحت «قرار النشر» وفوق «اعتماد النسخة». */}
          <section id="analysis-summary" aria-labelledby="supporting-indicators-title" className="space-y-4 scroll-mt-24 lg:hidden">
            <SectionTitle
              title="المؤشرات المساندة للقرار"
              subtitle="توضح الرسوم مستوى كل جانب، بينما تبقى الملاحظات والأدلة والأثر والإجراء الموصى به هي أساس القرار."
            />
            <div className="grid gap-4 xl:grid-cols-2">
              <ComplianceIndicatorCard review={review} staticSummary />
              <RiskIndicatorCard review={review} staticSummary />
              <ProfessionalismIndicatorCard review={review} staticSummary />
              <LanguageIndicatorCard review={review} staticSummary />
              <ReadinessIndicatorCard review={review} staticSummary />
            </div>
          </section>

          <>
          <section id="findings" className="space-y-4 scroll-mt-24">
            <SectionTitle title="3. الملاحظات" subtitle="جميع الملاحظات واجبة المعالجة قبل النشر." />
            {sortedFindings.length ? <FindingsList findings={sortedFindings} /> : (() => {
              const hasOtherIssues = review.publicationDecision.outcome === "NOT_RECOMMENDED"
                || ["بالغ", "حرج", "مرتفع"].includes(review.riskLevel)
                || review.professionalismScore < 60
                || !review.languageQuality.passed;
              const otherIssueReasons = [
                ["بالغ", "حرج", "مرتفع"].includes(review.riskLevel) && `مستوى مخاطر ${review.riskLevel}`,
                review.professionalismScore < 60 && "أسلوب لا يليق بالمهنة القانونية",
                !review.languageQuality.passed && "أخطاء لغوية تحتاج تصحيحاً"
              ].filter(Boolean).join(" · ");
              return (
                <Panel className={hasOtherIssues ? "border border-amber-200 bg-amber-50/60" : ""}>
                  <div className="flex items-start gap-3">
                    {hasOtherIssues
                      ? <AlertTriangle className="mt-1 shrink-0 text-amber-500" size={20} />
                      : <CheckCircle2 className="mt-1 shrink-0 text-palm" size={20} />}
                    <div>
                      <h3 className="font-semibold">لم ترصد مخالفة قانونية مرتبطة بمرجع رسمي</h3>
                      {hasOtherIssues
                        ? <p className="mt-2 leading-7 text-amber-800">القرار السلبي مبني على: {otherIssueReasons}. راجع بطاقات المؤشرات أعلاه وعالج هذه النقاط قبل النشر.</p>
                        : <p className="mt-2 leading-7 text-ink/70">راجع متطلبات الاعتماد وجودة اللغة قبل تجهيز النشر.</p>}
                    </div>
                  </div>
                </Panel>
              );
            })()}
          </section>
          </>


          <section id="improvements" className="space-y-5 scroll-mt-24">
          <Panel id="rewrite" className="scroll-mt-24">
            <SectionTitle title="4. الصياغة المقترحة وأثر التحسين" subtitle="الذكاء الاصطناعي يولّد صياغة معالِجة لجميع الملاحظات الامتثالية واللغوية. تُعاد المراجعة فعلياً بعد التطبيق." />

            {/* كتلة الصياغة الذكية */}
            <div className="mb-5 rounded-xl border border-violetBorder bg-violetSoft p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-violet">
                  <Sparkles size={18} aria-hidden="true" />
                  <h3 className="font-semibold">صياغة مقترحة</h3>
                </div>
                <button
                  type="button"
                  onClick={requestAISuggestion}
                  disabled={suggestingAI || loading}
                  className="inline-flex items-center gap-2 rounded-lg bg-violet px-[11px] py-[9px] text-sm font-medium text-white transition hover:bg-violetDark disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Sparkles size={15} aria-hidden="true" />
                  {suggestingAI ? "جار الإنشاء..." : aiSuggestion ? "إنشاء صياغة جديدة" : "صياغة مقترحة"}
                </button>
              </div>

              {suggestingAI ? (
                <div className="mt-4 flex items-center gap-3 rounded-lg bg-white p-4 text-sm leading-7 text-ink/60">
                  <DgaSpinner size="sm" tone="violet" label="جار إنشاء الصياغة..." />
                  <span>جار إنشاء الصياغة المقترحة التي تعالج {review.findings.length ? `${review.findings.length} ملاحظة امتثالية` : "الملاحظات"}{review.languageQuality.issues.length ? ` و${review.languageQuality.issues.length} ملاحظة لغوية` : ""}...</span>
                </div>
              ) : suggestionError ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-7 text-red-700">
                  <p className="font-semibold">تعذّر توليد الصياغة</p>
                  <p className="mt-1">{suggestionError}</p>
                  <button type="button" onClick={requestAISuggestion} className="mt-3 inline-flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-xs text-white">
                    <Sparkles size={13} /> إعادة المحاولة
                  </button>
                </div>
              ) : aiSuggestion !== null ? (
                <div className="mt-4 space-y-3">
                  <textarea
                    value={aiSuggestion}
                    onChange={(e) => setAiSuggestion(e.target.value)}
                    className="min-h-36 w-full rounded-lg border border-line p-4 leading-8 text-sm"
                  />
                  <p className="text-xs leading-6 text-ink/55">
                    يمكنك تعديل الصياغة قبل تطبيقها. هذا المقترح استرشادي وتظل مسؤولية الاعتماد والنشر على المستخدم.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={applyAISuggestion}
                      disabled={loading}
                      className="inline-flex items-center gap-2 rounded-lg bg-violet px-[11px] py-[9px] text-sm font-medium text-white transition hover:bg-violetDark disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Sparkles size={16} aria-hidden="true" />
                      تطبيق الصياغة واستبدال المحتوى
                    </button>
                    <button
                      type="button"
                      onClick={approveCurrentVersion}
                      disabled={approved || approving || review.findings.some((f) => !f.resolved) || !review.languageQuality.passed || ["بالغ", "حرج", "مرتفع"].includes(review.riskLevel)}
                      className="inline-flex items-center gap-2 rounded-md border border-palm px-4 py-2.5 text-sm text-palm disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <CheckCircle2 size={16} aria-hidden="true" />
                      {approved ? "تم الاعتماد" : approving ? "جار الاعتماد..." : "اعتماد المحتوى الحالي"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 space-y-3">
                  <p className="text-sm leading-7 text-ink/65">
                    صياغة مقترحة وفق الضوابط والقواعد المهنية، تعالج
                    {review.findings.length ? ` ${review.findings.length} ملاحظة امتثالية` : " الملاحظات"}
                    {review.languageQuality.issues.length ? ` و${review.languageQuality.issues.length} ملاحظة لغوية` : ""}
                    ، مع الحفاظ على الدقة الإملائية والأسلوب المهني.
                  </p>
                  <button
                    type="button"
                    onClick={approveCurrentVersion}
                    disabled={approved || approving || review.findings.some((f) => !f.resolved) || !review.languageQuality.passed || ["بالغ", "حرج", "مرتفع"].includes(review.riskLevel)}
                    className="inline-flex items-center gap-2 rounded-md border border-palm px-4 py-2.5 text-sm text-palm disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <CheckCircle2 size={16} aria-hidden="true" />
                    {approved ? "تم اعتماد المحتوى" : approving ? "جار الاعتماد..." : "اعتماد المحتوى الحالي"}
                  </button>
                </div>
              )}
            </div>

          </Panel>
          </section>

<>
          <Panel id="channels" className="scroll-mt-24">
            <SectionTitle title="5. القنوات المقترحة" subtitle="كل توصية مبنية على نوع المحتوى والجمهور والهدف ونتائج المراجعة." />
            <div className="flex flex-wrap gap-3">
              {review.channelRecommendations.map((item) => {
                const Icon = socialBrandIcons[item.key];
                return Icon ? (
                  <div key={item.key} title={item.channel} aria-label={item.channel} className="rounded-xl border border-line bg-white p-3 shadow-xs">
                    <Icon size={28} className={socialBrandStyles[item.key]?.icon} />
                  </div>
                ) : null;
              })}
            </div>
          </Panel>

          <Panel id="approval" className="scroll-mt-24 lg:hidden">
            <SectionTitle title="7. اعتماد النسخة" subtitle="لا تتاح المشاركة أو التصدير إلا للنسخة النهائية التي تمت مراجعتها واعتمادها." />
            <button type="button" onClick={approveCurrentVersion} disabled={approved || approving || review.findings.some((finding) => !finding.resolved) || !review.languageQuality.passed || ["بالغ", "حرج", "مرتفع"].includes(review.riskLevel)} className="inline-flex items-center gap-2 rounded-md bg-palm px-5 py-2.5 text-white disabled:cursor-not-allowed disabled:opacity-50"><Save size={16} />{approved ? "تم اعتماد النسخة" : approving ? "جار الاعتماد..." : "اعتماد النسخة الحالية"}</button>
            {approveMsg ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">{approveMsg}</p> : null}
            {!approved ? (() => {
              // شفافية القفل: يُعرض سبب تعطل الاعتماد بدقة لا برسالة عامة
              const unresolvedCount = review.findings.filter((finding) => !finding.resolved).length;
              const reasons: string[] = [];
              if (unresolvedCount) reasons.push(`${unresolvedCount} مخالفة غير معالجة — عالجها بالصياغة المقترحة أو عدّل النص ثم أعد التحليل`);
              if (!review.languageQuality.passed) reasons.push("جودة اللغة دون الحد المطلوب");
              if (["بالغ", "حرج", "مرتفع"].includes(review.riskLevel)) reasons.push(`مستوى المخاطر «${review.riskLevel}» يمنع الاعتماد`);
              return reasons.length ? (
                <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm leading-6 text-red-800">
                  <p className="font-semibold">يتعذّر اعتماد النسخة الحالية للأسباب التالية:</p>
                  <ul className="mt-1 list-disc space-y-1 pr-5">{reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                  <p className="mt-2 text-xs text-red-700/80">لن يؤدي الاعتماد إلى إخفاء ملاحظة حرجة أو تجاوزها.</p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-ink/65">النسخة جاهزة للاعتماد — لا حواجز متبقية.</p>
              );
            })() : null}
          </Panel>

          <Panel id="sharing" className="scroll-mt-24 lg:hidden">
            <SectionTitle title="8. المشاركة والتصدير" subtitle="احفظ النسخ ونزّلها وشاركها من مكان واحد." />
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={downloadWord} disabled={!approved} className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5 disabled:opacity-40"><FileDown size={16} />تقرير Word</button>
              <button type="button" onClick={prepareSharing} disabled={!approved} className="inline-flex items-center gap-2 rounded-md bg-palm px-4 py-2.5 text-white disabled:opacity-40"><Share2 size={16} />المشاركة</button>
            </div>
            {!approved ? <div className="mt-4 flex items-center gap-2 rounded-lg bg-gold/10 p-4 text-sm"><AlertTriangle size={17} className="text-gold" />يجب اعتماد المخرج قبل إتاحة المشاركة والتصدير.</div> : null}
            {shareMessage ? <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-7 text-red-700"><AlertTriangle size={17} className="mt-0.5 shrink-0" />{shareMessage}</div> : null}
          </Panel>
          </>

          <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-500" aria-hidden="true" />
            <p className="text-sm font-medium leading-7 text-amber-900">
              هذا المقترح استرشادي، تم إنشاؤه بناءً على البيانات المدخلة ونتائج المراجعة والمراجع المهنية المسجلة في المنصة. يظل قرار التعديل أو الاعتماد أو النشر مسؤولية المستخدم.
            </p>
          </div>
        </>
      ) : null}
        </div>
        {/* العمود الأيمن (الحاسب فقط lg+): مساعد قرار النشر — القرار + المؤشرات + الاعتماد + المشاركة.
            على الجوال/اللوحي يبقى هذا كله ظاهراً في العمود الرئيسي كما هو تماماً دون تغيير. */}
        {review ? (
          <aside className="hidden space-y-4 lg:block lg:pl-1">
            <Panel className={`border-t-4 shadow-md ${
              decisionTone(review) === "good"
                ? "border-t-green-400"
                : decisionTone(review) === "danger"
                  ? "border-t-red-400"
                  : "border-t-slate-300"
            }`}>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">قرار النشر</p>
              <div className="mt-2">
                <StatusBadge tone={decisionTone(review)}>{review.publicationDecision.label}</StatusBadge>
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
              <a
                href="#findings"
                className="mt-4 flex items-center justify-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm text-ink/70 transition hover:border-palm hover:text-palm focus-ring"
              >
                معالجة الملاحظات
              </a>
            </Panel>

            {/* المؤشرات المساندة — منقولة إلى الرَّيل على الحاسب: تحت «قرار النشر» وفوق «اعتماد النسخة».
                نفس البطاقات والقيم والتفاصيل المدخلة، بصيغة الملخّص الثابت بلا سهم طيّ. */}
            <div className="space-y-4">
              <SectionTitle
                title="المؤشرات المساندة للقرار"
                subtitle="توضح الرسوم مستوى كل جانب، بينما تبقى الملاحظات والأدلة والأثر والإجراء الموصى به هي أساس القرار."
              />
              <ComplianceIndicatorCard review={review} staticSummary />
              <RiskIndicatorCard review={review} staticSummary />
              <ProfessionalismIndicatorCard review={review} staticSummary />
              <LanguageIndicatorCard review={review} staticSummary />
              <ReadinessIndicatorCard review={review} staticSummary />
            </div>

            {/* اعتماد النسخة — في الرَّيل على الحاسب (نفس الزر والمنطق والأسباب) */}
            <Panel>
              <SectionTitle title="7. اعتماد النسخة" subtitle="لا تتاح المشاركة أو التصدير إلا للنسخة النهائية التي تمت مراجعتها واعتمادها." />
              <button type="button" onClick={approveCurrentVersion} disabled={approved || approving || review.findings.some((finding) => !finding.resolved) || !review.languageQuality.passed || ["بالغ", "حرج", "مرتفع"].includes(review.riskLevel)} className="inline-flex items-center gap-2 rounded-md bg-palm px-5 py-2.5 text-white disabled:cursor-not-allowed disabled:opacity-50"><Save size={16} />{approved ? "تم اعتماد النسخة" : approving ? "جار الاعتماد..." : "اعتماد النسخة الحالية"}</button>
              {approveMsg ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm leading-6 text-red-700">{approveMsg}</p> : null}
              {!approved ? (() => {
                const unresolvedCount = review.findings.filter((finding) => !finding.resolved).length;
                const reasons: string[] = [];
                if (unresolvedCount) reasons.push(`${unresolvedCount} مخالفة غير معالجة — عالجها بالصياغة المقترحة أو عدّل النص ثم أعد التحليل`);
                if (!review.languageQuality.passed) reasons.push("جودة اللغة دون الحد المطلوب");
                if (["بالغ", "حرج", "مرتفع"].includes(review.riskLevel)) reasons.push(`مستوى المخاطر «${review.riskLevel}» يمنع الاعتماد`);
                return reasons.length ? (
                  <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm leading-6 text-red-800">
                    <p className="font-semibold">يتعذّر اعتماد النسخة الحالية للأسباب التالية:</p>
                    <ul className="mt-1 list-disc space-y-1 pr-5">{reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>
                    <p className="mt-2 text-xs text-red-700/80">لن يؤدي الاعتماد إلى إخفاء ملاحظة حرجة أو تجاوزها.</p>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-ink/65">النسخة جاهزة للاعتماد — لا حواجز متبقية.</p>
                );
              })() : null}
            </Panel>

            {/* المشاركة والتصدير — في الرَّيل على الحاسب (نفس الأزرار والوظائف) */}
            <Panel>
              <SectionTitle title="8. المشاركة والتصدير" subtitle="احفظ النسخ ونزّلها وشاركها من مكان واحد." />
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={downloadWord} disabled={!approved} className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5 disabled:opacity-40"><FileDown size={16} />تقرير Word</button>
                <button type="button" onClick={prepareSharing} disabled={!approved} className="inline-flex items-center gap-2 rounded-md bg-palm px-4 py-2.5 text-white disabled:opacity-40"><Share2 size={16} />المشاركة</button>
              </div>
              {!approved ? <div className="mt-4 flex items-center gap-2 rounded-lg bg-gold/10 p-4 text-sm"><AlertTriangle size={17} className="text-gold" />يجب اعتماد المخرج قبل إتاحة المشاركة والتصدير.</div> : null}
              {shareMessage ? <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-7 text-red-700"><AlertTriangle size={17} className="mt-0.5 shrink-0" />{shareMessage}</div> : null}
            </Panel>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
