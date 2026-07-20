"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  CONTENT_RECORDS_KEY,
  ACTIVE_CONTENT_KEY,
} from "@/lib/content-record-store";
import type { ReviewResult } from "@/lib/types";

const MOCK_BODY =
  "اليوم شرينا سيارات كلاسيكية ووقفناها قدام مكتبنا رمزاً للأصالة.. السنابة الجاية بتشوفون شي يعجبكم";

const MOCK_REVIEW: ReviewResult = {
  reviewContext: {
    reviewId: "preview-001",
    shortExcerpt: "اليوم شرينا سيارات كلاسيكية...",
    contentType: "post",
    channel: "X",
    audience: "الجمهور العام",
    purpose: "رفع الوعي بالخدمات المهنية",
    reviewedAt: new Date().toISOString(),
  },
  languageQuality: {
    passed: false,
    score: 72,
    threshold: 80,
    normalizedText: MOCK_BODY,
    improvedDraft: 'اقتنينا اليوم سيارات كلاسيكية ووقفناها أمام مكتبنا رمزاً للأصالة.',
    issues: [
      {
        id: "lang-1",
        category: "style",
        severity: "medium",
        message: "الكلمة \"شرينا\" عامية — الصواب \"اشترينا\" أو \"اقتنينا\"",
        excerpt: "شرينا",
        suggestion: "استبدل \"شرينا\" بـ \"اشترينا\" أو \"اقتنينا\" للحفاظ على مستوى لغوي مناسب للمهنة القانونية.",
      },
      {
        id: "lang-2",
        category: "style",
        severity: "low",
        message: "\"قدام\" عامية — الصواب \"أمام\"",
        excerpt: "قدام",
        suggestion: "استبدل \"قدام\" بـ \"أمام\".",
      },
    ],
    categoryScores: { spelling: 95, grammar: 88, style: 55, readability: 80, "اتساق المصطلحات": 90 },
    reviewedAt: new Date().toISOString(),
  },
  professionalismScore: 100,
  contentQualityScore: 44,
  contentQualityScoreExplanation: {
    finalScore: 44,
    redLine: true,
    factors: [
      { key: "compliance", label: "الامتثال", sourceScore: 30, weight: 0.4, weightedScore: 12 },
      { key: "risk",       label: "المخاطر",  sourceScore: 55, weight: 0.3, weightedScore: 16.5 },
      { key: "professionalism", label: "الجوانب المهنية", sourceScore: 100, weight: 0.2, weightedScore: 20 },
      { key: "language",  label: "اللغة",    sourceScore: 72,  weight: 0.1, weightedScore: 7.2 },
    ],
  },
  complianceScore: 30,
  complianceScoreExplanation: {
    modelVersion: "v2",
    baseScore: 100,
    totalDeduction: 70,
    finalScore: 30,
    calculatedFromFindingsOnly: true,
    contributions: [],
  },
  riskLevel: "متوسط",
  riskScore: 55,
  riskScoreExplanation: {
    modelVersion: "v2",
    score: 55,
    level: "متوسط",
    findingCount: 2,
    severityContribution: 25,
    categoryContribution: 15,
    impactContribution: 10,
    domainContribution: 3,
    countContribution: 2,
    contributions: [],
    affectedParties: ["الموكل", "المهنة"],
    explanation: "المحتوى يبرز المظاهر المادية بدلاً من الخدمة القانونية مما يضر بصورة المحامي المهنية.",
    fix: "ركّز المحتوى على الخدمات القانونية وتجنب ربط المكتب بالمقتنيات المادية.",
  },
  publishingReadinessScore: 25,
  publishingReadinessExplanation: {
    modelVersion: "v2",
    finalScore: 25,
    metadataCompletenessScore: 100,
    reviewStatus: "NEEDS_CORRECTION",
    allPassed: false,
    gates: [
      { key: "compliance", label: "الامتثال", passed: false, sourceValue: 30, threshold: "≥ 70%", reason: "مخالفات ق38 وق2" },
      { key: "risk",       label: "المخاطر",  passed: false, sourceValue: 55, threshold: "≤ 50%", reason: "مستوى مخاطر متوسط" },
      { key: "professionalism", label: "الكتابة", passed: true,  sourceValue: 100, threshold: "≥ 80%", reason: "الأسلوب مستوفٍ للمعايير المهنية المعتمدة" },
      { key: "language",  label: "اللغة",    passed: false, sourceValue: 72,  threshold: "≥ 80%", reason: "ألفاظ عامية" },
    ],
  },
  reviewStatus: "NEEDS_CORRECTION",
  summary: "المحتوى يخالف قواعد الإعلان ويُظهر مظاهر مادية تخل بالمعايير المهنية المعتمدة. يُنصح بمراجعة شاملة قبل النشر.",
  findings: [
    {
      traceabilityId: "f-001",
      legalKnowledgeEntryId: "kb-038",
      sourceDocumentId: "sdoc-nba",
      title: "إبراز مقتنيات مادية في الإعلان القانوني",
      category: "ضوابط الإعلان",
      domain: "نظامي",
      potentialImpact: "مرتفع",
      weight: 35,
      scoreImpact: -35,
      issue: "يُظهر المنشور شراء سيارات كلاسيكية كرمز للمكتب — وهو ما يدخل في باب الإعلان المادي المحظور.",
      severity: "مرتفع",
      businessSeverity: "high",
      resolved: false,
      riskDimensions: ["reputational", "legal"],
      evidence: "اليوم شرينا سيارات كلاسيكية ووقفناها قدام مكتبنا رمزاً للأصالة..",
      matchedPattern: "شرينا سيارات.*مكتب",
      contentClassification: "إعلان مضلل محتمل",
      advice: "عدّل المحتوى ليركز على الخدمة القانونية بدلاً من المظاهر المادية.",
      suggestedSaferWording: "عدّل المحتوى ليركز على الخدمة القانونية بدلاً من المظاهر المادية للمكتب.",
      legalCitation: "المادة 38 — قواعد السلوك المهني للمحامين",
      sourceDocument: "قواعد السلوك المهني للمحامين",
      legalReference: "المادة 38 — ضوابط الإعلان",
      articleTitle: "ضوابط الإعلان عن الخدمات القانونية",
      articleTextExcerpt: "لا يجوز للمحامي الإعلان عن مكتبه بأساليب تقوم على عرض المظاهر المادية.",
      explanation: "المنشور يُظهر مقتنيات مادية (سيارات كلاسيكية) كدليل على مكانة المكتب، وهو مخالف لضوابط الإعلان المهنية.",
      legalExplanation: "تحظر المادة 38 استخدام أساليب الإعلان القائمة على المظاهر المادية لأنها تُخل بوقار المهنة القانونية.",
      reviewOutcome: "رصدت ملاحظة",
      confidenceLevel: "مرتفع",
      sourceUrl: "https://www.moj.gov.sa/ar/RulesAndRegulations/Pages/LawyerRules.aspx",
    },
    {
      traceabilityId: "f-002",
      legalKnowledgeEntryId: "kb-002",
      sourceDocumentId: "sdoc-nba",
      title: "تهديد كرامة المهنة القانونية",
      category: "كرامة المهنة",
      domain: "مهني",
      potentialImpact: "مرتفع",
      weight: 35,
      scoreImpact: -35,
      issue: "ربط المكتب بالسيارات الكلاسيكية كرمز يُضعف صورة المهنة ويخالف معيار الكرامة المهنية.",
      severity: "مرتفع",
      businessSeverity: "high",
      resolved: false,
      riskDimensions: ["reputational"],
      evidence: "رمزاً للأصالة.. السنابة الجاية بتشوفون شي يعجبكم",
      matchedPattern: "رمزاً.*الأصالة",
      contentClassification: "وصف مهني",
      advice: "تجنب ربط المكتب بالمظاهر والمقتنيات المادية.",
      suggestedSaferWording: "تجنب ربط المكتب بالمظاهر المادية والتركيز على الخبرة القانونية والخدمة المتميزة.",
      legalCitation: "المادة 2 — قواعد السلوك المهني للمحامين",
      sourceDocument: "قواعد السلوك المهني للمحامين",
      legalReference: "المادة 2 — الكرامة والهيبة المهنية",
      articleTitle: "الكرامة والهيبة المهنية للمحامي",
      articleTextExcerpt: "يجب على المحامي في جميع تصرفاته المحافظة على كرامة المهنة وهيبتها.",
      explanation: "المنشور يربط هوية المكتب بالمقتنيات المادية بدلاً من الكفاءة القانونية.",
      legalExplanation: "تلزم المادة 2 المحامي بالمحافظة على كرامة المهنة في جميع تصرفاته العامة.",
      reviewOutcome: "رصدت ملاحظة",
      confidenceLevel: "مرتفع",
      sourceUrl: "https://www.moj.gov.sa/ar/RulesAndRegulations/Pages/LawyerRules.aspx",
    },
  ],
  professionalConductCompliance: {
    title: "الامتثال لقواعد السلوك المهني",
    sourceDocument: "قواعد السلوك المهني للمحامين",
    sourceUrl: "https://www.moj.gov.sa/ar/RulesAndRegulations/Pages/LawyerRules.aspx",
    findings: [],
    passed: false,
    summary: "رُصدت مخالفتان تتعلقان بضوابط الإعلان وكرامة المهنة.",
  },
  executiveRegulationCompliance: {
    title: "الامتثال للائحة التنفيذية",
    sourceDocument: "اللائحة التنفيذية لنظام المحاماة",
    sourceUrl: "https://www.moj.gov.sa/ar/RulesAndRegulations/Pages/LawyerRules.aspx",
    findings: [],
    passed: true,
    summary: "لم ترصد مخالفات في اللائحة التنفيذية.",
  },
  legalRiskAssessment: {
    level: "متوسط",
    score: 55,
    reason: "المحتوى يُبرز المظاهر المادية ويستخدم لغة عامية مما يُعرّض المحامي لمخاطر سمعة ومخاطر تأديبية.",
    publishingReadinessScore: 25,
    supportingArticle: {
      sourceDocument: "قواعد السلوك المهني للمحامين",
      legalReference: "المادة 38 — ضوابط الإعلان",
      articleTitle: "ضوابط الإعلان عن الخدمات القانونية",
      sourceUrl: "https://www.moj.gov.sa/ar/RulesAndRegulations/Pages/LawyerRules.aspx",
    },
  },
  referencesPanel: [
    {
      sourceDocument: "قواعد السلوك المهني للمحامين",
      legalReference: "المادة 38 — ضوابط الإعلان",
      articleTitle: "ضوابط الإعلان عن الخدمات القانونية",
      articleTextExcerpt: "لا يجوز للمحامي الإعلان عن مكتبه بأساليب تقوم على عرض المظاهر المادية.",
      sourceUrl: "https://www.moj.gov.sa/ar/RulesAndRegulations/Pages/LawyerRules.aspx",
    },
    {
      sourceDocument: "قواعد السلوك المهني للمحامين",
      legalReference: "المادة 2 — الكرامة والهيبة المهنية",
      articleTitle: "الكرامة والهيبة المهنية للمحامي",
      articleTextExcerpt: "يجب على المحامي في جميع تصرفاته المحافظة على كرامة المهنة وهيبتها.",
      sourceUrl: "https://www.moj.gov.sa/ar/RulesAndRegulations/Pages/LawyerRules.aspx",
    },
  ],
  governedRewrites: [
    {
      id: "rw-001",
      suggestedText: "نحرص في مكتبنا على تقديم خدمات قانونية متميزة تجمع بين الخبرة العميقة والالتزام بأعلى معايير المهنة. نسعد بخدمتكم.",
      basis: "استبدال المحتوى المادي بمحتوى يُبرز الخبرة القانونية والالتزام المهني.",
      originalComplianceScore: 30,
      proposedComplianceScore: 85,
      originalLanguageQuality: 72,
      proposedLanguageQuality: 95,
      originalRiskLevel: "متوسط",
      proposedRiskLevel: "منخفض",
      originalRiskScore: 55,
      proposedRiskScore: 20,
      validation: {
        legalCompliance: "passed",
        compliance: "passed",
        languageQuality: "passed",
        riskImpact: "reduced",
      },
      referencesUsed: [],
    },
  ],
  traceability: {
    reviewId: "preview-001",
    scoringModelVersion: "v2",
    calculatedAt: new Date().toISOString(),
    findingTraceabilityIds: ["f-001", "f-002"],
    legalKnowledgeEntryIds: ["kb-038", "kb-002"],
    sourceDocumentIds: ["sdoc-nba"],
  },
  workflow: [
    { key: "language_quality_review",  label: "جودة اللغة",        status: "failed"  },
    { key: "legal_compliance_review",  label: "الامتثال القانوني", status: "failed"  },
    { key: "risk_assessment",          label: "تقييم المخاطر",     status: "blocked" },
    { key: "publishing_readiness",     label: "جاهزية النشر",      status: "blocked" },
    { key: "export_support",           label: "دعم التصدير",       status: "pending" },
  ],
  exportAllowed: false,
  advisoryDisclaimer: "هذا التقييم استشاري ولا يُغني عن المراجعة القانونية المتخصصة.",
  publicationDecision: {
    outcome: "NOT_RECOMMENDED",
    label: "غير جاهز للنشر",
    reason: "وُجدت مخالفتان جوهريتان (ق38، ق2) تمنعان التوصية بالنشر.",
    blockers: ["مخالفة المادة 38 — ضوابط الإعلان", "مخالفة المادة 2 — كرامة المهنة"],
    actions: ["عدّل المحتوى ليركز على الخدمة القانونية", "تجنب ربط المكتب بالمقتنيات المادية"],
    recommended: false,
  },
  confidence: {
    level: "Low",
    label: "غير موثوق",
    reason: "المحتوى غير ملتزم بقواعد السلوك المهني أو اللائحة التنفيذية لنظام المحاماة — أي محتوى غير ملتزم غير موثوق فيه.",
    evidenceQuality: "توجد مخالفات مرصودة مرتبطة بالمراجع المسجلة.",
  },
  readinessDecision: {
    level: "غير جاهز",
    reasons: ["مخالفة ضوابط الإعلان (المادة 38)", "إخلال بمعيار الكرامة المهنية (المادة 2)"],
    blockers: ["مخالفة المادة 38", "مخالفة المادة 2"],
    actions: ["عدّل النص ليُبرز الخدمة القانونية لا المظاهر المادية", "استخدم لغة فصحى قانونية"],
  },
  channelRecommendations: [
    {
      key: "linkedin",
      channel: "LinkedIn",
      suitability: "متوسطة",
      reason: "القناة مناسبة للمحتوى المهني لكن المحتوى الحالي غير ملائم.",
      targetAudience: "المهنيون والمنشآت",
      format: "نص مع صورة",
      objective: "التعريف بالخدمات القانونية",
      expectedBenefit: "تعزيز الحضور المهني",
      risks: "المحتوى الحالي قد يُضر بالسمعة المهنية.",
      readiness: "يحتاج مراجعة",
      contentDirection: "ركز على الإنجازات القانونية بدلاً من المقتنيات المادية.",
      hashtags: ["#محاماة", "#قانون", "#خدمات_قانونية"],
      timing: "أيام الأسبوع — صباحاً",
      recommended: false,
    },
  ],
  decisionWorkflow: [
    { key: "input",       label: "إدخال المحتوى",  status: "مكتمل",       reason: "تم إدخال المحتوى وسياقه", action: "" },
    { key: "analysis",    label: "التحليل",         status: "مكتمل",       reason: "اكتمل التحليل برصد مخالفتين", action: "" },
    { key: "correction",  label: "المعالجة",        status: "الحالي",      reason: "يُنتظر تعديل المحتوى", action: "عدّل المحتوى وأعد التحليل" },
    { key: "publishing",  label: "النشر",           status: "قيد الانتظار", reason: "مُعلَّق حتى معالجة المخالفات", action: "" },
  ],
  analysisMode: "full",
  semanticAvailable: true,
};

