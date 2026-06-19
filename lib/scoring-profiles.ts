import type { ContentKind } from "@/lib/types";

export type BusinessSeverity = "critical" | "high" | "medium" | "low";
export type ProfileStatus = "DRAFT" | "ACTIVE" | "RETIRED";

export type ScoringProfile = {
  id: string;
  name: string;
  version: number;
  status: ProfileStatus;
  contentKinds: ContentKind[];
  channels: string[];
  priority: number;
  isDefault: boolean;
  complianceDeductions: Record<BusinessSeverity, number>;
  riskPoints: Record<BusinessSeverity, number>;
  readinessWeights: {
    compliance: number;
    risk: number;
    language: number;
    approval: number;
  };
  thresholds: {
    compliance: { veryHigh: number; high: number; medium: number; low: number };
    risk: { low: number; medium: number; high: number };
    readiness: { recommended: number; afterFindings: number; processing: number };
  };
  createdAt: string;
  changeReason: string;
};

const baseProfile = {
  version: 1,
  status: "ACTIVE" as const,
  channels: [] as string[],
  complianceDeductions: { critical: 40, high: 20, medium: 10, low: 5 },
  riskPoints: { critical: 40, high: 20, medium: 10, low: 5 },
  thresholds: {
    compliance: { veryHigh: 95, high: 85, medium: 70, low: 50 },
    risk: { low: 20, medium: 40, high: 60 },
    readiness: { recommended: 90, afterFindings: 80, processing: 60 }
  },
  createdAt: "2026-06-18T00:00:00.000Z",
  changeReason: "Initial approved business methodology"
};

export const initialScoringProfiles: ScoringProfile[] = [
  {
    ...baseProfile,
    id: "professional-advertisement",
    name: "الإعلان المهني",
    contentKinds: ["advertisement"],
    priority: 100,
    isDefault: false,
    readinessWeights: { compliance: 45, risk: 35, language: 10, approval: 10 }
  },
  {
    ...baseProfile,
    id: "educational-legal-content",
    name: "المحتوى القانوني التثقيفي",
    contentKinds: ["post", "infographic", "caption"],
    priority: 80,
    isDefault: false,
    readinessWeights: { compliance: 40, risk: 25, language: 25, approval: 10 }
  },
  {
    ...baseProfile,
    id: "awareness-campaign",
    name: "الحملة التوعوية",
    contentKinds: ["campaign", "publishing_plan"],
    priority: 90,
    isDefault: false,
    readinessWeights: { compliance: 40, risk: 30, language: 20, approval: 10 }
  },
  {
    ...baseProfile,
    id: "video-content",
    name: "محتوى الفيديو",
    contentKinds: ["script", "visual_content"],
    channels: ["TikTok", "Snapchat", "YouTube", "YouTube Shorts"],
    priority: 95,
    isDefault: false,
    readinessWeights: { compliance: 35, risk: 30, language: 25, approval: 10 }
  },
  {
    ...baseProfile,
    id: "article-content",
    name: "المقال القانوني",
    contentKinds: ["article"],
    priority: 85,
    isDefault: false,
    readinessWeights: { compliance: 40, risk: 25, language: 25, approval: 10 }
  },
  {
    ...baseProfile,
    id: "default-professional-content",
    name: "المحتوى المهني العام",
    contentKinds: [],
    priority: 1,
    isDefault: true,
    readinessWeights: { compliance: 40, risk: 30, language: 20, approval: 10 }
  }
];

declare global {
  // eslint-disable-next-line no-var
  var scoringProfileRegistry: ScoringProfile[] | undefined;
}

export function getScoringProfiles() {
  if (!globalThis.scoringProfileRegistry) {
    globalThis.scoringProfileRegistry = structuredClone(initialScoringProfiles);
  }
  return globalThis.scoringProfileRegistry;
}

export function resolveScoringProfile(kind: ContentKind, channel?: string) {
  const active = getScoringProfiles().filter((profile) => profile.status === "ACTIVE");
  const matching = active
    .filter((profile) => {
      const kindMatch = profile.contentKinds.length === 0 || profile.contentKinds.includes(kind);
      const channelMatch = profile.channels.length === 0 || Boolean(channel && profile.channels.includes(channel));
      return kindMatch && channelMatch;
    })
    .sort((a, b) => {
      const specificityA = a.contentKinds.length > 0 ? 1 : 0 + (a.channels.length > 0 ? 1 : 0);
      const specificityB = b.contentKinds.length > 0 ? 1 : 0 + (b.channels.length > 0 ? 1 : 0);
      return specificityB - specificityA || b.priority - a.priority;
    });
  return matching[0] ?? active.find((profile) => profile.isDefault) ?? initialScoringProfiles.at(-1)!;
}

export function validateScoringProfile(profile: ScoringProfile) {
  const errors: string[] = [];
  const total = Object.values(profile.readinessWeights).reduce((sum, value) => sum + value, 0);
  if (total !== 100) errors.push("يجب أن يكون مجموع أوزان جاهزية النشر 100%.");
  for (const severity of ["critical", "high", "medium", "low"] as BusinessSeverity[]) {
    if (profile.complianceDeductions[severity] < 0) errors.push(`خصم الامتثال ${severity} غير صالح.`);
    if (profile.riskPoints[severity] < 0) errors.push(`وزن المخاطر ${severity} غير صالح.`);
  }
  return errors;
}

export function saveScoringProfile(profile: ScoringProfile) {
  const errors = validateScoringProfile(profile);
  if (errors.length) return { saved: false, errors };
  const profiles = getScoringProfiles();
  const index = profiles.findIndex((item) => item.id === profile.id && item.version === profile.version);
  if (index >= 0 && profiles[index].status === "ACTIVE") {
    return { saved: false, errors: ["لا يمكن تعديل إصدار مفعل. أنشئ إصداراً جديداً."] };
  }
  if (index >= 0) profiles[index] = profile;
  else profiles.push(profile);
  return { saved: true, errors: [] };
}

export function activateScoringProfile(id: string, version: number) {
  const profiles = getScoringProfiles();
  const target = profiles.find((item) => item.id === id && item.version === version);
  if (!target) return false;
  if (validateScoringProfile(target).length) return false;
  profiles
    .filter((item) => item.id === id && item.status === "ACTIVE")
    .forEach((item) => { item.status = "RETIRED"; });
  target.status = "ACTIVE";
  return true;
}
