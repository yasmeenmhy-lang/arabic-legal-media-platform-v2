import { describe, expect, it } from "vitest";
import { legalKnowledgeEntries, legalSourceDocuments } from "@/lib/legal-knowledge-base";
import { reviewContent } from "@/lib/services/review-service";

function isOfficialMojUrl(sourceUrl: string) {
  const hostname = new URL(sourceUrl).hostname.toLowerCase();
  return hostname === "laws.moj.gov.sa" || hostname === "moj.gov.sa" || hostname.endsWith(".moj.gov.sa");
}

describe("reviewContent", () => {
  it("flags guaranteed outcomes and exaggerated claims", () => {
    const result = reviewContent("نضمن لك أفضل محام يساعدك على اكسب قضيتك.");

    expect(result.riskLevel).toBe("مرتفع");
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
    expect(result.riskLevel).toBe("مرتفع");
  });

  it("keeps neutral educational wording low risk", () => {
    const result = reviewContent("هذه مادة توعوية عامة عن الالتزامات التعاقدية ولا تغني عن مراجعة محام مختص.");

    expect(result.riskLevel).toBe("منخفض");
    expect(result.findings).toHaveLength(0);
  });
});
