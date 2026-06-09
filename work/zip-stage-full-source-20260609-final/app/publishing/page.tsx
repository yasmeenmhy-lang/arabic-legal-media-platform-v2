import { DataTable, PageHeader, Panel, StatusBadge } from "@/components/ui";

export default function PublishingPage() {
  return (
    <>
      <PageHeader title="إدارة النشر" description="جدولة المحتوى ومتابعة التقويم والطابور، مع بنية مزودين قابلة للربط لاحقا." />
      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <DataTable
          headers={["المحتوى", "القناة", "وقت النشر", "الحالة"]}
          rows={[
            ["إعلان استشارة للشركات الناشئة", "LinkedIn", "12 يونيو 09:00", <StatusBadge tone="good" key="a">مجدول</StatusBadge>],
            ["حماية العقود", "الموقع", "14 يونيو 11:00", <StatusBadge tone="good" key="b">مجدول</StatusBadge>],
            ["ملخص فيديو", "TikTok", "16 يونيو 18:00", <StatusBadge tone="warn" key="c">مزود تجريبي</StatusBadge>]
          ]}
        />
        <Panel>
          <h3 className="mb-4 font-extrabold">مزودو النشر</h3>
          {["X", "LinkedIn", "Instagram", "TikTok", "YouTube", "Website"].map((provider) => (
            <div key={provider} className="mb-3 flex items-center justify-between rounded border border-line p-3">
              <span className="font-bold">{provider}</span>
              <StatusBadge tone={provider === "Website" ? "good" : "neutral"}>{provider === "Website" ? "متصل" : "تجريبي"}</StatusBadge>
            </div>
          ))}
        </Panel>
      </div>
    </>
  );
}
