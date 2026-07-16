import type { ContentKind } from "@/lib/types";

/** Single source of truth for how each content kind is labeled across the platform. */
export const contentKindLabels: Record<ContentKind, string> = {
  post: "منشور توعوي",
  advertisement: "إعلان مهني",
  campaign: "حملة",
  article: "مقال",
  script: "نص فيديو",
  caption: "تعليق",
  visual_content: "محتوى بصري",
  infographic: "رسم توضيحي",
  publishing_plan: "خطة نشر",
  title: "عنوان",
  hashtag: "وسم",
  social_export: "تصدير اجتماعي",
  commentary: "رد ومحادثة",
  statement: "تصريح",
  diary: "يوميات"
};

export const contentKindOptions: Array<{ value: ContentKind; label: string }> = (
  Object.keys(contentKindLabels) as ContentKind[]
).map((value) => ({ value, label: contentKindLabels[value] }));
