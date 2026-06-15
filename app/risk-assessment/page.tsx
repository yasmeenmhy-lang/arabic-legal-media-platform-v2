import { DataTable, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { getApprovalWorkflowItems } from "@/lib/services/approval-workflow-service";
import type { RiskLevel } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const riskLabels: Record<RiskLevel, string> = {
  LOW: "منخفض",
  MEDIUM: "متوسط",
  HIGH: "عال",
  CRITICAL: "حرج"
};

export default async function RiskAssessmentPage() {
  const items = await getApprovalWorkflowItems();

  return (
    <>
      <PageHeader
        title="مؤشرات المخاطر"
        description="عرض مؤشرات المخاطر الناتجة عن مسار مراجعة المحتوى وربطها بجودة اللغة ومستوى الامتثال وجاهزية النشر."
      />
      <Panel>
        <DataTable
          headers={["المحتوى", "مؤشر المخاطر", "جودة اللغة", "مستوى الامتثال", "اتجاه المعالجة"]}
          rows={items.map((item) => [
            item.title,
            <StatusBadge key={item.id} tone={item.riskLevel === "LOW" ? "good" : item.riskLevel === "MEDIUM" ? "warn" : "danger"}>{riskLabels[item.riskLevel]}</StatusBadge>,
            `${item.languageQualityScore}%`,
            `${item.complianceScore}%`,
            item.riskLevel === "LOW" ? "مناسب للمراجعة النهائية" : "يتطلب معالجة الملاحظات"
          ])}
        />
      </Panel>
    </>
  );
}
