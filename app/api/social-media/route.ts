import { ok } from "@/lib/api";
import { getSocialMediaCenter } from "@/lib/services/social-media-service";

export async function GET() {
  return ok(getSocialMediaCenter());
}
