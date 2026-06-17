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
          <SectionTitle title="تنبيهات المراجعة" subtitle="مرتبطة بنتائج مراجعة فعلية محفوظة في الجلسة." />
          <p className="text-sm leading-7 text-ink/65">لا توجد تنبيهات مراجعة معروضة حالياً.</p>
        </Panel>

        <Panel>
          <div className="mb-3 flex items-center justify-between gap-3">
            <AlertTriangle className="text-gold" size={22} />
            <StatusBadge tone="neutral">متابعة</StatusBadge>
          </div>
          <SectionTitle title="تنبيهات المخاطر" subtitle="تظهر عند وجود محتوى عالي المخاطر أو غير مناسب للتصدير وفق نتيجة المراجعة." />
          <p className="text-sm leading-7 text-ink/65">لا توجد مؤشرات مخاطر تحتاج متابعة في هذه الجلسة.</p>
        </Panel>

        <Panel>
          <div className="mb-3 flex items-center justify-between gap-3">
            <Settings className="text-palm" size={22} />
            <StatusBadge tone="neutral">المراجع</StatusBadge>
          </div>
          <SectionTitle title="تنبيهات المراجع" subtitle="مرتبطة بتحديث مصادر وزارة العدل والمراجع الرسمية." />
          <p className="text-sm leading-7 text-ink/65">لم يتم عرض تحديث مرجعي معلق حالياً.</p>
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
          لا تعرض هذه الصفحة تنبيهات تجريبية أو افتراضية؛ تظهر التنبيهات عند توفر مراجعات أو تحديثات فعلية.
        </p>
      </Panel>
    </div>
  );
}
