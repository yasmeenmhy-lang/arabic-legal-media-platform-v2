import type { ShareReadyContent, SocialPlatformShareTarget } from "@/lib/types";
import { reviewContent } from "@/lib/services/review-service";

export const socialPlatforms: SocialPlatformShareTarget[] = [
  {
    key: "tiktok",
    label: "TikTok",
    characterLimit: 2200,
    supportsWebShare: true,
    supportsDeepLink: false,
    manualInstructions: ["انسخ النص المعتمد.", "افتح TikTok وارفع الفيديو القصير.", "الصق الوصف والوسوم ثم راجع الإعدادات قبل النشر."]
  },
  {
    key: "snapchat",
    label: "Snapchat",
    characterLimit: 250,
    supportsWebShare: true,
    supportsDeepLink: false,
    manualInstructions: ["انسخ النص المختصر.", "افتح Snapchat.", "أضف النص كتعليق أو ملصق ثم انشر بعد مراجعة الخصوصية."]
  },
  {
    key: "x",
    label: "X",
    characterLimit: 280,
    supportsWebShare: true,
    supportsDeepLink: true,
    deepLink: "https://twitter.com/intent/tweet?text=",
    manualInstructions: ["افتح X.", "الصق النص والوسوم.", "تأكد من عدم تجاوز الحد المسموح قبل النشر."]
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    characterLimit: 3000,
    supportsWebShare: true,
    supportsDeepLink: true,
    deepLink: "https://www.linkedin.com/sharing/share-offsite/?url=",
    manualInstructions: ["افتح LinkedIn.", "اختر إنشاء منشور.", "الصق النص المعتمد وأضف الرابط أو الملف عند الحاجة."]
  },
  {
    key: "instagram",
    label: "Instagram",
    characterLimit: 2200,
    supportsWebShare: true,
    supportsDeepLink: false,
    manualInstructions: ["انسخ التعليق والوسوم.", "افتح Instagram.", "ارفع الصورة أو الفيديو ثم الصق التعليق قبل النشر."]
  },
  {
    key: "youtube_shorts",
    label: "YouTube Shorts",
    characterLimit: 5000,
    supportsWebShare: true,
    supportsDeepLink: false,
    manualInstructions: ["انسخ العنوان والوصف.", "افتح YouTube Studio.", "ارفع الفيديو القصير وأضف الوصف والوسوم."]
  }
];

const approvedBody =
  "قبل توقيع أي عقد، راجع نطاق الالتزامات، مدد التنفيذ، شروط الإنهاء، وآلية تسوية النزاع. هذه مادة توعوية عامة ولا تغني عن استشارة محام مرخص.";
const approvedReview = reviewContent(approvedBody, "social_export");
const approvedMetadata = {
  complianceScore: approvedReview.complianceScore,
  riskLevel: approvedReview.riskLevel,
  approvalStatus: approvedReview.exportAllowed ? "APPROVED" as const : "NEEDS_CORRECTION" as const,
  legalCitations: approvedReview.findings.map((finding) => ({
    legalCitation: finding.legalCitation,
    sourceDocument: finding.sourceDocument,
    ruleOrArticleNumber: finding.ruleOrArticleNumber,
    explanation: finding.explanation,
    sourceUrl: finding.sourceUrl
  }))
};

export const shareReadyContent: ShareReadyContent[] = [
  {
    id: "approved-contract-awareness",
    title: "حماية العقود قبل التوقيع",
    body: approvedBody,
    hashtags: ["#توعية_قانونية", "#العقود", "#محاماة"],
    mediaNotes: "مناسب كمنشور LinkedIn أو فيديو قصير مدته 30 ثانية.",
    approved: approvedReview.exportAllowed,
    complianceMetadata: approvedMetadata,
    exportPackage: {
      textFileName: "approved-contract-awareness.txt",
      metadataFileName: "approved-contract-awareness.json",
      payload: {
        status: approvedMetadata.approvalStatus,
        languageQuality: {
          status: approvedReview.languageQuality.passed ? "passed" : "failed",
          score: approvedReview.languageQuality.score
        },
        compliance: {
          status: approvedReview.complianceScore >= 82 ? "passed" : "failed",
          score: approvedReview.complianceScore,
          legalCitations: approvedMetadata.legalCitations
        },
        riskLevel: approvedMetadata.riskLevel,
        approvalStatus: approvedMetadata.approvalStatus,
        platforms: ["tiktok", "snapchat", "x", "linkedin", "instagram", "youtube_shorts"]
      }
    }
  }
];

export function getSocialMediaCenter() {
  return {
    platforms: socialPlatforms,
    content: shareReadyContent
  };
}

export function buildShareUrl(platformKey: string, content: ShareReadyContent) {
  const platform = socialPlatforms.find((item) => item.key === platformKey);
  const text = `${content.title}\n\n${content.body}\n\n${content.hashtags.join(" ")}`;

  if (!platform?.supportsDeepLink || !platform.deepLink) return null;
  return `${platform.deepLink}${encodeURIComponent(text)}`;
}

export function buildExportPackage(contentId: string) {
  const content = shareReadyContent.find((item) => item.id === contentId);
  if (!content) return null;

  return {
    fileName: `${content.id}-export-package.json`,
    package: {
      title: content.title,
      body: content.body,
      hashtags: content.hashtags,
      mediaNotes: content.mediaNotes,
      approved: content.approved,
      complianceMetadata: content.complianceMetadata,
      metadata: content.exportPackage.payload
    }
  };
}
