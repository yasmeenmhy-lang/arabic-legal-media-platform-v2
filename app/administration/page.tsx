import { DataTable, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { getLegalSourceUpdateCenter } from "@/lib/services/legal-source-update-service";

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
    <>
      <PageHeader
        title="الحوكمة والإعدادات"
        description="متابعة مصادر وزارة العدل والمراجع المهنية والتنظيمية وحالة استخدامها في تقييم الامتثال والمخاطر."
      />
      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <Panel>
          <h3 className="mb-4 font-extrabold">مصادر وزارة العدل والمراجع النظامية</h3>
          <DataTable
            headers={["المصدر", "آخر فحص", "الإصدار", "تغير مرصود", "حالة الاستخدام"]}
            rows={updateCenter.sources.map((source) => [
              source.title,
              source.lastCheckedAt === "غير محدد" ? source.lastCheckedAt : new Date(source.lastCheckedAt).toLocaleString("ar-SA"),
              source.currentVersion,
              source.changeDetected ? "نعم" : "لا",
              <StatusBadge key={source.sourceDocumentId} tone={source.changeDetected ? "warn" : "good"}>{sourceStatusLabel(source.status, source.changeDetected)}</StatusBadge>
            ])}
          />
        </Panel>
        <Panel>
          <h3 className="mb-4 font-extrabold">تحديثات مرجعية بانتظار المراجعة</h3>
          {updateCenter.pendingApprovals.length > 0 ? (
            <div className="space-y-3">
              {updateCenter.pendingApprovals.map((source) => (
                <div key={source.sourceDocumentId} className="rounded border border-line bg-white p-4">
                  <p className="font-bold">{source.title}</p>
                  <p className="mt-2 text-sm leading-6 text-ink/65">الإصدار المقترح: {source.pendingVersion ?? "غير محدد"}</p>
                  <p className="mt-2 text-xs text-palm">{source.sourceUrl}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-7 text-ink/65">لا توجد تحديثات مرجعية معلقة.</p>
          )}
        </Panel>
      </div>
      <div className="mt-5">
        <Panel>
          <h3 className="mb-4 font-extrabold">سجل المتابعة</h3>
          <DataTable
            headers={["النشاط", "المصدر", "المستخدم", "التاريخ", "التفاصيل"]}
            rows={updateCenter.auditTrail.map((audit) => [
              auditActionLabel(audit.action),
              audit.sourceDocumentId,
              audit.actor,
              new Date(audit.at).toLocaleString("ar-SA"),
              audit.details
            ])}
          />
        </Panel>
      </div>
    </>
  );
}
