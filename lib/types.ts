export type RoleName = "LAWYER" | "SUPERVISOR" | "ADMIN";

export type RiskLevel = "منخفض" | "متوسط" | "مرتفع";

export type ContentKind =
  | "post"
  | "advertisement"
  | "article"
  | "script"
  | "campaign"
  | "visual_content"
  | "infographic"
  | "title"
  | "hashtag"
  | "caption"
  | "publishing_plan"
  | "social_export";

export type LanguageIssueCategory = "spelling" | "grammar" | "style" | "readability" | "اتساق المصطلحات";

export type LanguageIssueSeverity = "low" | "medium" | "high" | "critical";

export type ModuleCard = {
  title: string;
  href: string;
  description: string;
  metric: string;
  status: string;
};

export type AIContentInput = {
  topic: string;
  audience: string;
  practiceArea: string;
  channel: string;
  objective: string;
};

export type AIContentOutput = {
  observations: string[];
  riskIndicators: string[];
  improvementSuggestions: string[];
  referenceHighlights: string[];
  languageQuality?: {
    passed: boolean;
    score: number;
    issuesCount: number;
    reviews: LanguageQualityReviewResult[];
  };
  compliance?: {
    score: number;
    scoreExplanation: ComplianceScoreExplanation;
    riskScore: number;
    riskLevel: RiskLevel;
    riskScoreExplanation: RiskScoreExplanation;
    publishingReadinessScore: number;
    publishingReadinessExplanation: PublishingReadinessExplanation;
    readinessStatus: string;
    publishingReadiness: string;
    advisoryDisclaimer: string;
    legalCitations: Array<{
      traceabilityId: string;
      title: string;
      category: FindingCategory;
      weight: number;
      scoreImpact: number;
      legalCitation: string;
      sourceDocument: string;
      legalReference: string;
      articleTitle: string;
      articleTextExcerpt: string;
      explanation: string;
      confidenceLevel: string;
      sourceUrl: string;
    }>;
    traceability: ReviewTraceability;
    reviews: ReviewResult[];
  };
};

export type LanguageQualityIssue = {
  id: string;
  category: LanguageIssueCategory;
  severity: LanguageIssueSeverity;
  message: string;
  excerpt: string;
  suggestion: string;
  start?: number;
  end?: number;
};

export type LanguageQualityReviewInput = {
  text: string;
  kind: ContentKind;
  platform?: string;
  requiredTerms?: string[];
  terminologyMap?: Record<string, string[]>;
};

export type LanguageQualityReviewResult = {
  passed: boolean;
  score: number;
  threshold: number;
  normalizedText: string;
  improvedDraft: string;
  issues: LanguageQualityIssue[];
  categoryScores: Record<LanguageIssueCategory, number>;
  reviewedAt: string;
};

export type ReviewContext = {
  contentType?: string;
  channel?: string;
  audience?: string;
  purpose?: string;
  reviewStatus?: ReviewReadinessStatus;
};

export type ReviewedContentContext = {
  reviewId: string;
  shortExcerpt: string;
  contentType?: string;
  channel?: string;
  audience?: string;
  purpose?: string;
  reviewedAt: string;
};

export type ReviewFinding = {
  traceabilityId: string;
  legalKnowledgeEntryId: string;
  sourceDocumentId: string;
  title: string;
  category: FindingCategory;
  domain: FindingDomain;
  potentialImpact: RiskLevel;
  weight: number;
  scoreImpact: number;
  issue: string;
  severity: RiskLevel;
  evidence: string;
  matchedPattern: string;
  contentClassification: "معلومة قانونية" | "وصف مهني" | "ادعاء تسويقي" | "وعد بنتيجة" | "إعلان مضلل محتمل";
  advice: string;
  suggestedSaferWording: string;
  legalCitation: string;
  sourceDocument: string;
  legalReference: string;
  articleTitle: string;
  articleTextExcerpt: string;
  explanation: string;
  legalExplanation: string;
  reviewOutcome: "لم ترصد ملاحظة" | "رصدت ملاحظة";
  confidenceLevel: "منخفض" | "متوسط" | "مرتفع";
  sourceUrl: string;
};

