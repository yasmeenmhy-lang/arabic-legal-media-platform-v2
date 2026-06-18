import type { LegalReviewSection, ReviewContext, ReviewFinding, RiskLevel } from "@/lib/types";
import { legalKnowledgeEntries, legalSourceDocuments } from "@/lib/legal-knowledge-base";
import {
  calculateComplianceScore,
  calculateFindingWeight,
  calculateRiskScore,
  classifyLegalKnowledgeEntry
} from "@/lib/services/scoring-service";

const PROFESSIONAL_CONDUCT_SOURCE_ID = "rules-professional-conduct-lawyers";
const EXECUTIVE_REGULATION_SOURCE_ID = "advocacy-law-executive-regulations";

const noViolationMessage = "لم يتم رصد ملاحظة مرتبطة بالمراجع المهنية والتنظيمية المسجلة.";

function isOfficialMojUrl(sourceUrl: string) {
  try {
    const hostname = new URL(sourceUrl).hostname.toLowerCase();
    return hostname === "laws.moj.gov.sa" || hostname === "moj.gov.sa" || hostname.endsWith(".moj.gov.sa");
  } catch {
    return false;
  }
}

function getRegisteredSource(entry: (typeof legalKnowledgeEntries)[number]) {
  return legalSourceDocuments.find(
    (source) =>
      source.id === entry.sourceDocumentId &&
      source.sourceUrl === entry.sourceUrl &&
      source.title === entry.sourceDocument &&
      source.status === "ACTIVE" &&
      isOfficialMojUrl(source.sourceUrl)
  );
}

function isTraceableRegisteredRule(entry: (typeof legalKnowledgeEntries)[number]) {
  return Boolean(
    getRegisteredSource(entry) &&
      entry.id &&
      entry.sourceDocumentId &&
      entry.sourceDocument &&
      entry.legalReference &&
      entry.articleTitle &&
      entry.fullText &&
      entry.sourceUrl &&
      (entry.prohibitedPatterns.length > 0 || (entry.contextualPatterns?.length ?? 0) > 0)
  );
}

function buildCitation(entry: (typeof legalKnowledgeEntries)[number]) {
  return `${entry.sourceDocument}، ${entry.legalReference}، ${entry.articleTitle ?? entry.section}، ${entry.chapter} - ${entry.section}، ص ${entry.pageNumber}`;
}

function getSurroundingSentence(text: string, matchedPattern: string) {
  const patternIndex = text.indexOf(matchedPattern);
  if (patternIndex < 0) return matchedPattern;

  const sentenceStartCandidates = ["\n", ".", "؟", "!", "،"].map((separator) => text.lastIndexOf(separator, patternIndex));
  const sentenceStart = Math.max(-1, ...sentenceStartCandidates) + 1;
  const sentenceEndCandidates = ["\n", ".", "؟", "!"].map((separator) => {
    const index = text.indexOf(separator, patternIndex + matchedPattern.length);
    return index === -1 ? text.length : index;
  });
  const sentenceEnd = Math.min(...sentenceEndCandidates);
  return text.slice(sentenceStart, sentenceEnd).trim() || matchedPattern;
}

function findEvidence(text: string, patterns: string[]) {
  const matchedPattern = patterns.find((pattern) => text.includes(pattern));
  if (!matchedPattern) return null;

  return {
    matchedPattern,
    phrase: getSurroundingSentence(text, matchedPattern)
  };
}

function classifyContentContext(sentence: string): ReviewFinding["contentClassification"] {
  const guaranteeSignals = ["نضمن", "يضمن", "مضمون", "مضمونة", "الفوز", "كسب", "نتيجة", "نتائج مؤكدة", "الحكم لصالحك"];
  const misleadingSignals = ["أفضل", "الأفضل", "رقم واحد", "نسبة نجاح", "الأقوى", "لا مثيل", "كل القضايا", "بلا استثناء"];
  const marketingSignals = ["احجز", "اتصل", "تواصل", "عرض", "خصم", "خدمة", "حلول"];
  const professionalSignals = ["يقدم", "خدمات", "مراجعة", "دراسة", "استشارات", "وفق الأنظمة", "مكتب"];

  if (guaranteeSignals.some((signal) => sentence.includes(signal))) return "وعد بنتيجة";
  if (misleadingSignals.some((signal) => sentence.includes(signal))) return "إعلان مضلل محتمل";
  if (marketingSignals.some((signal) => sentence.includes(signal))) return "ادعاء تسويقي";
  if (professionalSignals.some((signal) => sentence.includes(signal))) return "وصف مهني";
  return "معلومة قانونية";
}

