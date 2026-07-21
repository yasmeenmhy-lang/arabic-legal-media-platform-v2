import type {
  ContentKind,
  GovernedRewriteReference,
  GovernedRewriteSettings,
  GovernedRewriteSuggestion,
  ReviewContext,
  ReviewFinding,
  RiskLevel
} from "@/lib/types";
import { legalKnowledgeEntries, legalSourceDocuments } from "@/lib/legal-knowledge-base";
import { reviewLanguageQuality } from "@/lib/services/language-quality-service";
import { rebuildComplianceFromFindings } from "@/lib/services/legal-compliance-service";
import { resolveScoringProfile } from "@/lib/scoring-profiles";
import { governTextFull } from "@/lib/services/governor-gate";

function envFlag(name: string, fallback: boolean) {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return value === "true";
}

function envThreshold(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : fallback;
}

export const governedRewriteSettings: GovernedRewriteSettings = {
  requireLegalValidation: envFlag("REWRITE_REQUIRE_LEGAL_VALIDATION", true),
  requireLanguageValidation: envFlag("REWRITE_REQUIRE_LANGUAGE_VALIDATION", true),
  minimumComplianceThreshold: envThreshold("REWRITE_MIN_COMPLIANCE_SCORE", 95),
  minimumLanguageQualityThreshold: envThreshold("REWRITE_MIN_LANGUAGE_QUALITY_SCORE", 95)
};

function uniqueBy<T>(items: T[], key: (item: T) => string) {
  const unique = new Map<string, T>();
  items.forEach((item) => unique.set(key(item), item));
  return Array.from(unique.values());
}

function isOfficialMojUrl(sourceUrl: string) {
  try {
    const hostname = new URL(sourceUrl).hostname.toLowerCase();
    return hostname === "laws.moj.gov.sa" || hostname === "moj.gov.sa" || hostname.endsWith(".moj.gov.sa");
  } catch {
    return false;
  }
}

function sourceIsRegistered(reference: GovernedRewriteReference) {
  return legalSourceDocuments.some(
    (source) =>
      source.title === reference.sourceDocument &&
      source.sourceUrl === reference.sourceUrl &&
      source.status === "ACTIVE" &&
      isOfficialMojUrl(source.sourceUrl)
  );
}

function findingIsTraceable(finding: ReviewFinding) {
  return legalKnowledgeEntries.some(
    (entry) =>
      entry.id === finding.legalKnowledgeEntryId &&
      entry.sourceDocumentId === finding.sourceDocumentId &&
      entry.sourceDocument === finding.sourceDocument &&
      entry.legalReference === finding.legalReference &&
      entry.articleTitle === finding.articleTitle &&
      entry.fullText === finding.articleTextExcerpt &&
      entry.sourceUrl === finding.sourceUrl
  );
}

function referencesFromFindings(findings: ReviewFinding[]): GovernedRewriteReference[] {
  return uniqueBy(
    findings
      .filter(findingIsTraceable)
      .map((finding) => ({
        sourceDocument: finding.sourceDocument,
        legalReference: finding.legalReference,
        articleTitle: finding.articleTitle,
        articleTextExcerpt: finding.articleTextExcerpt,
        sourceUrl: finding.sourceUrl
      }))
      .filter(sourceIsRegistered),
    (reference) => `${reference.sourceDocument}-${reference.legalReference}-${reference.sourceUrl}`
  );
}

function generalValidationReferences(): GovernedRewriteReference[] {
  return legalSourceDocuments
    .filter((source) => source.status === "ACTIVE" && isOfficialMojUrl(source.sourceUrl))
    .map((source) => ({
      sourceDocument: source.title,
      sourceUrl: source.sourceUrl
    }));
}

function normalizedContentScope(context: ReviewContext) {
  return context.contentType?.trim() || "المحتوى المهني";
}

