import { describe, expect, it } from "vitest";
import { initialScoringProfiles, resolveScoringProfile, validateScoringProfile } from "@/lib/scoring-profiles";

describe("scoring profiles", () => {
  it("selects a specific active profile from content type and channel", () => {
    expect(resolveScoringProfile("advertisement", "LinkedIn").id).toBe("professional-advertisement");
    expect(resolveScoringProfile("script", "TikTok").id).toBe("video-content");
    expect(resolveScoringProfile("article", "الموقع الإلكتروني").id).toBe("article-content");
  });

  it("requires readiness weights to total 100 before activation", () => {
    const invalid = structuredClone(initialScoringProfiles[0]);
    invalid.readinessWeights.approval = 5;
    expect(validateScoringProfile(invalid)).toContain("يجب أن يكون مجموع أوزان جاهزية النشر 100%.");
  });
});
