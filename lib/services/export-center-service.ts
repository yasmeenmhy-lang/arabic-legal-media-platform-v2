import { assertContentCanExport } from "@/lib/services/review-service";
import { advisoryDisclaimer } from "@/lib/governance";

export async function prepareExportContent(text: string) {
  const gate = await assertContentCanExport(text, "social_export");
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
