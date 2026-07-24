import { ButtonLink, PageHeader } from "@/components/ui";
import { ReviewContextSummary, ReviewFindingsSection } from "@/components/review-context-summary";

export default function LegalCompliancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="ملاحظات الامتثال"
        title="ملاحظات الامتثال المهني"
        action={<ButtonLink href="/content-review">مراجعة محتوى</ButtonLink>}
      />

      <ReviewContextSummary focus="findings" />
      <ReviewFindingsSection />
    </div>
  );
}
