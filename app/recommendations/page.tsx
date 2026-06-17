import { ButtonLink, PageHeader } from "@/components/ui";
import { ReviewContextSummary, ReviewOpportunitiesSection } from "@/components/review-context-summary";

export default function RecommendationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="فرص التحسين"
        title="فرص تحسين المحتوى الإعلامي والإعلاني"
        description="لا تعرض هذه الصفحة مقترحات جاهزة أو عامة. تظهر فرص التحسين بعد تحليل نص فعلي، وتُصنف الملاحظات الصياغية غير النظامية بشكل مستقل عن الملاحظات المرتبطة بالمراجع الرسمية."
        action={<ButtonLink href="/content-review">تحليل محتوى</ButtonLink>}
      />

      <ReviewContextSummary focus="opportunities" />
      <ReviewOpportunitiesSection />
    </div>
  );
}