function buildInternalSafeSentence(finding: ReviewFinding, context: ReviewContext) {
  const serviceScope = normalizedContentScope(context);
  const id = finding.legalKnowledgeEntryId;
  const evidence = `${finding.evidence} ${finding.matchedPattern}`.toLowerCase();

  if (id.includes("no-guaranteed-outcomes") || evidence.includes("100%") || evidence.includes("نضمن") || evidence.includes("مضمونة") || evidence.includes("كسب")) {
    return `يقدم المكتب مراجعة مهنية للوقائع والمستندات المتعلقة بـ${serviceScope}، مع بيان الخيارات النظامية الممكنة دون وعد بنتيجة محددة أو ضمان لمآل الإجراء.`;
  }

  if (id.includes("advertising") || evidence.includes("أفضل") || evidence.includes("رقم واحد") || evidence.includes("الأقوى") || evidence.includes("لا مثيل")) {
    return "يعرض المكتب خدماته القانونية بصياغة تعريفية مهنية، مع تجنب عبارات التفضيل أو التفوق أو المقارنات غير المثبتة، وبما يحافظ على وضوح الإعلان وصدقه.";
  }

  if (id.includes("confidentiality")) {
    return "تُعرض الخبرة أو نطاق الخدمات بصورة عامة دون الإفصاح عن أسماء العملاء أو تفاصيل القضايا أو المستندات أو أي بيانات يمكن أن تكشف معلومات سرية.";
  }

  if (id.includes("dignity")) {
    return "تُصاغ الرسالة بلغة مهنية هادئة تحافظ على شرف المهنة ومكانتها وثقة الجمهور، وتتجنب العبارات العدائية أو المثيرة أو غير الملائمة.";
  }

  if (id.includes("license") || id.includes("prohibited-wording")) {
    return "تُذكر الصفة المهنية ونطاق الخدمة بدقة دون الإيحاء بترخيص أو اعتماد أو موافقة رسمية غير مثبتة من جهة مختصة.";
  }

  if (id.includes("training")) {
    return "يوضح المكتب خبرته وخدماته بعبارات محددة وقابلة للتحقق، دون مبالغة أو تعميم أو ادعاء خبرة مطلقة في جميع الحالات.";
  }

  if (id.includes("conflict")) {
    return "يؤكد المكتب التزامه بالتحقق من تعارض المصالح قبل قبول أي عمل، وبما يحافظ على استقلالية التمثيل وحماية مصالح العملاء.";
  }

  if (id.includes("communication") || id.includes("solicitation")) {
    return "يمكن للراغبين طلب مراجعة مهنية وفق الوقائع والمستندات ذات الصلة، دون ربط التواصل بتحقيق نتيجة محددة أو استخدام ضغط تسويقي غير ملائم.";
  }

  if (id.includes("public-communication")) {
    return "تُعرض المعلومة القانونية بصيغة توعوية عامة، مع التنبيه إلى أن تقدير الموقف النظامي يتطلب مراجعة الوقائع والمستندات ذات الصلة.";
  }

  return finding.suggestedSaferWording || "استبدل العبارة محل الملاحظة بصياغة مهنية محايدة لا تتضمن وعدًا أو ادعاءً غير مثبت.";
}

function ensureProfessionalClosing(text: string) {
  const trimmed = text.trim().replace(/[\s.؟!،؛]+$/, "");
  if (trimmed.includes("وفق الأنظمة والتعليمات ذات العلاقة")) return `${trimmed}.`;
  return `${trimmed}، وفق الأنظمة والتعليمات ذات العلاقة.`;
}

