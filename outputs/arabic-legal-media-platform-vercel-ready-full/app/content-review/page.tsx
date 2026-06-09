import { DataTable, PageHeader, Panel, StatusBadge, WorkflowSteps } from "@/components/ui";

export default function ContentReviewPage() {
  return (
    <>
      <PageHeader
        title="مراجعة المحتوى"
        description="فحص العبارات المبالغ فيها، الوعود بنتائج، الإعلان المضلل، واللغة الحساسة قبل النشر."
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Panel>
          <h3 className="mb-4 font-extrabold">نص للمراجعة</h3>
          <textarea className="min-h-56 w-full rounded border border-line p-3 leading-7 focus-ring" defaultValue="نضمن لك أفضل نتيجة في قضيتك..." />
          <button className="mt-4 rounded bg-palm px-5 py-2 text-sm font-bold text-white focus-ring">تشغيل المراجعة</button>
        </Panel>
        <Panel>
          <h3 className="mb-4 font-extrabold">نتيجة الامتثال</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded bg-paper p-4">
              <p className="text-sm text-ink/60">درجة الامتثال</p>
              <p className="mt-2 text-3xl font-extrabold text-gold">52%</p>
            </div>
            <div className="rounded bg-paper p-4">
              <p className="text-sm text-ink/60">مستوى المخاطر</p>
              <p className="mt-3"><StatusBadge tone="danger">عال</StatusBadge></p>
            </div>
          </div>
          <DataTable
            headers={["الملاحظة", "الشدة", "الاقتراح"]}
            rows={[["وعد بنتيجة", <StatusBadge tone="danger" key="risk">عال</StatusBadge>, "استبدل الوعد بصياغة مهنية مشروطة بالوقائع."]]}
          />
        </Panel>
      </div>
      <div className="mt-5">
        <WorkflowSteps steps={["استلام المحتوى", "تحليل المخاطر", "تطبيق التعديلات وحفظ سجل المراجعة"]} />
      </div>
    </>
  );
}