function contextSupportsRule(entry: (typeof legalKnowledgeEntries)[number], evidence: { matchedPattern: string; phrase: string }) {
  const classification = classifyContentContext(evidence.phrase);
  const ruleContext = `${entry.id} ${entry.riskCategories.join(" ")} ${entry.section} ${entry.articleTitle ?? ""}`;
  const phrase = evidence.phrase;

  if (entry.id.includes("no-guaranteed-outcomes")) {
    return classification === "وعد بنتيجة" || ["نضمن", "يضمن", "مضمون", "مضمونة", "كسب", "الفوز", "نتيجة"].some((signal) => phrase.includes(signal));
  }

  if (entry.id.includes("advertising") || ruleContext.includes("إعلان") || ruleContext.includes("تضليل")) {
    return (
      classification === "إعلان مضلل محتمل" ||
      classification === "ادعاء تسويقي" ||
      ["أفضل", "الأفضل", "نسبة نجاح", "رقم واحد", "نتائج"].some((signal) => phrase.includes(signal))
    );
  }

  if (entry.id.includes("confidentiality")) return ["عميل", "قضية", "هوية", "مستندات", "بيانات"].some((signal) => phrase.includes(signal));
  if (entry.id.includes("conflict")) return ["الطرفين", "الأطراف", "الخصوم", "تعارض"].some((signal) => phrase.includes(signal));
  if (entry.id.includes("dignity")) return ["خصم", "فضيحة", "انتقم", "اهزم", "اسحق"].some((signal) => phrase.includes(signal));
  if (entry.id.includes("license") || entry.id.includes("prohibited-wording")) return ["معتمد", "مرخص", "وزارة العدل", "رسمي", "مصادق", "ترخيص"].some((signal) => phrase.includes(signal));
  if (entry.id.includes("training")) return ["خبرة", "خبير", "كل القضايا", "الأكثر"].some((signal) => phrase.includes(signal));
  if (entry.id.includes("communication") || entry.id.includes("solicitation")) return classification === "ادعاء تسويقي" || ["تواصل", "اتصل", "احجز", "فوراً", "فرصة"].some((signal) => phrase.includes(signal));

  return classification !== "معلومة قانونية";
}

function confidenceFromEvidence(matchedPattern: string | undefined, entry: (typeof legalKnowledgeEntries)[number]) {
  if (!matchedPattern) return "منخفض" as const;
  const exactPatternMatch = entry.prohibitedPatterns.includes(matchedPattern);
  if (exactPatternMatch && matchedPattern.length >= 6) return "مرتفع" as const;
  return "متوسط" as const;
}

function buildLegalExplanation(entry: (typeof legalKnowledgeEntries)[number], evidencePhrase: string, context?: ReviewContext) {
  const classification = classifyContentContext(evidencePhrase);
  const contextNote = [
    context?.contentType ? `نوع المحتوى: ${context.contentType}` : "",
    context?.channel ? `القناة: ${context.channel}` : "",
    context?.audience ? `الجمهور: ${context.audience}` : "",
    context?.purpose ? `الغرض: ${context.purpose}` : ""
  ]
    .filter(Boolean)
    .join("، ");
  return `وردت العبارة محل المراجعة "${evidencePhrase}" وصُنفت سياقياً على أنها "${classification}" ضمن نطاق ${entry.section}${contextNote ? `، مع سياق المراجعة (${contextNote})` : ""}. ترتبط هذه الملاحظة بالمرجع الرسمي لأن النص المرجعي يؤكد: ${entry.fullText}`;
}

function createTraceabilityId(entryId: string, evidence: string) {
  let hash = 0;
  const value = `${entryId}:${evidence}`;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  return `FND-${hash.toString(16).toUpperCase().padStart(8, "0")}`;
}

