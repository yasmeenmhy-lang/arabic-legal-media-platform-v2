import { ExternalLink } from "lucide-react";
import { DataTable, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";
import { getLegalSourceUpdateCenter } from "@/lib/services/legal-source-update-service";
import { governedRewriteSettings } from "@/lib/services/recommendation-service";
import { formatDualDateTime } from "@/lib/dates";

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
  const sourceById = new Map(updateCenter.sources.map((source) => [source.sourceDocumentId, source]));

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
          rows={updateCenter.auditTrail.map((audit) => {
            const source = sourceById.get(audit.sourceDocumentId);
            return [
              auditActionLabel(audit.action),
              source?.sourceUrl ? (
                <a key={`${audit.id}-source`} href={source.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-palm underline underline-offset-4">
                  {source.title}
                  <ExternalLink size={14} aria-hidden="true" />
                </a>
              ) : audit.sourceDocumentId,
              audit.actor,
              formatDualDateTime(audit.at),
              audit.details
            ];
          })}
        />
      </Panel>

      <Panel className="overflow-hidden">
        <SectionTitle title="حوكمة مقترحات الصياغة" subtitle="إعدادات بوابة الجودة التي تمنع عرض أي صياغة مقترحة قبل اجتياز التحقق القانوني واللغوي." />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border border-line bg-paper p-4">
            <p className="text-xs leading-6 text-ink/55">اشتراط التحقق القانوني قبل العرض</p>
            <div className="mt-3">
              <StatusBadge tone={governedRewriteSettings.requireLegalValidation ? "good" : "gold"}>
                {governedRewriteSettings.requireLegalValidation ? "مفعل" : "غير مفعل"}
              </StatusBadge>
            </div>
          </div>
          <div className="rounded-lg border border-line bg-paper p-4">
            <p className="text-xs leading-6 text-ink/55">اشتراط التحقق اللغوي قبل العرض</p>
            <div className="mt-3">
              <StatusBadge tone={governedRewriteSettings.requireLanguageValidation ? "good" : "gold"}>
                {governedRewriteSettings.requireLanguageValidation ? "مفعل" : "غير مفعل"}
              </StatusBadge>
            </div>
          </div>
          <div className="rounded-lg border border-line bg-paper p-4">
            <p className="text-xs leading-6 text-ink/55">الحد الأدنى للامتثال في المقترحات</p>
            <p className="mt-2 text-2xl font-normal text-palm">{governedRewriteSettings.minimumComplianceThreshold}%</p>
            <p className="mt-2 text-xs leading-6 text-ink/55">لا يظهر المقترح إذا كان أقل من هذا الحد أو أحدث ملاحظة جديدة.</p>
          </div>
          <div className="rounded-lg border border-line bg-paper p-4">
            <p className="text-xs leading-6 text-ink/55">الحد الأدنى لجودة اللغة</p>
            <p className="mt-2 text-2xl font-normal text-palm">{governedRewriteSettings.minimumLanguageQualityThreshold}%</p>
            <p className="mt-2 text-xs leading-6 text-ink/55">يشترط كذلك أن تنخفض درجة المخاطر أو تبقى دون زيادة.</p>
          </div>
        </div>
        <p className="mt-3 text-xs leading-6 text-ink/55">
          تدار هذه الإعدادات مركزياً ضمن إعدادات تشغيل المنصة، وتطبق على جميع مقترحات الصياغة قبل عرضها للمستخدم.
        </p>
      </Panel>

      <Panel className="overflow-hidden">
        <SectionTitle title="التنبيهات الحالية" subtitle="تنبيهات المحتوى عالي المخاطر والمراجعات المعلقة وتعثر التصدير، مرتبة لمساعدة على معالجة الملاحظات حسب الأولوية." />
        <div className="rounded-lg border border-dashed border-line bg-paper p-5 text-sm leading-7 text-ink/65">
          لا توجد تنبيهات مراجعة معروضة. تظهر التنبيهات فقط عند وجود مراجعات فعلية محفوظة أو تحديثات مرجعية مرصودة.
        </div>
      </Panel>
    </div>
  );
}
