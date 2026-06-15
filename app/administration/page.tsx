import { DataTable, PageHeader, Panel, StatusBadge } from "@/components/ui";
import { getLegalSourceUpdateCenter } from "@/lib/services/legal-source-update-service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function AdministrationPage() {
  const updateCenter = await getLegalSourceUpdateCenter();

  return (
    <>
      <PageHeader
        title="الإدارة والإعدادات"
        description="متابعة مصادر وزارة العدل، تشغيل المزامنة اليدوية، مراجعة التغييرات، واعتماد النسخ القانونية قبل استخدامها في الامتثال."
      />
      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <Panel>
          <h3 className="mb-4 font-extrabold">مصادر وزارة العدل والمراجع النظامية</h3>
          <DataTable
            headers={["المصدر", "آخر فحص", "الإصدار", "تغيير", "الحالة"]}
            rows={updateCenter.sources.map((source) => [
              source.title,
              source.lastCheckedAt === "غير محدد" ? source.lastCheckedAt : new Date(source.lastCheckedAt).toLocaleString("ar-SA"),
              source.currentVersion,
              source.changeDetected ? "نعم" : "لا",
              <StatusBadge key={source.sourceDocumentId} tone={source.changeDetected ? "warn" : "good"}>{source.status}</StatusBadge>
            ])}
          />
        </Panel>
        <Panel>
          <h3 className="mb-4 font-extrabold">اعتمادات معلقة</h3>
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
            <p className="text-sm leading-7 text-ink/65">لا توجد تحديثات قانونية معلقة.</p>
          )}
        </Panel>
      </div>
      <div className="mt-5">
        <Panel>
          <h3 className="mb-4 font-extrabold">سجل التدقيق</h3>
          <DataTable
            headers={["الإجراء", "المصدر", "المستخدم", "التاريخ", "التفاصيل"]}
            rows={updateCenter.auditTrail.map((audit) => [
              audit.action,
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
