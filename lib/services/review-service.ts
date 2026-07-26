import type {
  ContentEvaluation,
  ContentKind,
  LanguageIssueCategory,
  LanguageIssueSeverity,
  LanguageQualityIssue,
  LanguageQualityReviewResult,
  ReviewContext,
  ReviewFinding,
  ReviewResult,
  ReviewWorkflowStep,
  RiskAffectedParty,
  RiskLevel
} from "@/lib/types";
import { advisoryDisclaimer } from "@/lib/governance";
import { countAdvisoryLanguageIssues, countHardLanguageErrors } from "@/lib/language-gate";
import { createReviewedContentContext } from "@/lib/review-context";
import { runPublishingReadinessReview } from "@/lib/services/approval-workflow-service";
import { rebuildComplianceFromFindings } from "@/lib/services/legal-compliance-service";
import { partiesToRiskLevel } from "@/lib/risk-parties";
import { runSemanticAnalysis } from "@/lib/services/semantic-analysis-service";
import type { SemanticAnalysisResult } from "@/lib/services/semantic-analysis-service";
import { evaluateContent } from "@/lib/services/content-evaluation-service";
import { verifyTextCitations } from "@/lib/services/web-research-service";
import { buildGovernedRewriteSuggestions } from "@/lib/services/recommendation-service";
import {
  calculateContentQualityScore,
  calculatePublishingReadiness,
  calculateRiskFromEvaluation,
  deriveReviewStatus,
  SCORING_MODEL_VERSION
} from "@/lib/services/scoring-service";
import { resolveScoringProfile } from "@/lib/scoring-profiles";
import {
  buildChannelRecommendations,
  buildConfidence,
  buildDecisionWorkflow,
  buildPublicationDecision,
  buildReadinessDecision,
  buildSourceGovernanceReasons
} from "@/lib/services/decision-support-service";

const noRegisteredViolationMessage = "لم يتم رصد ملاحظة مرتبطة بالمراجع المهنية والتنظيمية المسجلة.";

// قاعدة الجهات المتضررة المتفق عليها: جهة واحدة أو أقل → منخفض، جهتان → متوسط، ثلاث جهات → مرتفع.
// أي مخالفة امتثال تضر المحامي والمهنة بالضرورة (جهتان) → المخاطر لا تقل عن "متوسط".
// "مرتفع" يبقى محكوماً بتقييم الجهات الثلاث، لا بشدة المخالفة.
const RISK_ORDER: RiskLevel[] = ["منخفض", "متوسط", "مرتفع", "بالغ"];



const workflowLabels: Array<[ReviewWorkflowStep["key"], string]> = [
  ["language_quality_review", "جودة اللغة والصياغة"],
  ["legal_compliance_review", "ملاحظات الامتثال"],
  ["risk_assessment", "مؤشرات المخاطر"],
  ["publishing_readiness", "ملخص المراجعة وجاهزية النشر"],
  ["export_support", "دعم التصدير"]
];

function buildWorkflow(languageQualityPassed: boolean, compliancePassed: boolean, readinessPassed: boolean): ReviewWorkflowStep[] {
  return workflowLabels.map(([key, label], index) => {
    if (index === 0) return { key, label, status: languageQualityPassed ? "passed" : "failed" };
    if (!languageQualityPassed) return { key, label, status: "blocked" };
    if (index === 1 || index === 2) return { key, label, status: compliancePassed ? "passed" : "failed" };
    if (!compliancePassed) return { key, label, status: "blocked" };
    return { key, label, status: readinessPassed ? "passed" : "pending" };
  });
}

function mapToLanguageQualityResult(
  aiLang: { score: number; passed: boolean; issues: Array<{ category: LanguageIssueCategory; severity: LanguageIssueSeverity; excerpt: string; message: string; suggestion: string }> }
): LanguageQualityReviewResult {
  const weights: Record<LanguageIssueSeverity, number> = { low: 2, medium: 5, high: 9, critical: 16 };
  const issues: LanguageQualityIssue[] = aiLang.issues.map((issue, index) => ({
    id: `ai-${issue.category}-${index + 1}`,
    category: issue.category,
    severity: issue.severity,
    message: issue.message || "يوجد خطأ في النص",
    excerpt: issue.excerpt,
    suggestion: issue.suggestion
  }));

  const categoryScores: Record<LanguageIssueCategory, number> = {
    spelling: 100,
    grammar: 100,
    style: 100,
    readability: 100,
    "اتساق المصطلحات": 100
  };
  for (const issue of issues) {
    categoryScores[issue.category] = Math.max(0, categoryScores[issue.category] - weights[issue.severity]);
  }

  // لا يُؤخذ حكم الذكاء الذاتي «passed» على عِلّاته — يُراجَع مقابل قائمة الأخطاء
  // التي أرجعها هو نفسه: خطأ إملائي أو نحوي واحد يكفي لإسقاط «سليم لغوياً» ولو
  // زعم النموذج تجاوز العتبة، فلا يتناقض الحكم الظاهر مع الأخطاء المعروضة تحته.
  const hasHardIssues = issues.some((issue) => issue.category === "spelling" || issue.category === "grammar");
  const passed = aiLang.passed && !hasHardIssues && aiLang.score >= 75;

  return {
    passed,
    score: aiLang.score,
    threshold: 75,
    normalizedText: "",
    improvedDraft: "",
    issues,
    categoryScores,
    reviewedAt: new Date().toISOString()
  };
}

