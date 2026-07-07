"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BarChart2,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  Edit3,
  ExternalLink,
  FileDown,
  FileText,
  Globe,
  Image as ImageIcon,
  Layers,
  Megaphone,
  MessageSquare,
  Save,
  Scale,
  Share2,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  User,
  Users,
  Video,
  XCircle
} from "lucide-react";
import { Button, DgaSpinner, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
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
import {
  approveContentVersion,
  clearActiveContentSelection,
  getActiveContentSelection,
  loadContentRecords,
  markContentShared,
  saveContentDraft,
  upsertAnalyzedVersion
} from "@/lib/content-record-store";
import { saveLatestReviewSnapshot } from "@/components/review-context-summary";
import { riskDisplayLabel, type ContentKind, type ReviewResult, type RiskLevel } from "@/lib/types";
import { FindingsList } from "@/components/content-review/FindingCard";
import {
  ComplianceIndicatorCard,
  ContentQualityIndicatorCard,
  LanguageIndicatorCard,
  ProfessionalismIndicatorCard,
  ReadinessIndicatorCard,
  RiskIndicatorCard
} from "@/components/content-review/IndicatorCards";
import { InlineContentGuidance } from "@/components/content-review/InlineGuidance";

const contentTypes = contentKindOptions.filter((item) =>
  (["post", "advertisement", "campaign", "article", "script", "caption", "visual_content", "infographic", "publishing_plan"] as ContentKind[]).includes(item.value)
);
const channels = ["LinkedIn", "X", "Instagram", "TikTok", "Snapchat", "YouTube", "الموقع الإلكتروني"];
const audiences = ["عملاء محتملون من الأفراد", "منشآت ورواد أعمال", "زملاء وقطاع قانوني", "الجمهور العام"];
const purposes = ["تثقيف الجمهور حول موضوع قانوني", "رفع الوعي بالخدمات المهنية", "تعزيز الحضور المهني والثقة", "حملة توعوية"];

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
  "زملاء وقطاع قانوني": <Scale size={13} />,
  "الجمهور العام": <Users size={13} />
};

const purposeIcons: Record<string, React.ReactNode> = {
  "تثقيف الجمهور حول موضوع قانوني": <BookOpen size={13} />,
  "رفع الوعي بالخدمات المهنية": <TrendingUp size={13} />,
  "تعزيز الحضور المهني والثقة": <Award size={13} />,
  "حملة توعوية": <Megaphone size={13} />
};

