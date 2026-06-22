"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Award,
  BarChart2,
  BookOpen,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clipboard,
  Download,
  Edit3,
  FileDown,
  FileText,
  Globe,
  Image,
  Layers,
  Megaphone,
  MessageSquare,
  Printer,
  Save,
  Scale,
  Share2,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  User,
  Users,
  Video
} from "lucide-react";
import {
  LinkedInIcon,
  XIcon,
  InstagramIcon,
  TikTokIcon,
  SnapchatIcon,
  YouTubeIcon
} from "@/components/social-icons";
import { PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import { socialBrandIcons } from "@/components/social-icons";
import { contentKindOptions } from "@/lib/content-types";
import {
  approveContentVersion,
  getActiveContentSelection,
  loadContentRecords,
  markContentShared,
  upsertAnalyzedVersion
} from "@/lib/content-record-store";
import { saveLatestReviewSnapshot } from "@/components/review-context-summary";
import type { ContentKind, ReviewFinding, ReviewResult, RiskLevel } from "@/lib/types";

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
  visual_content: <Image size={13} />,
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

const severityLabel = { critical: "حرجة", high: "عالية", medium: "متوسطة", low: "منخفضة" } as const;
const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 } as const;

function riskTone(risk: RiskLevel) {
  if (risk === "حرج" || risk === "مرتفع") return "gold" as const;
  if (risk === "متوسط") return "neutral" as const;
  return "good" as const;
}

function decisionTone(review: ReviewResult) {
  return review.publicationDecision.outcome === "RECOMMENDED"
    ? "good" as const
    : review.publicationDecision.outcome === "RECOMMENDED_AFTER_FINDINGS"
      ? "neutral" as const
      : "gold" as const;
}

