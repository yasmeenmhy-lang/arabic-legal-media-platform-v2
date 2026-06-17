import type { LegalReviewSection, ReviewFinding, RiskLevel } from "@/lib/types";
import { legalKnowledgeEntries } from "@/lib/legal-knowledge-base";

const PROFESSIONAL_CONDUCT_SOURCE_ID = "rules-professional-conduct-lawyers";
const EXECUTIVE_REGULATION_SOURCE_ID = "advocacy-law-executive-regulations";

const severityWeight: Record<RiskLevel, number> = {
  منخفض: 8,
  متوسط: 16,
  مرتفع: 28
};

const noViolationMessage = "No relevant violation detected against the reviewed professional and regulatory references.";

function buildCitation(entry: (typeof legalKnowledgeEntries)[number]) {
  return `${entry.sourceDocument}، ${entry.articleOrRuleNumber}، ${entry.articleTitle ?? entry.section}، ${entry.chapter} - ${entry.section}، ص ${entry.pageNumber}`;
}

function findEvidence(text: string, patterns: string[]) {
  return patterns.find((pattern) => text.includes(pattern));
}

function confidenceFromEvidence(evidence: string | undefined, entry: (typeof legalKnowledgeEntries)[number]) {
  if (!evidence) return "منخفض" as const;
  const exactPatternMatch = entry.prohibitedPatterns.includes(evidence);
  if (exactPatternMatch && evidence.length >= 8) return "مرتفع" as const;
  return "متوسط" as const;
}

function buildLegalExplanation(entry: (typeof legalKnowledgeEntries)[number], evidence: string) {
  return `وردت العبارة محل المراجعة "${evidence}" ضمن نطاق ${entry.section}. ترتبط هذه الملاحظة بالمرجع الرسمي لأن النص المرجعي يؤكد: ${entry.fullText}`;
}

function buildFinding(entry: (typeof legalKnowledgeEntries)[number], evidence: string): ReviewFinding {
  return {
    issue: entry.riskCategories.join("، "),
    severity: entry.severity,
    evidence,
    advice: entry.recommendedAction,
    legalCitation: buildCitation(entry),
    sourceDocument: entry.sourceDocument,
    ruleOrArticleNumber: entry.articleOrRuleNumber,
    articleTitle: entry.articleTitle ?? entry.section,
    articleTextExcerpt: entry.fullText,
    explanation: `رصدت المنصة عبارة "${evidence}"، وقد ترتبط بملاحظة مهنية أو تنظيمية وفق المرجع المحدد.`,
    legalExplanation: buildLegalExplanation(entry, evidence),
    reviewOutcome: "رصدت ملاحظة",
    confidenceLevel: confidenceFromEvidence(evidence, entry),
    sourceUrl: entry.sourceUrl
  };
}

function calculateRiskLevel(findings: ReviewFinding[]): RiskLevel {
  if (findings.some((finding) => finding.severity === "مرتفع") || findings.length >= 3) return "مرتفع";
  if (findings.some((finding) => finding.severity === "متوسط")) return "متوسط";
  return "منخفض";
}

function buildSection(title: string, sourceDocumentId: string, findings: ReviewFinding[]): LegalReviewSection {
  const sourceEntry = legalKnowledgeEntries.find((entry) => entry.sourceDocumentId === sourceDocumentId);
  const sectionFindings = findings.filter((finding) =>
    legalKnowledgeEntries.some(
      (entry) =>
        entry.sourceDocumentId === sourceDocumentId &&
        entry.sourceDocument === finding.sourceDocument &&
        entry.articleOrRuleNumber === finding.ruleOrArticleNumber
    )
  );

  return {
    title,
    sourceDocument: sourceEntry?.sourceDocument ?? title,
    sourceUrl: sourceEntry?.sourceUrl ?? "",
    findings: sectionFindings,
    passed: sectionFindings.length === 0,
    summary:
      sectionFindings.length > 0
        ? `توجد ${sectionFindings.length} ملاحظة مرتبطة بهذا المصدر، وكل ملاحظة تعرض المادة أو القاعدة، عنوانها، المقتطف المرجعي، وسبب الرصد.`
        : noViolationMessage
  };
}

function buildReferencesPanel(findings: ReviewFinding[]) {
  const unique = new Map<string, ReviewFinding>();
  findings.forEach((finding) => {
    unique.set(`${finding.sourceDocument}-${finding.ruleOrArticleNumber}-${finding.articleTitle}`, finding);
  });

  return Array.from(unique.values()).map((finding) => ({
    sourceDocument: finding.sourceDocument,
    ruleOrArticleNumber: finding.ruleOrArticleNumber,
    articleTitle: finding.articleTitle,
    articleTextExcerpt: finding.articleTextExcerpt,
    sourceUrl: finding.sourceUrl
  }));
}

function buildRiskAssessment(findings: ReviewFinding[]) {
  const level = calculateRiskLevel(findings);
  const highestFinding =
    findings.find((finding) => finding.severity === "مرتفع") ??
    findings.find((finding) => finding.severity === "متوسط") ??
    findings[0];

  return {
    level,
    reason: highestFinding
      ? `مستوى المخاطر ${level} بسبب الملاحظة المرتبطة بـ "${highestFinding.articleTitle}" في ${highestFinding.sourceDocument}.`
      : noViolationMessage,
    supportingArticle: highestFinding
      ? {
          sourceDocument: highestFinding.sourceDocument,
          ruleOrArticleNumber: highestFinding.ruleOrArticleNumber,
          articleTitle: highestFinding.articleTitle,
          sourceUrl: highestFinding.sourceUrl
        }
      : undefined
  };
}

export function runLegalComplianceReview(text: string) {
  const findings: ReviewFinding[] = legalKnowledgeEntries.flatMap((entry) => {
    const evidence = findEvidence(text, entry.prohibitedPatterns);
    if (!evidence) return [];
    return [buildFinding(entry, evidence)];
  });

  const penalty = findings.reduce((sum, finding) => sum + severityWeight[finding.severity], 0);
  const complianceScore = findings.length === 0 ? 100 : Math.max(20, 100 - penalty);
  const riskLevel = calculateRiskLevel(findings);
  const professionalConductCompliance = buildSection("امتثال قواعد السلوك المهني", PROFESSIONAL_CONDUCT_SOURCE_ID, findings);
  const executiveRegulationCompliance = buildSection("امتثال اللائحة التنفيذية لنظام المحاماة", EXECUTIVE_REGULATION_SOURCE_ID, findings);
  const legalRiskAssessment = buildRiskAssessment(findings);
  const referencesPanel = buildReferencesPanel(findings);

  return {
    passed: riskLevel === "منخفض" || riskLevel === "متوسط",
    complianceScore,
    riskLevel,
    findings,
    professionalConductCompliance,
    executiveRegulationCompliance,
    legalRiskAssessment,
    referencesPanel,
    noViolationMessage
  };
}
