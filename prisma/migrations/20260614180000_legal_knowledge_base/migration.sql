CREATE TABLE "LegalSourceDocument" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileName" TEXT,
    "sourceUrl" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "lastCheckedAt" DATETIME,
    "changeDetected" BOOLEAN NOT NULL DEFAULT false,
    "pendingVersion" TEXT,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "pages" INTEGER,
    "issuedHijri" TEXT,
    "effectiveHijri" TEXT,
    "ministry" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "LegalSourceVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceDocumentId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "checkedAt" DATETIME NOT NULL,
    "checksum" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LegalSourceVersion_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "LegalSourceDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "LegalSourceAudit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceDocumentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LegalSourceAudit_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "LegalSourceDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "LegalKnowledgeEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceDocumentId" TEXT NOT NULL,
    "sourceDocument" TEXT NOT NULL,
    "articleOrRuleNumber" TEXT NOT NULL,
    "chapter" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "fullText" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "keywords" TEXT NOT NULL DEFAULT '[]',
    "riskCategories" TEXT NOT NULL DEFAULT '[]',
    "severity" TEXT NOT NULL,
    "prohibitedPatterns" TEXT NOT NULL DEFAULT '[]',
    "recommendedAction" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LegalKnowledgeEntry_sourceDocumentId_fkey" FOREIGN KEY ("sourceDocumentId") REFERENCES "LegalSourceDocument" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE "ReviewFinding" ADD COLUMN "legalCitation" TEXT;
ALTER TABLE "ReviewFinding" ADD COLUMN "sourceDocument" TEXT;
ALTER TABLE "ReviewFinding" ADD COLUMN "ruleOrArticleNumber" TEXT;
ALTER TABLE "ReviewFinding" ADD COLUMN "explanation" TEXT;
ALTER TABLE "ReviewFinding" ADD COLUMN "sourceUrl" TEXT;
ALTER TABLE "Content" ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "ContentReview" ADD COLUMN "languageQualityScore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "LegalSourceDocument" ADD COLUMN "sourceHash" TEXT;
ALTER TABLE "LegalSourceDocument" ADD COLUMN "pendingSourceHash" TEXT;