function safeSentenceForFinding(finding: ReviewFinding, context: ReviewContext) {
  return buildInternalSafeSentence(finding, context);

  const serviceScope = context.contentType || "المحتوى المهني";

  if (finding.legalKnowledgeEntryId.includes("no-guaranteed-outcomes")) {
    return `يقدم المكتب مراجعة مهنية للوقائع والمستندات المتعلقة بـ${serviceScope}، مع بيان الخيارات النظامية الممكنة دون وعد بنتيجة محددة.`;
  }

  if (finding.legalKnowledgeEntryId.includes("advertising")) {
    return `يعرض المكتب خدماته المهنية بصورة تعريفية، مع الالتزام بالوضوح وتجنب العبارات المطلقة أو المقارنات غير القابلة للتحقق.`;
  }

  if (finding.legalKnowledgeEntryId.includes("confidentiality")) {
    return "تُعرض الأمثلة المهنية بصورة عامة دون كشف بيانات العملاء أو تفاصيل القضايا أو أي معلومات سرية.";
  }

  if (finding.legalKnowledgeEntryId.includes("conflict")) {
    return "يراعي المكتب متطلبات الاستقلال المهني والتحقق من عدم وجود تعارض مصالح قبل تقديم أي خدمة.";
  }

  if (finding.legalKnowledgeEntryId.includes("dignity")) {
    return "تصاغ الرسالة بلغة مهنية هادئة تحافظ على مكانة المهنة وثقة الجمهور في الخدمات القانونية.";
  }

  if (finding.legalKnowledgeEntryId.includes("license") || finding.legalKnowledgeEntryId.includes("prohibited-wording")) {
    return "تُذكر الصفة المهنية بدقة وفق البيانات النظامية الموثقة، دون الإيحاء بترخيص أو اعتماد غير مثبت.";
  }

  if (finding.legalKnowledgeEntryId.includes("training")) {
    return "يوضح المكتب نطاق خبرته وخدماته بعبارات محددة وقابلة للتحقق دون مبالغة أو تعميم.";
  }

  if (finding.legalKnowledgeEntryId.includes("communication") || finding.legalKnowledgeEntryId.includes("solicitation")) {
    return "يمكن للراغبين التواصل لطلب مراجعة مهنية وفق الوقائع والمستندات ذات الصلة، دون ربط التواصل بنتيجة محددة.";
  }

  return finding.suggestedSaferWording;
}

function replaceFindingEvidence(text: string, findings: ReviewFinding[], context: ReviewContext) {
  return findings.reduce((draft, finding) => {
    const safeSentence = safeSentenceForFinding(finding, context);
    return draft.includes(finding.evidence)
      ? draft.replace(finding.evidence, safeSentence)
      : draft.replace(finding.matchedPattern, safeSentence);
  }, text);
}

function buildCandidateText(text: string, findings: ReviewFinding[], kind: ContentKind, context: ReviewContext) {
  const legallySaferDraft = replaceFindingEvidence(text, findings, context);
  const languageDraft = reviewLanguageQuality({ text: legallySaferDraft, kind }).improvedDraft;
  return ensureProfessionalClosing(languageDraft);
}

function riskIsReducedOrUnchanged(originalRiskScore: number, proposedRiskScore: number) {
  return proposedRiskScore <= originalRiskScore;
}

function hasNewViolation(originalFindings: ReviewFinding[], proposedFindings: ReviewFinding[]) {
  const originalIds = new Set(originalFindings.map((finding) => finding.legalKnowledgeEntryId));
  return proposedFindings.some((finding) => !originalIds.has(finding.legalKnowledgeEntryId));
}