export type FindingCategory =
  | "ضوابط الإعلان"
  | "الوعود بالنتائج"
  | "السرية والخصوصية"
  | "استقطاب العملاء"
  | "الصفة المهنية"
  | "الخبرة المهنية"
  | "تعارض المصالح"
  | "كرامة المهنة"
  | "التواصل العام";

export type FindingDomain = "نظامي" | "مهني" | "إعلاني" | "لغوي" | "إجرائي";

export type ScoreContribution = {
  traceabilityId: string;
  label: string;
  value: number;
  explanation: string;
};

export type ComplianceScoreExplanation = {
  modelVersion: string;
  baseScore: number;
  totalDeduction: number;
  finalScore: number;
  calculatedFromFindingsOnly: true;
  contributions: ScoreContribution[];
};

export type RiskScoreExplanation = {
  modelVersion: string;
  score: number;
  level: RiskLevel;
  findingCount: number;
  severityContribution: number;
  categoryContribution: number;
  impactContribution: number;
  domainContribution: number;
  countContribution: number;
  contributions: ScoreContribution[];
};

export type PublishingReadinessExplanation = {
  modelVersion: string;
  finalScore: number;
  metadataCompletenessScore: number;
  reviewStatus: ReviewReadinessStatus;
  factors: Array<{
    key: "compliance" | "risk" | "language" | "metadata" | "review_status";
    label: string;
    sourceScore: number;
    weight: number;
    weightedScore: number;
    explanation: string;
  }>;
};

export type ReviewTraceability = {
  reviewId: string;
  scoringModelVersion: string;
  calculatedAt: string;
  findingTraceabilityIds: string[];
  legalKnowledgeEntryIds: string[];
  sourceDocumentIds: string[];
};

export type LegalReviewSection = {
  title: string;
  sourceDocument: string;
  sourceUrl: string;
  findings: ReviewFinding[];
  passed: boolean;
  summary: string;
};

export type LegalRiskAssessment = {
  level: RiskLevel;
  score: number;
  reason: string;
  publishingReadinessScore: number;
  supportingArticle?: {
    sourceDocument: string;
    legalReference: string;
    articleTitle: string;
    sourceUrl: string;
  };
};

export type ReviewResult = {
  reviewContext: ReviewedContentContext;
  languageQuality: LanguageQualityReviewResult;
  complianceScore: number;
  complianceScoreExplanation: ComplianceScoreExplanation;
  riskLevel: RiskLevel;
  riskScore: number;
  riskScoreExplanation: RiskScoreExplanation;
  publishingReadinessScore: number;
  publishingReadinessExplanation: PublishingReadinessExplanation;
  reviewStatus: ReviewReadinessStatus;
  summary: string;
  findings: ReviewFinding[];
  professionalConductCompliance: LegalReviewSection;
  executiveRegulationCompliance: LegalReviewSection;
  legalRiskAssessment: LegalRiskAssessment;
  referencesPanel: Array<{
    sourceDocument: string;
    legalReference: string;
    articleTitle: string;
    articleTextExcerpt: string;
    sourceUrl: string;
  }>;
  governedRewrites: GovernedRewriteSuggestion[];
  traceability: ReviewTraceability;
  workflow: ReviewWorkflowStep[];
  exportAllowed: boolean;
  advisoryDisclaimer: string;
};

export type GovernedRewriteValidationStatus = "passed" | "failed";

export type GovernedRewriteRiskImpact = "reduced" | "unchanged";

export type GovernedRewriteReference = {
  sourceDocument: string;
  legalReference?: string;
  articleTitle?: string;
  articleTextExcerpt?: string;
  sourceUrl: string;
};

export type GovernedRewriteSuggestion = {
  id: string;
  suggestedText: string;
  basis: string;
  originalComplianceScore: number;
  proposedComplianceScore: number;
  originalLanguageQuality: number;
  proposedLanguageQuality: number;
  originalRiskLevel: RiskLevel;
  proposedRiskLevel: RiskLevel;
  originalRiskScore: number;
  proposedRiskScore: number;
  validation: {
    legalCompliance: GovernedRewriteValidationStatus;
    compliance: GovernedRewriteValidationStatus;
    languageQuality: GovernedRewriteValidationStatus;
    riskImpact: GovernedRewriteRiskImpact;
  };
  referencesUsed: GovernedRewriteReference[];
};