const chipBase = "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition focus-ring";
const chipIdle = "border-line bg-white text-ink/65 hover:border-palm hover:bg-mint hover:text-palm";
const chipSelected = "border-palm bg-mint text-palm shadow-[0_0_0_1px_theme(colors.palm)]";

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
  if (review.analysisMode === "pattern-only") return "neutral" as const;
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
  const [kind, setKind] = useState<ContentKind | "">("");
  const [channel, setChannel] = useState("");
  const [audience, setAudience] = useState("");
  const [purpose, setPurpose] = useState("");
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [contentId, setContentId] = useState<string>();
  const [versionNumber, setVersionNumber] = useState<number>();
  const [approved, setApproved] = useState(false);
  const [approving, setApproving] = useState(false);
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

  useEffect(() => {
    const selection = getActiveContentSelection();
    if (!selection) return;
    const record = loadContentRecords().find((item) => item.id === selection.contentId);
    const version = record?.versions.find((item) => item.version === selection.version);
    if (!record || !version) return;
    setContentId(record.id);
    setVersionNumber(version.version);
    setText(version.body);
    setKind(version.contentType);
    setChannel(version.channel);
    setAudience(version.audience);
    setPurpose(version.purpose);
    setReview(version.analysis ?? null);
    setApproved(Boolean(version.approvedAt));
    if (!version.analysis) {
      setMessage("تم فتح محتوى محفوظ من إصدار سابق. أعد تحليل المحتوى لعرض قرار النشر والنتائج بصيغتها الحالية.");
    }
  }, []);

  const hasReviewContext = Boolean(kind && channel && audience && purpose);
  const contextScore = [kind, channel, audience, purpose].filter(Boolean).length;
  const contentTypeLabel = kind ? contentTypes.find((item) => item.value === kind)?.label ?? "محتوى مهني" : "";
  const sortedFindings = useMemo(
    () => [...(review?.findings ?? [])].sort((a, b) => severityOrder[a.businessSeverity ?? "low"] - severityOrder[b.businessSeverity ?? "low"]),
    [review]
  );

  async function requestReview(reviewStatus?: "READY_FOR_PUBLISHING") {
    if (!kind || !channel || !audience || !purpose) {
      throw new Error("اختر نوع المحتوى والقناة والجمهور والهدف قبل التحليل حتى ترتبط النتائج بالسياق الصحيح.");
    }
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, kind, contentType: contentTypeLabel, channel, audience, purpose, reviewStatus })
    });
    if (!response.ok) {
      const payload = await response.json().catch(() => ({})) as { error?: string };
      throw new Error(payload.error ?? "تعذر إكمال المراجعة.");
    }
    return (await response.json()).data as ReviewResult;
  }

  async function runReview() {
    if (!kind || !channel || !audience || !purpose) {
      setMessage("اختر نوع المحتوى والقناة والجمهور والهدف قبل التحليل حتى ترتبط النتائج بالسياق الصحيح.");
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
        body: text,
        contentType: kind,
        contentTypeLabel,
        channel,
        audience,
        purpose,
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
    if (!rewrite || !kind || !channel || !audience || !purpose) return;
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
        body: rewriteText,
        contentType: kind,
        contentTypeLabel,
        channel,
        audience,
        purpose,
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
    if (!contentId || text.trim().length < 5 || !kind || !channel || !audience || !purpose) {
      setMessage("تعذر الحفظ: أدخل نصًا من خمسة أحرف على الأقل واختر نوع المحتوى والقناة والجمهور والهدف.");
      return;
    }
    const saved = saveContentDraft({
      contentId,
      body: text,
      contentType: kind,
      contentTypeLabel,
      channel,
      audience,
      purpose
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
    if (!contentId || !versionNumber || !review || approving) return;
    setApproving(true);
    setMessage("");
    try {
      const saved = approveContentVersion(contentId, versionNumber);
      if (!saved) {
        setMessage("تعذر الاعتماد: عالج الملاحظات والحواجز الظاهرة أولاً.");
        return;
      }
      const approvedReview = await requestReview("READY_FOR_PUBLISHING");
      saved.version.analysis = approvedReview;
      setReview(approvedReview);
      saveLatestReviewSnapshot(approvedReview);
      setApproved(true);
      setMessage("تم اعتماد الإصدار النهائي. أصبحت خيارات المشاركة والتصدير متاحة.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر إكمال الاعتماد.");
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
    if (!approved || !contentId || !versionNumber) return;
    const shared = markContentShared(contentId, versionNumber);
    if (!shared) return;
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
        throw new Error(payload?.error ?? "تعذر إنشاء الصياغة المقترحة — تحقق من إعدادات الخدمة.");
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
    if (!aiSuggestion || !kind || !channel || !audience || !purpose) return;
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

      <Panel id="input">
        <SectionTitle title="1. إدخال المحتوى والسياق" subtitle="كلما اكتمل السياق ارتفعت موثوقية التوصية." />

        {/* شريط اكتمال السياق */}
        <div className="mb-5">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-ink/55">اكتمال السياق</span>
            <span className="font-semibold text-palm">{contextScore} من 4</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-paper">
            <div className="h-full rounded-full bg-palm opacity-80" style={{ width: `${contextScore * 25}%` }} />
          </div>
        </div>

        {/* نوع المحتوى */}
        <div className={`mb-4 ${Boolean(review) && !isEditing ? "pointer-events-none opacity-60" : ""}`}>
          <p className="mb-2 text-sm text-ink/65">نوع المحتوى</p>
          <div className="flex flex-wrap gap-2">
            {contentTypes.map((item) => (
              <button key={item.value} type="button" onClick={() => setKind(item.value as ContentKind)} className={`${chipBase} ${kind === item.value ? chipSelected : chipIdle}`}>
                {contentTypeIcons[item.value]}{item.label}
              </button>
            ))}
          </div>
        </div>

        {/* القناة */}
        <div className={`mb-4 ${Boolean(review) && !isEditing ? "pointer-events-none opacity-60" : ""}`}>
          <p className="mb-2 text-sm text-ink/65">القناة</p>
          <div className="flex flex-wrap gap-2">
            {channels.map((item) => (
              <button key={item} type="button" onClick={() => setChannel(item)} className={`${chipBase} ${channel === item ? chipSelected : chipIdle}`}>
                {channelIcons[item]}{item}
              </button>
            ))}
          </div>
        </div>

        {/* الجمهور */}
        <div className={`mb-4 ${Boolean(review) && !isEditing ? "pointer-events-none opacity-60" : ""}`}>
          <p className="mb-2 text-sm text-ink/65">الجمهور</p>
          <div className="flex flex-wrap gap-2">
            {audiences.map((item) => (
              <button key={item} type="button" onClick={() => setAudience(item)} className={`${chipBase} ${audience === item ? chipSelected : chipIdle}`}>
                {audienceIcons[item]}{item}
              </button>
            ))}
          </div>
        </div>

        {/* الهدف */}
        <div className={`mb-4 ${Boolean(review) && !isEditing ? "pointer-events-none opacity-60" : ""}`}>
          <p className="mb-2 text-sm text-ink/65">الهدف</p>
          <div className="flex flex-wrap gap-2">
            {purposes.map((item) => (
              <button key={item} type="button" onClick={() => setPurpose(item)} className={`${chipBase} ${purpose === item ? chipSelected : chipIdle}`}>
                {purposeIcons[item]}{item}
              </button>
            ))}
          </div>
        </div>
        {!hasReviewContext ? (
          <p className="mt-2 text-xs leading-6 text-ink/60">اختر نوع المحتوى والقناة والجمهور والهدف حتى يكون التحليل مرتبطًا بالسياق الصحيح.</p>
        ) : null}
        <label className="mt-4 block text-sm">
          <span className="flex flex-wrap items-center justify-between gap-2">
            <span>النص محل المراجعة</span>
            <Button size="sm" variant="secondary-gray" onClick={clearContentInput} disabled={loading || text.length === 0} leadingIcon={<XCircle size={14} aria-hidden="true" />}>مسح المحتوى</Button>
          </span>
          <textarea value={text} disabled={Boolean(review) && !isEditing} onChange={(event) => setText(event.target.value)} className="mt-2 min-h-44 w-full rounded-lg border border-line p-4 leading-8 disabled:bg-paper disabled:text-ink/65" />
        </label>
        <div className="mt-3">
          <InlineContentGuidance review={review} draftText={text} onApplyRewrite={applyRewrite} loading={loading} />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {!review || isEditing ? <Button size="lg" onClick={runReview} disabled={loading || text.trim().length < 5 || !hasReviewContext} leadingIcon={loading ? <DgaSpinner size="sm" tone="violet" /> : <FileText size={17} />}>{loading ? "جار التحليل..." : contentId ? "إعادة التحليل" : "تحليل المحتوى"}</Button> : null}
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
            className={`border-t-4 shadow-md ${
              review.analysisMode === "pattern-only"
                ? "border-t-slate-300 bg-white"
                : review.publicationDecision.outcome === "RECOMMENDED"
                  ? "border-t-green-400 bg-green-50/40"
                  : review.publicationDecision.outcome === "NOT_RECOMMENDED" || review.publicationDecision.outcome === "LEGAL_REVIEW_REQUIRED"
                    ? "border-t-red-400 bg-red-50/40"
                    : "border-t-amber-400 bg-amber-50/40"
            }`}
          >
            {review.analysisMode === "pattern-only" ? (
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
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">2. قرار النشر</p>
                    <h2 className="mt-2 text-xl font-bold">{review.publicationDecision.label}</h2>
                    <p className="mt-3 max-w-4xl leading-8 text-ink/75">{review.publicationDecision.reason}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <StatusBadge tone={decisionTone(review)}>{review.publicationDecision.label}</StatusBadge>
                  </div>
                </div>
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <div className="rounded-lg bg-white/70 p-4 ring-1 ring-line"><p className="text-xs text-ink/55">لماذا هذه التوصية؟</p><p className="mt-2 leading-8">{review.confidence.reason}</p></div>
                  <div className="rounded-lg bg-white/70 p-4 ring-1 ring-line"><p className="text-xs text-ink/55">ما المطلوب قبل النشر؟</p><ul className="mt-2 list-disc space-y-2 pr-5 leading-7">{review.readinessDecision.blockers.length ? review.readinessDecision.blockers.map((item) => <li key={item}>{item}</li>) : <li>لا توجد متطلبات مانعة متبقية.</li>}</ul></div>
                </div>
              </>
            )}
          </Panel>

          <section id="analysis-summary" aria-labelledby="supporting-indicators-title" className="space-y-4 scroll-mt-24">
            <SectionTitle
              title="المؤشرات المساندة للقرار"
              subtitle="توضح الرسوم مستوى كل جانب، بينما تبقى الملاحظات والأدلة والأثر والإجراء الموصى به هي أساس القرار."
            />
            <div className="grid gap-4 xl:grid-cols-2">
              <ComplianceIndicatorCard review={review} />
              <RiskIndicatorCard review={review} />
              <ProfessionalismIndicatorCard review={review} />
              <LanguageIndicatorCard review={review} />
              <ContentQualityIndicatorCard review={review} />
              <ReadinessIndicatorCard review={review} />
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

          <Panel id="approval" className="scroll-mt-24">
            <SectionTitle title="7. اعتماد النسخة" subtitle="لا تتاح المشاركة أو التصدير إلا للنسخة النهائية التي تمت مراجعتها واعتمادها." />
            <button type="button" onClick={approveCurrentVersion} disabled={approved || approving || review.findings.some((finding) => !finding.resolved) || !review.languageQuality.passed || ["بالغ", "حرج", "مرتفع"].includes(review.riskLevel)} className="inline-flex items-center gap-2 rounded-md bg-palm px-5 py-2.5 text-white disabled:cursor-not-allowed disabled:opacity-50"><Save size={16} />{approved ? "تم اعتماد النسخة" : approving ? "جار الاعتماد..." : "اعتماد النسخة الحالية"}</button>
            {!approved ? <p className="mt-3 text-sm text-ink/65">عالج الحواجز الظاهرة أولاً. لن يؤدي الاعتماد إلى إخفاء ملاحظة حرجة أو تجاوزها.</p> : null}
          </Panel>

          <Panel id="sharing" className="scroll-mt-24">
            <SectionTitle title="8. المشاركة والتصدير" subtitle="وحدة واحدة تحفظ النسخ والتنزيل والتقارير والمشاركة دون ادعاء نشر تلقائي." />
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={downloadWord} disabled={!approved} className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5 disabled:opacity-40"><FileDown size={16} />تقرير Word</button>
              <button type="button" onClick={prepareSharing} disabled={!approved} className="inline-flex items-center gap-2 rounded-md bg-palm px-4 py-2.5 text-white disabled:opacity-40"><Share2 size={16} />المشاركة</button>
            </div>
            {!approved ? <div className="mt-4 flex items-center gap-2 rounded-lg bg-gold/10 p-4 text-sm"><AlertTriangle size={17} className="text-gold" />يجب اعتماد المخرج قبل إتاحة المشاركة والتصدير.</div> : null}
          </Panel>
          </>

          <p className="rounded-lg border border-line bg-white p-4 text-xs leading-7 text-ink/60">
            هذا المقترح استرشادي، تم إنشاؤه بناءً على البيانات المدخلة ونتائج المراجعة والمراجع المهنية المسجلة في المنصة. يظل قرار التعديل أو الاعتماد أو النشر مسؤولية المستخدم.
          </p>
        </>
      ) : null}
    </div>
  );
}
