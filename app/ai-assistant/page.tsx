import { PageHeader, Panel, WorkflowSteps } from "@/components/ui";

export default function AIAssistantPage() {
  return (
    <>
      <PageHeader
        title="مساعد مراجعة المحتوى الإعلامي"
        description="تحليل المحتوى الإعلامي واقتراح ملاحظات مهنية ومؤشرات مخاطر وفرص تحسين ومراجع نظامية داعمة لتقييم جاهزية النشر."
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Panel>
          <h3 className="mb-4 font-extrabold">طلب مراجعة وتحسين</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {["الموضوع", "الجمهور", "مجال الممارسة", "القناة", "هدف المراجعة", "نوع التقييم"].map((label) => (
              <label key={label} className="text-sm font-bold">
                {label}
                <input className="mt-2 w-full rounded border border-line bg-white px-3 py-2 focus-ring" placeholder={label} />
              </label>
            ))}
          </div>
          <button className="mt-5 rounded bg-palm px-5 py-2 text-sm font-bold text-white focus-ring">تحليل المحتوى</button>
        </Panel>
        <Panel>
          <h3 className="mb-4 font-extrabold">ملاحظات ومقترحات تحسين</h3>
          <div className="space-y-3 text-sm leading-7 text-ink/70">
            <p className="rounded bg-paper p-3">ملاحظة صياغية: تعزيز وضوح النص وتجنب الوعود أو العبارات المطلقة.</p>
            <p className="rounded bg-paper p-3">مؤشرات مراجعة: ملاءمة العنوان، وضوح الرسالة، واتساق الدعوة للتواصل مع طبيعة المحتوى.</p>
            <p className="rounded bg-paper p-3">#توعية_قانونية #محاماة #امتثال_مهني</p>
          </div>
        </Panel>
      </div>
      <div className="mt-5">
        <WorkflowSteps steps={["إدخال المحتوى والسياق", "تحليل الملاحظات والمخاطر", "حفظ السجل وإرساله للمراجعة"]} />
      </div>
    </>
  );
}