// يبني تقرير المراجعة الكامل من نتائج ذكاء محسوبة سلفاً (بلا أي استدعاء ذكاء إضافي) —
// يسمح بمشاركة نتيجة حكم واحدة (مثلاً حكم الإنشاء) لبناء تقرير المراجعة الكامل منها
// بدل استدعاء ذكاء مستقل ثانٍ قد يحكم حكماً مختلفاً على النص نفسه.
export async function buildReviewResult(
  text: string,
  kind: ContentKind,
  context: ReviewContext,
  semanticResult: SemanticAnalysisResult,
  contentEval: ContentEvaluation
): Promise<ReviewResult> {
  const profile = resolveScoringProfile(kind, context.channel);

  const semanticFindings = semanticResult.findings;
  const analysisMode: ReviewResult["analysisMode"] = semanticResult.mode;
  const degradedReason: ReviewResult["degradedReason"] =
    semanticResult.mode === "pattern-only" ? (semanticResult as Extract<SemanticAnalysisResult, { mode: "pattern-only" }>).degradedReason : undefined;
  if (analysisMode === "pattern-only") {
    console.warn("[review-service] degraded to pattern-only, reason:", degradedReason);
  }

  const languageQuality = mapToLanguageQualityResult(contentEval.language);
  const compliance = rebuildComplianceFromFindings(semanticFindings, profile);

  // تعذّر تقييم الذكاء (fallback): يُعلَّم صراحةً حتى تعكسه جودة المحتوى وجاهزية النشر
  // والقرار — بدل أن تُحسب من قيم افتراضية توحي بنتيجة إيجابية زائفة.
  const evaluationIncomplete =
    (contentEval.risks.explanation ?? "").startsWith("تعذّر") ||
    (contentEval.professionalWriting.explanation ?? "").startsWith("تعذّر");

  // Override risk values with AI-based evaluation (affected parties model).
  // Compliance findings guarantee two affected parties (المحامي والمهنة), so the
  // risk level is floored per the agreed parties rule — never "منخفض" with violations.
  const activeFindings = compliance.findings.filter((f) => !f.resolved);
  const flooredParties = activeFindings.length > 0
    ? ([...new Set([...contentEval.risks.affectedParties, "المحامي", "المهنة"])] as RiskAffectedParty[])
    : contentEval.risks.affectedParties;
  const complianceFloor = partiesToRiskLevel(flooredParties);
  const effectiveRisks =
    RISK_ORDER.indexOf(complianceFloor) > RISK_ORDER.indexOf(contentEval.risks.level)
      ? {
          level: complianceFloor,
          affectedParties: flooredParties,
          // الجملة الآلية التي كانت تتصدّر التعليل («رُصدت N مخالفة امتثال…»)
          // حُذفت: كانت رقعةً تشرح رفعاً وقع لأن محرّك المخاطر لم يعلم بالمخالفة.
          // وقد صار يعلم بها ويصف أثرها بلغته المهنية، فلا حاجة لعدّاد داخلي
          // يتصدّر تعليل المحامي. والرفع نفسه يبقى شبكة أمان.
          explanation:
            contentEval.risks.explanation && !contentEval.risks.explanation.startsWith("تعذّر")
              ? contentEval.risks.explanation
              : "",
          fix: contentEval.risks.fix || "عالج مخالفات الامتثال المرصودة قبل النشر لخفض مستوى المخاطر."
        }
      : contentEval.risks;
  const riskScore = effectiveRisks.level === "بالغ" ? 100
    : effectiveRisks.level === "مرتفع" ? 70
    : effectiveRisks.level === "متوسط" ? 40
    : 10;
  const riskLevel = effectiveRisks.level;
  const riskScoreExplanation = calculateRiskFromEvaluation(effectiveRisks, compliance.findings.length, profile);
  // توحيد لوحة تقييم المخاطر القانونية على نفس نموذج الجهات المعروض — فلا يظهر في نصوص
  // الإرشاد مستوى مخاطر ثانوي (محسوب بأرقام قديمة) يناقض المؤشر الرئيسي (متوسط ↔ منخفض).
  const legalRiskAssessment = {
    ...compliance.legalRiskAssessment,
    level: riskLevel,
    score: riskScore,
    publishingReadinessScore: Math.max(0, 100 - riskScore),
    reason: compliance.legalRiskAssessment.supportingArticle
      ? `مستوى المخاطر ${riskLevel} بسبب الملاحظة المرتبطة بـ "${compliance.legalRiskAssessment.supportingArticle.articleTitle}" في ${compliance.legalRiskAssessment.supportingArticle.sourceDocument}.`
      : compliance.legalRiskAssessment.reason
  };
  const professionalismScore = contentEval.professionalWriting.score;
  const reviewStatus = deriveReviewStatus({
    languageScore: languageQuality.score,
    complianceScore: compliance.complianceScore,
    riskLevel,
    requestedStatus: context.reviewStatus
  });
  const approved = ["READY_FOR_PUBLISHING", "EXPORTED", "SHARED"].includes(reviewStatus);
  const contentQualityExplanation = calculateContentQualityScore({
    complianceScore: compliance.complianceScore,
    riskScore,
    professionalismScore,
    languageScore: languageQuality.score
  });
  const publishingReadinessExplanation = calculatePublishingReadiness({
    complianceScore: compliance.complianceScore,
    riskScore,
    professionalismScore,
    languageScore: languageQuality.score,
    languageHardErrorCount: countHardLanguageErrors(languageQuality.issues),
    languageAdvisoryCount: countAdvisoryLanguageIssues(languageQuality.issues),
    context,
    reviewStatus
  });
  const publishingReadinessScore = publishingReadinessExplanation.finalScore;
  const readiness = runPublishingReadinessReview({
    languageQuality,
    complianceScore: compliance.complianceScore,
    riskLevel,
    publishingReadinessScore,
    reviewStatus
  });
  const readyForPublishing = readiness.readyForPublishing;
  // القاعدة الأساسية: الصياغة المقترحة تمر ببوابة الحاكم داخلياً — فشل مغلق فلا
  // تُعرض صياغة فيها مخالفة أو لم تُفحص (انظر recommendation-service)
  const governedRewrites = await buildGovernedRewriteSuggestions({
    text,
    kind,
    context,
    originalFindings: compliance.findings,
    originalComplianceScore: compliance.complianceScore,
    originalLanguageQuality: languageQuality.score,
    originalRiskLevel: riskLevel,
    originalRiskScore: riskScore
  });
  const reviewContext = createReviewedContentContext(text, context);
  const calculatedAt = new Date().toISOString();
  const confidence = buildConfidence(compliance.findings);
  const readinessDecision = buildReadinessDecision({
    complianceScore: compliance.complianceScore,
    riskScore,
    professionalismScore,
    riskLevel,
    languagePassed: languageQuality.passed,
    approved,
    findings: compliance.findings
  });
  // ★ قيد حوكمة المصادر المستقل في قرار النشر (بأمر معالجة الفجوات، البند ثانياً):
  // يُبنى من النتيجة الحتمية الممررة في السياق + عدد الإحالات «غير المطابقة» في
  // تقرير التحقق الحي (بصيغته المميزة «غير مطابق») — بلا مساس بالقاضي أو المقيّم
  // أو معادلاتهما، وبلا تحويل بين نوعي المخالفة.
  const unmatchedCitations = (context.verificationBriefing?.match(/«غير مطابق»/g) ?? []).length;
  const sourceGovernanceReasons = buildSourceGovernanceReasons(context.sourceGovernance, unmatchedCitations);
  const publicationDecision = buildPublicationDecision({
    confidence,
    readiness: readinessDecision,
    findings: compliance.findings,
    riskLevel,
    languageIssuesCount: languageQuality.issues.length,
    sourceGovernanceReasons
  });
  const channelRecommendations = buildChannelRecommendations(kind, context, compliance.findings, readinessDecision);
  const decisionWorkflow = buildDecisionWorkflow(publicationDecision, governedRewrites.length > 0, approved);

  return {
    reviewContext,
    languageQuality,
    professionalismScore,
    contentQualityScore: contentQualityExplanation.finalScore,
    contentQualityScoreExplanation: contentQualityExplanation,
    complianceScore: compliance.complianceScore,
    complianceScoreExplanation: compliance.complianceScoreExplanation,
    riskLevel,
    riskScore,
    riskScoreExplanation,
    publishingReadinessScore,
    publishingReadinessExplanation,
    reviewStatus,
    summary:
      compliance.findings.length > 0
        ? `توجد ${compliance.findings.length} ملاحظة مهنية أو تنظيمية مرتبطة بمواد وقواعد محددة من قواعد السلوك المهني أو اللائحة التنفيذية. تظهر كل ملاحظة سبب الرصد، مستوى الثقة، والمصدر الرسمي.`
        : noRegisteredViolationMessage,
    findings: compliance.findings,
    professionalConductCompliance: compliance.professionalConductCompliance,
    executiveRegulationCompliance: compliance.executiveRegulationCompliance,
    legalRiskAssessment,
    referencesPanel: compliance.referencesPanel,
    // ★ بقرار مالكة المنصة: لا يُعرض «مصدر تحقق» إلا ما فُتح وأسند إليه المدقق
    // نتيجة فعلية في تقريره (note) — نتيجة البحث المجردة لا تُعد مصدر تحقق،
    // ولا تتحول هذه المصادر تلقائياً إلى مصادر معتمدة.
    verifiedWebSources: context.verificationDetails?.length ? context.verificationDetails : undefined,
    governedRewrites,
    traceability: {
      reviewId: reviewContext.reviewId,
      scoringModelVersion: SCORING_MODEL_VERSION,
      calculatedAt,
      findingTraceabilityIds: compliance.findings.map((finding) => finding.traceabilityId),
      legalKnowledgeEntryIds: [...new Set(compliance.findings.map((finding) => finding.legalKnowledgeEntryId))],
      sourceDocumentIds: [...new Set(compliance.findings.map((finding) => finding.sourceDocumentId))]
    },
    workflow: buildWorkflow(languageQuality.passed, compliance.passed, readyForPublishing),
    exportAllowed: readyForPublishing,
    advisoryDisclaimer,
    publicationDecision,
    confidence,
    readinessDecision,
    channelRecommendations,
    decisionWorkflow,
    analysisMode,
    semanticAvailable: analysisMode === "full",
    degradedReason,
    evaluationIncomplete
  };
}

