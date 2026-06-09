import { describe, expect, it } from "vitest";
import { reviewContent } from "@/lib/services/review-service";

describe("reviewContent", () => {
  it("flags guaranteed outcomes and exaggerated claims", () => {
    const result = reviewContent("نضمن لك أفضل محام يساعدك على اكسب قضيتك");

    expect(result.riskLevel).toBe("CRITICAL");
    expect(result.findings.length).toBeGreaterThanOrEqual(3);
    expect(result.complianceScore).toBeLessThan(60);
  });

  it("keeps neutral educational wording low risk", () => {
    const result = reviewContent("هذه مادة توعوية عامة ولا تغني عن استشارة محام مرخص.");

    expect(result.riskLevel).toBe("LOW");
    expect(result.findings).toHaveLength(0);
  });
});
