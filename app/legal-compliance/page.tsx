import { ButtonLink, DataTable, KpiGrid, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import { legalKnowledgeEntries } from "@/lib/legal-knowledge-base";
import { FileText, Scale, ShieldCheck, TriangleAlert } from "lucide-react";

const rows = legalKnowledgeEntries.slice(0, 5).map((entry) => [
  entry.sourceDocument,
  entry.legalReference ?? "غير محدد",
  entry.riskCategories.join("، "),
  <StatusBadge key={entry.id} tone={entry.severity === "مرتفع" ? "gold" : entry.severity === "متوسط" ? "neutral" : "good"}>
    {entry.severity === "مرتفع" ? "مؤشر جوهري" : entry.severity === "متوسط" ? "مؤشر مهم" : "مؤشر منخفض"}
  </StatusBadge>
]);

export default function LegalCompliancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ملاحظات الامتثال"
        title="ملاحظات الامتثال المهني"
        description="عرض مستقل لملاحظات الامتثال المستندة إلى قاعدة المعرفة القانونية، مع بقاء نتيجة الامتثال جزءاً من تجربة مراجعة المحتوى الموحدة."
        action={<ButtonLink href="/content-review">مراجعة محتوى</ButtonLink>}
      />

      <KpiGrid
        items={[
          { label: "مراجع فعالة", value: "4", hint: "مصادر رسمية ومسجلة", tone: "gold", icon: <Scale size={20} /> },
          { label: "قواعد قابلة للفحص", value: `${legalKnowledgeEntries.length}`, hint: "مرتبطة بالمخاطر المهنية", tone: "good", icon: <ShieldCheck size={20} /> },
          { label: "ملاحظات عالية الأولوية", value: "3", hint: "تظهر عند وجود عبارات مؤثرة", tone: "gold", icon: <TriangleAlert size={20} /> },
          { label: "مجالات مراجعة", value: "5", hint: "إعلان، سرية، صفة، نتائج، طلب عمل", tone: "neutral", icon: <FileText size={20} /> }
        ]}
      />

      <Panel>
        <SectionTitle title="نطاقات الامتثال المسجلة" subtitle="تستخدم هذه النطاقات في نتائج المراجعة لإظهار الملاحظة والدلالة والمرجع المهني." />
        <DataTable headers={["المصدر", "المرجع النظامي", "الدلالة", "مستوى الأولوية"]} rows={rows} />
      </Panel>
    </div>
  );
}
