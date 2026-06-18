import { describe, expect, it } from "vitest";
import { MockAIService } from "@/lib/services/ai-service";

describe("governed assistant recommendations", () => {
  it("returns only rewrites produced by the governed review pipeline", async () => {
    const output = await new MockAIService().reviewMediaContent({
      topic: "يضمن مكتبنا تحقيق أفضل النتائج لعملائه",
      audience: "عملاء محتملون",
      practiceArea: "القضايا التجارية",
      channel: "LinkedIn",
      objective: "تعريف بالخدمات"
    });

    const review = output.compliance?.reviews[0];
    expect(review).toBeTruthy();
    expect(output.improvementSuggestions).toEqual(review?.governedRewrites.map((rewrite) => rewrite.suggestedText));
    expect(output.compliance?.traceability).toEqual(review?.traceability);
    expect(output.compliance?.legalCitations.every((citation) => citation.traceabilityId.startsWith("FND-"))).toBe(true);
  });

  it("does not invent generic recommendations when no governed rewrite is available", async () => {
    const output = await new MockAIService().reviewMediaContent({
      topic: "معلومات عامة عن مراجعة العقود وفق الأنظمة والتعليمات ذات العلاقة",
      audience: "الجمهور العام",
      practiceArea: "العقود",
      channel: "الموقع الإلكتروني",
      objective: "تثقيف مهني"
    });

    const review = output.compliance?.reviews[0];
    expect(output.improvementSuggestions).toEqual(review?.governedRewrites.map((rewrite) => rewrite.suggestedText));
  });
});
