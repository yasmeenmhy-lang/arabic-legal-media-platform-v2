import { DataTable, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import { getLegalSourceUpdateCenter } from "@/lib/services/legal-source-update-service";
import { formatDualDateTime } from "@/lib/dates";
import { alerts } from "@/lib/data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function sourceStatusLabel(status: string, changeDetected: boolean) {
  if (changeDetected) return "تغير مرجعي مرصود";
  if (status === "PENDING_APPROVAL") return "بانتظار المراجعة";
  if (status === "APPROVED" || status === "CURRENT" || status === "ACTIVE") return "مرجع مستخدم في التقييم";
  if (status === "REJECTED") return "غير مستخدم في التقييم";
  return "قيد المتابعة";
}

function auditActionLabel(action: string) {
  const labels: Record<string, string> = {
    REGISTERED: "تسجيل مرجع",
    MANUAL_SYNC: "مزامنة يدوية",
    CHANGE_DETECTED: "رصد تغير",
    APPROVED: "استخدام المرجع في التقييم",
    REJECTED: "استبعاد التحديث"
  };
  return labels[action] ?? action;
}

export default async function AdministrationPage() {
  const updateCenter = await getLegalSourceUpdateCenter();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="حوكمة المراجع والتنبيهات"
        title="الحوكمة والإعدادات"
        description="متابعة مصادر وزارة العدل والمراجع النظامية وحالة استخدامها في تقييم الامتثال والمخاطر، إلى جانب التنبيهات التشغيلية ذات الأولوية."
      />
      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <Panel className="overflow-hidden">
          <SectionTitle title="مصادر وزارة العدل والمراجع النظامية" subtitle="تعرض هذه القائمة حالة المراجع المستخدمة في نتائج المراجعة." />
          <DataTable
            headers={["المصدر", "آخر فحص", "الإصدار", "تغير مرصود", "حالة الاستخدام"]}
            rows={updateCenter.sources.map((source) => [
              source.title,
              source.lastCheckedAt === "غير محدد" ? source.lastCheckedAt : formatDualDateTime(source.lastCheckedAt),
              source.currentVersion,
              source.changeDetected ? "نعم" : "لا",
              <StatusBadge key={source.sourceDocumentId} tone={source.changeDetected ? "neutral" : "good"}>{sourceStatusLabel(source.status, source.changeDetected)}</StatusBadge>
            ])}
          />
        </Panel>
        <Panel className="overflow-hidden">
          <SectionTitle title="تحديثات مرجعية" subtitle="تظهر هنا التغيرات التي تحتاج مراجعة المسؤول عن المنصة." />
          {updateCenter.pendingApprovals.length > 0 ? (
            <div className="space-y-3">
              {updateCenter.pendingApprovals.map((source) => (
                <div key={source.sourceDocumentId} className="rounded-lg border border-line bg-white p-4">
                  <p className="font-normal">{source.title}</p>
                  <p className="mt-2 text-sm leading-6 text-ink/65">الإصدار المقترح: {source.pendingVersion ?? "غير محدد"}</p>
                  <p className="mt-2 break-all text-xs text-palm">{source.sourceUrl}</p>
                </div>
              ))}
            </div>
          ) : <p className="text-sm leading-7 text-ink/65">لا توجد تحديثات مرجعية معلقة.</p>}
        </Panel>
      </div>

      <Panel className="overflow-hidden">
        <SectionTitle title="سجل المتابعة" subtitle="سجل مختصر للتغيرات والإجراءات المرتبطة بالمراجع." />
        <DataTable
          headers={["النشاط", "المصدر", "المستخدم", "التاريخ", "التفاصيل"]}
          rows={updateCenter.auditTrail.map((audit) => [auditActionLabel(audit.action), audit.sourceDocumentId, audit.actor, formatDualDateTime(audit.at), audit.details])}
        />
      </Panel>

      <Panel className="overflow-hidden">
        <SectionTitle title="التنبيهات الحالية" subtitle="تنبيهات المحتوى عالي المخاطر والمراجعات المعلقة وتعثر التصدير، مرتبة لمساعدة على معالجة الملاحظات حسب الأولوية." />
        <div className="space-y-3">
          {alerts.map((alert) => (
            <div key={alert.title} className="flex flex-col justify-between gap-3 rounded-lg border border-line bg-white p-4 sm:flex-row sm:items-center">
              <div className="min-w-0">
                <h3 className="font-normal">{alert.title}</h3>
                <p className="mt-2 text-sm leading-7 text-ink/65">{alert.body}</p>
              </div>
              <StatusBadge tone={alert.severity === "مرتفع" ? "gold" : "neutral"}>يتطلب متابعة</StatusBadge>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