export type GovernedRewriteSettings = {
  requireLegalValidation: boolean;
  requireLanguageValidation: boolean;
  minimumComplianceThreshold: number;
  minimumLanguageQualityThreshold: number;
};

export type ReviewWorkflowStep = {
  key: "language_quality_review" | "legal_compliance_review" | "risk_assessment" | "publishing_readiness" | "export_support";
  label: string;
  status: "pending" | "blocked" | "passed" | "failed";
};

export type LegalSourceStatus = "ACTIVE" | "SUPERSEDED" | "DRAFT";

export type LegalSourceDocument = {
  id: string;
  title: string;
  documentType: "PDF" | "MOJ_URL";
  fileName?: string;
  sourceUrl: string;
  version: string;
  status: LegalSourceStatus;
  pages?: number;
  issuedHijri?: string;
  effectiveHijri?: string;
  ministry: string;
};

export type LegalKnowledgeEntry = {
  id: string;
  sourceDocumentId: string;
  sourceDocument: string;
  legalReference: string | null;
  articleTitle?: string;
  chapter: string;
  section: string;
  fullText: string;
  pageNumber: number;
  sourceUrl: string;
  version: string;
  status: LegalSourceStatus;
  keywords: string[];
  riskCategories: string[];
  severity: RiskLevel;
  prohibitedPatterns: string[];
  contextualPatterns?: string[];
  recommendedAction: string;
};

export type LegalSourceUpdateStatus = "CURRENT" | "CHANGE_DETECTED" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";

export type LegalSourceVersion = {
  id: string;
  sourceDocumentId: string;
  version: string;
  checkedAt: string;
  checksum: string;
  summary: string;
  approvedBy?: string;
  approvedAt?: string;
};

export type LegalSourceSyncState = {
  sourceDocumentId: string;
  title: string;
  sourceUrl: string;
  lastCheckedAt: string;
  changeDetected: boolean;
  currentVersion: string;
  pendingVersion?: string;
  status: LegalSourceUpdateStatus;
  versionHistory: LegalSourceVersion[];
};

export type SourceAuditTrailItem = {
  id: string;
  sourceDocumentId: string;
  action: "REGISTERED" | "MANUAL_SYNC" | "CHANGE_DETECTED" | "APPROVED" | "REJECTED";
  actor: string;
  at: string;
  details: string;
};

export type ReviewReadinessStatus = "DRAFT" | "REVIEW_REQUIRED" | "NEEDS_CORRECTION" | "READY_FOR_PUBLISHING" | "EXPORTED" | "SHARED";

export type ReviewReadinessItem = {
  id: string;
  title: string;
  owner: string;
  status: ReviewReadinessStatus;
  languageQualityScore: number;
  complianceScore: number;
  riskLevel: RiskLevel;
  updatedAt: string;
};

export type SocialPlatformKey = "tiktok" | "snapchat" | "x" | "linkedin" | "instagram" | "youtube_shorts";

export type SocialPlatformShareTarget = {
  key: SocialPlatformKey;
  label: string;
  characterLimit?: number;
  supportsWebShare: boolean;
  supportsDeepLink: boolean;
  deepLink?: string;
  manualInstructions: string[];
};

export type ShareReadyContent = {
  id: string;
  title: string;
  body: string;
  hashtags: string[];
  mediaNotes: string;
  readyForPublishing: boolean;
  complianceMetadata?: {
    complianceScore: number;
    riskLevel: RiskLevel;
    readinessStatus: string;
    publishingReadiness: string;
    advisoryDisclaimer: string;
    legalCitations: Array<{
      legalCitation: string;
      sourceDocument: string;
      legalReference: string;
      articleTitle: string;
      articleTextExcerpt: string;
      explanation: string;
      confidenceLevel: string;
      sourceUrl: string;
    }>;
  };
  exportPackage: {
    textFileName: string;
    metadataFileName: string;
    payload: Record<string, unknown>;
  };
};
