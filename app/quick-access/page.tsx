import { DataTable, KpiGrid, PageHeader, Panel, SectionTitle } from "@/components/ui";
import { BookOpen, ExternalLink, Landmark, Scale } from "lucide-react";

const links = [
  ["وزارة العدل", "https://www.moj.gov.sa", "الخدمات والأنظمة العدلية"],
  ["ناجز", "https://najiz.sa", "الخدمات العدلية الإلكترونية"],
  ["الهيئة السعودية للمحامين", "https://sba.gov.sa", "الخدمات المهنية للمحامين"],
  ["قواعد السلوك المهني للمحامين", "https://laws.moj.gov.sa/ar/legislation/JmI0BPgVlA5GuIxkJUi08A", "مرجع مهني رسمي"],
  ["اللائحة التنفيذية لنظام المحاماة", "https://laws.moj.gov.sa/ar/legislation/5huwCrAuvCK62BbuXv7fjg", "مرجع تنظيمي رسمي"]
];

export default function QuickAccessPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="الوصول السريع"
        title="الوصول السريع"
        description="روابط مباشرة إلى الجهات والمراجع الرسمية ذات الصلة بالمحتوى الإعلامي والإعلاني للمحامين."
      />

      <KpiGrid
        items={[
          { label: "روابط رسمية", value: `${links.length}`, hint: "جهات ومراجع موثوقة", tone: "good", icon: <ExternalLink size={20} /> },
          { label: "مراجع مهنية", value: "2", hint: "قواعد ولوائح ذات صلة", tone: "gold", icon: <BookOpen size={20} /> },
          { label: "جهات عدلية", value: "2", hint: "وزارة العدل وناجز", tone: "neutral", icon: <Landmark size={20} /> },
          { label: "مرجع مهني", value: "1", hint: "الهيئة السعودية للمحامين", tone: "neutral", icon: <Scale size={20} /> }
        ]}
      />

      <Panel>
        <SectionTitle title="الروابط الرسمية" subtitle="تفتح الروابط في نافذة جديدة ليستطيع المستخدم الرجوع إلى المصدر الرسمي مباشرة." />
        <DataTable
          headers={["الجهة أو المرجع", "الاستخدام", "الرابط"]}
          rows={links.map(([label, href, purpose]) => [
            label,
            purpose,
            <a key={href} href={href} target="_blank" rel="noreferrer" className="font-extrabold text-palm underline underline-offset-4">فتح الرابط الرسمي</a>
          ])}
        />
      </Panel>
    </div>
  );
}
