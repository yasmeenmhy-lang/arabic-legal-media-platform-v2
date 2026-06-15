import { DataTable, PageHeader, Panel, StatusBadge, WorkflowSteps } from "@/components/ui";
import { approvalWorkflowStateLabels, approvalWorkflowStates, getApprovalWorkflowItems } from "@/lib/services/approval-workflow-service";
import type { RiskLevel } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function statusTone(status: string): "good" | "warn" | "danger" {
  if (status === "APPROVED" || status === "EXPORTED" || status === "SHARED") return "good";
  if (status === "NEEDS_CORRECTION") return "danger";
  return "warn";
}

const riskLabels: Record<RiskLevel, string> = {
  LOW: "منخفض",
  MEDIUM: "متوسط",
  HIGH: "عال",
  CRITICAL: "حرج"
};

export default async function ApprovalWorkflowPage() {
  const items = await getApprovalWorkflowItems();

  return (
    <>
      <PageHeader
        title="ملخص المراجعة وجاهزية النشر"
        description="عرض موحد لنتيجة المراجعة، معالجة الملاحظات، مستوى الامتثال، مؤشرات المخاطر، وجاهزية النشر والتصدير."
      />
      <WorkflowSteps steps={approvalWorkflowStates.map((state) => approvalWorkflowStateLabels[state])} />
      <div className="mt-5">
        <Panel>
          <h3 className="mb-4 font-extrabold">ملخص حالات المراجعة</h3>
          <DataTable
            headers={["المحتوى", "المالك", "نتيجة المراجعة", "جودة اللغة", "مستوى الامتثال", "مؤشرات المخاطر", "آخر تحديث"]}
            rows={items.map((item) => [
              item.title,
              item.owner,
              <StatusBadge key={item.id} tone={statusTone(item.status)}>{approvalWorkflowStateLabels[item.status]}</StatusBadge>,
              `${item.languageQualityScore}%`,
              `${item.complianceScore}%`,
              riskLabels[item.riskLevel],
              new Date(item.updatedAt).toLocaleDateString("ar-SA")
            ])}
          />
        </Panel>
      </div>
    </>
  );
}
