import { ok } from "@/lib/api";
import { getApprovalWorkflowCenter } from "@/lib/services/approval-workflow-service";

export async function GET() {
  return ok(await getApprovalWorkflowCenter());
}
