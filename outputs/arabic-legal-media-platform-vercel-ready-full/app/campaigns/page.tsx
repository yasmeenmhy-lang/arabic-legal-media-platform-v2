import { DataTable, PageHeader, Panel, StatusBadge } from "@/components/ui";

export default function CampaignsPage() {
  return (
    <>
      <PageHeader title="إدارة الحملات" description="إنشاء حملات توعوية ومهنية وإعلانية مع أهداف وجمهور وقنوات وتواريخ وتحليلات." />
      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Panel>
          <h3 className="mb-4 font-extrabold">إنشاء حملة</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {["اسم الحملة", "الهدف", "الجمهور", "القنوات", "تاريخ البداية", "تاريخ النهاية"].map((label) => (
              <input key={label} className="rounded border border-line px-3 py-2 focus-ring" placeholder={label} />
            ))}
          </div>
        </Panel>
        <DataTable
          headers={["الحملة", "النوع", "المحتوى", "الأداء"]}
          rows={[
            ["التوعية بالعقود", "توعوية", "8 مواد", <StatusBadge tone="good" key="a">78%</StatusBadge>],
            ["خدمات الشركات", "إعلانية", "5 مواد", <StatusBadge tone="warn" key="b">52%</StatusBadge>]
          ]}
        />
      </div>
    </>
  );
}
