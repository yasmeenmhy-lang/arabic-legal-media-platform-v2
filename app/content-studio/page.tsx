"use client";

import { useState } from "react";
import {
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
  Video,
  XCircle,
} from "lucide-react";
import { PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
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
  type StoredContentRecord,
  type StoredContentVersion,
} from "@/lib/content-record-store";
import type { ContentKind, ReviewResult } from "@/lib/types";

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

function toneBorder(tone: "good" | "gold" | "danger" | "neutral") {
  if (tone === "good") return "border-t-green-400";
  if (tone === "gold") return "border-t-amber-400";
  if (tone === "danger") return "border-t-red-400";
  return "border-t-slate-300";
}

function scoreToTone(score: number): "good" | "gold" | "danger" {
  return score >= 80 ? "good" : score >= 60 ? "gold" : "danger";
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
  // Shared context
  const [kind, setKind] = useState<ContentKind | null>(null);
  const [channel, setChannel] = useState("");
  const [audience, setAudience] = useState("");
  const [purpose, setPurpose] = useState("");
  const [specialty, setSpecialty] = useState("");

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
    setReviewing(true);
    setReviewError("");
    setReview(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          kind: kind ?? undefined,
          contentType: kind ? contentKindLabels[kind] : undefined,
          channel: channel || undefined,
          audience: audience || undefined,
          purpose: purpose || undefined,
        }),
      });
      const payload = (await res.json()) as { data?: ReviewResult; error?: string };
      if (!res.ok || !payload.data) {
        setReviewError(payload.error ?? "فشل التحليل");
        return;
      }
      setReview(payload.data);
    } finally {
      setReviewing(false);
    }
  }

  // ── Save draft ──

  function saveDraft() {
    if (!activeText.trim()) return;
    try {
      createDraftRecord(activeText, { kind, channel, audience, purpose });
      flash("تم حفظ المسودة في سجل المحتوى");
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
                onClick={() => setKind(item.value as ContentKind)}
                className={`${chipBase} ${kind === item.value ? chipSelected : chipIdle}`}
              >
                {contentTypeIcons[item.value]}
                {item.label}
              </button>
            ))}
          </div>
        </div>

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
                <FileCheck2 size={22} />
              </span>
              <span className="text-lg font-semibold text-ink">مراجعة محتوى</span>
              <span className="text-sm leading-6 text-ink/60">
                أدخل نصاً جاهزاً وراجعه قانونياً عبر محرك التحليل.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setPath("create")}
              className="flex flex-col items-start gap-3 rounded-xl border-2 border-line bg-white p-6 text-right transition hover:border-palm hover:shadow-md focus-ring"
            >
              <span className="rounded-lg bg-mint p-2.5 text-palm">
                <Sparkles size={22} />
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
            placeholder="أدخل النص هنا..."
            className="min-h-44 w-full rounded-lg border border-line p-4 leading-8"
          />
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={runReview}
              disabled={reviewText.trim().length < 5}
              className="inline-flex items-center gap-2 rounded-md bg-palm px-5 py-2.5 text-white disabled:opacity-50"
            >
              <FileCheck2 size={17} />
              مراجعة المحتوى
            </button>
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
            className="inline-flex items-center gap-2 rounded-md bg-palm px-5 py-2.5 text-white disabled:opacity-50"
          >
            <Sparkles size={17} />
            إنشاء المحتوى
          </button>
          {generateError && <p className="mt-3 text-sm text-red-600">{generateError}</p>}
        </Panel>
      )}

      {/* Generating spinner */}
      {generating && (
        <Panel>
          <div className="flex flex-col items-center gap-4 py-8">
            <Bot size={32} className="animate-pulse text-palm" />
            <p className="text-sm text-ink/65">الذكاء الاصطناعي يُنشئ المحتوى...</p>
            <div className="h-2 w-48 overflow-hidden rounded-full bg-paper">
              <div className="h-full w-full rounded-full bg-gradient-to-r from-mint via-palm/40 to-mint bg-[length:200%] animate-[pulse_1.5s_ease-in-out_infinite]" />
            </div>
          </div>
        </Panel>
      )}

      {/* ── 4. Generated content preview ── */}
      {path === "create" && generatedText && !review && !reviewing && (
        <Panel>
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
            className="min-h-44 w-full rounded-lg border border-line p-4 leading-8"
          />
          <p className="mt-2 rounded-lg bg-paper p-3 text-xs leading-6 text-ink/55">
            النص المقترح لغرض التعليم والمساعدة فقط — تظل مسؤولية النشر والمشاركة على المستخدم.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={runReview}
              disabled={generatedText.trim().length < 5}
              className="inline-flex items-center gap-2 rounded-md bg-palm px-5 py-2.5 text-white disabled:opacity-50"
            >
              <FileCheck2 size={17} />
              راجع قانونياً
            </button>
            <button
              type="button"
              onClick={() => {
                setGeneratedText("");
                setTopic("");
              }}
              className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5 text-sm"
            >
              <Edit3 size={16} />
              عدّل الطلب
            </button>
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
          <DecisionCard review={review} />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ComplianceMini review={review} />
            <RiskMini review={review} />
            <ProfessionalismMini review={review} />
            <LanguageMini review={review} />
          </div>

          <QualityCard review={review} />

          <Panel>
            <p className="mb-4 text-sm font-semibold text-ink">ماذا تريد؟</p>
            <div className="flex flex-wrap gap-3">
              <a
                href="/social-media"
                className="inline-flex items-center gap-2 rounded-md bg-palm px-4 py-2.5 text-sm text-white"
              >
                📤 نشر مباشرة
              </a>
              <a
                href="/calendar"
                className="inline-flex items-center gap-2 rounded-md border border-palm px-4 py-2.5 text-sm text-palm"
              >
                📅 جدولة
              </a>
              <button
                type="button"
                onClick={saveDraft}
                className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5 text-sm"
              >
                <Save size={16} />
                حفظ مسودة
              </button>
              <button
                type="button"
                onClick={() => setReview(null)}
                className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5 text-sm"
              >
                <Edit3 size={16} />
                تعديل
              </button>
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

// ── Result sub-components ──────────────────────────────────────────────────

function DecisionCard({ review }: { review: ReviewResult }) {
  const dec = review.publicationDecision;
  const ready = dec.recommended;
  return (
    <Panel
      className={`border-t-4 shadow-md ${ready ? "border-t-green-400" : "border-t-red-400"}`}
    >
      <div className="flex items-start gap-4">
        <span
          className={`shrink-0 rounded-xl p-3 ${
            ready ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
          }`}
        >
          {ready ? <CheckCircle2 size={28} /> : <XCircle size={28} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
            قرار النشر
          </p>
          <p
            className={`text-xl font-bold ${ready ? "text-green-700" : "text-red-700"}`}
          >
            {dec.label}
          </p>
          <p className="mt-1.5 text-sm leading-6 text-ink/70">{dec.reason}</p>
          {dec.blockers.length > 0 && (
            <ul className="mt-3 space-y-1">
              {dec.blockers.map((b, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                  <span className="mt-0.5 shrink-0 text-red-400">•</span>
                  {b}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Panel>
  );
}

function ComplianceMini({ review }: { review: ReviewResult }) {
  const ok = review.findings.length === 0;
  return (
    <Panel className={`border-t-4 shadow-md ${toneBorder(ok ? "good" : "danger")}`}>
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">الامتثال</p>
      <StatusBadge tone={ok ? "good" : "danger"}>{ok ? "ملتزم" : "غير ملتزم"}</StatusBadge>
      {!ok && (
        <p className="mt-2 text-xs text-ink/60">
          {review.findings.length}{" "}
          {review.findings.length === 1 ? "مخالفة" : "مخالفات"}
        </p>
      )}
    </Panel>
  );
}

function RiskMini({ review }: { review: ReviewResult }) {
  const tone =
    review.riskLevel === "منخفض"
      ? ("good" as const)
      : review.riskLevel === "متوسط"
        ? ("gold" as const)
        : ("danger" as const);
  return (
    <Panel className={`border-t-4 shadow-md ${toneBorder(tone)}`}>
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">المخاطر</p>
      <StatusBadge tone={tone}>{review.riskLevel}</StatusBadge>
      <p className="mt-2 text-sm font-semibold text-ink">
        {review.riskScore}
        <span className="text-xs font-normal text-ink/50"> / 100</span>
      </p>
    </Panel>
  );
}

function ProfessionalismMini({ review }: { review: ReviewResult }) {
  const score = review.professionalismScore;
  return (
    <Panel className={`border-t-4 shadow-md ${toneBorder(scoreToTone(score))}`}>
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">الكتابة المهنية</p>
      <p className="text-2xl font-bold text-ink">
        {score}
        <span className="text-sm font-normal text-ink/50"> / 100</span>
      </p>
    </Panel>
  );
}

function LanguageMini({ review }: { review: ReviewResult }) {
  const score = review.languageQuality.score;
  return (
    <Panel className={`border-t-4 shadow-md ${toneBorder(scoreToTone(score))}`}>
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">اللغة</p>
      <p className="text-2xl font-bold text-ink">
        {score}
        <span className="text-sm font-normal text-ink/50"> / 100</span>
      </p>
    </Panel>
  );
}

function QualityCard({ review }: { review: ReviewResult }) {
  const exp = review.contentQualityScoreExplanation;
  const hasViolations = review.findings.length > 0;
  const tone =
    exp.redLine || hasViolations ? ("danger" as const) : scoreToTone(review.contentQualityScore);
  const label =
    exp.redLine || hasViolations
      ? "خط أحمر مُفعَّل"
      : review.contentQualityScore >= 80
        ? "متوازن"
        : "يحتاج تحسين";
  return (
    <Panel className={`border-t-4 shadow-md ${toneBorder(tone)}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
            جودة المحتوى
          </p>
          <p className="text-3xl font-bold text-ink">
            {review.contentQualityScore}
            <span className="text-base font-normal text-ink/50"> / 100</span>
          </p>
        </div>
        <StatusBadge tone={tone}>{label}</StatusBadge>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {exp.factors.map((factor) => {
          const isCompliance = factor.key === "compliance";
          const ok = isCompliance ? review.findings.length === 0 : factor.sourceScore >= 70;
          return (
            <div
              key={factor.key}
              className="flex items-center justify-between gap-2 rounded-lg bg-paper px-3 py-2"
            >
              <span className="text-sm text-ink/70">{factor.label}</span>
              {isCompliance ? (
                <span
                  className={`rounded px-2 py-0.5 text-xs font-bold ${
                    ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}
                >
                  {ok ? "ملتزم" : "غير ملتزم"}
                </span>
              ) : (
                <span className="text-sm font-semibold text-ink">{factor.sourceScore}</span>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
