import { ButtonLink, PageHeader } from "@/components/ui";
import { ReviewContextSummary, ReviewOpportunitiesSection } from "@/components/review-context-summary";

export default function RecommendationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="فرص التحسين"
        title="فرص تحسين المحتوى الإعلامي والإعلاني"
        action={<ButtonLink href="/content-review">تحليل محتوى</ButtonLink>}
      />

      <ReviewContextSummary focus="opportunities" />
      <ReviewOpportunitiesSection />
    </div>
  );
}
