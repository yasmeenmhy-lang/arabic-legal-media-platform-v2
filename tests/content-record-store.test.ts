// @vitest-environment jsdom

import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  approveContentVersion,
  CONTENT_RECORDS_KEY,
  loadContentRecords,
  markContentShared,
  saveContentDraft,
  upsertAnalyzedVersion
} from "@/lib/content-record-store";
import { reviewContent } from "@/lib/services/review-service";

describe("versioned content records", () => {
  beforeAll(() => {
    process.env.SEMANTIC_ANALYSIS_ENABLED = "false";
  });
  beforeEach(() => window.localStorage.clear());

  it("preserves an approved version and creates a new current version after editing", async () => {
    const firstReview = await reviewContent("يقدم المكتب محتوى توعوياً عاماً وفق الأنظمة والتعليمات ذات العلاقة.", "advertisement", { contentType: "إعلان", channel: "X" });
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

    const secondReview = await reviewContent("نقدم مراجعة مهنية للخيارات المتاحة", "advertisement", { contentType: "إعلان", channel: "X" });
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

  it("prevents approval of a version with unresolved critical findings", async () => {
    const review = await reviewContent("نضمن لك الفوز بالقضية", "advertisement", { contentType: "إعلان", channel: "X" });
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

  it("opens legacy saved content safely while requiring re-analysis", () => {
    window.localStorage.setItem(CONTENT_RECORDS_KEY, JSON.stringify([{
      id: "legacy-content",
      title: "محتوى قديم",
      currentVersion: 1,
      status: "جاهز للاعتماد",
      sharingStatus: "غير متاح",
      versions: [{
        id: "legacy-v1",
        contentId: "legacy-content",
        version: 1,
        body: "محتوى محفوظ قبل تحديث نموذج القرار",
        contentType: "post",
        contentTypeLabel: "منشور",
        channel: "LinkedIn",
        audience: "الجمهور العام",
        purpose: "التثقيف",
        status: "جاهز للاعتماد",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        analysis: {
          complianceScore: 95,
          riskLevel: "منخفض",
          languageQuality: { passed: true, score: 95, issues: [] },
          findings: [],
          governedRewrites: []
        },
        references: []
      }],
      actions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }]));

    const record = loadContentRecords()[0];
    expect(record.versions[0].body).toContain("محتوى محفوظ");
    expect(record.versions[0].analysis).toBeUndefined();
  });

  it("blocks sharing until the exact version is approved", async () => {
    const review = await reviewContent("محتوى مهني واضح", "post", { contentType: "منشور", channel: "LinkedIn" });
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

  it("persists edited draft fields and invalidates the previous analysis until reanalysis", async () => {
    const review = await reviewContent("محتوى مهني توعوي واضح", "post", { contentType: "منشور", channel: "LinkedIn" });
    const saved = upsertAnalyzedVersion({
      body: "محتوى مهني توعوي واضح",
      contentType: "post",
      contentTypeLabel: "منشور",
      channel: "LinkedIn",
      audience: "الجمهور العام",
      purpose: "التثقيف",
      review
    });

    const edited = saveContentDraft({
      contentId: saved.record.id,
      body: "محتوى مهني توعوي واضح بعد التعديل",
      contentType: "post",
      contentTypeLabel: "منشور",
      channel: "X",
      audience: "منشآت ورواد أعمال",
      purpose: "رفع الوعي"
    });

    expect(edited?.version.body).toContain("بعد التعديل");
    expect(edited?.version.channel).toBe("X");
    expect(edited?.version.analysis).toBeUndefined();
    expect(edited?.version.references).toEqual([]);
    expect(loadContentRecords()[0].actions[0].action).toBe("SAVED");
  });
});
