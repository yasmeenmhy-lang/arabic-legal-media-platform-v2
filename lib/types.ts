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
    riskLevel: RiskLevel;
    readinessStatus: string;
    publishingReadiness: string;
    advisoryDisclaimer: string;
    legalCitations: Array<{
      legalCitation: string;
      sourceDocument: string;
      ruleOrArticleNumber: string;
      explanation: string;
      sourceUrl: string;
    }>;
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

export type ReviewFinding = {
  issue: string;
  severity: RiskLevel;
  evidence: string;
  advice: string;
  legalCitation: string;
  sourceDocument: string;
  ruleOrArticleNumber: string;
  explanation: string;
  sourceUrl: string;
};

export type ReviewResult = {
  languageQuality: LanguageQualityReviewResult;
  complianceScore: number;
  riskLevel: RiskLevel;
  summary: string;
  findings: ReviewFinding[];
  workflow: ReviewWorkflowStep[];
  exportAllowed: boolean;
  advisoryDisclaimer: string;
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
  articleOrRuleNumber: string;
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
      ruleOrArticleNumber: string;
      explanation: string;
      sourceUrl: string;
    }>;
  };
  exportPackage: {
    textFileName: string;
    metadataFileName: string;
    payload: Record<string, unknown>;
  };
};
