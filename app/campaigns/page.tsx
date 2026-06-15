import { DataTable, PageHeader, Panel, StatusBadge } from "@/components/ui";

export default function CampaignsPage() {
  return (
    <>
      <PageHeader title="دعم تخطيط الحملات" description="دعم استرشادي لتحديد اتجاه الحملة والجمهور المقترح والرسائل المحتملة والمخاطر وملاحظات الامتثال قبل المراجعة." />
      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Panel>
          <h3 className="mb-4 font-extrabold">خطة حملة استرشادية</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {["اتجاه الحملة", "هدف المراجعة", "الجمهور المقترح", "مقترحات القنوات", "بداية مقترحة", "نهاية مقترحة"].map((label) => (
              <input key={label} className="rounded border border-line px-3 py-2 focus-ring" placeholder={label} />
            ))}
          </div>
        </Panel>
        <DataTable
          headers={["اتجاه الحملة", "النوع", "المخرجات المقترحة", "جاهزية المراجعة"]}
          rows={[
            ["التوعية بالعقود", "توعوية", "8 مواد", <StatusBadge tone="good" key="a">78%</StatusBadge>],
            ["خدمات الشركات", "إعلانية", "5 مواد", <StatusBadge tone="warn" key="b">52%</StatusBadge>]
          ]}
        />
      </div>
    </>
  );
}
