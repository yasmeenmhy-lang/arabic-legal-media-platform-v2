import { describe, expect, it } from "vitest";
import { legalKnowledgeEntries, legalSourceDocuments } from "@/lib/legal-knowledge-base";
import { reviewContent } from "@/lib/services/review-service";
import { buildReviewPersistenceData } from "@/lib/services/review-persistence-service";

function isOfficialMojUrl(sourceUrl: string) {
  const hostname = new URL(sourceUrl).hostname.toLowerCase();
  return hostname === "laws.moj.gov.sa" || hostname === "moj.gov.sa" || hostname.endsWith(".moj.gov.sa");
}

describe("reviewContent", () => {
  it("flags guaranteed outcomes and exaggerated claims", () => {
    const result = reviewContent("نضمن لك أفضل محام يساعدك على اكسب قضيتك.");

    expect(["متوسط", "مرتفع", "حرج"]).toContain(result.riskLevel);
    expect(result.findings.length).toBeGreaterThanOrEqual(2);
    expect(result.complianceScore).toBeLessThan(60);
    expect(result.findings[0].legalCitation).toBeTruthy();
    expect(result.findings[0].sourceDocument).toBeTruthy();
    expect(result.findings[0].legalReference).toBeTruthy();
    expect(result.findings[0].articleTitle).toBeTruthy();
    expect(result.findings[0].articleTextExcerpt).toBeTruthy();
    expect(result.findings[0].legalExplanation).toContain(result.findings[0].evidence);
    expect(result.findings[0].confidenceLevel).toBeTruthy();
    expect(isOfficialMojUrl(result.findings[0].sourceUrl)).toBe(true);
    expect(result.findings[0].explanation).toBeTruthy();
  });

  it("returns only auditable findings linked to registered legal references", () => {
    const result = reviewContent("يضمن مكتبنا تحقيق أفضل النتائج لعملائه");

    expect(result.findings.length).toBeGreaterThan(0);

    for (const finding of result.findings) {
      const entry = legalKnowledgeEntries.find((item) => item.id === finding.legalKnowledgeEntryId);
      expect(entry).toBeTruthy();
      expect(entry?.sourceDocumentId).toBe(finding.sourceDocumentId);
      expect(entry?.sourceDocument).toBe(finding.sourceDocument);
      expect(entry?.legalReference).toBe(finding.legalReference);
      expect(entry?.articleTitle).toBe(finding.articleTitle);
      expect(entry?.fullText).toBe(finding.articleTextExcerpt);
      expect(entry?.sourceUrl).toBe(finding.sourceUrl);
      expect([...(entry?.prohibitedPatterns ?? []), ...(entry?.contextualPatterns ?? [])]).toContain(finding.matchedPattern);
      expect(finding.evidence).toContain(finding.matchedPattern);
      expect(finding.contentClassification).toBeTruthy();
      expect(finding.traceabilityId).toMatch(/^FND-/);
      expect(finding.title).toBeTruthy();
      expect(finding.category).toBeTruthy();
      expect(finding.domain).toBeTruthy();
      expect(finding.potentialImpact).toBeTruthy();
      expect(finding.weight).toBeGreaterThan(0);
      expect(finding.scoreImpact).toBe(finding.weight);

      const registeredSource = legalSourceDocuments.find((source) => source.id === finding.sourceDocumentId);
      expect(registeredSource).toBeTruthy();
      expect(registeredSource?.title).toBe(finding.sourceDocument);
      expect(registeredSource?.sourceUrl).toBe(finding.sourceUrl);
      expect(isOfficialMojUrl(finding.sourceUrl)).toBe(true);
    }
  });

  it("uses registered contextual patterns with sentence support, not exact phrases only", () => {
    const result = reviewContent("يعلن المكتب عن خدمة تحقق نتيجة لصالح العميل في النزاع التجاري.");

    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.findings.some((finding) => finding.matchedPattern === "تحقق نتيجة")).toBe(true);
    expect(result.findings.every((finding) => finding.legalExplanation.includes(finding.contentClassification))).toBe(true);
    expect(["متوسط", "مرتفع", "حرج"]).toContain(result.riskLevel);
  });

  it("keeps neutral educational wording low risk", () => {
    const result = reviewContent("هذه مادة توعوية عامة عن الالتزامات التعاقدية ولا تغني عن مراجعة محام مختص.");

    expect(result.riskLevel).toBe("منخفض");
    expect(result.findings).toHaveLength(0);
  });

  it("returns compact review context without exposing the full submitted content", () => {
    const submittedContent = "يقدم المكتب خدمات قانونية للأفراد والمنشآت وفق الأنظمة والتعليمات ذات العلاقة. ".repeat(8);
    const result = reviewContent(submittedContent, "post", { contentType: "منشور", channel: "LinkedIn" });

    expect(result.reviewContext.reviewId).toMatch(/^REV-/);
    expect(result.reviewContext.contentType).toBe("منشور");
    expect(result.reviewContext.channel).toBe("LinkedIn");
    expect(result.reviewContext.shortExcerpt.length).toBeLessThan(submittedContent.length);
    expect(result.reviewContext.shortExcerpt.length).toBeLessThanOrEqual(123);
    expect(result.reviewContext.shortExcerpt).not.toBe(submittedContent);
    expect((result as unknown as { submittedContent?: string }).submittedContent).toBeUndefined();
    expect((result as unknown as { text?: string }).text).toBeUndefined();
  });

  it("shows governed rewrites only after legal, compliance, language, and risk validation", () => {
    const result = reviewContent("يضمن مكتبنا تحقيق أفضل النتائج لعملائه.", "advertisement", {
      contentType: "إعلان مهني",
      channel: "LinkedIn",
      audience: "عملاء محتملون"
    });

    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.governedRewrites).toHaveLength(1);

    const rewrite = result.governedRewrites[0];
    expect(rewrite.proposedComplianceScore).toBeGreaterThanOrEqual(95);
    expect(rewrite.proposedComplianceScore).toBeGreaterThanOrEqual(rewrite.originalComplianceScore);
    expect(rewrite.proposedLanguageQuality).toBeGreaterThanOrEqual(95);
    expect(rewrite.proposedRiskScore).toBeLessThanOrEqual(rewrite.originalRiskScore);
    expect(rewrite.validation.legalCompliance).toBe("passed");
    expect(rewrite.validation.compliance).toBe("passed");
    expect(rewrite.validation.languageQuality).toBe("passed");
    expect(rewrite.referencesUsed.length).toBeGreaterThan(0);
    expect(rewrite.referencesUsed.every((reference) => isOfficialMojUrl(reference.sourceUrl))).toBe(true);
    expect(rewrite.suggestedText).not.toContain("يضمن");
    expect(rewrite.suggestedText).not.toContain("أفضل النتائج");
  });

  it("does not display a rewrite for neutral content that needs no governed correction", () => {
    const result = reviewContent("يقدم المكتب خدمات قانونية للأفراد والمنشآت وفق الأنظمة والتعليمات ذات العلاقة.", "post");

    expect(result.findings).toHaveLength(0);
    expect(result.complianceScore).toBe(100);
    expect(result.governedRewrites).toHaveLength(0);
  });

  it("calculates compliance exclusively from finding score impacts", () => {
    const result = reviewContent("يضمن مكتبنا تحقيق أفضل النتائج لعملائه.", "advertisement");
    const expectedDeduction = result.findings.reduce((sum, finding) => sum + finding.scoreImpact, 0);

    expect(result.complianceScoreExplanation.calculatedFromFindingsOnly).toBe(true);
    expect(result.complianceScoreExplanation.totalDeduction).toBe(expectedDeduction);
    expect(result.complianceScore).toBe(Math.max(0, 100 - expectedDeduction));
    expect(result.complianceScoreExplanation.contributions).toHaveLength(result.findings.length);
  });

  it("calculates risk independently from configurable finding severity", () => {
    const result = reviewContent("نضمن أفضل النتائج ونمثل الطرفين دون تعارض مصالح.", "advertisement");
    const explanation = result.riskScoreExplanation;
    const expected = Math.min(100, explanation.contributions.reduce((sum, item) => sum + item.value, 0));

    expect(result.findings.length).toBeGreaterThan(1);
    expect(result.riskScore).toBe(expected);
    expect(explanation.findingCount).toBe(result.findings.length);
    expect(explanation.severityContribution).toBeGreaterThan(0);
    expect(explanation.contributions.every((item) => item.value > 0)).toBe(true);
  });

  it("calculates publishing readiness from compliance, risk, language, and approval", () => {
    const result = reviewContent(
      "يقدم المكتب خدمات قانونية للأفراد والمنشآت وفق الأنظمة والتعليمات ذات العلاقة.",
      "post",
      {
        contentType: "منشور",
        channel: "LinkedIn",
        audience: "منشآت",
        purpose: "تثقيف مهني"
      }
    );
    const explanation = result.publishingReadinessExplanation;
    const expected = Math.round(explanation.factors.reduce((sum, factor) => sum + factor.weightedScore, 0));

    expect(explanation.factors.map((factor) => factor.key)).toEqual([
      "compliance",
      "risk",
      "language",
      "approval"
    ]);
    expect(explanation.metadataCompletenessScore).toBe(100);
    expect(result.publishingReadinessScore).toBe(expected);
  });

  it("uses context completeness for confidence rather than an undocumented readiness weight", () => {
    const text = "يقدم المكتب خدمات قانونية للأفراد والمنشآت وفق الأنظمة والتعليمات ذات العلاقة.";
    const incomplete = reviewContent(text, "post");
    const complete = reviewContent(text, "post", {
      contentType: "منشور",
      channel: "LinkedIn",
      audience: "منشآت",
      purpose: "تثقيف مهني"
    });

    expect(incomplete.publishingReadinessExplanation.metadataCompletenessScore).toBe(0);
    expect(complete.publishingReadinessExplanation.metadataCompletenessScore).toBe(100);
    expect(incomplete.confidence.level).not.toBe("High");
    expect(complete.confidence.level).toBe("High");
  });

  it("returns a versioned review traceability record", () => {
    const result = reviewContent("يضمن مكتبنا تحقيق أفضل النتائج لعملائه.");

    expect(result.traceability.reviewId).toBe(result.reviewContext.reviewId);
    expect(result.traceability.scoringModelVersion).toBe("decision-support-v2");
    expect(result.traceability.findingTraceabilityIds).toEqual(result.findings.map((finding) => finding.traceabilityId));
    expect(result.traceability.legalKnowledgeEntryIds.length).toBeGreaterThan(0);
    expect(result.traceability.sourceDocumentIds.length).toBeGreaterThan(0);
  });

  it("places critical findings first and produces a publication decision", () => {
    const result = reviewContent("نضمن لك الفوز في القضية مع نشر تفاصيل العميل.", "advertisement", {
      contentType: "إعلان مهني",
      channel: "LinkedIn",
      audience: "عملاء محتملون",
      purpose: "الترويج لخدمة"
    });

    expect(result.findings[0].businessSeverity).toBe("critical");
    expect(result.publicationDecision.outcome).toBe("NOT_RECOMMENDED");
    expect(result.publicationDecision.reason).toBeTruthy();
    expect(result.readinessDecision.blockers.length).toBeGreaterThan(0);
  });

  it("explains channel recommendations with audience, benefit, and limitations", () => {
    const result = reviewContent("مادة توعوية عامة عن الالتزامات التعاقدية وفق الأنظمة.", "post", {
      contentType: "منشور",
      channel: "LinkedIn",
      audience: "منشآت ورواد أعمال",
      purpose: "تثقيف الجمهور"
    });

    expect(result.channelRecommendations.length).toBeGreaterThan(0);
    expect(result.channelRecommendations[0].reason).toBeTruthy();
    expect(result.channelRecommendations[0].targetAudience).toBeTruthy();
    expect(result.channelRecommendations[0].expectedBenefit).toBeTruthy();
    expect(result.channelRecommendations[0].risks).toBeTruthy();
  });

  it("serializes governed scores and finding traceability for persistence", () => {
    const result = reviewContent("يضمن مكتبنا تحقيق أفضل النتائج لعملائه.");
    const data = buildReviewPersistenceData("content-1", result);

    expect(data.riskScore).toBe(result.riskScore);
    expect(data.publishingReadinessScore).toBe(result.publishingReadinessScore);
    expect(JSON.parse(data.complianceScoreExplanation)).toEqual(result.complianceScoreExplanation);
    expect(JSON.parse(data.traceability)).toEqual(result.traceability);
    expect(data.findings.create[0].traceabilityId).toBe(result.findings[0].traceabilityId);
    expect(data.findings.create[0].scoreImpact).toBe(result.findings[0].scoreImpact);
  });
});
