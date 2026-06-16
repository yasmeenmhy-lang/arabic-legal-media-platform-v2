import { ButtonLink, DataTable, PageHeader, Panel, ScoreCard, SectionTitle, StatusBadge, WorkflowSteps } from "@/components/ui";
import { reviewContent } from "@/lib/services/review-service";
import { ClipboardCheck, FileWarning, Lightbulb, ShieldCheck } from "lucide-react";

const sampleText = "يجب مراجعة صياغة الإعلان قبل نشره لأنه يتضمن وعداً بنتيجة مضمونة للعميل.";
const review = reviewContent(sampleText, "advertisement");

const riskLabels = {
  LOW: "منخفض",
  MEDIUM: "متوسط",
  HIGH: "عال",
  CRITICAL: "حرج"
} as const;

function scoreTone(value: number) {
  if (value >= 85) return "good" as const;
  if (value >= 70) return "warn" as const;
  return "danger" as const;
}

export default function ReviewResultsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="نتائج المراجعة"
        title="نتائج المراجعة التنفيذية"
        description="عرض تنفيذي مستقل لنتيجة مراجعة المحتوى، يشمل جودة الصياغة، ملاحظات الامتثال، مؤشرات المخاطر، فرص التحسين، المراجع الرسمية، وجاهزية النشر."
        action={<ButtonLink href="/content-review">فتح مراجعة المحتوى</ButtonLink>}
      />

      <div className="grid gap-4 md:grid-cols-4">
        <ScoreCard label="جودة المحتوى" value={review.languageQuality.score} tone={scoreTone(review.languageQuality.score)} detail="لغة وصياغة ووضوح" />
        <ScoreCard label="مستوى الامتثال" value={review.complianceScore} tone={scoreTone(review.complianceScore)} detail="ملاحظات مهنية وتنظيمية" />
        <Panel>
          <ClipboardCheck className="mb-3 text-palm" />
          <p className="text-sm font-extrabold">جاهزية النشر</p>
          <div className="mt-3">
            <StatusBadge tone={review.exportAllowed ? "good" : "warn"}>
              {review.exportAllowed ? "مناسب للتصدير وفق نتائج المراجعة" : "يتطلب معالجة الملاحظات"}
            </StatusBadge>
          </div>
        </Panel>
        <Panel>
          <FileWarning className="mb-3 text-amber-700" />
          <p className="text-sm font-extrabold">مستوى المخاطر</p>
          <p className="mt-3 text-2xl font-extrabold text-palm">{riskLabels[review.riskLevel]}</p>
        </Panel>
      </div>

      <Panel>
        <SectionTitle title="الملخص التنفيذي" subtitle="خلاصة قابلة للعرض على المسؤول عن المراجعة أو النشر." />
        <p className="leading-8 text-ink/75">{review.summary}</p>
      </Panel>

      <WorkflowSteps steps={review.workflow.map((step) => step.label)} />

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <SectionTitle title="ملاحظات الامتثال والمخاطر" subtitle="كل ملاحظة تعرض المرجع الرسمي واتجاه المعالجة." />
          <DataTable
            headers={["الملاحظة", "المخاطر", "المرجع الرسمي", "المادة أو القاعدة", "اتجاه المعالجة"]}
            rows={review.findings.map((finding) => [
              finding.issue,
              <StatusBadge key={finding.evidence} tone="danger">{riskLabels[finding.severity]}</StatusBadge>,
              <a key={finding.sourceUrl} href={finding.sourceUrl} className="font-extrabold text-palm underline underline-offset-4">{finding.sourceDocument}</a>,
              finding.ruleOrArticleNumber,
              finding.advice
            ])}
          />
        </Panel>
        <Panel>
          <SectionTitle title="فرص التحسين" subtitle="مقترحات عملية لتحسين الصياغة قبل النشر." />
          <DataTable
            headers={["المجال", "الأولوية", "المقترح"]}
            rows={review.languageQuality.issues.map((issue) => [
              issue.category,
              <StatusBadge key={issue.id} tone="warn">{issue.severity}</StatusBadge>,
              issue.suggestion
            ])}
          />
        </Panel>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <ButtonLink href="/legal-compliance"><ShieldCheck size={16} />ملاحظات الامتثال</ButtonLink>
        <ButtonLink href="/risk-assessment"><FileWarning size={16} />مؤشرات المخاطر</ButtonLink>
        <ButtonLink href="/recommendations"><Lightbulb size={16} />فرص التحسين</ButtonLink>
      </div>
    </div>
  );
}
