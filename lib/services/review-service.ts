import type { ContentKind, ReviewContext, ReviewResult, ReviewWorkflowStep } from "@/lib/types";
import { advisoryDisclaimer } from "@/lib/governance";
import { reviewLanguageQuality } from "@/lib/services/language-quality-service";
import { runPublishingReadinessReview } from "@/lib/services/approval-workflow-service";
import { runLegalComplianceReview } from "@/lib/services/legal-compliance-service";

const noRegisteredViolationMessage = "لم يتم رصد ملاحظة مرتبطة بالمراجع المهنية والتنظيمية المسجلة.";

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

function calculatePublishingReadinessScore(languageScore: number, complianceScore: number, riskLevel: ReviewResult["riskLevel"], legalReadinessScore: number) {
  const riskPenalty = riskLevel === "مرتفع" ? 22 : riskLevel === "متوسط" ? 8 : 0;
  return Math.max(0, Math.min(100, Math.round(languageScore * 0.25 + complianceScore * 0.45 + legalReadinessScore * 0.3 - riskPenalty)));
}

export function reviewContent(text: string, kind: ContentKind = "post", context: ReviewContext = {}): ReviewResult {
  const languageQuality = reviewLanguageQuality({
    text,
    kind,
    terminologyMap: {
      المسؤولية: ["المسؤليه", "المسئولية"],
      الإجراء: ["الاجراء", "اجراءات"]
    }
  });

  const compliance = runLegalComplianceReview(text, context);
  const publishingReadinessScore = calculatePublishingReadinessScore(
    languageQuality.score,
    compliance.complianceScore,
    compliance.riskLevel,
    compliance.legalRiskAssessment.publishingReadinessScore
  );
  const readiness = runPublishingReadinessReview({
    languageQuality,
    complianceScore: compliance.complianceScore,
    riskLevel: compliance.riskLevel
  });
  const readyForPublishing = readiness.readyForPublishing && publishingReadinessScore >= 82;

  return {
    languageQuality,
    complianceScore: compliance.complianceScore,
    riskLevel: compliance.riskLevel,
    publishingReadinessScore,
    summary:
      compliance.findings.length > 0
        ? `توجد ${compliance.findings.length} ملاحظة مهنية أو تنظيمية مرتبطة بمواد وقواعد محددة من قواعد السلوك المهني أو اللائحة التنفيذية. تظهر كل ملاحظة سبب الرصد، مستوى الثقة، والمصدر الرسمي.`
        : noRegisteredViolationMessage,
    findings: compliance.findings,
    professionalConductCompliance: compliance.professionalConductCompliance,
    executiveRegulationCompliance: compliance.executiveRegulationCompliance,
    legalRiskAssessment: compliance.legalRiskAssessment,
    referencesPanel: compliance.referencesPanel,
    workflow: buildWorkflow(languageQuality.passed, compliance.passed, readyForPublishing),
    exportAllowed: readyForPublishing,
    advisoryDisclaimer
  };
}

export function assertContentCanExport(text: string, kind: ContentKind = "social_export") {
  const review = reviewContent(text, kind);

  return {
    allowed: review.exportAllowed,
    review,
    message: review.exportAllowed
      ? "المحتوى مناسب للتصدير وفق نتائج المراجعة."
      : "يتاح التصدير بعد مراجعة ومعالجة ملاحظات اللغة والامتثال والمخاطر."
  };
}
