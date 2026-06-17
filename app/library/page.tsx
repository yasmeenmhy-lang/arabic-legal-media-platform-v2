import { ButtonLink, DataTable, KpiGrid, Panel, PageHeader, SectionTitle, StatusBadge } from "@/components/ui";
import { legalKnowledgeEntries, legalSourceDocuments } from "@/lib/legal-knowledge-base";
import { BookOpen, Database, FileSearch, Landmark } from "lucide-react";

// Only official Ministry of Justice links are kept — every entry here resolves
// to laws.moj.gov.sa or moj.gov.sa, with a single canonical row per document.
const sourceRows = legalSourceDocuments.map((source) => [
  source.title,
  "رابط رسمي",
  <a key={source.id} href={source.sourceUrl} target="_blank" rel="noreferrer" className="font-normal text-palm underline underline-offset-4">
    فتح المصدر
  </a>,
  <StatusBadge key={`${source.id}-status`} tone="good">مرجع فعال</StatusBadge>
]);

const knowledgeRows = legalKnowledgeEntries.map((entry) => [
  entry.sourceDocument,
  entry.legalReference ?? "غير محدد",
  entry.chapter,
  entry.riskCategories.join("، "),
  <StatusBadge key={entry.id} tone={entry.severity === "مرتفع" ? "gold" : entry.severity === "متوسط" ? "neutral" : "good"}>
    {entry.severity === "مرتفع" ? "أولوية جوهرية" : entry.severity === "متوسط" ? "أولوية مهمة" : "أولوية منخفضة"}
  </StatusBadge>
]);

export default function LibraryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="المراجع وقاعدة المعرفة القانونية"
        title="المراجع المهنية والتنظيمية"
        description="عرض موحد للمصادر الرسمية لوزارة العدل ومواد قاعدة المعرفة القانونية المستخدمة في ملاحظات الامتثال ومؤشرات المخاطر، دون إظهار تفاصيل تقنية أو بيانات تشغيلية غير لازمة للمستخدم."
        action={<ButtonLink href="/content-review">مراجعة محتوى</ButtonLink>}
      />

      <KpiGrid
        items={[
          { label: "مصادر وزارة العدل", value: `${legalSourceDocuments.length}`, hint: "روابط رسمية فعالة فقط", tone: "gold", icon: <Landmark size={20} /> },
          { label: "مدخلات معرفة", value: `${legalKnowledgeEntries.length}`, hint: "قواعد ومواد مفهرسة", tone: "good", icon: <Database size={20} /> },
          { label: "فصول مغطاة", value: "4", hint: "إعلان، سرية، صفة، خبرة", tone: "neutral", icon: <BookOpen size={20} /> },
          { label: "مجالات فحص", value: "6", hint: "تظهر في نتائج المراجعة", tone: "neutral", icon: <FileSearch size={20} /> }
        ]}
      />

      <Panel className="overflow-hidden">
        <SectionTitle title="مصادر وزارة العدل المسجلة" subtitle="تظهر هذه المصادر في نتائج المراجعة عند وجود ملاحظة مرتبطة بها، ولا تتضمن سوى روابط moj.gov.sa الرسمية." />
        <DataTable headers={["المصدر", "النوع", "الرابط", "الحالة"]} rows={sourceRows} />
      </Panel>

      <Panel className="overflow-hidden">
        <SectionTitle title="قاعدة المعرفة القانونية" subtitle="يعرض الجدول نطاق الاستخدام المهني لكل مرجع داخل مخرجات المراجعة." />
        <DataTable headers={["المصدر", "المرجع النظامي", "الفصل", "مجالات المخاطر", "الأولوية"]} rows={knowledgeRows} />
      </Panel>
    </div>
  );
}
