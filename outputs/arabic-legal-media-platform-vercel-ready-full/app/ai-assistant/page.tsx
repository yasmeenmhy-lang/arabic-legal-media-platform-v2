import { PageHeader, Panel, WorkflowSteps } from "@/components/ui";

export default function AIAssistantPage() {
  return (
    <>
      <PageHeader
        title="مساعد المحتوى الذكي"
        description="إنشاء مقالات، أسئلة شائعة، منشورات اجتماعية، ونصوص فيديو مع عناوين ووسوم ودعوة إجراء، مع حفظ سجل الطلبات."
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Panel>
          <h3 className="mb-4 font-extrabold">طلب توليد محتوى</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {["الموضوع", "الجمهور", "مجال الممارسة", "القناة", "هدف المحتوى", "نوع المخرج"].map((label) => (
              <label key={label} className="text-sm font-bold">
                {label}
                <input className="mt-2 w-full rounded border border-line bg-white px-3 py-2 focus-ring" placeholder={label} />
              </label>
            ))}
          </div>
          <button className="mt-5 rounded bg-palm px-5 py-2 text-sm font-bold text-white focus-ring">توليد نسخة تجريبية</button>
        </Panel>
        <Panel>
          <h3 className="mb-4 font-extrabold">مخرجات مقترحة</h3>
          <div className="space-y-3 text-sm leading-7 text-ink/70">
            <p className="rounded bg-paper p-3">نسخة توعوية واضحة تتجنب الوعود وتدعو القارئ لفهم الخيارات النظامية.</p>
            <p className="rounded bg-paper p-3">عناوين: دليل موجز، أخطاء شائعة، نقاط عملية قبل اتخاذ القرار.</p>
            <p className="rounded bg-paper p-3">#توعية_قانونية #محاماة #امتثال_مهني</p>
          </div>
        </Panel>
      </div>
      <div className="mt-5">
        <WorkflowSteps steps={["إدخال الهدف والجمهور", "توليد نسخ متعددة", "حفظ السجل وإرساله للمراجعة"]} />
      </div>
    </>
  );
}
