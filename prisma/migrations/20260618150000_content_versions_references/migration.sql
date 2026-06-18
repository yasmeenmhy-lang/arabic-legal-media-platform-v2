ALTER TABLE "User" ADD COLUMN "gender" TEXT;
ALTER TABLE "User" ADD COLUMN "experienceYears" INTEGER;
ALTER TABLE "User" ADD COLUMN "legalSpecialty" TEXT;
ALTER TABLE "User" ADD COLUMN "loginCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lastLoginAt" DATETIME;

ALTER TABLE "ContentReview" ADD COLUMN "contentVersionId" TEXT;

CREATE TABLE "ContentVersion" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "contentId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "body" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "contentType" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "audience" TEXT,
  "purpose" TEXT,
  "isCurrent" BOOLEAN NOT NULL DEFAULT true,
  "isApproved" BOOLEAN NOT NULL DEFAULT false,
  "approvedBy" TEXT,
  "approvedAt" DATETIME,
  "analysisSnapshot" TEXT,
  "complianceSnapshot" TEXT,
  "riskSnapshot" TEXT,
  "opportunitiesSnapshot" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "ContentVersion_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ContentVersion_contentId_version_key" ON "ContentVersion"("contentId", "version");
CREATE INDEX "ContentVersion_contentId_isCurrent_idx" ON "ContentVersion"("contentId", "isCurrent");
CREATE INDEX "ContentVersion_contentId_isApproved_idx" ON "ContentVersion"("contentId", "isApproved");

CREATE TABLE "ProfessionalOfficialReference" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "contentVersionId" TEXT NOT NULL,
  "referenceName" TEXT NOT NULL,
  "ruleOrRegulationName" TEXT NOT NULL,
  "articleOrRuleNumber" TEXT NOT NULL,
  "relatedText" TEXT NOT NULL,
  "relatedContentPhrase" TEXT NOT NULL,
  "relianceReason" TEXT NOT NULL,
  "contentEffect" TEXT NOT NULL,
  "practicalGuidance" TEXT NOT NULL,
  "officialUrl" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProfessionalOfficialReference_contentVersionId_fkey" FOREIGN KEY ("contentVersionId") REFERENCES "ContentVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ProfessionalOfficialReference_contentVersionId_idx" ON "ProfessionalOfficialReference"("contentVersionId");

CREATE TABLE "ContentAction" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "contentId" TEXT NOT NULL,
  "version" INTEGER,
  "actorName" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "previousStatus" TEXT,
  "newStatus" TEXT,
  "details" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentAction_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ContentAction_contentId_version_idx" ON "ContentAction"("contentId", "version");

CREATE TABLE "PlanningProposal" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "contentId" TEXT,
  "contentVersion" INTEGER,
  "title" TEXT NOT NULL,
  "objective" TEXT NOT NULL,
  "audience" TEXT NOT NULL,
  "channels" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "occasion" TEXT,
  "message" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PROPOSED',
  "createdBy" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL
);

CREATE INDEX "PlanningProposal_contentId_contentVersion_idx" ON "PlanningProposal"("contentId", "contentVersion");
CREATE INDEX "ContentReview_contentId_contentVersionId_idx" ON "ContentReview"("contentId", "contentVersionId");
