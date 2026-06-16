import type { ReviewFinding, RiskLevel } from "@/lib/types";
import { legalKnowledgeEntries } from "@/lib/legal-knowledge-base";

const severityWeight: Record<RiskLevel, number> = {
  LOW: 8,
  MEDIUM: 14,
  HIGH: 22,
  CRITICAL: 32
};

function buildCitation(entry: (typeof legalKnowledgeEntries)[number]) {
  return `${entry.sourceDocument}، ${entry.articleOrRuleNumber}، ${entry.chapter} - ${entry.section}، ص ${entry.pageNumber}`;
}

function findEvidence(text: string, patterns: string[]) {
  return patterns.find((pattern) => text.includes(pattern));
}

function calculateRiskLevel(findings: ReviewFinding[]): RiskLevel {
  if (findings.some((finding) => finding.severity === "CRITICAL") || findings.length >= 3) return "CRITICAL";
  if (findings.some((finding) => finding.severity === "HIGH")) return "HIGH";
  if (findings.some((finding) => finding.severity === "MEDIUM")) return "MEDIUM";
  return "LOW";
}

export function runLegalComplianceReview(text: string) {
  const findings: ReviewFinding[] = legalKnowledgeEntries.flatMap((entry) => {
    const evidence = findEvidence(text, entry.prohibitedPatterns);
    if (!evidence) return [];

    return [
      {
        issue: entry.riskCategories.join(", "),
        severity: entry.severity,
        evidence,
        advice: entry.recommendedAction,
        legalCitation: buildCitation(entry),
        sourceDocument: entry.sourceDocument,
        ruleOrArticleNumber: entry.articleOrRuleNumber,
        explanation: `يتضمن النص عبارة "${evidence}"، وقد ترتبط بملاحظة امتثال وفق المرجع: ${entry.fullText}`,
        sourceUrl: entry.sourceUrl
      }
    ];
  });

  const penalty = findings.reduce((sum, finding) => sum + severityWeight[finding.severity], 0);
  const complianceScore = Math.max(20, 100 - penalty);
  const riskLevel = calculateRiskLevel(findings);

  return {
    passed: riskLevel === "LOW" || riskLevel === "MEDIUM",
    complianceScore,
    riskLevel,
    findings
  };
}
