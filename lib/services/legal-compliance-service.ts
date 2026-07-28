import type { LegalReviewSection, ReviewFinding } from "@/lib/types";
import { legalSourceDocuments } from "@/lib/legal-knowledge-base";
import { calculateComplianceScore, calculateRiskScore } from "@/lib/services/scoring-service";
import type { ScoringProfile } from "@/lib/scoring-profiles";

const PROFESSIONAL_CONDUCT_SOURCE_ID = "rules-professional-conduct-lawyers";
const EXECUTIVE_REGULATION_SOURCE_ID = "advocacy-law-executive-regulations";

const noViolationMessage = "لم يتم رصد ملاحظة مرتبطة بالمراجع المهنية والتنظيمية المسجلة.";

function buildSection(title: string, sourceDocumentId: string, findings: ReviewFinding[]): LegalReviewSection {
  const sourceEntry = legalSourceDocuments.find((doc) => doc.id === sourceDocumentId);
  const sectionFindings = findings.filter((finding) => finding.sourceDocumentId === sourceDocumentId);

  return {
    title,
    sourceDocument: sourceEntry?.title ?? title,
    sourceUrl: sourceEntry?.sourceUrl ?? "",
    findings: sectionFindings,
    passed: sectionFindings.length === 0,
    summary:
      sectionFindings.length > 0
        ? `توجد ${sectionFindings.length} ملاحظة مرتبطة بهذا المصدر، وكل ملاحظة تعرض المرجع النظامي، عنوانه، المقتطف المرجعي، وسبب الرصد.`
        : noViolationMessage
  };
}

function buildReferencesPanel(findings: ReviewFinding[]) {
  const unique = new Map<string, ReviewFinding>();
  findings.forEach((finding) => {
    unique.set(`${finding.sourceDocument}-${finding.legalReference}-${finding.articleTitle}`, finding);
  });

  return Array.from(unique.values()).map((finding) => ({
    sourceDocument: finding.sourceDocument,
    legalReference: finding.legalReference,
    articleTitle: finding.articleTitle,
    articleTextExcerpt: finding.articleTextExcerpt,
    sourceUrl: finding.sourceUrl
  }));
}

function buildRiskAssessment(findings: ReviewFinding[], riskScoreExplanation: ReturnType<typeof calculateRiskScore>) {
  const level = riskScoreExplanation.level;
  const publishingReadinessScore = Math.max(0, 100 - riskScoreExplanation.score);
  const highestFinding =
    findings.find((finding) => finding.severity === "مرتفع") ??
    findings.find((finding) => finding.severity === "متوسط") ??
    findings[0];

  return {
    level,
    score: riskScoreExplanation.score,
    publishingReadinessScore,
    reason: highestFinding
      ? `مستوى المخاطر ${level} بسبب الملاحظة المرتبطة بـ "${highestFinding.articleTitle}" في ${highestFinding.sourceDocument}.`
      : noViolationMessage,
    supportingArticle: highestFinding
      ? {
          sourceDocument: highestFinding.sourceDocument,
          legalReference: highestFinding.legalReference,
          articleTitle: highestFinding.articleTitle,
          sourceUrl: highestFinding.sourceUrl
        }
      : undefined
  };
}

// Rebuilds compliance sections and scores from a findings array produced by the semantic engine.
export function rebuildComplianceFromFindings(mergedFindings: ReviewFinding[], profile: ScoringProfile) {
  const order = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...mergedFindings].sort(
    (a, b) => (order[a.businessSeverity ?? "low"] ?? 3) - (order[b.businessSeverity ?? "low"] ?? 3)
  );

  const complianceScoreExplanation = calculateComplianceScore(sorted, profile);
  const riskScoreExplanation = calculateRiskScore(sorted, profile);
  const complianceScore = complianceScoreExplanation.finalScore;
  const riskLevel = riskScoreExplanation.level;

  return {
    passed: sorted.length === 0 && (riskLevel === "منخفض" || riskLevel === "متوسط"),
    complianceScore,
    complianceScoreExplanation,
    riskLevel,
    riskScore: riskScoreExplanation.score,
    riskScoreExplanation,
    findings: sorted,
    professionalConductCompliance: buildSection("امتثال قواعد السلوك المهني للمحامين", PROFESSIONAL_CONDUCT_SOURCE_ID, sorted),
    executiveRegulationCompliance: buildSection("امتثال اللائحة التنفيذية لنظام المحاماة", EXECUTIVE_REGULATION_SOURCE_ID, sorted),
    legalRiskAssessment: buildRiskAssessment(sorted, riskScoreExplanation),
    referencesPanel: buildReferencesPanel(sorted)
  };
}