export async function reviewContent(text: string, kind: ContentKind = "post", context: ReviewContext = {}): Promise<ReviewResult> {
  // ★★ القاعدة المؤسسة (بأمر مالكة المنصة — ممنوع تجاوزها): قواعد السلوك المهني
  // واللائحة التنفيذية نقطة الانطلاق لكل مسار. النص يُعرض على القواعد أولاً —
  // الطبقة الأولى بألفاظ المتن ثم الثانية بمعناه ومقصده — قبل أي بحث خارجي.
  // التحقق الحي خادمٌ يأتي بعد الحكم لا مقدَّمٌ عليه.
  const semanticResult = await runSemanticAnalysis(text, context, kind);

  // التحقّق الحيّ من المصادر — بعد حكم القواعد: إنفاذٌ فعليٌّ لقاعدة تحرّي المصادر،
  // يجري على كل مراجعة بلا استثناء (بقرار المالكة): لا يُشترط وجود إحالة ظاهرة ولا
  // إفصاح المستخدم، لأن النص قد يحمل ادعاءً نظامياً بلا لفظ مرجعي صريح. نتائجه
  // تُحقن في قياس المخاطر واللغة وتُعرض «مصادر تحقق». فشله لا يُسقط المراجعة.
  let ctx = context;
  const verification = await verifyTextCitations({
    text,
    specialty: context.specialty,
    sourceHint: context.sourceHint,
    timeoutMs: 45_000
  });
  if (verification?.briefing) {
    ctx = {
      ...context,
      verificationBriefing: verification.briefing,
      verificationSources: verification.sources,
      verificationDetails: verification.details,
    };
  }

  // متتابعات — بقرار مالكة المنصة: «الامتثال عنصر أساسي في قياس المخاطر».
  // المخالفات المثبتة بالقواعد + نتائج التحقق الحي تُمرَّران معاً إلى القياس نفسه،
  // فلا يقيس محرّك المخاطر الأثر وهو لا يعلم بما رُصد.
  const contentEval = await evaluateContent(text, ctx, semanticResult.findings);
  return buildReviewResult(text, kind, ctx, semanticResult, contentEval);
}

export async function assertContentCanExport(text: string, kind: ContentKind = "social_export") {
  const review = await reviewContent(text, kind);

  return {
    allowed: review.exportAllowed,
    review,
    message: review.exportAllowed
      ? "المحتوى مناسب للتصدير وفق نتائج المراجعة."
      : "يتاح التصدير بعد مراجعة ومعالجة ملاحظات اللغة والامتثال والمخاطر."
  };
}
