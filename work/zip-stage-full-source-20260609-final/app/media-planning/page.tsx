import { CalendarDays } from "lucide-react";
import { DataTable, PageHeader, Panel, StatusBadge } from "@/components/ui";

export default function MediaPlanningPage() {
  return (
    <>
      <PageHeader
        title="التخطيط الإعلامي"
        description="توليد خطط شهرية وأسبوعية مع اقتراح الموضوعات والحملات وتواريخ النشر وصيغ المحتوى."
      />
      <div className="grid gap-5 xl:grid-cols-[1fr_1.4fr]">
        <Panel>
          <div className="mb-4 flex items-center gap-2">
            <CalendarDays className="text-palm" />
            <h3 className="font-extrabold">طرق العرض</h3>
          </div>
          <div className="grid grid-cols-3 rounded border border-line p-1 text-center text-sm font-bold">
            <span className="rounded bg-palm py-2 text-white">تقويم</span>
            <span className="py-2">قائمة</span>
            <span className="py-2">مسار</span>
          </div>
          <div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs">
            {Array.from({ length: 28 }, (_, index) => (
              <div key={index} className="min-h-16 rounded border border-line bg-white p-2">
                <span className="font-bold">{index + 1}</span>
                {[4, 9, 14, 21].includes(index) && <p className="mt-2 rounded bg-mint py-1 text-palm">منشور</p>}
              </div>
            ))}
          </div>
        </Panel>
        <DataTable
          headers={["الموضوع", "الصيغة", "القناة", "التاريخ", "الحالة"]}
          rows={[
            ["حماية العقود", "مقال", "الموقع", "10 يونيو", <StatusBadge tone="good" key="a">مجدول</StatusBadge>],
            ["إعلان مهني", "منشور", "LinkedIn", "13 يونيو", <StatusBadge key="b">مسودة</StatusBadge>],
            ["سلسلة توعوية", "فيديو قصير", "X", "18 يونيو", <StatusBadge tone="warn" key="c">ينتظر مراجعة</StatusBadge>]
          ]}
        />
      </div>
    </>
  );
}
