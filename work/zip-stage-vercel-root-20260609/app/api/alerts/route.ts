import { ok } from "@/lib/api";
import { alerts } from "@/lib/data";

export async function GET() {
  return ok(alerts);
}
