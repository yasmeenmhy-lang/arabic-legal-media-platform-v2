import { ButtonLink, PageHeader } from "@/components/ui";
import { ReviewContextSummary, ReviewReferencesSection } from "@/components/review-context-summary";

export default function LibraryPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="المراجع وقاعدة المعرفة القانونية"
        title="المراجع المهنية والتنظيمية"
        description="عرض موحد للمصادر الرسمية لوزارة العدل ومواد قاعدة المعرفة القانونية المستخدمة في ملاحظات الامتثال ومؤشرات المخاطر، دون إظهار تفاصيل تقنية أو بيانات تشغيلية غير لازمة للمستخدم."
        action={<ButtonLink href="/content-review">مراجعة محتوى</ButtonLink>}
      />

      <ReviewContextSummary focus="references" />
      <ReviewReferencesSection />
    </div>
  );
}
