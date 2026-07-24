"use client";

import type { ContentKind, ProfessionalOfficialReference, ReviewResult } from "@/lib/types";
import { adoptLegacyKey, scopedKey } from "@/lib/user-scope";

// عنوان موجز لكل محتوى — موضوع قصير كامل مشتقّ من مطلع النص، لا مقطعٌ مقصوص في منتصف
// كلمة. يُؤخذ أول جملة كاملة، فإن طالت فأول كلماتها دون قطع كلمة ولا نقاط معلّقة.
export function deriveContentTitle(body: string): string {
  const clean = (body || "").replace(/\s+/g, " ").trim();
  if (!clean) return "محتوى دون عنوان";
  // نهاية أول جملة (نقطة/تعجب/سؤال/سطر جديد)
  let cut = clean.length;
  for (const mark of [".", "!", "؟", "\n", "؛"]) {
    const i = clean.indexOf(mark);
    if (i > 2 && i < cut) cut = i;
  }
  let title = clean.slice(0, cut).trim();
  const words = title.split(" ");
  if (words.length > 8) title = words.slice(0, 8).join(" ");
  title = title.replace(/[،:؛\-–—.\s]+$/u, "").trim();
  return title || "محتوى دون عنوان";
}

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
  // بقية معلومات السياق المدخلة — تُحفظ وتُسترجع عند فتح المحتوى (اختيارية لتوافق السجلات القديمة)
  specialty?: string;
  charLimit?: number | null;
  adCta?: string;
  adStyle?: string;
  scriptDuration?: string;
  scriptStyle?: string;
  articleLength?: string;
  status: "مسودة" | "قيد التحليل" | "بحاجة إلى معالجة" | "جاهز للاعتماد" | "معتمد";
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

// ── تصدير/استيراد السجل — بقرار مالكة المنصة: نقل السجل بين المتصفحات والعناوين بلا فقدان ──

export type RecordsExportPayload = {
  format: "lawyer-media-records";
  version: 1;
  exportedAt: string;
  records: StoredContentRecord[];
};

export function exportContentRecords(): RecordsExportPayload {
  return {
    format: "lawyer-media-records",
    version: 1,
    exportedAt: now(),
    records: loadContentRecords(),
  };
}

// استيراد غير تدميري: دمج بالمعرّف — الموجود يُحدَّث فقط إن كان المستورد أحدث، والجديد يُضاف، ولا يُحذف شيء
export function importContentRecords(payload: unknown): { added: number; updated: number; skipped: number } | null {
  const raw = payload as Partial<RecordsExportPayload> | StoredContentRecord[] | null;
  const incomingRaw = Array.isArray(raw) ? raw : Array.isArray(raw?.records) ? raw.records : null;
  if (!incomingRaw) return null;
  const incoming = normalizeStoredRecords(incomingRaw);
  if (!incoming.length && incomingRaw.length) return null;
  const existing = loadContentRecords();
  const byId = new Map(existing.map((r) => [r.id, r] as const));
  let added = 0, updated = 0, skipped = 0;
  for (const record of incoming) {
    const current = byId.get(record.id);
    if (!current) { byId.set(record.id, record); added++; continue; }
    if (new Date(record.updatedAt).getTime() > new Date(current.updatedAt).getTime()) {
      byId.set(record.id, record); updated++;
    } else {
      skipped++;
    }
  }
  saveContentRecords([...byId.values()]);
  return { added, updated, skipped };
}

// بقرارها: كل حساب يرى سجلاته فقط — المفتاح معزول باسم الحساب الداخل، مع تبنّي بيانات ما قبل العزل مرة واحدة
export function loadContentRecords(): StoredContentRecord[] {
  if (typeof window === "undefined") return [];
  try {
    adoptLegacyKey(CONTENT_RECORDS_KEY);
    return normalizeStoredRecords(JSON.parse(window.localStorage.getItem(scopedKey(CONTENT_RECORDS_KEY)) ?? "[]"));
  } catch {
    return [];
  }
}

