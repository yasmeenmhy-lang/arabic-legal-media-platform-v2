import { alerts } from "@/lib/data";
import { PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";

export default function AlertsPage() {
  return (
    <>
      <PageHeader eyebrow="متابعة تشغيلية" title="مركز التنبيهات" description="تنبيهات المحتوى عالي المخاطر والمراجعات المعلقة وتعثر التصدير وملاحظات التخطيط الإعلامي." />
      <Panel>
        <SectionTitle title="التنبيهات الحالية" subtitle="ترتيب يساعد على معالجة الملاحظات حسب الأولوية." />
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div key={alert.title} className="flex flex-col justify-between gap-3 rounded-lg border border-line bg-white p-4 sm:flex-row sm:items-center">
              <div><h3 className="font-extrabold">{alert.title}</h3><p className="mt-2 text-sm leading-7 text-ink/65">{alert.body}</p></div>
              <StatusBadge tone={alert.severity === "HIGH" ? "danger" : "warn"}>يتطلب متابعة</StatusBadge>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}
