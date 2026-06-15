import { assertContentCanExport } from "@/lib/services/review-service";

export function prepareExportContent(text: string) {
  const gate = assertContentCanExport(text, "social_export");

  if (!gate.allowed) {
    return {
      allowed: false,
      review: gate.review,
      content: null,
      message: gate.message
    };
  }

  return {
    allowed: true,
    review: gate.review,
    content: gate.review.languageQuality.improvedDraft,
    message: "Content is approved for export."
  };
}
