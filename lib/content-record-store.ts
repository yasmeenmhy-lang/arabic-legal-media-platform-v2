"use client";

import type { ContentKind, ProfessionalOfficialReference, ReviewResult } from "@/lib/types";

export const CONTENT_RECORDS_KEY = "lawyer-media:content-records:v2";
export const ACTIVE_CONTENT_KEY = "lawyer-media:active-content";
export const DEMO_USER_NAME = "أحمد عبدالعزيز";

export type ContentAction = {
  id: string;
  action: "CREATED" | "ANALYZED" | "SAVED" | "APPROVED" | "EDITED" | "SHARED" | "ARCHIVED";
  label: string;
  actor: string;
  at: string;
  fromStatus?: string;
  toStatus?: string;
  details?: string;
};

export type StoredContentVersion = {
  id: string;
  contentId: string;
  version: number;
  body: string;
  contentType: ContentKind;
  contentTypeLabel: string;
  channel: string;
  audience: string;
  purpose: string;
  status: "مسودة" | "قيد التحليل" | "يحتاج إلى تعديل" | "جاهز للاعتماد" | "معتمد";
  createdAt: string;
  updatedAt: string;
  analysis?: ReviewResult;
  references: ProfessionalOfficialReference[];
  approvedAt?: string;
  approvedBy?: string;
};

export type StoredContentRecord = {
  id: string;
  title: string;
  currentVersion: number;
  approvedVersion?: number;
  status: StoredContentVersion["status"];
  versions: StoredContentVersion[];
  actions: ContentAction[];
  archived?: boolean;
  sharingStatus: "غير متاح" | "جاهز للمشاركة" | "تمت المشاركة";
  createdAt: string;
  updatedAt: string;
};

function now() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadContentRecords(): StoredContentRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(CONTENT_RECORDS_KEY) ?? "[]") as StoredContentRecord[];
  } catch {
    return [];
  }
}

export function saveContentRecords(records: StoredContentRecord[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONTENT_RECORDS_KEY, JSON.stringify(records));
  window.dispatchEvent(new Event("lawyer-media:records-updated"));
}

export function getActiveContentSelection() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(window.localStorage.getItem(ACTIVE_CONTENT_KEY) ?? "null") as { contentId: string; version: number } | null;
  } catch {
    return null;
  }
}

export function setActiveContentSelection(contentId: string, version: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACTIVE_CONTENT_KEY, JSON.stringify({ contentId, version }));
}

export function clearActiveContentSelection() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(ACTIVE_CONTENT_KEY);
}

export function referencesFromReview(review: ReviewResult): ProfessionalOfficialReference[] {
  return review.findings.map((finding) => ({
    id: finding.traceabilityId,
    referenceName: finding.sourceDocument,
    ruleOrRegulationName: finding.sourceDocument,
    articleOrRuleNumber: finding.legalReference,
    relatedText: finding.articleTextExcerpt,
    relatedContentPhrase: finding.evidence,
    relianceReason: finding.legalExplanation || finding.explanation,
    contentEffect: `${finding.issue} — الأثر المحتمل: ${finding.potentialImpact}`,
    practicalGuidance: finding.suggestedSaferWording || finding.advice,
    officialUrl: finding.sourceUrl
  }));
}