export default function PreviewSeed() {
  const router = useRouter();

  useEffect(() => {
    const contentId = "preview-content-001";
    const record = {
      id: contentId,
      title: MOCK_BODY.slice(0, 72),
      currentVersion: 1,
      status: "يحتاج إلى تعديل",
      versions: [
        {
          id: `${contentId}-v1`,
          contentId,
          version: 1,
          body: MOCK_BODY,
          contentType: "post",
          contentTypeLabel: "منشور",
          channel: "X",
          audience: "الجمهور العام",
          purpose: "رفع الوعي بالخدمات المهنية",
          status: "يحتاج إلى تعديل",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          analysis: MOCK_REVIEW,
          references: [],
        },
      ],
      actions: [],
      sharingStatus: "غير متاح",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const existing = JSON.parse(localStorage.getItem(CONTENT_RECORDS_KEY) ?? "[]");
    const filtered = existing.filter((r: { id: string }) => r.id !== contentId);
    localStorage.setItem(CONTENT_RECORDS_KEY, JSON.stringify([record, ...filtered]));
    localStorage.setItem(ACTIVE_CONTENT_KEY, JSON.stringify({ contentId, version: 1 }));

    router.push("/content-review?open=1");
  }, [router]);

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", fontFamily: "sans-serif", direction: "rtl" }}>
      <p>جاري تحميل التصور...</p>
    </div>
  );
}
