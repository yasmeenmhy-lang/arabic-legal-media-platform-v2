import type { ShareReadyContent, SocialPlatformShareTarget } from "@/lib/types";

export const socialPlatforms: SocialPlatformShareTarget[] = [
  {
    key: "tiktok",
    label: "TikTok",
    characterLimit: 2200,
    supportsWebShare: true,
    supportsDeepLink: false,
    manualInstructions: ["انسخ النص المناسب للنشر بعد مراجعة نتيجة التقييم.", "افتح TikTok وارفع الفيديو القصير.", "الصق الوصف والوسوم ثم راجع الإعدادات قبل النشر."]
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
    manualInstructions: ["افتح LinkedIn.", "اختر إعداد منشور.", "الصق النص المناسب للنشر وأضف الرابط أو الملف عند الحاجة."]
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
    label: "YouTube",
    characterLimit: 5000,
    supportsWebShare: true,
    supportsDeepLink: false,
    manualInstructions: ["انسخ العنوان والوصف.", "افتح YouTube Studio.", "ارفع الفيديو القصير وأضف الوصف والوسوم."]
  }
];

export const shareReadyContent: ShareReadyContent[] = [];

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
      readyForPublishing: content.readyForPublishing,
      complianceMetadata: content.complianceMetadata,
      metadata: content.exportPackage.payload
    }
  };
}
