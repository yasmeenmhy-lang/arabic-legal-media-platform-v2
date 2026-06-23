"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BarChart2,
  BookOpen,
  Bot,
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
  Printer,
  Save,
  Scale,
  Share2,
  ShieldAlert,
  SpellCheck,
  Sparkles,
  TrendingUp,
  User,
  Users,
  Video,
  XCircle
} from "lucide-react";
import { PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
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
import type { ContentKind, LanguageQualityIssue, ReviewFinding, ReviewResult, RiskLevel } from "@/lib/types";

const contentTypes = contentKindOptions.filter((item) =>
  (["post", "advertisement", "campaign", "article", "script", "caption", "visual_content", "infographic", "publishing_plan"] as ContentKind[]).includes(item.value)
);
const channels = ["LinkedIn", "X", "Instagram", "TikTok", "Snapchat", "YouTube", "ط§ظ„ظ…ظˆظ‚ط¹ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ"];
const audiences = ["ط¹ظ…ظ„ط§ط، ظ…ط­طھظ…ظ„ظˆظ† ظ…ظ† ط§ظ„ط£ظپط±ط§ط¯", "ظ…ظ†ط´ط¢طھ ظˆط±ظˆط§ط¯ ط£ط¹ظ…ط§ظ„", "ط²ظ…ظ„ط§ط، ظˆظ‚ط·ط§ط¹ ظ‚ط§ظ†ظˆظ†ظٹ", "ط§ظ„ط¬ظ…ظ‡ظˆط± ط§ظ„ط¹ط§ظ…"];
const purposes = ["طھط«ظ‚ظٹظپ ط§ظ„ط¬ظ…ظ‡ظˆط± ط­ظˆظ„ ظ…ظˆط¶ظˆط¹ ظ‚ط§ظ†ظˆظ†ظٹ", "ط±ظپط¹ ط§ظ„ظˆط¹ظٹ ط¨ط§ظ„ط®ط¯ظ…ط§طھ ط§ظ„ظ…ظ‡ظ†ظٹط©", "طھط¹ط²ظٹط² ط§ظ„ط­ط¶ظˆط± ط§ظ„ظ…ظ‡ظ†ظٹ ظˆط§ظ„ط«ظ‚ط©", "ط­ظ…ظ„ط© طھظˆط¹ظˆظٹط©"];

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
  "ط§ظ„ظ…ظˆظ‚ط¹ ط§ظ„ط¥ظ„ظƒطھط±ظˆظ†ظٹ": <Globe size={13} />
};

const audienceIcons: Record<string, React.ReactNode> = {
  "ط¹ظ…ظ„ط§ط، ظ…ط­طھظ…ظ„ظˆظ† ظ…ظ† ط§ظ„ط£ظپط±ط§ط¯": <User size={13} />,
  "ظ…ظ†ط´ط¢طھ ظˆط±ظˆط§ط¯ ط£ط¹ظ…ط§ظ„": <Building2 size={13} />,
  "ط²ظ…ظ„ط§ط، ظˆظ‚ط·ط§ط¹ ظ‚ط§ظ†ظˆظ†ظٹ": <Scale size={13} />,
  "ط§ظ„ط¬ظ…ظ‡ظˆط± ط§ظ„ط¹ط§ظ…": <Users size={13} />
};

const purposeIcons: Record<string, React.ReactNode> = {
  "طھط«ظ‚ظٹظپ ط§ظ„ط¬ظ…ظ‡ظˆط± ط­ظˆظ„ ظ…ظˆط¶ظˆط¹ ظ‚ط§ظ†ظˆظ†ظٹ": <BookOpen size={13} />,
  "ط±ظپط¹ ط§ظ„ظˆط¹ظٹ ط¨ط§ظ„ط®ط¯ظ…ط§طھ ط§ظ„ظ…ظ‡ظ†ظٹط©": <TrendingUp size={13} />,
  "طھط¹ط²ظٹط² ط§ظ„ط­ط¶ظˆط± ط§ظ„ظ…ظ‡ظ†ظٹ ظˆط§ظ„ط«ظ‚ط©": <Award size={13} />,
  "ط­ظ…ظ„ط© طھظˆط¹ظˆظٹط©": <Megaphone size={13} />
};

const chipBase = "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition focus-ring";
const chipIdle = "border-line bg-white text-ink/65 hover:border-palm hover:bg-mint hover:text-palm";
const chipSelected = "border-palm bg-mint text-palm shadow-[0_0_0_1px_theme(colors.palm)]";

const severityLabel = { critical: "ط­ط±ط¬ط©", high: "ط¹ط§ظ„ظٹط©", medium: "ظ…طھظˆط³ط·ط©", low: "ظ…ظ†ط®ظپط¶ط©" } as const;
const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 } as const;
const reviewTabs = [
  { key: "findings", label: "ط§ظ„ظ…ظ„ط§ط­ط¸ط§طھ" },
  { key: "compliance", label: "ط§ظ„ط§ظ…طھط«ط§ظ„" },
  { key: "risk", label: "ط§ظ„ظ…ط®ط§ط·ط±" },
  { key: "improvements", label: "ظپط±طµ ط§ظ„طھط­ط³ظٹظ†" },
  { key: "references", label: "ط§ظ„ظ…ط±ط§ط¬ط¹ ط§ظ„ظ…ظ‡ظ†ظٹط© ظˆط§ظ„ط±ط³ظ…ظٹط©" },
  { key: "sharing", label: "ط§ظ„ظ…ط´ط§ط±ظƒط©" }
] as const;
type ReviewTab = (typeof reviewTabs)[number]["key"];

type ContextChipOption<T extends string> = {
  value: T;
  label: string;
  icon?: React.ReactNode;
};

function ContextChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled
}: {
  label: string;
  options: ContextChipOption<T>[];
  value: T | "";
  onChange: (value: T) => void;
  disabled: boolean;
}) {
  return (
    <section className="space-y-2">
      <p className="text-sm font-medium text-ink/75">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              aria-pressed={selected}
              className={`rounded-full border px-4 py-2 text-sm transition focus-ring disabled:cursor-not-allowed disabled:opacity-60 ${
                selected
                  ? "border-palm bg-palm text-white shadow-sm"
                  : "border-line bg-white text-ink/75 hover:border-palm/60 hover:bg-mint hover:text-palm"
              }`}
            >
              {option.icon}
              {option.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

const inlineSpellingRules = [
  { wrong: "ظ‡ط§ط°ط§", correction: "ظ‡ط°ط§", message: "طµط­ط­ ط±ط³ظ… ط§ط³ظ… ط§ظ„ط¥ط´ط§ط±ط© ط¥ظ„ظ‰: ظ‡ط°ط§." },
  { wrong: "ظ‡ط§ط°ظ‡", correction: "ظ‡ط°ظ‡", message: "طµط­ط­ ط±ط³ظ… ط§ط³ظ… ط§ظ„ط¥ط´ط§ط±ط© ط¥ظ„ظ‰: ظ‡ط°ظ‡." },
  { wrong: "ظ†ط¶", correction: "ظ†طµ", message: "طµط­ط­ ط±ط³ظ… ط§ظ„ظƒظ„ظ…ط© ط¥ظ„ظ‰: ظ†طµ." },
  { wrong: "ط§ط®ط·ط§", correction: "ط£ط®ط·ط§ط،", message: "ط£ط¶ظپ ط§ظ„ظ‡ظ…ط²ط© ظˆط§ظ„ظ…ط¯ ظپظٹ ظƒظ„ظ…ط©: ط£ط®ط·ط§ط،." },
  { wrong: "ط§ط®ط·ط§ط،", correction: "ط£ط®ط·ط§ط،", message: "ط£ط¶ظپ ط§ظ„ظ‡ظ…ط²ط© ظپظٹ ظƒظ„ظ…ط©: ط£ط®ط·ط§ط،." },
  { wrong: "ظ„ط؛ظˆظٹظ‡", correction: "ظ„ط؛ظˆظٹط©", message: "طµط­ط­ ط§ظ„طھط§ط، ط§ظ„ظ…ط±ط¨ظˆط·ط© ظپظٹ ظƒظ„ظ…ط©: ظ„ط؛ظˆظٹط©." },
  { wrong: "ظˆط§ط¶ط­ظ‡", correction: "ظˆط§ط¶ط­ط©", message: "طµط­ط­ ط§ظ„طھط§ط، ط§ظ„ظ…ط±ط¨ظˆط·ط© ظپظٹ ظƒظ„ظ…ط©: ظˆط§ط¶ط­ط©." },
  { wrong: "ظ‚ط§ظ†ظˆظ†ظٹظ‡", correction: "ظ‚ط§ظ†ظˆظ†ظٹط©", message: "طµط­ط­ ط§ظ„طھط§ط، ط§ظ„ظ…ط±ط¨ظˆط·ط© ظپظٹ ظƒظ„ظ…ط©: ظ‚ط§ظ†ظˆظ†ظٹط©." },
  { wrong: "ظ…ظ‡ظ†ظٹظ‡", correction: "ظ…ظ‡ظ†ظٹط©", message: "طµط­ط­ ط§ظ„طھط§ط، ط§ظ„ظ…ط±ط¨ظˆط·ط© ظپظٹ ظƒظ„ظ…ط©: ظ…ظ‡ظ†ظٹط©." },
  { wrong: "ط§ط¹ظ„ط§ظ†ظٹظ‡", correction: "ط¥ط¹ظ„ط§ظ†ظٹط©", message: "ط£ط¶ظپ ط§ظ„ظ‡ظ…ط²ط© ظˆطµط­ط­ ط§ظ„طھط§ط، ط§ظ„ظ…ط±ط¨ظˆط·ط© ظپظٹ ظƒظ„ظ…ط©: ط¥ط¹ظ„ط§ظ†ظٹط©." },
  { wrong: "ط§ط¹ظ„ط§ظ†ظٹ", correction: "ط¥ط¹ظ„ط§ظ†ظٹ", message: "ط£ط¶ظپ ط§ظ„ظ‡ظ…ط²ط© ظپظٹ ظƒظ„ظ…ط©: ط¥ط¹ظ„ط§ظ†ظٹ." },
  { wrong: "ط§ط³طھط´ط§ط±ظ‡", correction: "ط§ط³طھط´ط§ط±ط©", message: "طµط­ط­ ط§ظ„طھط§ط، ط§ظ„ظ…ط±ط¨ظˆط·ط© ظپظٹ ظƒظ„ظ…ط©: ط§ط³طھط´ط§ط±ط©." },
  { wrong: "ط§ظ„ط¹ظ…ظ„ط§", correction: "ط§ظ„ط¹ظ…ظ„ط§ط،", message: "طµط­ط­ ط±ط³ظ… ط§ظ„ظƒظ„ظ…ط© ط¥ظ„ظ‰: ط§ظ„ط¹ظ…ظ„ط§ط،." },
  { wrong: "ط§ظ„ظ…ط­ظƒظ…ظ‡", correction: "ط§ظ„ظ…ط­ظƒظ…ط©", message: "طµط­ط­ ط§ظ„طھط§ط، ط§ظ„ظ…ط±ط¨ظˆط·ط© ظپظٹ ظƒظ„ظ…ط©: ط§ظ„ظ…ط­ظƒظ…ط©." },
  { wrong: "ط§ظ„ظ†طھظٹط¬ظ‡", correction: "ط§ظ„ظ†طھظٹط¬ط©", message: "طµط­ط­ ط§ظ„طھط§ط، ط§ظ„ظ…ط±ط¨ظˆط·ط© ظپظٹ ظƒظ„ظ…ط©: ط§ظ„ظ†طھظٹط¬ط©." },
  { wrong: "ط§ظ„ط§ط¬ط±ط§ط،ط§طھ", correction: "ط§ظ„ط¥ط¬ط±ط§ط،ط§طھ", message: "ط£ط¶ظپ ط§ظ„ظ‡ظ…ط²ط© ظپظٹ ط§ظ„ظ…طµط·ظ„ط­ ط§ظ„ظ…ظ‡ظ†ظٹ: ط§ظ„ط¥ط¬ط±ط§ط،ط§طھ." },
  { wrong: "ظˆط§ظ„ط§ط¬ط±ط§ط،ط§طھ", correction: "ظˆط§ظ„ط¥ط¬ط±ط§ط،ط§طھ", message: "ط£ط¶ظپ ط§ظ„ظ‡ظ…ط²ط© ظپظٹ ط§ظ„ظ…طµط·ظ„ط­ ط§ظ„ظ…ظ‡ظ†ظٹ: ظˆط§ظ„ط¥ط¬ط±ط§ط،ط§طھ." },
  { wrong: "ط§ظ„ظ‚ط¶ظٹظ‡", correction: "ط§ظ„ظ‚ط¶ظٹط©", message: "طµط­ط­ ط§ظ„طھط§ط، ط§ظ„ظ…ط±ط¨ظˆط·ط© ظپظٹ ظƒظ„ظ…ط©: ط§ظ„ظ‚ط¶ظٹط©." },
  { wrong: "ط§ظ„ط³ط¹ظˆط¯ظٹظ‡", correction: "ط§ظ„ط³ط¹ظˆط¯ظٹط©", message: "طµط­ط­ ط§ظ„طھط§ط، ط§ظ„ظ…ط±ط¨ظˆط·ط© ظپظٹ ظƒظ„ظ…ط©: ط§ظ„ط³ط¹ظˆط¯ظٹط©." },
  { wrong: "ط§ط¬ط±ط§ط،ط§طھ", correction: "ط¥ط¬ط±ط§ط،ط§طھ", message: "ط£ط¶ظپ ط§ظ„ظ‡ظ…ط²ط© ظپظٹ ط§ظ„ظ…طµط·ظ„ط­ ط§ظ„ظ…ظ‡ظ†ظٹ: ط¥ط¬ط±ط§ط،ط§طھ." },
  { wrong: "ط§ظ„ط§ط¬ط±ط§ط،", correction: "ط§ظ„ط¥ط¬ط±ط§ط،", message: "ط£ط¶ظپ ط§ظ„ظ‡ظ…ط²ط© ظپظٹ ط§ظ„ظ…طµط·ظ„ط­ ط§ظ„ظ…ظ‡ظ†ظٹ: ط§ظ„ط¥ط¬ط±ط§ط،." },
  { wrong: "ظˆط§ظ„ط§ط¬ط±ط§ط،", correction: "ظˆط§ظ„ط¥ط¬ط±ط§ط،", message: "ط£ط¶ظپ ط§ظ„ظ‡ظ…ط²ط© ظپظٹ ط§ظ„ظ…طµط·ظ„ط­ ط§ظ„ظ…ظ‡ظ†ظٹ: ظˆط§ظ„ط¥ط¬ط±ط§ط،." },
  { wrong: "ط§ط¬ط±ط§ط،", correction: "ط¥ط¬ط±ط§ط،", message: "ط£ط¶ظپ ط§ظ„ظ‡ظ…ط²ط© ظپظٹ ط§ظ„ظ…طµط·ظ„ط­ ط§ظ„ظ…ظ‡ظ†ظٹ: ط¥ط¬ط±ط§ط،." },
  { wrong: "ط§ظ„ظ„ط§ط¦ط­ظ‡", correction: "ط§ظ„ظ„ط§ط¦ط­ط©", message: "طµط­ط­ ط§ظ„طھط§ط، ط§ظ„ظ…ط±ط¨ظˆط·ط© ظپظٹ ظƒظ„ظ…ط©: ط§ظ„ظ„ط§ط¦ط­ط©." },
  { wrong: "ط§ظ„ط§ظ†ط¸ظ…ظ‡", correction: "ط§ظ„ط£ظ†ط¸ظ…ط©", message: "ط£ط¶ظپ ط§ظ„ظ‡ظ…ط²ط© ظˆطµط­ط­ ط§ظ„طھط§ط، ط§ظ„ظ…ط±ط¨ظˆط·ط© ظپظٹ ظƒظ„ظ…ط©: ط§ظ„ط£ظ†ط¸ظ…ط©." }
];

function escapeInlinePattern(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function detectInlineWritingIssues(value: string): LanguageQualityIssue[] {
  return inlineSpellingRules.flatMap((rule, ruleIndex) => {
    const pattern = new RegExp(`(?<![\\u0600-\\u06FF])${escapeInlinePattern(rule.wrong)}(?![\\u0600-\\u06FF])`, "g");
    return Array.from(value.matchAll(pattern)).map((match, matchIndex) => ({
      id: `inline-spelling-${ruleIndex}-${matchIndex}`,
      category: "spelling" as const,
      severity: "medium" as const,
      message: rule.message,
      excerpt: match[0],
      suggestion: `ط§ط³طھط¨ط¯ظ„ "${match[0]}" ط¨ظ€ "${rule.correction}".`,
      start: match.index,
      end: (match.index ?? 0) + match[0].length
    }));
  });
}

type AssistantIssue = {
  id: string;
  severity: keyof typeof severityOrder;
  label: string;
  evidence: string;
  reason: string;
  action: string;
  source?: string;
};

function languageIssueSeverity(issue: LanguageQualityIssue): keyof typeof severityOrder {
  if (issue.severity === "high") return "high";
  if (issue.severity === "medium") return "medium";
  return "low";
}

function buildAssistantIssues(review: ReviewResult, liveSpellingIssues: LanguageQualityIssue[]) {
  const findingIssues: AssistantIssue[] = review.findings.map((finding, index) => ({
    id: `finding-${index}-${finding.title}`,
    severity: finding.businessSeverity ?? "low",
    label: finding.title,
    evidence: finding.evidence,
    reason: finding.legalExplanation,
    action: finding.suggestedSaferWording,
    source: `${finding.sourceDocument} â€” ${finding.legalReference}`
  }));

  const mergedLanguageIssues = [...review.languageQuality.issues, ...liveSpellingIssues].filter(
    (issue, index, list) => list.findIndex((item) => `${item.category}-${item.excerpt}-${item.suggestion}` === `${issue.category}-${issue.excerpt}-${issue.suggestion}`) === index
  );

  const languageIssues: AssistantIssue[] = mergedLanguageIssues.map((issue, index) => ({
    id: `language-${index}-${issue.excerpt}`,
    severity: languageIssueSeverity(issue),
    label: issue.category === "spelling" ? "طھطµط­ظٹط­ ط¥ظ…ظ„ط§ط¦ظٹ ط£ظˆ ظ„ط؛ظˆظٹ" : "طھط­ط³ظٹظ† ظ„ط؛ظˆظٹ ط£ظˆ ط£ط³ظ„ظˆط¨ظٹ",
    evidence: issue.excerpt,
    reason: issue.message,
    action: issue.suggestion,
    source: "ظ‚ظˆط§ط¹ط¯ ظ„ط؛ظˆظٹط© ط¹ط±ط¨ظٹط© ظ…ط¹ظٹط§ط±ظٹط© ظ„ظ„طھط¯ظ‚ظٹظ‚ ط§ظ„ط¥ظ…ظ„ط§ط¦ظٹ ظˆط§ظ„طھط­ط±ظٹط±ظٹ"
  }));

  const riskIssue: AssistantIssue[] = ["حرج", "مرتفع"].includes(review.riskLevel)
    ? [{
        id: "risk-summary",
        severity: review.riskLevel === "حرج" ? "critical" : "high",
        label: `ظ…ط³طھظˆظ‰ ظ…ط®ط§ط·ط± ${review.riskLevel}`,
        evidence: review.findings[0]?.evidence ?? review.legalRiskAssessment.reason,
        reason: review.legalRiskAssessment.reason,
        action: review.readinessDecision.actions[0] ?? "ط¹ط§ظ„ط¬ ط§ظ„ظ…ط®ط§ط·ط± ظ‚ط¨ظ„ ط§ظ„طھظپظƒظٹط± ظپظٹ ط§ظ„ظ†ط´ط±.",
        source: review.findings[0] ? `${review.findings[0].sourceDocument} â€” ${review.findings[0].legalReference}` : "ظ†طھظٹط¬ط© طھظ‚ظٹظٹظ… ط§ظ„ظ…ط®ط§ط·ط±"
      }]
    : [];

  return [...findingIssues, ...riskIssue, ...languageIssues].sort(
    (a, b) => severityOrder[a.severity] - severityOrder[b.severity]
  );
}

function assistantSeverityText(severity: keyof typeof severityOrder) {
  if (severity === "critical") return "ط­ط±ط¬ط©";
  if (severity === "high") return "ط¹ط§ظ„ظٹط©";
  if (severity === "medium") return "ظ…طھظˆط³ط·ط©";
  return "ظ…ظ†ط®ظپط¶ط©";
}

function buildInternalAssistantSummary(review: ReviewResult, assistantIssues: AssistantIssue[], languagePassed: boolean) {
  const professionalIssues = assistantIssues.filter((issue) => issue.id.startsWith("finding-"));
  const riskIssues = assistantIssues.filter((issue) => issue.id === "risk-summary");
  const languageIssues = assistantIssues.filter((issue) => issue.id.startsWith("language-"));
  const topIssue = assistantIssues[0];

  if (topIssue) {
    const parts = [
      professionalIssues.length ? `${professionalIssues.length} ظ…ظ„ط§ط­ط¸ط© ظ…ظ‡ظ†ظٹط© ط£ظˆ ط§ظ…طھط«ط§ظ„ظٹط©` : null,
      riskIssues.length ? "ظ…ط¤ط´ط± ظ…ط®ط§ط·ط± ظ…ط±طھظپط¹ ظٹط­طھط§ط¬ ظ…ط¹ط§ظ„ط¬ط© ظ‚ط¨ظ„ ط§ظ„ظ†ط´ط±" : null,
      languageIssues.length ? `${languageIssues.length} ظ…ظ„ط§ط­ط¸ط© ظ„ط؛ظˆظٹط© ط£ظˆ ط¥ظ…ظ„ط§ط¦ظٹط©` : null
    ].filter(Boolean);

    return `ط§ط¨ط¯ط£ ط¨ط§ظ„ط£ظˆظ„ظˆظٹط© ${assistantSeverityText(topIssue.severity)}: "${topIssue.label}". ط±طµط¯ ط§ظ„ظ†ط¸ط§ظ… ${parts.join("طŒ ")}. ط±ط§ط¬ط¹ ط§ظ„ط¯ظ„ظٹظ„ ظˆط§ظ„ظ…ط±ط¬ط¹ ظˆط§ظ„ط¥ط¬ط±ط§ط، ط§ظ„ظ…ظ‚طھط±ط­ ظ„ظƒظ„ ط¨ظ†ط¯ ظ‚ط¨ظ„ ط§ظ„ط§ط¹طھظ…ط§ط¯ ط£ظˆ ط§ظ„ظ…ط´ط§ط±ظƒط©.`;
  }

  if (!languagePassed) {
    return "ظ„ط§ طھظˆط¬ط¯ ظ…ط®ط§ظ„ظپط© ظ…ظ‡ظ†ظٹط© ظ…ط±طµظˆط¯ط©طŒ ظ„ظƒظ† طھظˆط¬ط¯ ظ…ظ„ط§ط­ط¸ط§طھ ظ„ط؛ظˆظٹط© ط£ظˆ طھط­ط±ظٹط±ظٹط© ظٹط¬ط¨ ظ…ط¹ط§ظ„ط¬طھظ‡ط§ ظ‚ط¨ظ„ ط§ط¹طھظ…ط§ط¯ ط§ظ„ظ†ط³ط®ط© ط§ظ„ظ†ظ‡ط§ط¦ظٹط©.";
  }

  return review.publicationDecision.recommended
    ? "ظ„ط§ طھظˆط¬ط¯ ظ…ظ„ط§ط­ط¸ط§طھ ظ…ظ‡ظ†ظٹط© ط£ظˆ ظ„ط؛ظˆظٹط© ظ…ط§ظ†ط¹ط© ظپظٹ ط§ظ„ظ†طµ ط§ظ„ط­ط§ظ„ظٹ. ط±ط§ط¬ط¹ ط§ظ„ظ†ط³ط®ط© ط§ظ„ظ†ظ‡ط§ط¦ظٹط© ظˆظ‚ط±ط§ط± ط§ظ„ظ†ط´ط± ظ‚ط¨ظ„ ط§ظ„ط§ط¹طھظ…ط§ط¯."
    : review.publicationDecision.reason;
}

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

function complianceKpiTone(value: number) {
  if (value >= 80) return "good" as const;
  if (value >= 60) return "gold" as const;
  return "danger" as const;
}

function languageKpiTone(value: number) {
  if (value >= 80) return "good" as const;
  if (value >= 60) return "neutral" as const;
  return "gold" as const;
}

function riskKpiTone(risk: RiskLevel) {
  if (risk === "حرج" || risk === "مرتفع") return "danger" as const;
  if (risk === "متوسط") return "gold" as const;
  return "good" as const;
}

function readinessKpiTone(review: ReviewResult) {
  if (review.publicationDecision.outcome === "RECOMMENDED") return "good" as const;
  if (review.publicationDecision.outcome === "NOT_RECOMMENDED") return "danger" as const;
  if (review.publishingReadinessScore < 60) return "danger" as const;
  return "gold" as const;
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
          <p className="text-xs text-ink/50">ط§ظ„ط£ظˆظ„ظˆظٹط© {index + 1}</p>
          <h3 className="mt-1 text-base font-semibold leading-8">{finding.title}</h3>
        </div>
        <StatusBadge tone={severity === "critical" || severity === "high" ? "gold" : severity === "medium" ? "neutral" : "good"}>
          {severityLabel[severity]}
        </StatusBadge>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg bg-paper p-4">
          <p className="text-xs text-ink/55">ظ…ط§ ط§ظ„ط®ط·ط£طں</p>
          <p className="mt-2 leading-8">{finding.issue}</p>
        </div>
        <div className="rounded-lg bg-paper p-4">
          <p className="text-xs text-ink/55">ط§ظ„ط¯ظ„ظٹظ„ ظ…ظ† ط§ظ„ظ…ط­طھظˆظ‰</p>
          <p className="mt-2 leading-8 font-medium">â€œ{finding.evidence}â€‌</p>
        </div>
        <div className="rounded-lg bg-paper p-4">
          <p className="text-xs text-ink/55">ظ„ظ…ط§ط°ط§ ظٹظ…ط«ظ„ ظ…ط´ظƒظ„ط©طں</p>
          <p className="mt-2 leading-8">{finding.legalExplanation}</p>
        </div>
        <div className="rounded-lg bg-paper p-4">
          <p className="text-xs text-ink/55">ط§ظ„ظ…ط±ط¬ط¹ ط§ظ„ظ…طھط£ط«ط±</p>
          <div className="mt-2 flex items-start gap-3 leading-7"><OfficialLogo entity={officialEntityFromUrl(finding.sourceUrl)} /><span className="pt-1">{finding.sourceDocument} â€” {finding.legalReference}</span></div>
          <a href={finding.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-2 text-sm text-palm underline">
            ظپطھط­ ط§ظ„ظ…ط±ط¬ط¹ ط§ظ„ط±ط³ظ…ظٹ <ExternalLink size={14} aria-hidden="true" />
          </a>
        </div>
        <div className="rounded-lg bg-paper p-4">
          <p className="text-xs text-ink/55">ط§ظ„ط£ط«ط± ظˆط§ظ„ظ…ط®ط§ط·ط±</p>
          <p className="mt-2 leading-8">ظ‚ط¯ ظٹظ†ط´ط¦ ط£ط«ط±ط§ظ‹ {finding.potentialImpact} ط¶ظ…ظ† {finding.riskDimensions?.map((item) => ({
            legal: "ط§ظ„ظ…ط®ط§ط·ط± ط§ظ„ظ‚ط§ظ†ظˆظ†ظٹط©",
            reputational: "ظ…ط®ط§ط·ط± ط§ظ„ط³ظ…ط¹ط©",
            confidentiality: "ظ…ط®ط§ط·ط± ط§ظ„ط³ط±ظٹط©",
            misleadingCommunication: "ظ…ط®ط§ط·ط± ط§ظ„طھظˆط§طµظ„ ط§ظ„ظ…ط¶ظ„ظ„"
          }[item])).join("طŒ ")}.</p>
        </div>
        <div className="rounded-lg border border-palm/20 bg-mint/50 p-4">
          <p className="text-xs text-palm">ط§ظ„ط¥ط¬ط±ط§ط، ط§ظ„ظ…ظˆطµظ‰ ط¨ظ‡</p>
          <p className="mt-2 leading-8">{finding.suggestedSaferWording}</p>
        </div>
      </div>
    </article>
  );
}

function SpellingCheckerPanel({ issues }: { issues: LanguageQualityIssue[] }) {
  const spellingIssues = issues.filter((issue) => issue.category === "spelling");
  return (
    <Panel id="smart-spelling-checker">
      <SectionTitle
        title="ط§ظ„ظ…ط¯ظ‚ظ‚ ط§ظ„ط¥ظ…ظ„ط§ط¦ظٹ ط§ظ„ط°ظƒظٹ"
        subtitle="ظٹط¹ط±ط¶ ط§ظ„ظƒظ„ظ…ط§طھ ط£ظˆ ط§ظ„ط¹ط¨ط§ط±ط§طھ ط°ط§طھ ط§ظ„ط£ط®ط·ط§ط، ط§ظ„ط¥ظ…ظ„ط§ط¦ظٹط© ط§ظ„ظˆط§ط¶ط­ط©طŒ ظˆظ„ط§ ظٹط¹طھط¨ط± ط§ظ„ظ†طµ طµط­ظٹط­ظ‹ط§ ط¹ظ†ط¯ ظˆط¬ظˆط¯ ط®ط·ط£ ط¥ظ…ظ„ط§ط¦ظٹ ط¸ط§ظ‡ط±."
      />
      {spellingIssues.length ? (
        <div className="grid gap-3">
          {spellingIssues.map((issue) => (
            <article key={issue.id} className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <SpellCheck size={18} className="text-red-700" aria-hidden="true" />
                <span className="rounded-md bg-white px-2.5 py-1 text-sm font-semibold text-red-700">{issue.excerpt}</span>
                <span className="text-sm text-ink/65">â†گ</span>
                <span className="rounded-md bg-mint px-2.5 py-1 text-sm text-palm">{issue.suggestion}</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-red-800">{issue.message}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-lg bg-paper p-4 text-sm leading-7">ظ„ظ… ظٹط±طµط¯ ط§ظ„ظ…ط¯ظ‚ظ‚ ط§ظ„ط¥ظ…ظ„ط§ط¦ظٹ ط£ط®ط·ط§ط، ظˆط§ط¶ط­ط© ظپظٹ ط§ظ„ظ†طµ ط§ظ„ط­ط§ظ„ظٹ.</p>
      )}
    </Panel>
  );
}

function InlineContentGuidance({
  review,
  draftText,
  onApplyRewrite,
  loading
}: {
  review: ReviewResult | null;
  draftText: string;
  onApplyRewrite: () => void;
  loading: boolean;
}) {
  const liveSpellingIssues = detectInlineWritingIssues(draftText);

  if (!review && draftText.trim().length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-paper p-3 text-xs leading-6 text-ink/65">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-palm">
            <SpellCheck size={16} aria-hidden="true" />
            <b>ظ„ط§ ظٹظˆط¬ط¯ ظ…ط­طھظˆظ‰ ظ…ط­ظ„ ظ…ط±ط§ط¬ط¹ط© ط­ط§ظ„ظٹظ‹ط§</b>
          </div>
          <StatusBadge tone="neutral">ظ„ط§ طھظˆط¬ط¯ ظ†طھط§ط¦ط¬</StatusBadge>
        </div>
        <p className="mt-2">ط£ط¯ط®ظ„ ظ†طµظ‹ط§ ط¬ط¯ظٹط¯ظ‹ط§ ظ„ط¨ط¯ط، ط§ظ„طھط¯ظ‚ظٹظ‚ ظˆط§ظ„طھط­ظ„ظٹظ„. ظ„ظ† طھط¸ظ‡ط± ظ…ط¤ط´ط±ط§طھ ط£ظˆ ظ†طھط§ط¦ط¬ ظ…ط±طھط¨ط·ط© ط¨ظ…ط­طھظˆظ‰ ط³ط§ط¨ظ‚ ط¨ط¹ط¯ ظ…ط³ط­ ط§ظ„ظ†طµ.</p>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="space-y-3 rounded-lg border border-dashed border-line bg-paper p-3 text-xs leading-6 text-ink/65">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-palm">
            <SpellCheck size={16} aria-hidden="true" />
            <b>طھط¯ظ‚ظٹظ‚ ظ…ط¨ط§ط´ط± ط£ط«ظ†ط§ط، ط§ظ„ظƒطھط§ط¨ط© ط¯ط§ط®ظ„ ظ…ظ†ط·ظ‚ط© ط§ظ„ظ…ط­طھظˆظ‰</b>
          </div>
          <StatusBadge tone={liveSpellingIssues.length ? "gold" : "neutral"}>{liveSpellingIssues.length ? "ظٹط­طھط§ط¬ طھطµط­ظٹط­ظ‹ط§" : "ط¨ط§ظ†طھط¸ط§ط± ط§ظ„طھط­ظ„ظٹظ„"}</StatusBadge>
        </div>
        {liveSpellingIssues.length ? (
          <div className="flex flex-wrap gap-2">
            {liveSpellingIssues.map((issue) => (
              <span key={issue.id} className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs leading-5 text-red-800">
                <b>{issue.excerpt}</b> â†گ {issue.suggestion}
              </span>
            ))}
          </div>
        ) : (
          <p>ط³ظٹط¸ظ‡ط± ط§ظ„طھط¯ظ‚ظٹظ‚ ط§ظ„ط¥ظ…ظ„ط§ط¦ظٹ ظˆط§ظ„ظ„ط؛ظˆظٹطŒ ظˆط§ظ„ظ…ط³ط§ط¹ط¯ ط§ظ„ط°ظƒظٹطŒ ظˆظ…ط³ط§ط± ط§ظ„طھط¹ط¯ظٹظ„ ط§ظ„ظ…ظ‚طھط±ط­ ط¯ط§ط®ظ„ ظ…ظ†ط·ظ‚ط© ط§ظ„ظ…ط­طھظˆظ‰ ط¨ط¹ط¯ ط§ظ„طھط­ظ„ظٹظ„.</p>
        )}
      </div>
    );
  }

  const reviewSpellingIssues = review.languageQuality.issues.filter((issue) => issue.category === "spelling");
  const spellingIssues = reviewSpellingIssues.length ? reviewSpellingIssues : liveSpellingIssues;
  const rewrite = review.governedRewrites[0];
  const enhancedRewrite = rewrite
    ? review.aiEnhancement?.rewriteSuggestions.find((item) => item.rewriteId === rewrite.id)
    : undefined;
  const languagePassed = review.languageQuality.passed && review.languageQuality.issues.length === 0 && liveSpellingIssues.length === 0;
  const assistantIssues = buildAssistantIssues(review, liveSpellingIssues);
  const internalAssistantSummary = buildInternalAssistantSummary(review, assistantIssues, languagePassed);
  const languageBadgeLabel = languagePassed
    ? review.findings.length
      ? "ظ„ط§ طھظˆط¬ط¯ ط£ط®ط·ط§ط، ظ„ط؛ظˆظٹط© ظˆط§ط¶ط­ط©"
      : "ط³ظ„ظٹظ… ظ„ط؛ظˆظٹظ‹ط§"
    : "ظٹط­طھط§ط¬ طھطµط­ظٹط­ظ‹ط§";

  return (
    <div className="space-y-3 rounded-lg border border-line bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-palm">
          <SpellCheck size={17} aria-hidden="true" />
          <p className="text-sm font-semibold">طھط¯ظ‚ظٹظ‚ ظ…ط¨ط§ط´ط± ط¯ط§ط®ظ„ ظ…ظ†ط·ظ‚ط© ط§ظ„ظ…ط­طھظˆظ‰</p>
        </div>
        <StatusBadge tone={languagePassed ? "good" : "gold"}>{languageBadgeLabel}</StatusBadge>
      </div>
      {spellingIssues.length ? (
        <div className="flex flex-wrap gap-2">
          {spellingIssues.map((issue) => (
            <span key={issue.id} className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs leading-5 text-red-800">
              <b>{issue.excerpt}</b> â†گ {issue.suggestion}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-xs leading-6 text-ink/60">ظ„ظ… ظٹط±طµط¯ ط§ظ„ظ…ط¯ظ‚ظ‚ ط£ط®ط·ط§ط، ط¥ظ…ظ„ط§ط¦ظٹط© ظˆط§ط¶ط­ط© ط¯ط§ط®ظ„ ط§ظ„ظ†طµ ط§ظ„ط­ط§ظ„ظٹ.</p>
      )}

      <div className="rounded-md bg-mint/50 p-3 text-xs leading-6">
        <div className="mb-1 flex items-center gap-2 text-palm"><Bot size={16} aria-hidden="true" /><b>ط§ظ„ظ…ط³ط§ط¹ط¯ ط§ظ„ط°ظƒظٹ</b></div>
        <p>
          {review.aiEnhancement?.assistantSummary
            ? review.aiEnhancement.assistantSummary
            : internalAssistantSummary}
        </p>
      </div>

      <div className="rounded-md border border-palm/20 bg-mint/30 p-3 text-xs leading-6">
        <div className="mb-2 flex items-center gap-2 text-palm"><Bot size={16} aria-hidden="true" /><b>طھظˆط¬ظٹظ‡ ط§ظ„ظ…ط³ط§ط¹ط¯ ط­ط³ط¨ ظ†طھظٹط¬ط© ط§ظ„طھط­ظ„ظٹظ„</b></div>
        {assistantIssues.length ? (
          <ol className="space-y-2 pr-5">
            {assistantIssues.map((item, index) => (
              <li key={item.id} className="rounded-md border border-line bg-white p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge tone={item.severity === "critical" || item.severity === "high" ? "gold" : "neutral"}>{index + 1}. {item.label}</StatusBadge>
                  <span className="text-ink/55">ط§ظ„ط£ظˆظ„ظˆظٹط©: {item.severity === "critical" ? "ط­ط±ط¬ط©" : item.severity === "high" ? "ط¹ط§ظ„ظٹط©" : item.severity === "medium" ? "ظ…طھظˆط³ط·ط©" : "ظ…ظ†ط®ظپط¶ط©"}</span>
                </div>
                <p className="mt-2"><b>ط§ظ„ظ…ط´ظƒظ„ط©:</b> {item.label}</p>
                <p><b>ط§ظ„ط¹ط¨ط§ط±ط© ط§ظ„ظ…ط±طھط¨ط·ط©:</b> {item.evidence}</p>
                <p><b>ط³ط¨ط¨ ط§ظ„ظ…ط®ط§ظ„ظپط© ط£ظˆ ط§ظ„ظ…ظ„ط§ط­ط¸ط©:</b> {item.reason}</p>
                {item.source ? <p><b>ط§ظ„ظ…ط±ط¬ط¹:</b> {item.source}</p> : null}
                <p><b>ط§ظ„ط¥ط¬ط±ط§ط، ط§ظ„ظ…ظ‚طھط±ط­:</b> {item.action}</p>
              </li>
            ))}
          </ol>
        ) : (
          <p>{review.publicationDecision.reason}</p>
        )}
      </div>

      {rewrite ? (
        <div className="rounded-md border border-palm/20 bg-paper p-3 text-xs leading-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <b>ظ…ط³ط§ط± ط§ظ„طھط¹ط¯ظٹظ„ ط§ظ„ظ…ظ‚طھط±ط­</b>
            <button type="button" onClick={onApplyRewrite} disabled={loading} className="inline-flex items-center gap-1 rounded-md bg-palm px-3 py-1.5 text-xs text-white disabled:opacity-50">
              <Sparkles size={14} />ط§ط³طھط®ط¯ط§ظ… ط§ظ„طµظٹط§ط؛ط© ط§ظ„ظ…ظ‚طھط±ط­ط©
            </button>
          </div>
          {enhancedRewrite?.explanation ? <p className="mt-2 text-ink/70">{enhancedRewrite.explanation}</p> : null}
          <p className="mt-2 text-ink/70">{enhancedRewrite?.suggestedText ?? rewrite.suggestedText}</p>
        </div>
      ) : null}
    </div>
  );
}

function SmartAssistantPanel({ review }: { review: ReviewResult }) {
  const firstFinding = review.findings[0];
  const firstLanguageIssue = review.languageQuality.issues[0];
  const guidance = firstFinding
    ? [
        `ط§ط¨ط¯ط£ ط¨ظ…ط¹ط§ظ„ط¬ط©: ${firstFinding.title}.`,
        `ط³ط¨ط¨ ط§ظ„ظ…ظ„ط§ط­ط¸ط©: ${firstFinding.legalExplanation}`,
        `ط§ظ„ط¹ط¨ط§ط±ط© ط§ظ„ظ…ط±طھط¨ط·ط© ط¯ط§ط®ظ„ ط§ظ„ظ…ط­طھظˆظ‰: "${firstFinding.evidence}".`,
        `ط§ظ„ظ…ط±ط¬ط¹: ${firstFinding.sourceDocument} â€” ${firstFinding.legalReference}.`,
        `ط§ظ‚طھط±ط§ط­ ط§ظ„طھط¹ط¯ظٹظ„: ${firstFinding.suggestedSaferWording}`
      ]
    : firstLanguageIssue
      ? [
          `ط§ط¨ط¯ط£ ط¨طھط­ط³ظٹظ† ط§ظ„ظ„ط؛ط©: ${firstLanguageIssue.message}`,
          `ط§ظ„ط¹ط¨ط§ط±ط© ط§ظ„ظ…ط±طھط¨ط·ط©: "${firstLanguageIssue.excerpt}".`,
          `ط§ظ„طھطµط­ظٹط­ ط£ظˆ ط§ظ„طھط­ط³ظٹظ† ط§ظ„ظ…ظ‚طھط±ط­: ${firstLanguageIssue.suggestion}`,
          "ط¨ط¹ط¯ ط§ظ„طھطµط­ظٹط­طŒ ط£ط¹ط¯ ط§ظ„طھط­ظ„ظٹظ„ ظ„ظ„طھط£ظƒط¯ ظ…ظ† ط£ط«ط± ط§ظ„طھط¹ط¯ظٹظ„ ط¹ظ„ظ‰ ط¬ط§ظ‡ط²ظٹط© ط§ظ„ظ†ط´ط±."
        ]
      : [
          "ظ„ظ… طھط¸ظ‡ط± ظ…ظ„ط§ط­ط¸ط© ظ…ظ‡ظ†ظٹط© ط£ظˆ ط¥ظ…ظ„ط§ط¦ظٹط© ظˆط§ط¶ط­ط© ظپظٹ ط§ظ„طھط­ظ„ظٹظ„ ط§ظ„ط­ط§ظ„ظٹ.",
          "ط±ط§ط¬ط¹ ط§ظ„ط³ظٹط§ظ‚ ظˆط§ظ„ط¬ظ…ظ‡ظˆط± ظˆط§ظ„ظ‚ظ†ط§ط© ظ‚ط¨ظ„ ط§ظ„ظ†ط´ط±طŒ ط«ظ… ط§ط¹طھظ…ط¯ ط§ظ„ظ†ط³ط®ط© ط§ظ„ظ†ظ‡ط§ط¦ظٹط© ط¹ظ†ط¯ ط§ظƒطھظ…ط§ظ„ ط§ظ„ظ…ط±ط§ط¬ط¹ط©."
        ];

  return (
    <Panel id="smart-assistant">
      <SectionTitle
        title="ط§ظ„ظ…ط³ط§ط¹ط¯ ط§ظ„ط°ظƒظٹ ط¯ط§ط®ظ„ ط§ظ„ظ†ط§ظپط°ط©"
        subtitle="ظٹط³ط§ط¹ط¯ظƒ ط¹ظ„ظ‰ ظپظ‡ظ… ط§ظ„ظ…ظ„ط§ط­ط¸ط© ظˆط³ط¨ط¨ظ‡ط§ ظˆط§ظ„ظ‚ط§ط¹ط¯ط© ط§ظ„ظ…ط±طھط¨ط·ط© ط¨ظ‡ط§ ظˆط·ط±ظٹظ‚ط© طھط¹ط¯ظٹظ„ ط§ظ„ظ†طµطŒ ط¯ظˆظ† ط£ظ† ظٹط­ظ„ ظ…ط­ظ„ ظ…ط³ط¤ظˆظ„ظٹط© ط§ظ„ظ…ط³طھط®ط¯ظ… ظپظٹ ط§ظ„ظ†ط´ط±."
      />
      <div className="rounded-xl border border-palm/20 bg-mint/40 p-4">
        <div className="flex items-center gap-2 text-palm"><Bot size={20} aria-hidden="true" /><h3 className="font-semibold">طھظˆط¬ظٹظ‡ ط¹ظ…ظ„ظٹ ظ„ظ„ظ…ط±ط§ط¬ط¹ط© ط§ظ„ط­ط§ظ„ظٹط©</h3></div>
        <ul className="mt-3 list-disc space-y-2 pr-5 text-sm leading-7">
          {guidance.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>
    </Panel>
  );
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
      setMessage("طھظ… ظپطھط­ ظ…ط­طھظˆظ‰ ظ…ط­ظپظˆط¸ ظ…ظ† ط¥طµط¯ط§ط± ط³ط§ط¨ظ‚. ط£ط¹ط¯ طھط­ظ„ظٹظ„ ط§ظ„ظ…ط­طھظˆظ‰ ظ„ط¹ط±ط¶ ظ‚ط±ط§ط± ط§ظ„ظ†ط´ط± ظˆط§ظ„ظ†طھط§ط¦ط¬ ط¨طµظٹط؛طھظ‡ط§ ط§ظ„ط­ط§ظ„ظٹط©.");
    }
  }, []);

  const hasReviewContext = Boolean(kind && channel && audience && purpose);
  const contentTypeLabel = kind ? contentTypes.find((item) => item.value === kind)?.label ?? "ظ…ط­طھظˆظ‰ ظ…ظ‡ظ†ظٹ" : "";
  const contextLocked = Boolean(review) && !isEditing;
  const contextCompletion = [kind, channel, audience, purpose].filter(Boolean).length;
  const contextCompletionPercent = (contextCompletion / 4) * 100;
  const selectedContext = [
    kind ? contentTypeLabel : "",
    channel,
    audience,
    purpose
  ].filter(Boolean);
  const contentTypeChips = contentTypes
    .slice(0, 4)
    .map((item) => ({ value: item.value, label: item.label, icon: contentTypeIcons[item.value] }));
  const channelChips = channels.slice(0, 4).map((item) => ({ value: item, label: item, icon: channelIcons[item] }));
  const audienceChips = audiences.map((item) => ({ value: item, label: item, icon: audienceIcons[item] }));
  const purposeChips = purposes.map((item) => ({ value: item, label: item, icon: purposeIcons[item] }));
  const sortedFindings = useMemo(
    () => [...(review?.findings ?? [])].sort((a, b) => severityOrder[a.businessSeverity ?? "low"] - severityOrder[b.businessSeverity ?? "low"]),
    [review]
  );

  async function requestReview(reviewStatus?: "READY_FOR_PUBLISHING") {
    if (!kind || !channel || !audience || !purpose) {
      throw new Error("ط§ط®طھط± ظ†ظˆط¹ ط§ظ„ظ…ط­طھظˆظ‰ ظˆط§ظ„ظ‚ظ†ط§ط© ظˆط§ظ„ط¬ظ…ظ‡ظˆط± ظˆط§ظ„ظ‡ط¯ظپ ظ‚ط¨ظ„ ط§ظ„طھط­ظ„ظٹظ„ ط­طھظ‰ طھط±طھط¨ط· ط§ظ„ظ†طھط§ط¦ط¬ ط¨ط§ظ„ط³ظٹط§ظ‚ ط§ظ„طµط­ظٹط­.");
    }
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, kind, contentType: contentTypeLabel, channel, audience, purpose, reviewStatus })
    });
    if (!response.ok) throw new Error("طھط¹ط°ط± ط¥ظƒظ…ط§ظ„ ط§ظ„ظ…ط±ط§ط¬ط¹ط©.");
    return (await response.json()).data as ReviewResult;
  }

  async function runReview() {
    if (!kind || !channel || !audience || !purpose) {
      setMessage("ط§ط®طھط± ظ†ظˆط¹ ط§ظ„ظ…ط­طھظˆظ‰ ظˆط§ظ„ظ‚ظ†ط§ط© ظˆط§ظ„ط¬ظ…ظ‡ظˆط± ظˆط§ظ„ظ‡ط¯ظپ ظ‚ط¨ظ„ ط§ظ„طھط­ظ„ظٹظ„ ط­طھظ‰ طھط±طھط¨ط· ط§ظ„ظ†طھط§ط¦ط¬ ط¨ط§ظ„ط³ظٹط§ظ‚ ط§ظ„طµط­ظٹط­.");
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
      setMessage("ط§ظƒطھظ…ظ„ ط§ظ„طھط­ظ„ظٹظ„. ط§ط¨ط¯ط£ ط¨ظ‚ط±ط§ط± ط§ظ„ظ†ط´ط± ط«ظ… ط¹ط§ظ„ط¬ ط§ظ„ظ…ظ„ط§ط­ط¸ط§طھ ط­ط³ط¨ ط§ظ„ط£ظˆظ„ظˆظٹط©.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "طھط¹ط°ط± ط¥ظƒظ…ط§ظ„ ط§ظ„ظ…ط±ط§ط¬ط¹ط©.");
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
    setMessage("طھظ… طھط·ط¨ظٹظ‚ ط§ظ„طµظٹط§ط؛ط© ط§ظ„ظ…ظ‚طھط±ط­ط©. ط¬ط§ط± ط¥ط¹ط§ط¯ط© ط§ظ„طھظ‚ظٹظٹظ… ظ„ظ„طھط­ظ‚ظ‚ ظ…ظ† ط§ظ„ظ†طھظٹط¬ط© ط§ظ„ظپط¹ظ„ظٹط©.");
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
      setMessage("طھظ… طھط·ط¨ظٹظ‚ ط§ظ„طµظٹط§ط؛ط© ظˆط¥ط¹ط§ط¯ط© طھظ‚ظٹظٹظ…ظ‡ط§. ط±ط§ط¬ط¹ ظ‚ط±ط§ط± ط§ظ„ظ†ط´ط± ط§ظ„ط¬ط¯ظٹط¯ ظ‚ط¨ظ„ ط§ظ„ط§ط¹طھظ…ط§ط¯.");
    } finally {
      setLoading(false);
    }
  }

  function beginEditing() {
    setEditSnapshot({ text, kind, channel, audience, purpose });
    setIsEditing(true);
    setMessage("ظٹظ…ظƒظ†ظƒ ط§ظ„ط¢ظ† طھط¹ط¯ظٹظ„ ط§ظ„ظ…ط­طھظˆظ‰ ظˆط§ظ„ط³ظٹط§ظ‚. ط§ط­ظپط¸ ط§ظ„ظ…ط³ظˆط¯ط© ط£ظˆ ط£ط¹ط¯ ط§ظ„طھط­ظ„ظٹظ„ ظ…ط¨ط§ط´ط±ط©.");
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
    setMessage("طھظ… ط¥ظ„ط؛ط§ط، ط§ظ„طھط¹ط¯ظٹظ„ط§طھ ط؛ظٹط± ط§ظ„ظ…ط­ظپظˆط¸ط©.");
  }

  function saveEdits() {
    if (!contentId || text.trim().length < 5 || !kind || !channel || !audience || !purpose) {
      setMessage("طھط¹ط°ط± ط§ظ„ط­ظپط¸: ط£ط¯ط®ظ„ ظ†طµظ‹ط§ ظ…ظ† ط®ظ…ط³ط© ط£ط­ط±ظپ ط¹ظ„ظ‰ ط§ظ„ط£ظ‚ظ„ ظˆط§ط®طھط± ظ†ظˆط¹ ط§ظ„ظ…ط­طھظˆظ‰ ظˆط§ظ„ظ‚ظ†ط§ط© ظˆط§ظ„ط¬ظ…ظ‡ظˆط± ظˆط§ظ„ظ‡ط¯ظپ.");
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
      setMessage("طھط¹ط°ط± ط­ظپط¸ ط§ظ„طھط¹ط¯ظٹظ„ط§طھ ظ„ط£ظ† ط³ط¬ظ„ ط§ظ„ظ…ط­طھظˆظ‰ ط؛ظٹط± ظ…طھط§ط­.");
      return;
    }
    setVersionNumber(saved.version.version);
    setReview(null);
    setApproved(false);
    setEditSnapshot(null);
    setIsEditing(false);
    setMessage("طھظ… ط­ظپط¸ ط§ظ„طھط¹ط¯ظٹظ„ط§طھ ظƒظ…ط³ظˆط¯ط©. ط£ط¹ط¯ ط§ظ„طھط­ظ„ظٹظ„ ظ„ط¹ط±ط¶ ظ‚ط±ط§ط± ط§ظ„ظ†ط´ط± ط§ظ„ظ…ط­ط¯ط«.");
  }

  async function approveCurrentVersion() {
    if (!contentId || !versionNumber || !review || approving) return;
    setApproving(true);
    setMessage("");
    try {
      const saved = approveContentVersion(contentId, versionNumber);
      if (!saved) {
        setMessage("طھط¹ط°ط± ط§ظ„ط§ط¹طھظ…ط§ط¯: ط¹ط§ظ„ط¬ ط§ظ„ظ…ظ„ط§ط­ط¸ط§طھ ظˆط§ظ„ط­ظˆط§ط¬ط² ط§ظ„ط¸ط§ظ‡ط±ط© ط£ظˆظ„ط§ظ‹.");
        return;
      }
      const approvedReview = await requestReview("READY_FOR_PUBLISHING");
      saved.version.analysis = approvedReview;
      setReview(approvedReview);
      saveLatestReviewSnapshot(approvedReview);
      setApproved(true);
      setMessage("طھظ… ط§ط¹طھظ…ط§ط¯ ط§ظ„ط¥طµط¯ط§ط± ط§ظ„ظ†ظ‡ط§ط¦ظٹ. ط£طµط¨ط­طھ ط®ظٹط§ط±ط§طھ ط§ظ„ظ…ط´ط§ط±ظƒط© ظˆط§ظ„طھطµط¯ظٹط± ظ…طھط§ط­ط©.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "طھط¹ط°ط± ط¥ظƒظ…ط§ظ„ ط§ظ„ط§ط¹طھظ…ط§ط¯.");
    } finally {
      setApproving(false);
    }
  }

  const report = review ? {
    "ظ‚ط±ط§ط± ط§ظ„ظ†ط´ط±": review.publicationDecision.label,
    "ط³ط¨ط¨ ط§ظ„ظ‚ط±ط§ط±": review.publicationDecision.reason,
    "ظ…ط³طھظˆظ‰ ط§ظ„ط«ظ‚ط©": review.confidence.label,
    "ط§ظ„ظ…ظ„ط§ط­ط¸ط§طھ": sortedFindings.map((finding) => ({
      "ط§ظ„ظ…ظ„ط§ط­ط¸ط©": finding.issue,
      "ط§ظ„ط¯ظ„ظٹظ„": finding.evidence,
      "ط§ظ„ظ…ط±ط¬ط¹": `${finding.sourceDocument} â€” ${finding.legalReference}`,
      "ط§ظ„ظ…ط®ط§ط·ط±": finding.potentialImpact,
      "ط§ظ„ط¥ط¬ط±ط§ط،": finding.suggestedSaferWording
    })),
    "ظ…طھط·ظ„ط¨ط§طھ ظ…ط§ ظ‚ط¨ظ„ ط§ظ„ظ†ط´ط±": review.readinessDecision.blockers,
    "ط§ظ„ظ‚ظ†ظˆط§طھ ط§ظ„ظ…ظ‚طھط±ط­ط©": review.channelRecommendations.map((item) => ({
      "ط§ظ„ظ‚ظ†ط§ط©": item.channel,
      "ط§ظ„ط³ط¨ط¨": item.reason,
      "ط§ظ„ط¬ظ…ظ‡ظˆط±": item.targetAudience,
      "ط§ظ„ظپط§ط¦ط¯ط© ط§ظ„ظ…طھظˆظ‚ط¹ط©": item.expectedBenefit,
      "ط§ظ„ظ‚ظٹظˆط¯": item.risks
    }))
  } : null;

  async function copyReport() {
    if (!report) return;
    await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setMessage("طھظ… ظ†ط³ط® ط§ظ„طھظ‚ط±ظٹط± ط§ظ„ظ…ظ‡ظ†ظٹ.");
  }

  function downloadAnalysis() {
    if (!report) return;
    downloadBlob("طھط­ظ„ظٹظ„-ط§ظ„ظ…ط­طھظˆظ‰.json", "application/json;charset=utf-8", JSON.stringify(report, null, 2));
    setMessage("طھظ… طھظ†ط²ظٹظ„ ط­ط²ظ…ط© ط§ظ„طھط­ظ„ظٹظ„.");
  }

  function downloadWord() {
    if (!report) return;
    const findings = sortedFindings.map((item) => `<h3>${item.title}</h3><p><b>ط§ظ„ط¯ظ„ظٹظ„:</b> ${item.evidence}</p><p><b>ط§ظ„ظ…ط±ط¬ط¹:</b> ${item.sourceDocument} â€” ${item.legalReference}</p><p><b>ط§ظ„ط¥ط¬ط±ط§ط،:</b> ${item.suggestedSaferWording}</p>`).join("");
    const html = `<html dir="rtl"><meta charset="utf-8"><body><h1>طھظ‚ط±ظٹط± ظ‚ط±ط§ط± ط§ظ„ظ†ط´ط±</h1><h2>${review?.publicationDecision.label}</h2><p>${review?.publicationDecision.reason}</p>${findings}</body></html>`;
    downloadBlob("طھظ‚ط±ظٹط±-ظ‚ط±ط§ط±-ط§ظ„ظ†ط´ط±.doc", "application/msword;charset=utf-8", html);
    setMessage("طھظ… طھظ†ط²ظٹظ„ طھظ‚ط±ظٹط± Word.");
  }

  function prepareSharing() {
    if (!approved || !contentId || !versionNumber) return;
    const shared = markContentShared(contentId, versionNumber);
    if (!shared) return;
    setMessage("طھظ… طھط¬ظ‡ظٹط² ط§ظ„ظ†ط³ط®ط© ط§ظ„ظ…ط¹طھظ…ط¯ط© ظ„ظ„ظ…ط´ط§ط±ظƒط© ظˆطھط³ط¬ظٹظ„ ط§ظ„ط¥ط¬ط±ط§ط،.");
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
    setMessage("طھظ… ظ…ط³ط­ ظ…ط­طھظˆظ‰ ظ…ط±ط¨ط¹ ط§ظ„ظ†طµ ظپظ‚ط·. ظ„ظ… طھطھط؛ظٹط± ط¨ظ‚ظٹط© ط§ظ„ط­ظ‚ظˆظ„ ط£ظˆ ط§ظ„ط³ط¬ظ„ط§طھ ط§ظ„ظ…ط­ظپظˆط¸ط©.");
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
        eyebrow="ظ…ط³ط§ط¹ط¯ ظ‚ط±ط§ط± ط§ظ„ظ†ط´ط± ظ„ظ„ظ…ط­ط§ظ…ظٹ"
        title="ط¥ط¯ط§ط±ط© ط§ظ„ظ…ط­طھظˆظ‰ ط§ظ„ط¥ط¹ظ„ط§ظ…ظٹ ظˆط§ظ„ط¥ط¹ظ„ط§ظ†ظٹ ظ„ظ„ظ…ط­ط§ظ…ظٹظ†"
        description="ط§ط¨ط¯ط£ ط¨ظ…ط§ ظٹط­طھط§ط¬ ط¥ظ„ظ‰ ظ‚ط±ط§ط±: ط§ظ„ظ…ظ„ط§ط­ط¸ط§طھطŒ ط§ظ„ط£ط¯ظ„ط©طŒ ط§ظ„ط£ط«ط±طŒ ظˆط§ظ„ط¥ط¬ط±ط§ط، ط§ظ„ظ…ظˆطµظ‰ ط¨ظ‡. ط§ظ„ط¯ط±ط¬ط§طھ ظ…ط¤ط´ط±ط§طھ ظ…ط³ط§ظ†ط¯ط© ظˆظ„ظٹط³طھ ط§ظ„ظ†طھظٹط¬ط© ط§ظ„ط£ط³ط§ط³ظٹط©."
        action={<button type="button" onClick={() => router.back()} className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5 text-sm transition hover:bg-paper focus-ring"><ArrowRight size={16} />ط±ط¬ظˆط¹</button>}
      />

      <Panel id="input">
        <SectionTitle title="1. ط¥ط¯ط®ط§ظ„ ط§ظ„ظ…ط­طھظˆظ‰ ظˆط§ظ„ط³ظٹط§ظ‚" subtitle="ظƒظ„ظ…ط§ ط§ظƒطھظ…ظ„ ط§ظ„ط³ظٹط§ظ‚ ط§ط±طھظپط¹طھ ظ…ظˆط«ظˆظ‚ظٹط© ط§ظ„طھظˆطµظٹط©." />
        <div className="rounded-2xl border border-line bg-paper/60 p-4 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-base font-semibold">ط§ظ„ط®ط·ظˆط© 2 â€” ط­ط¯ط¯ ط§ظ„ط³ظٹط§ظ‚</h3>
              <p className="mt-1 text-sm leading-7 text-ink/60">ط§ط®طھط± ظ†ظˆط¹ ط§ظ„ظ…ط­طھظˆظ‰ ظˆط§ظ„ظ‚ظ†ط§ط© ظˆط§ظ„ط¬ظ…ظ‡ظˆط± ظˆط§ظ„ظ‡ط¯ظپ ظ‚ط¨ظ„ ط§ظ„طھط­ظ„ظٹظ„.</p>
            </div>
            <StatusBadge tone={hasReviewContext ? "good" : "gold"}>{contextCompletion} ظ…ظ† 4</StatusBadge>
          </div>

          <div className="mt-5 grid gap-5">
            <ContextChipGroup
              label="ظ†ظˆط¹ ط§ظ„ظ…ط­طھظˆظ‰"
              options={contentTypeChips}
              value={kind}
              onChange={(value) => setKind(value as ContentKind)}
              disabled={contextLocked}
            />
            <ContextChipGroup
              label="ط§ظ„ظ‚ظ†ط§ط©"
              options={channelChips}
              value={channel}
              onChange={setChannel}
              disabled={contextLocked}
            />
            <ContextChipGroup
              label="ط§ظ„ط¬ظ…ظ‡ظˆط±"
              options={audienceChips}
              value={audience}
              onChange={setAudience}
              disabled={contextLocked}
            />
            <ContextChipGroup
              label="ط§ظ„ظ‡ط¯ظپ"
              options={purposeChips}
              value={purpose}
              onChange={setPurpose}
              disabled={contextLocked}
            />
          </div>

          <div className="mt-5 border-t border-line pt-4">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="text-ink/60">ط§ظƒطھظ…ط§ظ„ ط§ظ„ط³ظٹط§ظ‚</span>
              <span className="font-semibold text-palm">{contextCompletion} ظ…ظ† 4</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
              <div className="h-full rounded-full bg-palm transition-all" style={{ width: `${contextCompletionPercent}%` }} />
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-palm/15 bg-white p-3">
            <p className="mb-2 text-xs text-ink/55">ط§ظ„ط§ط®طھظٹط§ط±ط§طھ ط§ظ„ط­ط§ظ„ظٹط©</p>
            {selectedContext.length ? (
              <div className="flex flex-wrap gap-2">
                {selectedContext.map((item) => (
                  <span key={item} className="rounded-full bg-mint px-3 py-1.5 text-xs text-palm">{item}</span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink/55">ظ„ظ… ظٹطھظ… ط§ط®طھظٹط§ط± ط³ظٹط§ظ‚ ط¨ط¹ط¯.</p>
            )}
          </div>
        </div>
        {!hasReviewContext ? (
          <p className="mt-2 text-xs leading-6 text-ink/60">ط§ط®طھط± ظ†ظˆط¹ ط§ظ„ظ…ط­طھظˆظ‰ ظˆط§ظ„ظ‚ظ†ط§ط© ظˆط§ظ„ط¬ظ…ظ‡ظˆط± ظˆط§ظ„ظ‡ط¯ظپ ط­طھظ‰ ظٹظƒظˆظ† ط§ظ„طھط­ظ„ظٹظ„ ظ…ط±طھط¨ط·ظ‹ط§ ط¨ط§ظ„ط³ظٹط§ظ‚ ط§ظ„طµط­ظٹط­.</p>
        ) : null}
        <label className="mt-4 block text-sm">
          <span className="flex flex-wrap items-center justify-between gap-2">
            <span>ط§ظ„ظ†طµ ظ…ط­ظ„ ط§ظ„ظ…ط±ط§ط¬ط¹ط©</span>
            <button type="button" onClick={clearContentInput} disabled={loading || text.length === 0} className="inline-flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-xs text-ink/70 transition hover:border-palm hover:bg-mint hover:text-palm disabled:cursor-not-allowed disabled:opacity-40">
              <XCircle size={14} aria-hidden="true" />ظ…ط³ط­ ط§ظ„ظ…ط­طھظˆظ‰
            </button>
          </span>
          <textarea value={text} disabled={Boolean(review) && !isEditing} onChange={(event) => setText(event.target.value)} className="mt-2 min-h-44 w-full rounded-lg border border-line p-4 leading-8 disabled:bg-paper disabled:text-ink/65" />
        </label>
        <div className="mt-3">
          <InlineContentGuidance review={review} draftText={text} onApplyRewrite={applyRewrite} loading={loading} />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {!review || isEditing ? <button type="button" onClick={runReview} disabled={loading || text.trim().length < 5 || !hasReviewContext} className="inline-flex items-center gap-2 rounded-md bg-palm px-5 py-2.5 text-white disabled:opacity-50"><FileText size={17} />{loading ? "ط¬ط§ط± ط§ظ„طھط­ظ„ظٹظ„..." : contentId ? "ط¥ط¹ط§ط¯ط© ط§ظ„طھط­ظ„ظٹظ„" : "طھط­ظ„ظٹظ„ ط§ظ„ظ…ط­طھظˆظ‰"}</button> : null}
          {review && !isEditing ? <button type="button" onClick={beginEditing} className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5"><Edit3 size={16} />طھط¹ط¯ظٹظ„</button> : null}
          {isEditing && contentId ? <button type="button" onClick={saveEdits} disabled={loading || text.trim().length < 5 || !hasReviewContext} className="inline-flex items-center gap-2 rounded-md border border-palm px-4 py-2.5 text-palm disabled:opacity-50"><Save size={16} />ط­ظپط¸ ط§ظ„طھط¹ط¯ظٹظ„ط§طھ</button> : null}
          {isEditing ? <button type="button" onClick={cancelEditing} disabled={loading} className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5 disabled:opacity-50"><AlertTriangle size={16} />ط¥ظ„ط؛ط§ط،</button> : null}
        </div>
        {message ? <p className="mt-3 text-sm text-palm">{message}</p> : null}
      </Panel>

      {review ? (
        <>
          <Panel id="decision" className="border-2 border-palm/20">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs text-palm">2. ظ‚ط±ط§ط± ط§ظ„ظ†ط´ط±</p>
                <h2 className="mt-2 text-lg font-semibold">{review.publicationDecision.label}</h2>
                <p className="mt-3 max-w-4xl leading-8 text-ink/75">{review.publicationDecision.reason}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone={decisionTone(review)}>{review.publicationDecision.label}</StatusBadge>
                <StatusBadge tone={review.confidence.level === "High" ? "good" : review.confidence.level === "Medium" ? "neutral" : "gold"}>ط§ظ„ط«ظ‚ط© {review.confidence.label}</StatusBadge>
              </div>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-lg bg-paper p-4"><p className="text-xs text-ink/55">ظ„ظ…ط§ط°ط§ ظ‡ط°ظ‡ ط§ظ„طھظˆطµظٹط©طں</p><p className="mt-2 leading-8">{review.confidence.reason}</p></div>
              <div className="rounded-lg bg-paper p-4"><p className="text-xs text-ink/55">ظ…ط§ ط§ظ„ظ…ط·ظ„ظˆط¨ ظ‚ط¨ظ„ ط§ظ„ظ†ط´ط±طں</p><ul className="mt-2 list-disc space-y-2 pr-5 leading-7">{review.readinessDecision.blockers.length ? review.readinessDecision.blockers.map((item) => <li key={item}>{item}</li>) : <li>ظ„ط§ طھظˆط¬ط¯ ظ…طھط·ظ„ط¨ط§طھ ظ…ط§ظ†ط¹ط© ظ…طھط¨ظ‚ظٹط©.</li>}</ul></div>
            </div>
          </Panel>

          <nav aria-label="ط£ظ‚ط³ط§ظ… ظ†طھظٹط¬ط© ظ…ط±ط§ط¬ط¹ط© ط§ظ„ظ…ط­طھظˆظ‰" className="sticky top-2 z-10 flex gap-2 overflow-x-auto rounded-lg border border-line bg-white/95 p-2 shadow-sm backdrop-blur">
            {reviewTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => navigateToReviewSection(tab.key)}
                aria-current={activeTab === tab.key ? "page" : undefined}
                className={`shrink-0 rounded-md px-4 py-2 text-xs transition focus-ring sm:text-sm ${activeTab === tab.key ? "bg-palm text-white" : "text-ink/70 hover:bg-paper hover:text-ink"}`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          <>
          {sortedFindings.some((item) => item.businessSeverity === "critical") ? (
            <div className="rounded-xl border-2 border-red-300 bg-red-50 p-5">
              <div className="flex items-center gap-2 text-red-800"><ShieldAlert size={22} /><h2 className="text-lg font-bold">ظ…ظ„ط§ط­ط¸ط§طھ ط­ط±ط¬ط© طھطھط·ظ„ط¨ ط¥ط¬ط±ط§ط،ظ‹ ظپظˆط±ظٹط§ظ‹</h2></div>
              <p className="mt-2 leading-7 text-red-800/80">ظ‡ط°ظ‡ ط§ظ„ظ…ظ„ط§ط­ط¸ط§طھ ط¸ط§ظ‡ط±ط© ط¯ط§ط¦ظ…ط§ظ‹ ظ„ط£ظ†ظ‡ط§ طھظ…ظ†ط¹ ط§ظ„طھظˆطµظٹط© ط¨ط§ظ„ظ†ط´ط± ط­طھظ‰ ظ…ط¹ط§ظ„ط¬طھظ‡ط§ ظˆط¥ط¹ط§ط¯ط© ط§ظ„طھظ‚ظٹظٹظ….</p>
            </div>
          ) : null}

          <section id="findings" className="space-y-4 scroll-mt-24">
            <SectionTitle title="3. ط§ظ„ظ…ظ„ط§ط­ط¸ط§طھ ط­ط³ط¨ ط§ظ„ط£ظˆظ„ظˆظٹط©" subtitle="ط§ظ„ظ…ظ„ط§ط­ط¸ط§طھ ط§ظ„ط­ط±ط¬ط© ط£ظˆظ„ط§ظ‹طŒ ط«ظ… ط§ظ„ط¹ط§ظ„ظٹط© ظˆط§ظ„ظ…طھظˆط³ط·ط© ظˆط§ظ„ظ…ظ†ط®ظپط¶ط©. ظ„ط§ ظٹط¹طھظ…ط¯ ط§ظ„ط¹ط±ط¶ ط¹ظ„ظ‰ طھط±طھظٹط¨ ط§ظ„ط§ظƒطھط´ط§ظپ." />
            {sortedFindings.length ? sortedFindings.map((finding, index) => <FindingCard key={`${finding.title}-${finding.evidence}`} finding={finding} index={index} />) : (
              <Panel><div className="flex items-start gap-3"><CheckCircle2 className="mt-1 text-palm" /><div><h3 className="font-semibold">ظ„ظ… طھط±طµط¯ ظ…ط®ط§ظ„ظپط© ظ…ظ‡ظ†ظٹط© ظ…ط±طھط¨ط·ط© ط¨ط§ظ„ظ…ط±ط§ط¬ط¹ ط§ظ„ظ…ط³ط¬ظ„ط©</h3><p className="mt-2 leading-7 text-ink/70">ط±ط§ط¬ط¹ ظ…طھط·ظ„ط¨ط§طھ ط§ظ„ط§ط¹طھظ…ط§ط¯ ظˆط¬ظˆط¯ط© ط§ظ„ظ„ط؛ط© ظ‚ط¨ظ„ طھط¬ظ‡ظٹط² ط§ظ„ظ†ط´ط±.</p></div></div></Panel>
            )}
          </section>
          </>

          <section id="improvements" className="space-y-5 scroll-mt-24">
          <Panel id="rewrite">
            <SectionTitle title="4. ط§ظ„طµظٹط§ط؛ط© ط§ظ„ظ…ظ‚طھط±ط­ط© ظˆط£ط«ط± ط§ظ„طھط­ط³ظٹظ†" subtitle="ط§ظ„ط£ط«ط± ط§ظ„ظ…طھظˆظ‚ط¹ طھظˆط¬ظٹظ‡ظٹطŒ ظˆطھظڈط¹ط§ط¯ ط§ظ„ظ…ط±ط§ط¬ط¹ط© ظپط¹ظ„ظٹط§ظ‹ ط¨ط¹ط¯ طھط·ط¨ظٹظ‚ ط§ظ„طµظٹط§ط؛ط©." />
            {review.governedRewrites.length ? review.governedRewrites.map((rewrite) => {
              const enhancedRewrite = review.aiEnhancement?.rewriteSuggestions.find((item) => item.rewriteId === rewrite.id);
              return (
              <div key={rewrite.id} className="rounded-xl border border-line p-5">
                {enhancedRewrite?.explanation ? <p className="mb-3 rounded-lg bg-mint/50 p-3 text-xs leading-6 text-palm">{enhancedRewrite.explanation}</p> : null}
                <p className="leading-8">{enhancedRewrite?.suggestedText ?? rewrite.suggestedText}</p>
                <p className="mt-3 rounded-lg bg-paper p-3 text-xs leading-6 text-ink/65">ط§ظ„ظ†طµ ط§ظ„ظ…ظ‚طھط±ط­ ظ„ط؛ط±ط¶ ط§ظ„طھط¹ظ„ظٹظ… ظˆط§ظ„ظ…ط³ط§ط¹ط¯ط© ظپظ‚ط·طŒ ظˆطھط¸ظ„ ظ…ط³ط¤ظˆظ„ظٹط© ط§ظ„ظ†ط´ط± ظˆط§ظ„ظ…ط´ط§ط±ظƒط© ظˆط§ظ„ط§ط¹طھظ…ط§ط¯ ط¹ظ„ظ‰ ط§ظ„ظ…ط³طھط®ط¯ظ….</p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg bg-paper p-4"><p className="text-xs text-ink/55">ظ‚ط¨ظ„ ط§ظ„طھظˆطµظٹط©</p><p className="mt-2">ط§ظ„ط§ظ…طھط«ط§ظ„ {rewrite.originalComplianceScore}% â€” ط§ظ„ظ…ط®ط§ط·ط± {rewrite.originalRiskLevel}</p></div>
                  <div className="rounded-lg bg-mint p-4"><p className="text-xs text-palm">ط§ظ„ط£ط«ط± ط§ظ„ظ…طھظˆظ‚ط¹ ط¨ط¹ط¯ ط§ظ„طھط·ط¨ظٹظ‚</p><p className="mt-2">ط§ظ„ط§ظ…طھط«ط§ظ„ ط§ظ„ظ…طھظˆظ‚ط¹ {rewrite.proposedComplianceScore}% â€” ط§ظ„ظ…ط®ط§ط·ط± ط§ظ„ظ…طھظˆظ‚ط¹ط© {rewrite.proposedRiskLevel}</p></div>
                </div>
                <button type="button" onClick={applyRewrite} disabled={loading} className="mt-4 inline-flex items-center gap-2 rounded-md bg-palm px-4 py-2.5 text-white"><Sparkles size={16} />طھط·ط¨ظٹظ‚ ط§ظ„طµظٹط§ط؛ط© ظˆط¥ط¹ط§ط¯ط© ط§ظ„طھظ‚ظٹظٹظ…</button>
              </div>
            );
            }) : <p className="rounded-lg bg-paper p-4 leading-7">ظ„ط§ طھظˆط¬ط¯ طµظٹط§ط؛ط© ط¨ط¯ظٹظ„ط© ظ…ط·ظ„ظˆط¨ط© ط¨ط¹ط¯ ط§ظ„طھظ‚ظٹظٹظ… ط§ظ„ط­ط§ظ„ظٹ.</p>}
          </Panel>
          </section>

            <Panel id="references" className="scroll-mt-24">
              <SectionTitle title="ط§ظ„ظ…ط±ط§ط¬ط¹ ط§ظ„ظ…ظ‡ظ†ظٹط© ظˆط§ظ„ط±ط³ظ…ظٹط©" subtitle="ط§ظ„ظ…طµط§ط¯ط± ط§ظ„ط±ط³ظ…ظٹط© ط§ظ„ظ…ط±طھط¨ط·ط© ظ…ط¨ط§ط´ط±ط© ط¨ط§ظ„ظ…ظ„ط§ط­ط¸ط§طھطŒ ظ…ط¹ ط¨ظٹط§ظ† ط§ظ„ظ‚ط§ط¹ط¯ط© ط§ظ„ظ…طھط£ط«ط±ط©." />
              {sortedFindings.length ? (
                <div className="grid gap-3">
                  {sortedFindings.map((finding) => (
                    <article key={`${finding.sourceUrl}-${finding.legalReference}`} className="rounded-lg border border-line bg-paper p-4">
                      <div className="flex items-start gap-3"><OfficialLogo entity={officialEntityFromUrl(finding.sourceUrl)} /><h3 className="pt-1 font-semibold">{finding.sourceDocument}</h3></div>
                      <p className="mt-2 text-sm leading-7">{finding.legalReference}</p>
                      <p className="mt-2 text-sm leading-7 text-ink/65">{finding.legalExplanation}</p>
                      <a href={finding.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 text-sm text-palm underline">
                        ظپطھط­ ط§ظ„ظ…ط±ط¬ط¹ ط§ظ„ط±ط³ظ…ظٹ <ExternalLink size={14} aria-hidden="true" />
                      </a>
                    </article>
                  ))}
                </div>
              ) : <p className="rounded-lg bg-paper p-4 leading-7">ظ„ظ… طھظڈط±طµط¯ ظ…ظ„ط§ط­ط¸ط© طھط³طھط¯ط¹ظٹ ط¥ط¸ظ‡ط§ط± ظ…ط±ط¬ط¹ ظ…طھط£ط«ط± ظپظٹ ظ‡ط°ظ‡ ط§ظ„ظ…ط±ط§ط¬ط¹ط©.</p>}
            </Panel>

          <>
          <Panel id="channels">
            <SectionTitle title="5. ط§ظ„ظ‚ظ†ظˆط§طھ ط§ظ„ظ…ظ‚طھط±ط­ط©" subtitle="ظƒظ„ طھظˆطµظٹط© ظ…ط¨ظ†ظٹط© ط¹ظ„ظ‰ ظ†ظˆط¹ ط§ظ„ظ…ط­طھظˆظ‰ ظˆط§ظ„ط¬ظ…ظ‡ظˆط± ظˆط§ظ„ظ‡ط¯ظپ ظˆظ†طھط§ط¦ط¬ ط§ظ„ظ…ط±ط§ط¬ط¹ط©." />
            <div className="grid gap-4 lg:grid-cols-3">
              {review.channelRecommendations.map((item) => {
                const Icon = socialBrandIcons[item.key];
                const enhancedChannel = review.aiEnhancement?.channelRationales.find((rationale) => rationale.key === item.key);
                return (
                  <article key={item.key} className="rounded-xl border border-line bg-white p-5">
                    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-3">{Icon ? <Icon size={28} className={socialBrandStyles[item.key]?.icon} /> : null}<h3 className="text-base font-semibold">{item.channel}</h3></div><StatusBadge tone={item.suitability === "عالية" ? "good" : "neutral"}>ط§ظ„ظ…ظ„ط§ط،ظ…ط© {item.suitability}</StatusBadge></div>
                    <p className="mt-4 leading-7">{enhancedChannel?.reason ?? item.reason}</p>
                    <dl className="mt-4 space-y-3 text-sm leading-7">
                      <div><dt className="text-ink/55">ط§ظ„ط¬ظ…ظ‡ظˆط±</dt><dd>{item.targetAudience}</dd></div>
                      <div><dt className="text-ink/55">ط§ظ„طµظٹط؛ط©</dt><dd>{item.format}</dd></div>
                      <div><dt className="text-ink/55">ط§ظ„ظپط§ط¦ط¯ط© ط§ظ„ظ…طھظˆظ‚ط¹ط©</dt><dd>{enhancedChannel?.expectedBenefit ?? item.expectedBenefit}</dd></div>
                      <div><dt className="text-ink/55">ط§ظ„ظ…ط®ط§ط·ط± ط£ظˆ ط§ظ„ظ‚ظٹظˆط¯</dt><dd>{enhancedChannel?.risks ?? item.risks}</dd></div>
                      <div><dt className="text-ink/55">ط§ظ„طھظˆظ‚ظٹطھ ط§ظ„ظ…ظ‚طھط±ط­</dt><dd>{item.timing}</dd></div>
                    </dl>
                  </article>
                );
              })}
            </div>
          </Panel>

          <Panel id="approval">
            <SectionTitle title="7. ط§ط¹طھظ…ط§ط¯ ط§ظ„ظ†ط³ط®ط©" subtitle="ظ„ط§ طھطھط§ط­ ط§ظ„ظ…ط´ط§ط±ظƒط© ط£ظˆ ط§ظ„طھطµط¯ظٹط± ط¥ظ„ط§ ظ„ظ„ظ†ط³ط®ط© ط§ظ„ظ†ظ‡ط§ط¦ظٹط© ط§ظ„طھظٹ طھظ…طھ ظ…ط±ط§ط¬ط¹طھظ‡ط§ ظˆط§ط¹طھظ…ط§ط¯ظ‡ط§." />
            <button type="button" onClick={approveCurrentVersion} disabled={approved || approving || review.findings.some((finding) => !finding.resolved) || !review.languageQuality.passed || ["ط­ط±ط¬", "ظ…ط±طھظپط¹"].includes(review.riskLevel)} className="inline-flex items-center gap-2 rounded-md bg-palm px-5 py-2.5 text-white disabled:cursor-not-allowed disabled:opacity-50"><Save size={16} />{approved ? "طھظ… ط§ط¹طھظ…ط§ط¯ ط§ظ„ظ†ط³ط®ط©" : approving ? "ط¬ط§ط± ط§ظ„ط§ط¹طھظ…ط§ط¯..." : "ط§ط¹طھظ…ط§ط¯ ط§ظ„ظ†ط³ط®ط© ط§ظ„ط­ط§ظ„ظٹط©"}</button>
            {!approved ? <p className="mt-3 text-sm text-ink/65">ط¹ط§ظ„ط¬ ط§ظ„ط­ظˆط§ط¬ط² ط§ظ„ط¸ط§ظ‡ط±ط© ط£ظˆظ„ط§ظ‹. ظ„ظ† ظٹط¤ط¯ظٹ ط§ظ„ط§ط¹طھظ…ط§ط¯ ط¥ظ„ظ‰ ط¥ط®ظپط§ط، ظ…ظ„ط§ط­ط¸ط© ط­ط±ط¬ط© ط£ظˆ طھط¬ط§ظˆط²ظ‡ط§.</p> : null}
          </Panel>

          <Panel id="sharing" className="scroll-mt-24">
            <SectionTitle title="8. ط§ظ„ظ…ط´ط§ط±ظƒط© ظˆط§ظ„طھطµط¯ظٹط±" subtitle="ظˆط­ط¯ط© ظˆط§ط­ط¯ط© طھط­ظپط¸ ط§ظ„ظ†ط³ط® ظˆط§ظ„طھظ†ط²ظٹظ„ ظˆط§ظ„طھظ‚ط§ط±ظٹط± ظˆط§ظ„ظ…ط´ط§ط±ظƒط© ط¯ظˆظ† ط§ط¯ط¹ط§ط، ظ†ط´ط± طھظ„ظ‚ط§ط¦ظٹ." />
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={downloadWord} disabled={!approved} className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5 disabled:opacity-40"><FileDown size={16} />طھظ‚ط±ظٹط± Word</button>
              <button type="button" onClick={prepareSharing} disabled={!approved} className="inline-flex items-center gap-2 rounded-md bg-palm px-4 py-2.5 text-white disabled:opacity-40"><Share2 size={16} />ط§ظ„ظ…ط´ط§ط±ظƒط©</button>
            </div>
            {!approved ? <div className="mt-4 flex items-center gap-2 rounded-lg bg-gold/10 p-4 text-sm"><AlertTriangle size={17} className="text-gold" />ظٹط¬ط¨ ط§ط¹طھظ…ط§ط¯ ط§ظ„ظ…ط®ط±ط¬ ظ‚ط¨ظ„ ط¥طھط§ط­ط© ط§ظ„ظ…ط´ط§ط±ظƒط© ظˆط§ظ„طھطµط¯ظٹط±.</div> : null}
          </Panel>
          </>

          <p className="rounded-lg border border-line bg-white p-4 text-xs leading-7 text-ink/60">
            ظ‡ط°ط§ ط§ظ„ظ…ظ‚طھط±ط­ ط§ط³طھط±ط´ط§ط¯ظٹطŒ طھظ… ط¥ظ†ط´ط§ط¤ظ‡ ط¨ظ†ط§ط،ظ‹ ط¹ظ„ظ‰ ط§ظ„ط¨ظٹط§ظ†ط§طھ ط§ظ„ظ…ط¯ط®ظ„ط© ظˆظ†طھط§ط¦ط¬ ط§ظ„ظ…ط±ط§ط¬ط¹ط© ظˆط§ظ„ظ…ط±ط§ط¬ط¹ ط§ظ„ظ…ظ‡ظ†ظٹط© ط§ظ„ظ…ط³ط¬ظ„ط© ظپظٹ ط§ظ„ظ…ظ†طµط©. ظٹط¸ظ„ ظ‚ط±ط§ط± ط§ظ„طھط¹ط¯ظٹظ„ ط£ظˆ ط§ظ„ط§ط¹طھظ…ط§ط¯ ط£ظˆ ط§ظ„ظ†ط´ط± ظ…ط³ط¤ظˆظ„ظٹط© ط§ظ„ظ…ط³طھط®ط¯ظ….
          </p>
        </>
      ) : null}
    </div>
  );
}

