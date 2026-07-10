"use client";

import type { ContentKind, ProfessionalOfficialReference, ReviewResult } from "@/lib/types";

export const CONTENT_RECORDS_KEY = "lawyer-media:content-records:v2";
export const ACTIVE_CONTENT_KEY = "lawyer-media:active-content";
export const DEMO_USER_NAME = "ياسمين";

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

// مرئي محفوظ مع الإصدار — بقرار مالكة المنصة: الرسومات والمحتوى البصري ينتقلان مع المحتوى
// ويُحفظان في السجل فلا يختفيان عند مغادرة الصفحة
export type StoredVisual = {
  id: string;
  visualType: string;        // مفتاح المحرك: infographic | chart | mindmap | quote_card | carousel | storyboard | motion_script | image
  visualTypeLabel: string;   // التسمية العربية للعرض في السجل
  svg?: string;              // مصدر SVG الكامل (قابل للتكبير والتصدير)
  imageUrl?: string;         // رابط/بيانات الصورة للمرئي الاحترافي أو صورة الوصف
  provider?: string;         // مزود المرئي الاحترافي إن وجد
  createdAt: string;
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
  visuals?: StoredVisual[];
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

export function isCompatibleReviewResult(value: unknown): value is ReviewResult {
  if (!value || typeof value !== "object") return false;
  const review = value as Partial<ReviewResult>;
  return Boolean(
    review.publicationDecision &&
    typeof review.publicationDecision.label === "string" &&
    review.confidence &&
    typeof review.confidence.label === "string" &&
    review.readinessDecision &&
    Array.isArray(review.readinessDecision.blockers) &&
    Array.isArray(review.channelRecommendations) &&
    Array.isArray(review.decisionWorkflow) &&
    Array.isArray(review.findings) &&
    review.languageQuality &&
    Array.isArray(review.languageQuality.issues) &&
    review.contentQualityScoreExplanation &&
    Array.isArray((review.contentQualityScoreExplanation as { factors?: unknown }).factors)
  );
}

function normalizeStoredRecords(value: unknown): StoredContentRecord[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((candidate) => {
    if (!candidate || typeof candidate !== "object") return [];
    const record = candidate as Partial<StoredContentRecord>;
    if (
      typeof record.id !== "string" ||
      typeof record.title !== "string" ||
      !Array.isArray(record.versions)
    ) return [];

    const versions = record.versions.flatMap((candidateVersion) => {
      if (!candidateVersion || typeof candidateVersion !== "object") return [];
      const version = candidateVersion as Partial<StoredContentVersion>;
      if (
        typeof version.id !== "string" ||
        typeof version.contentId !== "string" ||
        typeof version.version !== "number" ||
        typeof version.body !== "string" ||
        typeof version.contentType !== "string"
      ) return [];

      const analysis = isCompatibleReviewResult(version.analysis) ? version.analysis : undefined;
      if (analysis) {
        analysis.findings = analysis.findings.map((f) => ({
          ...f,
          legalExplanation: f.legalExplanation?.replace("رصد التحليل الدلالي عبارة", "رصد التحليل عبارة") ?? f.legalExplanation
        }));
      }
      const visuals = Array.isArray(version.visuals)
        ? version.visuals.filter((v): v is StoredVisual =>
            Boolean(v && typeof v === "object" && typeof (v as StoredVisual).id === "string" &&
              (typeof (v as StoredVisual).svg === "string" || typeof (v as StoredVisual).imageUrl === "string")))
        : undefined;
      return [{
        ...version,
        channel: typeof version.channel === "string" ? version.channel : "LinkedIn",
        audience: typeof version.audience === "string" ? version.audience : "الجمهور العام",
        purpose: typeof version.purpose === "string" ? version.purpose : "التثقيف",
        references: Array.isArray(version.references) ? version.references : [],
        visuals,
        analysis
      } as StoredContentVersion];
    });

    return [{
      ...record,
      versions,
      actions: Array.isArray(record.actions) ? record.actions : [],
      sharingStatus: record.sharingStatus ?? "غير متاح"
    } as StoredContentRecord];
  });
}

export function loadContentRecords(): StoredContentRecord[] {
  if (typeof window === "undefined") return [];
  try {
    return normalizeStoredRecords(JSON.parse(window.localStorage.getItem(CONTENT_RECORDS_KEY) ?? "[]"));
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
    const value = JSON.parse(window.localStorage.getItem(ACTIVE_CONTENT_KEY) ?? "null") as unknown;
    if (!value || typeof value !== "object") return null;
    const selection = value as { contentId?: unknown; version?: unknown };
    return typeof selection.contentId === "string" && typeof selection.version === "number"
      ? { contentId: selection.contentId, version: selection.version }
      : null;
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

export function saveContentDraft(input: {
  contentId: string;
  title?: string;
  body: string;
  contentType: ContentKind;
  contentTypeLabel: string;
  channel: string;
  audience: string;
  purpose: string;
}) {
  const records = loadContentRecords();
  const record = records.find((item) => item.id === input.contentId);
  const current = record?.versions.find((item) => item.version === record.currentVersion);
  if (!record || !current) return null;

  const timestamp = now();
  const previousStatus = current.status;
  let version = current;
  if (current.approvedAt) {
    const nextVersion = Math.max(...record.versions.map((item) => item.version)) + 1;
    version = {
      id: `${record.id}-v${nextVersion}`,
      contentId: record.id,
      version: nextVersion,
      body: input.body,
      contentType: input.contentType,
      contentTypeLabel: input.contentTypeLabel,
      channel: input.channel,
      audience: input.audience,
      purpose: input.purpose,
      status: "مسودة",
      createdAt: timestamp,
      updatedAt: timestamp,
      references: [],
      // بقرار مالكة المنصة: المرئيات تنتقل مع المحتوى — الإصدار الجديد يرث مرئيات سابقه
      visuals: current.visuals?.length ? [...current.visuals] : undefined
    };
    record.versions.push(version);
    record.currentVersion = nextVersion;
  } else {
    version.body = input.body;
    version.contentType = input.contentType;
    version.contentTypeLabel = input.contentTypeLabel;
    version.channel = input.channel;
    version.audience = input.audience;
    version.purpose = input.purpose;
    version.status = "مسودة";
    version.analysis = undefined;
    version.references = [];
    version.updatedAt = timestamp;
  }

  record.title = input.title?.trim() || input.body.trim().slice(0, 72) || record.title;
  record.status = "مسودة";
  if (!record.approvedVersion) record.sharingStatus = "غير متاح";
  record.updatedAt = timestamp;
  record.actions.unshift({
    id: makeId("action"),
    action: current.approvedAt ? "EDITED" : "SAVED",
    label: current.approvedAt ? "إنشاء إصدار جديد من محتوى معتمد" : "حفظ تعديلات المسودة",
    actor: DEMO_USER_NAME,
    at: timestamp,
    fromStatus: previousStatus,
    toStatus: "مسودة",
    details: `الإصدار ${version.version} — يلزم إعادة التحليل قبل الاعتماد`
  });
  saveContentRecords(records);
  setActiveContentSelection(record.id, version.version);
  return { record, version };
}

export function upsertAnalyzedVersion(input: {
  contentId?: string;
  title?: string;
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
      title: input.title?.trim() || input.body.trim().slice(0, 72) || "محتوى دون عنوان",
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
    // بقرار مالكة المنصة: المرئيات تنتقل مع المحتوى — الإصدار الجديد يرث مرئيات سابقه فلا تختفي
    const inheritedVisuals = version?.visuals?.length ? [...version.visuals] : undefined;
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
      references: [],
      visuals: inheritedVisuals
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
  record.title = input.title?.trim() || input.body.trim().slice(0, 72) || record.title;
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
    ["بالغ", "حرج", "مرتفع"].includes(version.analysis.riskLevel)
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
  setActiveContentSelection(record.id, versionNumber);
  return { record, version };
}

// إلحاق مرئيات بإصدار محفوظ — مع تراجع آمن عند امتلاء حصة التخزين:
// يُحتفظ بمرئيات SVG (نصية خفيفة) وتُسقط بيانات الصور الضخمة فقط عند الضرورة
export function attachVisualsToVersion(
  contentId: string,
  versionNumber: number,
  visuals: Omit<StoredVisual, "id" | "createdAt">[]
): "saved" | "saved-partial" | "failed" {
  if (!visuals.length) return "failed";
  const records = loadContentRecords();
  const record = records.find((item) => item.id === contentId);
  const version = record?.versions.find((item) => item.version === versionNumber);
  if (!record || !version) return "failed";
  const timestamp = now();
  const stamped: StoredVisual[] = visuals.map((v) => ({ ...v, id: makeId("visual"), createdAt: timestamp }));
  version.visuals = [...(version.visuals ?? []), ...stamped];
  version.updatedAt = timestamp;
  record.updatedAt = timestamp;
  record.actions.unshift({
    id: makeId("action"),
    action: "SAVED",
    label: "حفظ المرئيات مع المحتوى في السجل",
    actor: DEMO_USER_NAME,
    at: timestamp,
    details: `الإصدار ${versionNumber} — ${stamped.map((v) => v.visualTypeLabel).join("، ")}`
  });
  try {
    saveContentRecords(records);
    return "saved";
  } catch {
    version.visuals = version.visuals.filter((v) => !v.imageUrl || v.imageUrl.length < 200_000);
    try {
      saveContentRecords(records);
      return "saved-partial";
    } catch {
      return "failed";
    }
  }
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
  setActiveContentSelection(record.id, versionNumber);
  return true;
}
