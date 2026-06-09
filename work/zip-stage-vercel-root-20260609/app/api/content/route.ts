import { ok } from "@/lib/api";
import { contentRows } from "@/lib/data";

export async function GET() {
  return ok(contentRows);
}
