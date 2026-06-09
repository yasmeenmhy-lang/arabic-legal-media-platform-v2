import { recommendations } from "@/lib/data";

export function getRecommendations() {
  return recommendations.map((body, index) => ({
    id: `rec-${index + 1}`,
    title: ["تحسين المحتوى", "توقيت النشر", "تخفيف المخاطر"][index] ?? "فرصة محتوى",
    body,
    priority: index + 1
  }));
}
