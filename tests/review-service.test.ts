import { describe, expect, it } from "vitest";
import { reviewContent } from "@/lib/services/review-service";

describe("reviewContent", () => {
  it("flags guaranteed outcomes and exaggerated claims", () => {
    const result = reviewContent("نضمن لك أفضل محام يساعدك على اكسب قضيتك.");

    expect(result.riskLevel).toBe("CRITICAL");
    expect(result.findings.length).toBeGreaterThanOrEqual(2);
    expect(result.complianceScore).toBeLessThan(60);
    expect(result.findings[0].legalCitation).toBeTruthy();
    expect(result.findings[0].sourceDocument).toBeTruthy();
    expect(result.findings[0].ruleOrArticleNumber).toBeTruthy();
    expect(result.findings[0].explanation).toBeTruthy();
  });

  it("keeps neutral educational wording low risk", () => {
    const result = reviewContent("هذه مادة توعوية عامة عن الالتزامات التعاقدية ولا تغني عن مراجعة محام مختص.");

    expect(result.riskLevel).toBe("LOW");
    expect(result.findings).toHaveLength(0);
  });
});
