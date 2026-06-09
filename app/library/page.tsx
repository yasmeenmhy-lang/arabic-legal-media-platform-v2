import { DataTable, EmptyState, PageHeader, StatusBadge } from "@/components/ui";

export default function LibraryPage() {
  return (
    <>
      <PageHeader title="مكتبة المحتوى" description="مستودع للقوالب وحملات التوعية والأصول القانونية مع البحث والوسوم وإعادة الاستخدام والأرشفة." />
      <DataTable
        headers={["الأصل", "التصنيف", "الوسوم", "الحالة"]}
        rows={[
          ["قالب منشور توعوي", "قالب", "توعية، امتثال", <StatusBadge tone="good" key="a">متاح</StatusBadge>],
          ["حملة حماية العقود", "قالب حملة", "شركات، عقود", <StatusBadge tone="good" key="b">متاح</StatusBadge>]
        ]}
      />
      <div className="mt-5">
        <EmptyState title="مساحة أصول إضافية" body="عند رفع أصول جديدة ستظهر هنا مع خيارات البحث والتصفية والتكرار." />
      </div>
    </>
  );
}
