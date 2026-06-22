import { AlertTriangle, Bell, FileSearch, Settings } from "lucide-react";
import { ButtonLink, PageHeader, Panel, SectionTitle, StatusBadge } from "@/components/ui";

export default function AlertsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="التنبيهات"
        title="التنبيهات"
        description="متابعة الملاحظات المهنية والتنظيمية التي تحتاج انتباهاً، مثل ارتفاع المخاطر أو تعثر جاهزية النشر أو وجود تحديث مرجعي يحتاج متابعة."
        action={<ButtonLink href="/content-review">فتح المراجعة</ButtonLink>}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Panel>
          <div className="mb-3 flex items-center justify-between gap-3">
            <Bell className="text-palm" size={22} />
            <StatusBadge tone="good">حالي</StatusBadge>
          </div>
          <SectionTitle title="تنبيهات المراجعة" />
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-paper py-6 text-center">
            <Bell size={18} className="text-ink/30" />
            <span className="text-sm text-ink/50">لا تنبيهات مراجعة حالياً</span>
          </div>
        </Panel>

        <Panel>
          <div className="mb-3 flex items-center justify-between gap-3">
            <AlertTriangle className="text-gold" size={22} />
            <StatusBadge tone="neutral">متابعة</StatusBadge>
          </div>
          <SectionTitle title="تنبيهات المخاطر" />
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-paper py-6 text-center">
            <AlertTriangle size={18} className="text-ink/30" />
            <span className="text-sm text-ink/50">لا مخاطر تحتاج متابعة</span>
          </div>
        </Panel>

        <Panel>
          <div className="mb-3 flex items-center justify-between gap-3">
            <Settings className="text-palm" size={22} />
            <StatusBadge tone="neutral">المراجع</StatusBadge>
          </div>
          <SectionTitle title="تنبيهات المراجع" />
          <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line bg-paper py-6 text-center">
            <Settings size={18} className="text-ink/30" />
            <span className="text-sm text-ink/50">لا تحديثات مرجعية معلقة</span>
          </div>
        </Panel>
      </div>

      <Panel>
        <SectionTitle title="مسارات المتابعة" subtitle="اختصارات لمعالجة سبب التنبيه عند ظهوره." />
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/content-review#findings">مراجعة الملاحظات</ButtonLink>
          <ButtonLink href="/risk-assessment">مؤشرات المخاطر</ButtonLink>
          <ButtonLink href="/administration">إعدادات المراجع</ButtonLink>
        </div>
        <p className="mt-4 flex items-center gap-2 text-xs leading-6 text-ink/55">
          <FileSearch size={14} className="text-palm" />
          تظهر التنبيهات عند توفر مراجعات أو تحديثات فعلية.
        </p>
      </Panel>
    </div>
  );
}
