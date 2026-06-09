export type RoleName = "LAWYER" | "SUPERVISOR" | "ADMIN";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

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
  versions: string[];
  titles: string[];
  hashtags: string[];
  cta: string;
};

export type ReviewFinding = {
  issue: string;
  severity: RiskLevel;
  evidence: string;
  advice: string;
};

export type ReviewResult = {
  complianceScore: number;
  riskLevel: RiskLevel;
  summary: string;
  findings: ReviewFinding[];
};
