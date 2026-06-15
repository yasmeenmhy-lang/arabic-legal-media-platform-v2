import { DataTable, PageHeader, StatusBadge } from "@/components/ui";
import { legalKnowledgeEntries, legalSourceDocuments } from "@/lib/legal-knowledge-base";

export default function LibraryPage() {
  return (
    <>
      <PageHeader
        title="قاعدة المعرفة القانونية"
        description="مستودع المصادر النظامية المعتمدة للمراجعة الامتثالية، مبني من قواعد السلوك المهني للمحامين واللائحة التنفيذية لنظام المحاماة وروابط وزارة العدل."
      />

      <DataTable
        headers={["المصدر", "النوع", "الإصدار", "الحالة", "الرابط"]}
        rows={legalSourceDocuments.map((document) => [
          document.title,
          document.documentType,
          document.version,
          <StatusBadge tone="good" key={document.id}>{document.status}</StatusBadge>,
          document.sourceUrl
        ])}
      />

      <div className="mt-5">
        <DataTable
          headers={["القاعدة/المادة", "الفصل", "الصفحة", "الفئات الخطرة", "الكلمات المفتاحية"]}
          rows={legalKnowledgeEntries.map((entry) => [
            entry.articleOrRuleNumber,
            `${entry.chapter} - ${entry.section}`,
            entry.pageNumber,
            entry.riskCategories.join(", "),
            entry.keywords.join(", ")
          ])}
        />
      </div>
    </>
  );
}
