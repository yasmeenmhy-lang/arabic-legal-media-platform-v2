import { assertContentCanExport } from "@/lib/services/review-service";
import { advisoryDisclaimer } from "@/lib/governance";

export function prepareExportContent(text: string) {
  const gate = assertContentCanExport(text, "social_export");
  const governedRewrite = gate.review.governedRewrites[0];

  if (!gate.allowed) {
    return {
      allowed: false,
      review: gate.review,
      content: null,
      message: gate.message,
      advisoryDisclaimer
    };
  }

  return {
    allowed: true,
    review: gate.review,
    content: governedRewrite?.suggestedText ?? gate.review.languageQuality.improvedDraft,
    governedRewrite: governedRewrite ?? null,
    message: "المحتوى مناسب للتصدير وفق نتائج المراجعة.",
    advisoryDisclaimer
  };
}