export async function buildGovernedRewriteSuggestions({
  text,
  kind,
  context,
  originalFindings,
  originalComplianceScore,
  originalLanguageQuality,
  originalRiskLevel,
  originalRiskScore
}: {
  text: string;
  kind: ContentKind;
  context: ReviewContext;
  originalFindings: ReviewFinding[];
  originalComplianceScore: number;
  originalLanguageQuality: number;
  originalRiskLevel: RiskLevel;
  originalRiskScore: number;
}): Promise<GovernedRewriteSuggestion[]> {
  if (!text.trim()) return [];
  // الصياغة المقترحة تُعرض فقط لمعالجة مخالفات مرصودة — التحسين اللغوي الصرف له
  // زر «أعد صياغة المحتوى» (reformulate) المحكوم بالبوابة أصلاً
  if (originalFindings.length === 0) return [];

  const candidateText = buildCandidateText(text, originalFindings, kind, context);
  if (candidateText.trim() === text.trim()) return [];

  // ★ القاعدة الأساسية (بقرار مالكة المنصة): ممنوع عرض أي نص من إنتاج المنصة —
  // ولو كان استبدالاً آلياً — دون فحصه فعلياً ببوابة الحاكم نفسها (محرك الحكم
  // الدلالي على المتن الرسمي الكامل). كان الفحص السابق زائفاً: يفحص قائمة مخالفات
  // فارغة مفترضة بدل النص المقترح نفسه، فتُعرض «صياغة مقترحة» قد تحمل مخالفات لم
  // تُفحص قط. فشل مغلق: تعذُّر حكم الذكاء أو بقاء أي مخالفة ⇒ لا تُعرض الصياغة.
  // ★ بأمر مالكة المنصة: المقترح يُفحص بكل المؤشرات بلا استثناء — الامتثال واللغة
  // والإملاء والأسلوب والمخاطر؛ أي مؤشر غير مستوفٍ = لا يُعرض المقترح إطلاقاً
  const gate = await governTextFull(candidateText, context, kind, { checkLanguage: true });
  if (!gate.semanticResult || !gate.compliant || !gate.clean) return [];
  if (gate.contentEval && gate.contentEval.risks.level !== "منخفض") return [];

  const proposedCompliance = rebuildComplianceFromFindings(gate.semanticResult.findings, resolveScoringProfile(kind, context.channel));
  const proposedLanguage = reviewLanguageQuality({ text: candidateText, kind }, governedRewriteSettings.minimumLanguageQualityThreshold);
  const referencesUsed = referencesFromFindings(originalFindings);
  const validationReferences = referencesUsed.length > 0 ? referencesUsed : generalValidationReferences();

  const legalCompliancePassed =
    validationReferences.length > 0 &&
    proposedCompliance.findings.length === 0 &&
    !hasNewViolation(originalFindings, proposedCompliance.findings);
  const compliancePassed =
    proposedCompliance.complianceScore >= governedRewriteSettings.minimumComplianceThreshold &&
    proposedCompliance.complianceScore >= originalComplianceScore &&
    proposedCompliance.findings.length <= originalFindings.length &&
    !hasNewViolation(originalFindings, proposedCompliance.findings);
  const languagePassed =
    proposedLanguage.score >= governedRewriteSettings.minimumLanguageQualityThreshold &&
    proposedLanguage.passed;
  const riskPassed = riskIsReducedOrUnchanged(originalRiskScore, proposedCompliance.riskScore);

  if (governedRewriteSettings.requireLegalValidation && !legalCompliancePassed) return [];
  if (governedRewriteSettings.requireLanguageValidation && !languagePassed) return [];
  if (!compliancePassed || !riskPassed) return [];

  return [
    {
      id: "governed-rewrite-1",
      suggestedText: candidateText,
      basis: "صياغة مقترحة لمعالجة الملاحظات المرتبطة بالمراجع المهنية والتنظيمية المسجلة — فُحصت بجميع مؤشرات الجودة وخلت من المخالفات.",
      originalComplianceScore,
      proposedComplianceScore: proposedCompliance.complianceScore,
      originalLanguageQuality,
      proposedLanguageQuality: proposedLanguage.score,
      originalRiskLevel,
      proposedRiskLevel: proposedCompliance.riskLevel,
      originalRiskScore,
      proposedRiskScore: proposedCompliance.riskScore,
      validation: {
        legalCompliance: legalCompliancePassed ? "passed" : "failed",
        compliance: compliancePassed ? "passed" : "failed",
        languageQuality: languagePassed ? "passed" : "failed",
        riskImpact: proposedCompliance.riskScore < originalRiskScore ? "reduced" : "unchanged"
      },
      referencesUsed: validationReferences
    }
  ];
}

export function getRecommendations() {
  return [];
}
