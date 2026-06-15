import type { ContentKind, ReviewResult, ReviewWorkflowStep } from "@/lib/types";
import { reviewLanguageQuality } from "@/lib/services/language-quality-service";
import { runApprovalWorkflow } from "@/lib/services/approval-workflow-service";
import { runLegalComplianceReview } from "@/lib/services/legal-compliance-service";

const workflowLabels: Array<[ReviewWorkflowStep["key"], string]> = [
  ["language_quality_review", "Language Quality Review"],
  ["legal_compliance_review", "Legal Compliance Review"],
  ["risk_assessment", "Risk Assessment"],
  ["approval_workflow", "Approval Workflow"],
  ["export_center", "Export Center"]
];

function buildWorkflow(languageQualityPassed: boolean, compliancePassed: boolean, approvalPassed: boolean): ReviewWorkflowStep[] {
  return workflowLabels.map(([key, label], index) => {
    if (index === 0) return { key, label, status: languageQualityPassed ? "passed" : "failed" };
    if (!languageQualityPassed) return { key, label, status: "blocked" };
    if (index === 1 || index === 2) return { key, label, status: compliancePassed ? "passed" : "failed" };
    if (!compliancePassed) return { key, label, status: "blocked" };
    return { key, label, status: approvalPassed ? "passed" : "pending" };
  });
}

export function reviewContent(text: string, kind: ContentKind = "ai_response"): ReviewResult {
  const languageQuality = reviewLanguageQuality({
    text,
    kind,
    terminologyMap: {
      المسؤولية: ["المسؤليه", "المسئولية"],
      الإجراء: ["الاجراء", "اجراءات"]
    }
  });

  if (!languageQuality.passed) {
    return {
      languageQuality,
      complianceScore: 0,
      riskLevel: "HIGH",
      summary: "Language quality validation must pass before legal compliance review, risk assessment, approval, or export.",
      findings: [],
      workflow: buildWorkflow(false, false, false),
      exportAllowed: false
    };
  }

  const compliance = runLegalComplianceReview(languageQuality.improvedDraft);
  const approval = runApprovalWorkflow({
    languageQuality,
    complianceScore: compliance.complianceScore,
    riskLevel: compliance.riskLevel
  });

  return {
    languageQuality,
    complianceScore: compliance.complianceScore,
    riskLevel: compliance.riskLevel,
    summary:
      compliance.findings.length > 0
        ? "توجد عبارات تحتاج مراجعة امتثالية مستندة إلى قاعدة المعرفة القانونية قبل النشر."
        : "لا توجد مؤشرات عالية المخاطر في النص وفقا لقاعدة المعرفة القانونية.",
    findings: compliance.findings,
    workflow: buildWorkflow(true, compliance.passed, approval.approved),
    exportAllowed: approval.approved
  };
}

export function assertContentCanExport(text: string, kind: ContentKind = "social_export") {
  const review = reviewContent(text, kind);

  return {
    allowed: review.exportAllowed,
    review,
    message: review.exportAllowed
      ? "Content passed language quality, compliance, risk, and approval gates."
      : "Export is blocked until language quality, legal compliance, risk assessment, and approval checks pass."
  };
}