export function upsertAnalyzedVersion(input: {
  contentId?: string;
  body: string;
  contentType: ContentKind;
  contentTypeLabel: string;
  channel: string;
  audience: string;
  purpose: string;
  review: ReviewResult;
}) {
  const records = loadContentRecords();
  const contentId = input.contentId ?? makeId("content");
  let record = records.find((item) => item.id === contentId);
  const timestamp = now();

  if (!record) {
    record = {
      id: contentId,
      title: input.body.trim().slice(0, 72) || "محتوى دون عنوان",
      currentVersion: 1,
      status: "قيد التحليل",
      versions: [],
      actions: [{
        id: makeId("action"),
        action: "CREATED",
        label: "إنشاء المحتوى",
        actor: DEMO_USER_NAME,
        at: timestamp,
        toStatus: "قيد التحليل"
      }],
      sharingStatus: "غير متاح",
      createdAt: timestamp,
      updatedAt: timestamp
    };
    records.unshift(record);
  }

  let version = record.versions.find((item) => item.version === record!.currentVersion);
  const approvedCurrentWasEdited = Boolean(version?.approvedAt && version.body !== input.body);
  if (!version || approvedCurrentWasEdited) {
    const nextVersion = record.versions.length ? Math.max(...record.versions.map((item) => item.version)) + 1 : 1;
    version = {
      id: `${contentId}-v${nextVersion}`,
      contentId,
      version: nextVersion,
      body: input.body,
      contentType: input.contentType,
      contentTypeLabel: input.contentTypeLabel,
      channel: input.channel,
      audience: input.audience,
      purpose: input.purpose,
      status: "قيد التحليل",
      createdAt: timestamp,
      updatedAt: timestamp,
      references: []
    };
    record.versions.push(version);
    record.currentVersion = nextVersion;
    if (approvedCurrentWasEdited) {
      record.actions.unshift({
        id: makeId("action"),
        action: "EDITED",
        label: "إنشاء إصدار جديد بعد تعديل محتوى معتمد",
        actor: DEMO_USER_NAME,
        at: timestamp,
        fromStatus: "معتمد",
        toStatus: "قيد التحليل",
        details: `الإصدار ${nextVersion}`
      });
    }
  }

  version.body = input.body;
  version.contentType = input.contentType;
  version.contentTypeLabel = input.contentTypeLabel;
  version.channel = input.channel;
  version.audience = input.audience;
  version.purpose = input.purpose;
  version.analysis = input.review;
  version.references = referencesFromReview(input.review);
  const onlyApprovalRemains =
    input.review.readinessDecision.blockers.length > 0 &&
    input.review.readinessDecision.blockers.every((blocker) => blocker.includes("اعتماد"));
  version.status =
    (input.review.findings.length === 0 && input.review.languageQuality.passed && onlyApprovalRemains) || input.review.exportAllowed
      ? "جاهز للاعتماد"
      : "يحتاج إلى تعديل";
  version.updatedAt = timestamp;
  record.status = version.status;
  record.title = input.body.trim().slice(0, 72) || record.title;
  record.updatedAt = timestamp;
  record.actions.unshift({
    id: makeId("action"),
    action: "ANALYZED",
    label: "تحليل المحتوى",
    actor: DEMO_USER_NAME,
    at: timestamp,
    toStatus: version.status,
    details: `الإصدار ${version.version} — امتثال ${input.review.complianceScore}% — مخاطر ${input.review.riskLevel}`
  });
  saveContentRecords(records);
  setActiveContentSelection(contentId, version.version);
  return { record, version };
}

export function approveContentVersion(contentId: string, versionNumber: number) {
  const records = loadContentRecords();
  const record = records.find((item) => item.id === contentId);
  const version = record?.versions.find((item) => item.version === versionNumber);
  if (
    !record ||
    !version?.analysis ||
    version.analysis.findings.some((finding) => !finding.resolved) ||
    !version.analysis.languageQuality.passed ||
    ["حرج", "مرتفع"].includes(version.analysis.riskLevel)
  ) return null;
  const timestamp = now();
  version.status = "معتمد";
  version.approvedAt = timestamp;
  version.approvedBy = DEMO_USER_NAME;
  version.updatedAt = timestamp;
  record.approvedVersion = versionNumber;
  record.currentVersion = versionNumber;
  record.status = "معتمد";
  record.sharingStatus = "جاهز للمشاركة";
  record.updatedAt = timestamp;
  record.actions.unshift({
    id: makeId("action"),
    action: "APPROVED",
    label: "اعتماد المحتوى ونتائج التحليل والمراجع",
    actor: DEMO_USER_NAME,
    at: timestamp,
    fromStatus: "جاهز للاعتماد",
    toStatus: "معتمد",
    details: `الإصدار ${versionNumber} — ${version.references.length} مرجعًا مهنيًا ورسميًا`
  });
  saveContentRecords(records);
  return { record, version };
}

export function markContentShared(contentId: string, versionNumber: number) {
  const records = loadContentRecords();
  const record = records.find((item) => item.id === contentId);
  const version = record?.versions.find((item) => item.version === versionNumber);
  if (!record || !version?.approvedAt) return false;
  const timestamp = now();
  record.sharingStatus = "تمت المشاركة";
  record.updatedAt = timestamp;
  record.actions.unshift({
    id: makeId("action"),
    action: "SHARED",
    label: "تجهيز المحتوى للمشاركة",
    actor: DEMO_USER_NAME,
    at: timestamp,
    fromStatus: "معتمد",
    toStatus: "معتمد",
    details: `الإصدار ${versionNumber}`
  });
  saveContentRecords(records);
  return true;
}
