import type { ContentKind, ReviewResult, ReviewWorkflowStep } from "@/lib/types";
import { advisoryDisclaimer } from "@/lib/governance";
import { reviewLanguageQuality } from "@/lib/services/language-quality-service";
import { runApprovalWorkflow } from "@/lib/services/approval-workflow-service";
import { runLegalComplianceReview } from "@/lib/services/legal-compliance-service";

const workflowLabels: Array<[ReviewWorkflowStep["key"], string]> = [
  ["language_quality_review", "جودة اللغة والصياغة"],
  ["legal_compliance_review", "ملاحظات الامتثال"],
  ["risk_assessment", "مؤشرات المخاطر"],
  ["approval_workflow", "ملخص المراجعة وجاهزية النشر"],
  ["export_center", "جاهزية التصدير"]
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
      summary: "يجب استكمال جودة اللغة والصياغة قبل عرض ملاحظات الامتثال ومؤشرات المخاطر وجاهزية النشر أو التصدير.",
      findings: [],
      workflow: buildWorkflow(false, false, false),
      exportAllowed: false,
      advisoryDisclaimer
    };
  }

  const compliance = runLegalComplianceReview(languageQuality.improvedDraft);
  const readiness = runApprovalWorkflow({
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
        ? "توجد عبارات تحتاج مراجعة امتثالية مستندة إلى المراجع المهنية والتنظيمية قبل النشر."
        : "لا توجد مؤشرات عالية المخاطر في النص وفقا للمراجع المهنية والتنظيمية.",
    findings: compliance.findings,
    workflow: buildWorkflow(true, compliance.passed, readiness.readyForPublishing),
    exportAllowed: readiness.readyForPublishing,
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
