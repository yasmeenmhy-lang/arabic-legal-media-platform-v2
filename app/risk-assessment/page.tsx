import { ButtonLink, PageHeader } from "@/components/ui";
import { ReviewContextSummary, ReviewRiskSection } from "@/components/review-context-summary";

export default function RiskAssessmentPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="مؤشرات المخاطر"
        title="مؤشرات المخاطر المهنية والإعلامية"
        action={<ButtonLink href="/analysis">تحليل محتوى جديد</ButtonLink>}
      />

      <ReviewContextSummary focus="risk" />
      <ReviewRiskSection />
    </div>
  );
}