function businessScoreExplanation(kind: "compliance" | "risk" | "language", review: ReviewResult) {
  if (kind === "compliance") {
    return {
      label: "الامتثال",
      value: `${review.complianceScore}%`,
      explanation: review.findings.length
        ? `تأثر المستوى بسبب ${review.findings.length} ملاحظة غير معالجة مرتبطة بمراجع مهنية أو رسمية.`
        : "لم ترصد ملاحظات مخالفة مرتبطة بالمراجع المسجلة.",
      evidence: review.findings[0]?.evidence ?? "صياغة مهنية غير قطعية.",
      action: review.findings[0]?.suggestedSaferWording ?? "حافظ على الصياغة الحالية وراجع النسخة النهائية."
    };
  }
  if (kind === "risk") {
    return {
      label: "المخاطر",
      value: review.riskLevel,
      explanation: review.legalRiskAssessment.reason,
      evidence: review.findings[0]?.evidence ?? "لا توجد عبارة عالية المخاطر مرصودة.",
      action: review.findings[0]?.suggestedSaferWording ?? "استمر في تجنب الوعود والادعاءات غير المدعومة."
    };
  }
  return {
    label: "جودة اللغة",
    value: `${review.languageQuality.score}%`,
    explanation: review.languageQuality.issues.length
      ? `توجد ${review.languageQuality.issues.length} فرصة لتحسين الوضوح والصياغة المهنية.`
      : "الصياغة واضحة ومناسبة للمراجعة المهنية.",
    evidence: review.languageQuality.issues[0]?.excerpt || "النص الحالي",
    action: review.languageQuality.issues[0]?.suggestion || "لا يلزم تعديل لغوي جوهري."
  };
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

function FindingCard({ finding, index }: { finding: ReviewFinding; index: number }) {
  const severity = finding.businessSeverity ?? "low";
  return (
    <article className={`rounded-xl border bg-white p-5 shadow-sm ${severity === "critical" ? "border-red-300 ring-2 ring-red-100" : "border-line"}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs text-ink/50">الأولوية {index + 1}</p>
          <h3 className="mt-1 text-lg font-semibold leading-8">{finding.title}</h3>
        </div>
        <StatusBadge tone={severity === "critical" || severity === "high" ? "gold" : severity === "medium" ? "neutral" : "good"}>
          {severityLabel[severity]}
        </StatusBadge>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg bg-paper p-4">
          <p className="text-xs text-ink/55">ما الخطأ؟</p>
          <p className="mt-2 leading-8">{finding.issue}</p>
        </div>
        <div className="rounded-lg bg-paper p-4">
          <p className="text-xs text-ink/55">الدليل من المحتوى</p>
          <p className="mt-2 leading-8 font-medium">“{finding.evidence}”</p>
        </div>
        <div className="rounded-lg bg-paper p-4">
          <p className="text-xs text-ink/55">لماذا يمثل مشكلة؟</p>
          <p className="mt-2 leading-8">{finding.legalExplanation}</p>
        </div>
        <div className="rounded-lg bg-paper p-4">
          <p className="text-xs text-ink/55">المرجع المتأثر</p>
          <p className="mt-2 leading-7">{finding.sourceDocument} — {finding.legalReference}</p>
          <a href={finding.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm text-palm underline">
            فتح المرجع الرسمي
          </a>
        </div>
        <div className="rounded-lg bg-paper p-4">
          <p className="text-xs text-ink/55">الأثر والمخاطر</p>
          <p className="mt-2 leading-8">قد ينشئ أثراً {finding.potentialImpact} ضمن {finding.riskDimensions?.map((item) => ({
            legal: "المخاطر القانونية",
            reputational: "مخاطر السمعة",
            confidentiality: "مخاطر السرية",
            misleadingCommunication: "مخاطر التواصل المضلل"
          }[item])).join("، ")}.</p>
        </div>
        <div className="rounded-lg border border-palm/20 bg-mint/50 p-4">
          <p className="text-xs text-palm">الإجراء الموصى به</p>
          <p className="mt-2 leading-8">{finding.suggestedSaferWording}</p>
        </div>
      </div>
    </article>
  );
}

export default function ContentReviewPage() {
  const [text, setText] = useState("");
  const [kind, setKind] = useState<ContentKind>("advertisement");
  const [channel, setChannel] = useState("LinkedIn");
  const [audience, setAudience] = useState(audiences[0]);
  const [purpose, setPurpose] = useState(purposes[0]);
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [contentId, setContentId] = useState<string>();
  const [versionNumber, setVersionNumber] = useState<number>();
  const [approved, setApproved] = useState(false);

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

  const contentTypeLabel = contentTypes.find((item) => item.value === kind)?.label ?? "محتوى مهني";
  const sortedFindings = useMemo(
    () => [...(review?.findings ?? [])].sort((a, b) => severityOrder[a.businessSeverity ?? "low"] - severityOrder[b.businessSeverity ?? "low"]),
    [review]
  );

  async function requestReview(reviewStatus?: "READY_FOR_PUBLISHING") {
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, kind, contentType: contentTypeLabel, channel, audience, purpose, reviewStatus })
    });
    if (!response.ok) throw new Error("تعذر إكمال المراجعة.");
    return (await response.json()).data as ReviewResult;
  }

  async function runReview() {
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
      setMessage("اكتمل التحليل. ابدأ بقرار النشر ثم عالج الملاحظات حسب الأولوية.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر إكمال المراجعة.");
    } finally {
      setLoading(false);
    }
  }

  async function applyRewrite() {
    const rewrite = review?.governedRewrites[0];
    if (!rewrite) return;
    setText(rewrite.suggestedText);
    setMessage("تم تطبيق الصياغة المقترحة. جار إعادة التقييم للتحقق من النتيجة الفعلية.");
    setLoading(true);
    try {
      const result = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rewrite.suggestedText, kind, contentType: contentTypeLabel, channel, audience, purpose })
      }).then((response) => response.json()).then((payload) => payload.data as ReviewResult);
      setReview(result);
      saveLatestReviewSnapshot(result);
      const saved = upsertAnalyzedVersion({
        contentId,
        body: rewrite.suggestedText,
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

  async function approveCurrentVersion() {
    if (!contentId || !versionNumber || !review) return;
    const saved = approveContentVersion(contentId, versionNumber);
    if (!saved) return;
    const approvedReview = await requestReview("READY_FOR_PUBLISHING");
    saved.version.analysis = approvedReview;
    setReview(approvedReview);
    saveLatestReviewSnapshot(approvedReview);
    setApproved(true);
    setMessage("تم اعتماد الإصدار النهائي. أصبحت خيارات المشاركة والتصدير متاحة.");
  }

  const report = review ? {
    "قرار النشر": review.publicationDecision.label,
    "سبب القرار": review.publicationDecision.reason,
    "مستوى الثقة": review.confidence.label,
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
    markContentShared(contentId, versionNumber);
    setMessage("تم تجهيز النسخة المعتمدة للمشاركة وتسجيل الإجراء.");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="مساعد قرار النشر للمحامي"
        title="مراجعة المحتوى واتخاذ قرار النشر"
        description="ابدأ بما يحتاج إلى قرار: الملاحظات، الأدلة، الأثر، والإجراء الموصى به. الدرجات مؤشرات مساندة وليست النتيجة الأساسية."
      />

      <Panel id="input">
        <SectionTitle title="1. إدخال المحتوى والسياق" subtitle="كلما اكتمل السياق ارتفعت موثوقية التوصية." />

        {/* شريط اكتمال السياق */}
        <div className="mb-5">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-ink/55">اكتمال السياق</span>
            <span className="font-semibold text-palm">4 من 4</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-paper">
            <div className="h-full rounded-full bg-palm opacity-80" style={{ width: "100%" }} />
          </div>
        </div>

        {/* نوع المحتوى */}
        <div className="mb-4">
          <p className="mb-2 text-sm text-ink/65">نوع المحتوى</p>
          <div className="flex flex-wrap gap-2">
            {contentTypes.map((item) => (
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

        {/* القناة */}
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

        {/* الجمهور */}
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

        {/* الهدف */}
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
        <label className="mt-4 block text-sm">النص محل المراجعة<textarea value={text} onChange={(event) => setText(event.target.value)} className="mt-2 min-h-44 w-full rounded-lg border border-line p-4 leading-8" /></label>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={runReview} disabled={loading || text.trim().length < 5} className="inline-flex items-center gap-2 rounded-md bg-palm px-5 py-2.5 text-white disabled:opacity-50"><FileText size={17} />{loading ? "جار التحليل..." : "تحليل المحتوى"}</button>
          {review ? <button type="button" onClick={() => document.getElementById("input")?.scrollIntoView({ behavior: "smooth" })} className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5"><Edit3 size={16} />تعديل المدخلات</button> : null}
        </div>
        {message ? <p className="mt-3 text-sm text-palm">{message}</p> : null}
      </Panel>

      {review ? (
        <>
          <Panel id="decision" className="border-2 border-palm/20">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs text-palm">2. قرار النشر</p>
                <h2 className="mt-2 text-2xl font-bold">{review.publicationDecision.label}</h2>
                <p className="mt-3 max-w-4xl leading-8 text-ink/75">{review.publicationDecision.reason}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone={decisionTone(review)}>{review.publicationDecision.label}</StatusBadge>
                <StatusBadge tone={review.confidence.level === "High" ? "good" : review.confidence.level === "Medium" ? "neutral" : "gold"}>الثقة {review.confidence.label}</StatusBadge>
              </div>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg bg-paper p-4"><p className="text-xs text-ink/55">لماذا هذه التوصية؟</p><p className="mt-2 leading-8">{review.confidence.reason}</p></div>
              <div className="rounded-lg bg-paper p-4"><p className="text-xs text-ink/55">ما المطلوب قبل النشر؟</p><ul className="mt-2 list-disc space-y-2 pr-5 leading-7">{review.readinessDecision.blockers.length ? review.readinessDecision.blockers.map((item) => <li key={item}>{item}</li>) : <li>لا توجد متطلبات مانعة متبقية.</li>}</ul></div>
            </div>
          </Panel>

          {sortedFindings.some((item) => item.businessSeverity === "critical") ? (
            <div className="rounded-xl border-2 border-red-300 bg-red-50 p-5">
              <div className="flex items-center gap-2 text-red-800"><ShieldAlert size={22} /><h2 className="text-lg font-bold">ملاحظات حرجة تتطلب إجراءً فورياً</h2></div>
              <p className="mt-2 leading-7 text-red-800/80">هذه الملاحظات ظاهرة دائماً لأنها تمنع التوصية بالنشر حتى معالجتها وإعادة التقييم.</p>
            </div>
          ) : null}

          <section id="findings" className="space-y-4">
            <SectionTitle title="3. الملاحظات حسب الأولوية" subtitle="الملاحظات الحرجة أولاً، ثم العالية والمتوسطة والمنخفضة. لا يعتمد العرض على ترتيب الاكتشاف." />
            {sortedFindings.length ? sortedFindings.map((finding, index) => <FindingCard key={`${finding.title}-${finding.evidence}`} finding={finding} index={index} />) : (
              <Panel><div className="flex items-start gap-3"><CheckCircle2 className="mt-1 text-palm" /><div><h3 className="font-semibold">لم ترصد مخالفة مهنية مرتبطة بالمراجع المسجلة</h3><p className="mt-2 leading-7 text-ink/70">راجع متطلبات الاعتماد وجودة اللغة قبل تجهيز النشر.</p></div></div></Panel>
            )}
          </section>

          <div className="grid gap-5 xl:grid-cols-3">
            {(["compliance", "risk", "language"] as const).map((kindName) => {
              const metric = businessScoreExplanation(kindName, review);
              return (
                <Panel key={kindName}>
                  <p className="text-xs text-ink/55">مؤشر مساند</p>
                  <div className="mt-2 flex items-center justify-between gap-3"><h3 className="text-lg font-semibold">{metric.label}</h3><StatusBadge tone={kindName === "risk" ? riskTone(review.riskLevel) : "neutral"}>{metric.value}</StatusBadge></div>
                  <p className="mt-4 leading-7">{metric.explanation}</p>
                  <div className="mt-3 rounded-md bg-paper p-3 text-sm"><b>الدليل:</b> {metric.evidence}</div>
                  <div className="mt-3 rounded-md bg-mint/50 p-3 text-sm"><b>الإجراء:</b> {metric.action}</div>
                </Panel>
              );
            })}
          </div>

          <Panel id="rewrite">
            <SectionTitle title="4. الصياغة المقترحة وأثر التحسين" subtitle="الأثر المتوقع توجيهي، وتُعاد المراجعة فعلياً بعد تطبيق الصياغة." />
            {review.governedRewrites.length ? review.governedRewrites.map((rewrite) => (
              <div key={rewrite.id} className="rounded-xl border border-line p-5">
                <p className="leading-8">{rewrite.suggestedText}</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg bg-paper p-4"><p className="text-xs text-ink/55">قبل التوصية</p><p className="mt-2">الامتثال {rewrite.originalComplianceScore}% — المخاطر {rewrite.originalRiskLevel}</p></div>
                  <div className="rounded-lg bg-mint p-4"><p className="text-xs text-palm">الأثر المتوقع بعد التطبيق</p><p className="mt-2">الامتثال المتوقع {rewrite.proposedComplianceScore}% — المخاطر المتوقعة {rewrite.proposedRiskLevel}</p></div>
                </div>
                <button type="button" onClick={applyRewrite} disabled={loading} className="mt-4 inline-flex items-center gap-2 rounded-md bg-palm px-4 py-2.5 text-white"><Sparkles size={16} />تطبيق الصياغة وإعادة التقييم</button>
              </div>
            )) : <p className="rounded-lg bg-paper p-4 leading-7">لا توجد صياغة بديلة مطلوبة بعد التقييم الحالي.</p>}
          </Panel>

          <Panel id="channels">
            <SectionTitle title="5. القنوات المقترحة" subtitle="كل توصية مبنية على نوع المحتوى والجمهور والهدف ونتائج المراجعة." />
            <div className="grid gap-4 lg:grid-cols-3">
              {review.channelRecommendations.map((item) => {
                const Icon = socialBrandIcons[item.key];
                return (
                  <article key={item.key} className="rounded-xl border border-line bg-white p-5">
                    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3">{Icon ? <Icon size={28} /> : null}<h3 className="text-lg font-semibold">{item.channel}</h3></div><StatusBadge tone={item.suitability === "عالية" ? "good" : "neutral"}>الملاءمة {item.suitability}</StatusBadge></div>
                    <p className="mt-4 leading-7">{item.reason}</p>
                    <dl className="mt-4 space-y-3 text-sm leading-7">
                      <div><dt className="text-ink/55">الجمهور</dt><dd>{item.targetAudience}</dd></div>
                      <div><dt className="text-ink/55">الصيغة</dt><dd>{item.format}</dd></div>
                      <div><dt className="text-ink/55">الفائدة المتوقعة</dt><dd>{item.expectedBenefit}</dd></div>
                      <div><dt className="text-ink/55">المخاطر أو القيود</dt><dd>{item.risks}</dd></div>
                      <div><dt className="text-ink/55">التوقيت المقترح</dt><dd>{item.timing}</dd></div>
                    </dl>
                  </article>
                );
              })}
            </div>
          </Panel>

          <Panel id="workflow">
            <SectionTitle title="6. مسار القرار والتنفيذ" subtitle="يوضح المرحلة الحالية، سببها، وما يجب فعله للانتقال إلى الخطوة التالية." />
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              {review.decisionWorkflow.map((stage, index) => (
                <div key={stage.key} className={`rounded-xl border p-4 ${stage.status === "الحالي" ? "border-palm bg-mint" : stage.status === "محجوب" ? "border-line bg-paper opacity-70" : "border-line bg-white"}`}>
                  <div className="flex items-center justify-between"><span className="grid h-7 w-7 place-items-center rounded-full bg-palm text-xs text-white">{index + 1}</span><StatusBadge tone={stage.status === "مكتمل" ? "good" : stage.status === "الحالي" ? "neutral" : "gold"}>{stage.status}</StatusBadge></div>
                  <h3 className="mt-3 font-semibold">{stage.label}</h3>
                  <p className="mt-2 text-xs leading-6 text-ink/65">{stage.reason}</p>
                  <p className="mt-3 text-xs leading-6 text-palm">{stage.action}</p>
                </div>
              ))}
            </div>
          </Panel>

          <Panel id="approval">
            <SectionTitle title="7. اعتماد النسخة" subtitle="لا تتاح المشاركة أو التصدير إلا للنسخة النهائية التي تمت مراجعتها واعتمادها." />
            <button type="button" onClick={approveCurrentVersion} disabled={approved || review.findings.some((finding) => !finding.resolved) || !review.languageQuality.passed || ["حرج", "مرتفع"].includes(review.riskLevel)} className="inline-flex items-center gap-2 rounded-md bg-palm px-5 py-2.5 text-white disabled:cursor-not-allowed disabled:opacity-50"><Save size={16} />{approved ? "تم اعتماد النسخة" : "اعتماد النسخة الحالية"}</button>
            {!approved ? <p className="mt-3 text-sm text-ink/65">عالج الحواجز الظاهرة أولاً. لن يؤدي الاعتماد إلى إخفاء ملاحظة حرجة أو تجاوزها.</p> : null}
          </Panel>

          <Panel id="sharing">
            <SectionTitle title="8. المشاركة والتصدير" subtitle="وحدة واحدة تحفظ النسخ والتنزيل والتقارير وتجهيز المشاركة دون ادعاء نشر تلقائي." />
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={copyReport} disabled={!approved} className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5 disabled:opacity-40"><Clipboard size={16} />نسخ التقرير</button>
              <button type="button" onClick={downloadAnalysis} disabled={!approved} className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5 disabled:opacity-40"><Download size={16} />حزمة التحليل</button>
              <button type="button" onClick={downloadWord} disabled={!approved} className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5 disabled:opacity-40"><FileDown size={16} />تقرير Word</button>
              <button type="button" onClick={() => window.print()} disabled={!approved} className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5 disabled:opacity-40"><Printer size={16} />طباعة / حفظ PDF</button>
              <button type="button" onClick={prepareSharing} disabled={!approved} className="inline-flex items-center gap-2 rounded-md bg-palm px-4 py-2.5 text-white disabled:opacity-40"><Share2 size={16} />تجهيز المشاركة</button>
            </div>
            {!approved ? <div className="mt-4 flex items-center gap-2 rounded-lg bg-gold/10 p-4 text-sm"><AlertTriangle size={17} className="text-gold" />يجب اعتماد المخرج قبل إتاحة المشاركة والتصدير.</div> : null}
          </Panel>

          <p className="rounded-lg border border-line bg-white p-4 text-xs leading-7 text-ink/60">
            هذا المقترح استرشادي، تم إنشاؤه بناءً على البيانات المدخلة ونتائج المراجعة والمراجع المهنية المسجلة في المنصة. يظل قرار التعديل أو الاعتماد أو النشر مسؤولية المستخدم.
          </p>
        </>
      ) : null}
    </div>
  );
}
