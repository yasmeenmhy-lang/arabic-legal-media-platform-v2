CREATE TABLE "ScoringProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "ScoringProfile_profileKey_key" ON "ScoringProfile"("profileKey");

CREATE TABLE "ScoringProfileVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scoringProfileId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "applicability" TEXT NOT NULL,
    "complianceDeductions" TEXT NOT NULL,
    "riskPoints" TEXT NOT NULL,
    "readinessWeights" TEXT NOT NULL,
    "thresholds" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "changeReason" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "activatedBy" TEXT,
    "activatedAt" DATETIME,
    "retiredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScoringProfileVersion_scoringProfileId_fkey" FOREIGN KEY ("scoringProfileId") REFERENCES "ScoringProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ScoringProfileVersion_scoringProfileId_version_key" ON "ScoringProfileVersion"("scoringProfileId", "version");
CREATE INDEX "ScoringProfileVersion_status_priority_idx" ON "ScoringProfileVersion"("status", "priority");

CREATE TABLE "ScoringProfileAudit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "scoringProfileVersionId" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScoringProfileAudit_scoringProfileVersionId_fkey" FOREIGN KEY ("scoringProfileVersionId") REFERENCES "ScoringProfileVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "ScoringProfileAudit_scoringProfileVersionId_createdAt_idx" ON "ScoringProfileAudit"("scoringProfileVersionId", "createdAt");