export function saveContentRecords(records: StoredContentRecord[]) {
  if (typeof window === "undefined") return;
  const key = scopedKey(CONTENT_RECORDS_KEY);
  try {
    window.localStorage.setItem(key, JSON.stringify(records));
  } catch {
    // امتلاء حصة تخزين المتصفح — كان الحفظ يفشل هنا بصمت فيضيع التحليل رغم ظهوره
    // على الشاشة. الآن يُخفَّف الحمل تدريجياً (الأقدم أولاً) حتى ينجح الحفظ:
    // ١) إسقاط بيانات الصور الضخمة، ٢) إسقاط طبقة التحسين الشكلي من التحليلات القديمة
    // (لا تمس المخالفات ولا المؤشرات)، وإن استحال بعد كل ذلك يُرفع الخطأ صريحاً.
    const oldestFirst = [...records].sort((a, b) => String(a.updatedAt ?? "").localeCompare(String(b.updatedAt ?? "")));
    let saved = false;
    for (const record of oldestFirst) {
      for (const version of record.versions) {
        if (version.visuals?.some((visual) => visual.imageUrl)) {
          version.visuals = version.visuals.filter((visual) => !visual.imageUrl);
          if (version.visuals.length === 0) version.visuals = undefined;
        }
      }
      try { window.localStorage.setItem(key, JSON.stringify(records)); saved = true; break; } catch { /* واصل التخفيف */ }
    }
    if (!saved) {
      for (const record of oldestFirst) {
        for (const version of record.versions) {
          if (version.analysis?.aiEnhancement) version.analysis = { ...version.analysis, aiEnhancement: undefined };
        }
        try { window.localStorage.setItem(key, JSON.stringify(records)); saved = true; break; } catch { /* واصل التخفيف */ }
      }
    }
    if (!saved) {
      // ٣) كل المرئيات (حتى الرسوم) من كل النسخ — النصوص والأحكام أولى بالمساحة
      for (const record of records) {
        for (const version of record.versions) version.visuals = undefined;
      }
      try { window.localStorage.setItem(key, JSON.stringify(records)); saved = true; } catch { /* واصل */ }
    }
    // ملاحظة معمارية بأمر مالكة المنصة: تجريد النسخ من أحكامها ممنوع — النسخة بلا
    // حكمها تُفتح لاحقاً فتُعاد للحكم من جديد وحكم النموذج متقلب فيخترع ملاحظات على
    // نص كان نظيفاً (الحكم يسافر مع النص دائماً). عند الضيق: إسقاط سجل كامل أولى —
    // نسخته السحابية تعود كاملة بحكمها، بينما الحكم المجرّد محلياً لا يعود.
    if (!saved) {
      // ٥) الملاذ الأخير: إسقاط الأقدم واحداً فواحداً — أقل قدر ممكن فقط حتى ينجح
      // الحفظ، لا سقف عشوائي (نسخ المُسقَط في مزامنة الحساب السحابية وتعود بالسحب)
      const newestFirst = [...records].sort((a, b) => String(b.updatedAt ?? "").localeCompare(String(a.updatedAt ?? "")));
      while (newestFirst.length > 1 && !saved) {
        newestFirst.pop();
        records.length = 0;
        records.push(...newestFirst);
        try { window.localStorage.setItem(key, JSON.stringify(records)); saved = true; } catch { /* أسقط واحداً آخر */ }
      }
      if (!saved) window.localStorage.setItem(key, JSON.stringify(records)); // إن فشل حتى هذا: خطأ صريح — لا فشل صامت
    }
  }
  window.dispatchEvent(new Event("lawyer-media:records-updated"));
  // إشعار طبقة المزامنة السحابية — بأمر مالكة المنصة: الحساب يرى سجله على كل الأجهزة
  try { window.dispatchEvent(new CustomEvent("lm-records-changed")); } catch { /* بيئة بلا نافذة */ }
}

export function getActiveContentSelection() {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(window.localStorage.getItem(scopedKey(ACTIVE_CONTENT_KEY)) ?? "null") as unknown;
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
  window.localStorage.setItem(scopedKey(ACTIVE_CONTENT_KEY), JSON.stringify({ contentId, version }));
}

export function clearActiveContentSelection() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(scopedKey(ACTIVE_CONTENT_KEY));
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

type StoredContextExtras = {
  specialty?: string;
  charLimit?: number | null;
  adCta?: string;
  adStyle?: string;
  scriptDuration?: string;
  scriptStyle?: string;
  articleLength?: string;
};