function buildFinding(entry: (typeof legalKnowledgeEntries)[number], evidence: { matchedPattern: string; phrase: string }, context?: ReviewContext): ReviewFinding {
  if (!entry.legalReference) {
    throw new Error(`Legal knowledge entry ${entry.id} is missing a legal reference.`);
  }
  const classification = classifyLegalKnowledgeEntry(entry);
  const weight = calculateFindingWeight(entry.severity, classification.category, classification.potentialImpact);

  return {
    traceabilityId: createTraceabilityId(entry.id, evidence.phrase),
    legalKnowledgeEntryId: entry.id,
    sourceDocumentId: entry.sourceDocumentId,
    title: entry.articleTitle ?? entry.section,
    category: classification.category,
    domain: classification.domain,
    potentialImpact: classification.potentialImpact,
    weight,
    scoreImpact: weight,
    issue: entry.riskCategories.join("، "),
    severity: entry.severity,
    evidence: evidence.phrase,
    matchedPattern: evidence.matchedPattern,
    contentClassification: classifyContentContext(evidence.phrase),
    advice: entry.recommendedAction,
    suggestedSaferWording: entry.recommendedAction,
    legalCitation: buildCitation(entry),
    sourceDocument: entry.sourceDocument,
    legalReference: entry.legalReference,
    articleTitle: entry.articleTitle ?? entry.section,
    articleTextExcerpt: entry.fullText,
    explanation: `رصدت المنصة العبارة الفعلية من النص: "${evidence.phrase}". سبب الرصد هو احتواؤها على مؤشر "${evidence.matchedPattern}" المرتبط بالمرجع المحدد.`,
    legalExplanation: buildLegalExplanation(entry, evidence.phrase, context),
    reviewOutcome: "رصدت ملاحظة",
    confidenceLevel: confidenceFromEvidence(evidence.matchedPattern, entry),
    sourceUrl: entry.sourceUrl
  };
}

function isAuditableFinding(finding: ReviewFinding) {
  return Boolean(
      finding.legalKnowledgeEntryId &&
      finding.traceabilityId &&
      finding.sourceDocumentId &&
      finding.title &&
      finding.category &&
      finding.domain &&
      finding.weight > 0 &&
      finding.scoreImpact > 0 &&
      finding.sourceDocument &&
      finding.legalReference &&
      finding.articleTitle &&
      finding.articleTextExcerpt &&
      finding.legalExplanation &&
      finding.evidence &&
      finding.matchedPattern &&
      finding.confidenceLevel &&
      finding.sourceUrl &&
      isOfficialMojUrl(finding.sourceUrl) &&
      legalKnowledgeEntries.some(
        (entry) =>
          entry.id === finding.legalKnowledgeEntryId &&
          entry.sourceDocumentId === finding.sourceDocumentId &&
          entry.sourceDocument === finding.sourceDocument &&
          entry.legalReference === finding.legalReference &&
          entry.articleTitle === finding.articleTitle &&
          entry.fullText === finding.articleTextExcerpt &&
          entry.sourceUrl === finding.sourceUrl &&
          (entry.prohibitedPatterns.includes(finding.matchedPattern) || (entry.contextualPatterns ?? []).includes(finding.matchedPattern))
      )
  );
}

function buildSection(title: string, sourceDocumentId: string, findings: ReviewFinding[]): LegalReviewSection {
  const sourceEntry = legalKnowledgeEntries.find((entry) => entry.sourceDocumentId === sourceDocumentId);
  const sectionFindings = findings.filter((finding) =>
    legalKnowledgeEntries.some(
      (entry) =>
        entry.sourceDocumentId === sourceDocumentId &&
        entry.sourceDocument === finding.sourceDocument &&
        entry.legalReference === finding.legalReference
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

export function runLegalComplianceReview(text: string, context?: ReviewContext) {
  const findings: ReviewFinding[] = legalKnowledgeEntries.flatMap((entry) => {
    if (!isTraceableRegisteredRule(entry)) return [];
    const evidence = findEvidence(text, [...entry.prohibitedPatterns, ...(entry.contextualPatterns ?? [])]);
    if (!evidence) return [];
    if (!contextSupportsRule(entry, evidence)) return [];
    return [buildFinding(entry, evidence, context)];
  }).filter(isAuditableFinding);

  const complianceScoreExplanation = calculateComplianceScore(findings);
  const riskScoreExplanation = calculateRiskScore(findings);
  const complianceScore = complianceScoreExplanation.finalScore;
  const riskLevel = riskScoreExplanation.level;
  const professionalConductCompliance = buildSection("امتثال قواعد السلوك المهني", PROFESSIONAL_CONDUCT_SOURCE_ID, findings);
  const executiveRegulationCompliance = buildSection("امتثال اللائحة التنفيذية لنظام المحاماة في المملكة العربية السعودية", EXECUTIVE_REGULATION_SOURCE_ID, findings);
  const legalRiskAssessment = buildRiskAssessment(findings, riskScoreExplanation);
  const referencesPanel = buildReferencesPanel(findings);

  return {
    passed: riskLevel === "منخفض" || riskLevel === "متوسط",
    complianceScore,
    complianceScoreExplanation,
    riskLevel,
    riskScore: riskScoreExplanation.score,
    riskScoreExplanation,
    findings,
    professionalConductCompliance,
    executiveRegulationCompliance,
    legalRiskAssessment,
    referencesPanel,
    noViolationMessage
  };
}
