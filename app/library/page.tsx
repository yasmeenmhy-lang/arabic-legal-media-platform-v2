import { DataTable, PageHeader, StatusBadge } from "@/components/ui";
import { legalKnowledgeEntries, legalSourceDocuments } from "@/lib/legal-knowledge-base";

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

function documentTypeLabel(type: string) {
  if (type === "PDF") return "وثيقة";
  if (type === "MOJ_URL") return "رابط مرجعي";
  return type;
}

export default function LibraryPage() {
  return (
    <>
      <PageHeader
        title="المراجع المهنية والتنظيمية"
        description="مستودع المراجع النظامية والمهنية المستخدمة في ملاحظات الامتثال ومؤشرات المخاطر ضمن مسار مراجعة المحتوى."
      />

      <DataTable
        headers={["المصدر", "النوع", "الإصدار", "حالة الاستخدام", "الرابط"]}
        rows={legalSourceDocuments.map((document) => [
          document.title,
          documentTypeLabel(document.documentType),
          document.version,
          <StatusBadge tone="good" key={document.id}>مرجع مستخدم في التقييم</StatusBadge>,
          document.sourceUrl
        ])}
      />

      <div className="mt-5">
        <DataTable
          headers={["القاعدة/المادة", "الفصل", "الصفحة", "فئات المخاطر", "الكلمات المفتاحية"]}
          rows={legalKnowledgeEntries.map((entry) => [
            entry.articleOrRuleNumber,
            `${entry.chapter} - ${entry.section}`,
            entry.pageNumber,
            formatRiskCategories(entry.riskCategories),
            entry.keywords.join(", ")
          ])}
        />
      </div>
    </>
  );
}