// يطبّق حقول السياق الإضافية على إصدار مخزَّن — مصدر واحد للحفظ يمنع نسيان أي حقل
function applyContextExtras(version: StoredContentVersion, extras: StoredContextExtras) {
  version.specialty = extras.specialty;
  version.charLimit = extras.charLimit ?? null;
  version.adCta = extras.adCta;
  version.adStyle = extras.adStyle;
  version.scriptDuration = extras.scriptDuration;
  version.scriptStyle = extras.scriptStyle;
  version.articleLength = extras.articleLength;
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
} & StoredContextExtras) {
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

  applyContextExtras(version, input);
  record.title = input.title?.trim() || deriveContentTitle(input.body) || record.title;
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
} & StoredContextExtras) {
  const records = loadContentRecords();
  const contentId = input.contentId ?? makeId("content");
  let record = records.find((item) => item.id === contentId);
  const timestamp = now();

  if (!record) {
    record = {
      id: contentId,
      title: input.title?.trim() || deriveContentTitle(input.body),
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
  applyContextExtras(version, input);
  version.analysis = input.review;
  version.references = referencesFromReview(input.review);
  const onlyApprovalRemains =
    input.review.readinessDecision.blockers.length > 0 &&
    input.review.readinessDecision.blockers.every((blocker) => blocker.includes("اعتماد"));
  version.status =
    (input.review.findings.length === 0 && input.review.languageQuality.passed && onlyApprovalRemains) || input.review.exportAllowed
      ? "جاهز للاعتماد"
      : "بحاجة إلى معالجة";
  version.updatedAt = timestamp;
  record.status = version.status;
  record.title = input.title?.trim() || deriveContentTitle(input.body) || record.title;
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

// المقياس الواحد لحواجز الاعتماد — بأمر مالكة المنصة: زر الاعتماد وسطر «الجاهزية»
// وأي عرض آخر يقرؤون من هذه الدالة وحدها، فلا يظهر «جاهزة — لا حواجز» مع «تعذر
// الاعتماد» معاً أبداً. القائمة الفارغة = يجوز الاعتماد.
export function approvalBarriers(version: StoredContentVersion | undefined): string[] {
  if (!version?.analysis) return ["لا يوجد تحليل محفوظ لهذه النسخة — أعد التحليل أولاً"];
  const barriers: string[] = [];
  if (version.analysis.findings.some((finding) => !finding.resolved)) barriers.push("ملاحظات امتثالية لم تُعالج بعد");
  if (!version.analysis.languageQuality.passed) barriers.push("جودة اللغة دون الحد المطلوب");
  else if ((version.analysis.languageQuality.issues?.length ?? 0) > 0) barriers.push("ملاحظات لغوية أو أسلوبية لم تُعالج بعد");
  if (["بالغ", "حرج", "مرتفع"].includes(version.analysis.riskLevel)) barriers.push("مستوى المخاطر مرتفع");
  return barriers;
}

export function approveContentVersion(contentId: string, versionNumber: number) {
  const records = loadContentRecords();
  const record = records.find((item) => item.id === contentId);
  const version = record?.versions.find((item) => item.version === versionNumber);
  if (!record || !version || approvalBarriers(version).length > 0) return null;
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
    version.visuals = version.visuals.filter((v) => !v.imageUrl || v.imageUrl.length < 320_000);
    try {
      saveContentRecords(records);
      return "saved-partial";
    } catch {
      return "failed";
    }
  }
}

// تعديل مرئي محفوظ داخل إصدار — بأمر مالكة المنصة: المستخدم مسؤول عن محتواه فله
// الصلاحية الكاملة لتحرير نصوص المرئي المحفوظ أو تسميته. يُحدَّث SVG و/أو التسمية
// ويُبصم الوقت فتلتقطه المزامنة السحابية وتنشره على كل الأجهزة.
export function updateVersionVisual(
  contentId: string,
  versionNumber: number,
  visualId: string,
  patch: { svg?: string; visualTypeLabel?: string }
): boolean {
  const records = loadContentRecords();
  const record = records.find((item) => item.id === contentId);
  const version = record?.versions.find((item) => item.version === versionNumber);
  const visual = version?.visuals?.find((v) => v.id === visualId);
  if (!record || !version || !visual) return false;
  if (typeof patch.svg === "string") visual.svg = patch.svg;
  if (typeof patch.visualTypeLabel === "string" && patch.visualTypeLabel.trim()) visual.visualTypeLabel = patch.visualTypeLabel.trim();
  const timestamp = now();
  version.updatedAt = timestamp;
  record.updatedAt = timestamp;
  try {
    saveContentRecords(records);
    return true;
  } catch {
    return false;
  }
}

// حذف مرئي محفوظ من إصدار — صلاحية كاملة للمستخدم على محتواه
export function deleteVersionVisual(contentId: string, versionNumber: number, visualId: string): boolean {
  const records = loadContentRecords();
  const record = records.find((item) => item.id === contentId);
  const version = record?.versions.find((item) => item.version === versionNumber);
  if (!record || !version || !version.visuals?.length) return false;
  const before = version.visuals.length;
  version.visuals = version.visuals.filter((v) => v.id !== visualId);
  if (version.visuals.length === before) return false;
  const timestamp = now();
  version.updatedAt = timestamp;
  record.updatedAt = timestamp;
  try {
    saveContentRecords(records);
    return true;
  } catch {
    return false;
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
