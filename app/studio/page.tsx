import { PageHeader, Panel, WorkflowSteps } from "@/components/ui";

export default function StudioPage() {
  const tools = ["مراجعة نص لصورة", "تحسين نص إنفوجرافيك", "مراجعة مقال لشرائح", "مراجعة مقال لمنشور", "تحسين توظيف المحتوى", "قوالب مراجعة قابلة للاستخدام"];
  return (
    <>
      <PageHeader title="مراجعة وتحسين المحتوى" description="مساحة عمل لمراجعة النصوص وتحسين جاهزيتها للصيغ الإعلامية المختلفة باستخدام قوالب إرشادية قابلة للاستخدام." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => (
          <Panel key={tool}>
            <h3 className="font-extrabold">{tool}</h3>
            <p className="mt-3 text-sm leading-7 text-ink/60">مسار مراجعة مبدئي لدعم التحسين قبل استخدام المحتوى في أي مادة إعلامية.</p>
          </Panel>
        ))}
      </div>
      <div className="mt-5">
        <WorkflowSteps steps={["اختيار قالب المراجعة", "إدخال المادة الأصلية", "عرض مقترحات تحسين قابلة للمراجعة"]} />
      </div>
    </>
  );
}
