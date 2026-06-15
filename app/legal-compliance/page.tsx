import { DataTable, PageHeader, Panel } from "@/components/ui";
import { legalKnowledgeEntries } from "@/lib/legal-knowledge-base";

export default function LegalCompliancePage() {
  return (
    <>
      <PageHeader
        title="الامتثال القانوني"
        description="مراجعة المحتوى مقابل قاعدة المعرفة القانونية المعتمدة وإظهار السند النظامي لكل ملاحظة."
      />
      <Panel>
        <DataTable
          headers={["الفئة", "السند", "المصدر", "الإجراء المقترح"]}
          rows={legalKnowledgeEntries.map((entry) => [
            entry.riskCategories.join(", "),
            `${entry.articleOrRuleNumber} - ص ${entry.pageNumber}`,
            entry.sourceDocument,
            entry.recommendedAction
          ])}
        />
      </Panel>
    </>
  );
}
