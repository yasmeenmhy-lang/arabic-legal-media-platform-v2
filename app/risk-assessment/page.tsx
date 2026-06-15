import { DataTable, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { getApprovalWorkflowItems } from "@/lib/services/approval-workflow-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function RiskAssessmentPage() {
  const items = await getApprovalWorkflowItems();

  return (
    <>
      <PageHeader
        title="تقييم المخاطر"
        description="تصنيف المخاطر الناتجة عن جودة اللغة والامتثال القانوني قبل الاعتماد والتصدير."
      />
      <Panel>
        <DataTable
          headers={["المحتوى", "المخاطر", "جودة اللغة", "الامتثال", "الإجراء"]}
          rows={items.map((item) => [
            item.title,
            <StatusBadge key={item.id} tone={item.riskLevel === "LOW" ? "good" : item.riskLevel === "MEDIUM" ? "warn" : "danger"}>{item.riskLevel}</StatusBadge>,
            `${item.languageQualityScore}%`,
            `${item.complianceScore}%`,
            item.riskLevel === "LOW" ? "جاهز للمراجعة النهائية" : "يتطلب تصحيحا"
          ])}
        />
      </Panel>
    </>
  );
}
