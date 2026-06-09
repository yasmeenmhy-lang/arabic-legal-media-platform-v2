import { alerts } from "@/lib/data";
import { PageHeader, Panel, StatusBadge } from "@/components/ui";

export default function AlertsPage() {
  return (
    <>
      <PageHeader title="مركز التنبيهات" description="تنبيهات المحتوى عالي المخاطر والمراجعات المعلقة وفشل النشر والاتجاهات الناشئة ومشكلات الحملات." />
      <div className="space-y-3">
        {alerts.map((alert) => (
          <Panel key={alert.title}>
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h3 className="font-extrabold">{alert.title}</h3>
                <p className="mt-2 text-sm leading-7 text-ink/65">{alert.body}</p>
              </div>
              <StatusBadge tone={alert.severity === "HIGH" ? "danger" : "warn"}>غير مقروء</StatusBadge>
            </div>
          </Panel>
        ))}
      </div>
    </>
  );
}
