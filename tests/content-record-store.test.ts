// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  approveContentVersion,
  loadContentRecords,
  markContentShared,
  upsertAnalyzedVersion
} from "@/lib/content-record-store";
import { reviewContent } from "@/lib/services/review-service";

describe("versioned content records", () => {
  beforeEach(() => window.localStorage.clear());

  it("preserves an approved version and creates a new current version after editing", () => {
    const firstReview = reviewContent("يقدم المكتب محتوى توعوياً عاماً وفق الأنظمة والتعليمات ذات العلاقة.", "advertisement", { contentType: "إعلان", channel: "X" });
    const first = upsertAnalyzedVersion({
      body: "يقدم المكتب محتوى توعوياً عاماً وفق الأنظمة والتعليمات ذات العلاقة.",
      contentType: "advertisement",
      contentTypeLabel: "إعلان",
      channel: "X",
      audience: "الجمهور العام",
      purpose: "رفع الوعي",
      review: firstReview
    });
    approveContentVersion(first.record.id, first.version.version);

    const secondReview = reviewContent("نقدم مراجعة مهنية للخيارات المتاحة", "advertisement", { contentType: "إعلان", channel: "X" });
    const second = upsertAnalyzedVersion({
      contentId: first.record.id,
      body: "نقدم مراجعة مهنية للخيارات المتاحة",
      contentType: "advertisement",
      contentTypeLabel: "إعلان",
      channel: "X",
      audience: "الجمهور العام",
      purpose: "رفع الوعي",
      review: secondReview
    });

    const record = loadContentRecords()[0];
    expect(second.version.version).toBe(2);
    expect(record.approvedVersion).toBe(1);
    expect(record.versions.find((version) => version.version === 1)?.approvedAt).toBeTruthy();
    expect(record.versions.find((version) => version.version === 2)?.approvedAt).toBeUndefined();
  });

  it("prevents approval of a version with unresolved critical findings", () => {
    const review = reviewContent("نضمن لك الفوز بالقضية", "advertisement", { contentType: "إعلان", channel: "X" });
    const saved = upsertAnalyzedVersion({
      body: "نضمن لك الفوز بالقضية",
      contentType: "advertisement",
      contentTypeLabel: "إعلان",
      channel: "X",
      audience: "الجمهور العام",
      purpose: "الترويج",
      review
    });

    expect(approveContentVersion(saved.record.id, saved.version.version)).toBeNull();
  });

  it("blocks sharing until the exact version is approved", () => {
    const review = reviewContent("محتوى مهني واضح", "post", { contentType: "منشور", channel: "LinkedIn" });
    const saved = upsertAnalyzedVersion({
      body: "محتوى مهني واضح",
      contentType: "post",
      contentTypeLabel: "منشور",
      channel: "LinkedIn",
      audience: "الجمهور العام",
      purpose: "التثقيف",
      review
    });
    expect(markContentShared(saved.record.id, saved.version.version)).toBe(false);
    approveContentVersion(saved.record.id, saved.version.version);
    expect(markContentShared(saved.record.id, saved.version.version)).toBe(true);
  });
});
