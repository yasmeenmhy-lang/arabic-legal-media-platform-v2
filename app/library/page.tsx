import { ButtonLink, DataTable, KpiGrid, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import { legalSourceDocuments } from "@/lib/legal-knowledge-base";
import { BookOpen, ExternalLink, FileText, Landmark } from "lucide-react";

const sourceRows = legalSourceDocuments.map((source) => [
  source.title,
  source.documentType === "MOJ_URL" ? "رابط رسمي" : "ملف مرجعي",
  source.sourceUrl ? (
    <a key={source.id} href={source.sourceUrl} className="font-bold text-palm underline underline-offset-4">
      فتح المصدر
    </a>
  ) : (
    "غير متاح"
  ),
  <StatusBadge key={source.id} tone="good">مرجع فعال</StatusBadge>
]);

export default function LibraryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="المراجع المهنية والتنظيمية"
        title="المراجع المهنية والتنظيمية"
        description="عرض المصادر الرسمية والمرجعية المستخدمة في ملاحظات الامتثال ومؤشرات المخاطر، دون إظهار تفاصيل تقنية أو بيانات تشغيلية غير لازمة للمستخدم."
        action={<ButtonLink href="/studio">استعراض قاعدة المعرفة</ButtonLink>}
      />

      <KpiGrid
        items={[
          { label: "مصادر مسجلة", value: `${legalSourceDocuments.length}`, hint: "ملفات وروابط رسمية", tone: "gold", icon: <BookOpen size={20} /> },
          { label: "روابط وزارة العدل", value: "2", hint: "مصادر رسمية قابلة للفتح", tone: "good", icon: <Landmark size={20} /> },
          { label: "ملفات مرجعية", value: "2", hint: "مستخدمة في قاعدة المعرفة", tone: "neutral", icon: <FileText size={20} /> },
          { label: "روابط سريعة", value: "5", hint: "جهات ومراجع مهنية", tone: "neutral", icon: <ExternalLink size={20} /> }
        ]}
      />

      <Panel>
        <SectionTitle title="المصادر المسجلة داخل المنصة" subtitle="تظهر هذه المصادر في نتائج المراجعة عند وجود ملاحظة مرتبطة بها." />
        <DataTable headers={["المصدر", "النوع", "الرابط", "الحالة"]} rows={sourceRows} />
      </Panel>

      <Panel>
        <SectionTitle title="روابط وصول سريعة" subtitle="روابط مساندة للمستخدمين للوصول إلى الجهات والمراجع ذات الصلة." />
        <DataTable
          headers={["الجهة أو المرجع", "الرابط"]}
          rows={[
            ["وزارة العدل", <a key="moj" className="font-bold text-palm underline underline-offset-4" href="https://www.moj.gov.sa">فتح الرابط</a>],
            ["ناجز", <a key="najiz" className="font-bold text-palm underline underline-offset-4" href="https://najiz.sa">فتح الرابط</a>],
            ["الهيئة السعودية للمحامين", <a key="sba" className="font-bold text-palm underline underline-offset-4" href="https://sba.gov.sa">فتح الرابط</a>]
          ]}
        />
      </Panel>
    </div>
  );
}
