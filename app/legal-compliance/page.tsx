import { DataTable, PageHeader, Panel } from "@/components/ui";
import { legalKnowledgeEntries } from "@/lib/legal-knowledge-base";

const riskCategoryLabels: Record<string, string> = {
  MISLEADING_ADVERTISING: "إعلان مضلل",
  UNVERIFIED_CLAIM: "ادعاء غير موثق",
  GUARANTEED_OUTCOME: "إيحاء بضمان نتيجة",
  CLIENT_MISLEADING: "تضليل المتلقي",
  CONFIDENTIALITY: "سرية المعلومات",
  PRIVACY: "الخصوصية",
  IMPROPER_SOLICITATION: "تواصل مهني غير ملائم",
  CLIENT_PRESSURE: "ضغط على المتلقي",
  LICENSE_CLAIM: "ادعاء صفة أو ترخيص",
  UNAUTHORIZED_PRACTICE: "ممارسة غير ملائمة",
  UNVERIFIED_EXPERIENCE: "خبرة غير موثقة",
  CREDENTIAL_CLAIM: "ادعاء مؤهل مهني"
};

function formatRiskCategories(categories: string[]) {
  return categories.map((category) => riskCategoryLabels[category] ?? category).join("، ");
}

export default function LegalCompliancePage() {
  return (
    <>
      <PageHeader
        title="ملاحظات الامتثال"
        description="عرض ملاحظات الامتثال الناتجة عن مسار مراجعة المحتوى وربط كل ملاحظة بالمرجع المهني أو التنظيمي ذي الصلة."
      />
      <Panel>
        <DataTable
          headers={["فئة الملاحظة", "المرجع", "المصدر", "اتجاه التحسين"]}
          rows={legalKnowledgeEntries.map((entry) => [
            formatRiskCategories(entry.riskCategories),
            `${entry.articleOrRuleNumber} - ص ${entry.pageNumber}`,
            entry.sourceDocument,
            entry.recommendedAction
          ])}
        />
      </Panel>
    </>
  );
}
