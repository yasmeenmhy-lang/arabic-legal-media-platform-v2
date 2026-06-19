import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import {
  activateScoringProfile,
  getScoringProfiles,
  saveScoringProfile,
  type ScoringProfile
} from "@/lib/scoring-profiles";

declare global {
  // eslint-disable-next-line no-var
  var scoringProfileAudit: Array<{ at: string; action: string; profile: string; reason: string }> | undefined;
}

function audit(action: string, profile: string, reason: string) {
  globalThis.scoringProfileAudit ??= [];
  globalThis.scoringProfileAudit.unshift({ at: new Date().toISOString(), action, profile, reason });
}

export async function GET() {
  if (!isAdminAuthenticated()) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  return NextResponse.json({ data: { profiles: getScoringProfiles(), audit: globalThis.scoringProfileAudit ?? [] } });
}

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("activate"), id: z.string(), version: z.number(), reason: z.string().min(3) }),
  z.object({ action: z.literal("save"), profile: z.record(z.unknown()), reason: z.string().min(3) }),
  z.object({ action: z.literal("newVersion"), id: z.string(), version: z.number(), reason: z.string().min(3) })
]);

export async function POST(request: Request) {
  if (!isAdminAuthenticated()) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const parsed = actionSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "INVALID_PROFILE_ACTION" }, { status: 400 });
  const data = parsed.data;

  if (data.action === "activate") {
    const activated = activateScoringProfile(data.id, data.version);
    if (!activated) return NextResponse.json({ error: "ACTIVATION_FAILED" }, { status: 422 });
    audit("ACTIVATED", `${data.id}-v${data.version}`, data.reason);
  } else if (data.action === "save") {
    const profile = data.profile as unknown as ScoringProfile;
    const result = saveScoringProfile({ ...profile, changeReason: data.reason });
    if (!result.saved) return NextResponse.json({ error: "VALIDATION_FAILED", details: result.errors }, { status: 422 });
    audit("SAVED", `${profile.id}-v${profile.version}`, data.reason);
  } else if (data.action === "newVersion") {
    const source = getScoringProfiles().find((item) => item.id === data.id && item.version === data.version);
    if (!source) return NextResponse.json({ error: "PROFILE_NOT_FOUND" }, { status: 404 });
    const versions = getScoringProfiles().filter((item) => item.id === source.id).map((item) => item.version);
    const profile = structuredClone(source);
    profile.version = Math.max(...versions) + 1;
    profile.status = "DRAFT";
    profile.createdAt = new Date().toISOString();
    profile.changeReason = data.reason;
    getScoringProfiles().push(profile);
    audit("VERSION_CREATED", `${profile.id}-v${profile.version}`, data.reason);
  }
  return NextResponse.json({ data: { profiles: getScoringProfiles(), audit: globalThis.scoringProfileAudit ?? [] } });
}
