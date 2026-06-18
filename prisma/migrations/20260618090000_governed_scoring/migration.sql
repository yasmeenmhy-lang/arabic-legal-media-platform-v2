ALTER TABLE "ContentReview" ADD COLUMN "riskScore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ContentReview" ADD COLUMN "publishingReadinessScore" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ContentReview" ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'REVIEW_REQUIRED';
ALTER TABLE "ContentReview" ADD COLUMN "complianceScoreExplanation" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "ContentReview" ADD COLUMN "riskScoreExplanation" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "ContentReview" ADD COLUMN "publishingReadinessExplanation" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "ContentReview" ADD COLUMN "traceability" TEXT NOT NULL DEFAULT '{}';

ALTER TABLE "ReviewFinding" ADD COLUMN "traceabilityId" TEXT;
ALTER TABLE "ReviewFinding" ADD COLUMN "title" TEXT;
ALTER TABLE "ReviewFinding" ADD COLUMN "category" TEXT;
ALTER TABLE "ReviewFinding" ADD COLUMN "domain" TEXT;
ALTER TABLE "ReviewFinding" ADD COLUMN "potentialImpact" TEXT;
ALTER TABLE "ReviewFinding" ADD COLUMN "weight" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ReviewFinding" ADD COLUMN "scoreImpact" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ReviewFinding" ADD COLUMN "articleTitle" TEXT;
ALTER TABLE "ReviewFinding" ADD COLUMN "articleTextExcerpt" TEXT;
ALTER TABLE "ReviewFinding" ADD COLUMN "confidenceLevel" TEXT;
