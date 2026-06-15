import { DataTable, PageHeader, Panel, StatusBadge, WorkflowSteps } from "@/components/ui";
import { approvalWorkflowStates, getApprovalWorkflowItems } from "@/lib/services/approval-workflow-service";

function statusTone(status: string): "good" | "warn" | "danger" {
  if (status === "APPROVED" || status === "EXPORTED" || status === "SHARED") return "good";
  if (status === "NEEDS_CORRECTION") return "danger";
  return "warn";
}

export default async function ApprovalWorkflowPage() {
  const items = await getApprovalWorkflowItems();

  return (
    <>
      <PageHeader
        title="مسار الاعتماد"
        description="إدارة انتقال المحتوى من المسودة إلى المراجعة والتصحيح والاعتماد والتصدير والمشاركة."
      />
      <WorkflowSteps steps={approvalWorkflowStates} />
      <div className="mt-5">
        <Panel>
          <h3 className="mb-4 font-extrabold">طلبات الاعتماد</h3>
          <DataTable
            headers={["المحتوى", "المالك", "الحالة", "جودة اللغة", "الامتثال", "المخاطر", "آخر تحديث"]}
            rows={items.map((item) => [
              item.title,
              item.owner,
              <StatusBadge key={item.id} tone={statusTone(item.status)}>{item.status}</StatusBadge>,
              `${item.languageQualityScore}%`,
              `${item.complianceScore}%`,
              item.riskLevel,
              new Date(item.updatedAt).toLocaleDateString("ar-SA")
            ])}
          />
        </Panel>
      </div>
    </>
  );
}
