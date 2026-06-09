import { PageHeader, Panel, WorkflowSteps } from "@/components/ui";

export default function StudioPage() {
  const tools = ["نص إلى صورة", "نص إلى إنفوجرافيك", "مقال إلى شرائح", "مقال إلى منشور", "إعادة توظيف المحتوى", "قوالب قابلة لإعادة الاستخدام"];
  return (
    <>
      <PageHeader title="استوديو المحتوى" description="مساحة إنتاج لتحويل النصوص إلى أصول مرئية ومنشورات متعددة الصيغ باستخدام قوالب قابلة لإعادة الاستخدام." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tools.map((tool) => (
          <Panel key={tool}>
            <h3 className="font-extrabold">{tool}</h3>
            <p className="mt-3 text-sm leading-7 text-ink/60">تدفق عمل تجريبي جاهز للربط بمزود تصميم أو خدمة ذكاء اصطناعي لاحقا.</p>
          </Panel>
        ))}
      </div>
      <div className="mt-5">
        <WorkflowSteps steps={["اختيار القالب", "إدخال المادة الأصلية", "إنتاج نسخة قابلة للمراجعة"]} />
      </div>
    </>
  );
}
