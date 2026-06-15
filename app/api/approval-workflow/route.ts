import { ok } from "@/lib/api";
import { getApprovalWorkflowCenter } from "@/lib/services/approval-workflow-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return ok(await getApprovalWorkflowCenter());
}
