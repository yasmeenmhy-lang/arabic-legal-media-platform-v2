import { ButtonLink, PageHeader } from "@/components/ui";
import { ReviewContextSummary, ReviewRiskSection } from "@/components/review-context-summary";

export default function RiskAssessmentPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="مؤشرات المخاطر"
        title="مؤشرات المخاطر المهنية والإعلامية"
        description="لا تعرض هذه الصفحة مؤشرات مخاطر افتراضية. تظهر مؤشرات المخاطر بعد تحليل محتوى فعلي وربط كل ملاحظة بالمراجع المهنية والتنظيمية المسجلة."
        action={<ButtonLink href="/content-review">تحليل محتوى جديد</ButtonLink>}
      />

      <ReviewContextSummary focus="risk" />
      <ReviewRiskSection />
    </div>
  );
}
