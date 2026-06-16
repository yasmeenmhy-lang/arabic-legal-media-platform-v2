import { ButtonLink, DataTable, KpiGrid, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import { legalKnowledgeEntries } from "@/lib/legal-knowledge-base";
import { Database, FileSearch, Layers, Tags } from "lucide-react";

const knowledgeRows = legalKnowledgeEntries.map((entry) => [
  entry.sourceDocument,
  entry.articleOrRuleNumber,
  entry.chapter,
  entry.riskCategories.join("، "),
  <StatusBadge key={entry.id} tone={entry.severity === "CRITICAL" ? "danger" : entry.severity === "HIGH" ? "warn" : "neutral"}>
    {entry.severity === "CRITICAL" ? "أولوية جوهرية" : entry.severity === "HIGH" ? "أولوية مهمة" : "أولوية متوسطة"}
  </StatusBadge>
]);

export default function KnowledgeBasePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="قاعدة المعرفة"
        title="قاعدة المعرفة القانونية"
        description="استعراض المواد والقواعد المهنية المسجلة التي تغذي ملاحظات الامتثال ومؤشرات المخاطر داخل تجربة مراجعة المحتوى."
        action={<ButtonLink href="/library">عرض المراجع الرسمية</ButtonLink>}
      />

      <KpiGrid
        items={[
          { label: "مدخلات معرفة", value: `${legalKnowledgeEntries.length}`, hint: "قواعد ومواد مفهرسة", tone: "good", icon: <Database size={20} /> },
          { label: "فصول مغطاة", value: "4", hint: "إعلان، سرية، صفة، خبرة", tone: "neutral", icon: <Layers size={20} /> },
          { label: "كلمات مفتاحية", value: "36", hint: "تستخدم في الربط الموضوعي", tone: "gold", icon: <Tags size={20} /> },
          { label: "مجالات فحص", value: "6", hint: "تظهر في نتائج المراجعة", tone: "warn", icon: <FileSearch size={20} /> }
        ]}
      />

      <Panel>
        <SectionTitle title="المواد والقواعد المسجلة" subtitle="يعرض الجدول نطاق الاستخدام المهني لكل مرجع داخل مخرجات المراجعة." />
        <DataTable headers={["المصدر", "القاعدة أو المادة", "الفصل", "مجالات المخاطر", "الأولوية"]} rows={knowledgeRows} />
      </Panel>
    </div>
  );
}
