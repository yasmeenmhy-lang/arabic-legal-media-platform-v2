import { ButtonLink, DataTable, PageHeader, Panel, ScoreCard, SectionTitle, StatusBadge, WorkflowSteps } from "@/components/ui";
import { reviewContent } from "@/lib/services/review-service";
import type { LanguageIssueCategory, LanguageIssueSeverity } from "@/lib/types";
import { ClipboardCheck, FileWarning, Lightbulb, ShieldCheck } from "lucide-react";

const sampleText = "يجب مراجعة صياغة الإعلان قبل نشره لأنه يتضمن وعداً بنتيجة مضمونة للعميل.";
const review = reviewContent(sampleText, "advertisement");

const categoryLabels: Record<LanguageIssueCategory, string> = {
  spelling: "الإملاء",
  grammar: "النحو والترقيم",
  style: "الأسلوب المهني",
  readability: "وضوح القراءة",
  "اتساق المصطلحات": "اتساق المصطلحات"
};

const severityTone: Record<LanguageIssueSeverity, "neutral" | "good" | "gold"> = {
  low: "neutral",
  medium: "neutral",
  high: "gold",
  critical: "gold"
};

const severityLabels: Record<LanguageIssueSeverity, string> = {
  low: "منخفضة",
  medium: "متوسطة",
  high: "عالية",
  critical: "حرجة"
};

function scoreTone(value: number) {
  if (value >= 85) return "good" as const;
  if (value >= 70) return "neutral" as const;
  return "gold" as const;
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
        <ScoreCard label="مستوى الامتثال" value={review.complianceScore} tone={scoreTone(review.complianceScore)} detail="محسوب من ملاحظات مرتبطة بمواد ومراجع رسمية" />
        <Panel>
          <ClipboardCheck className="mb-3 text-palm" />
          <p className="text-sm font-normal">جاهزية النشر</p>
          <div className="mt-3">
            <StatusBadge tone={review.exportAllowed ? "good" : "neutral"}>
              {review.exportAllowed ? "مناسب للتصدير وفق نتائج المراجعة" : "يتطلب معالجة الملاحظات"}
            </StatusBadge>
          </div>
        </Panel>
        <Panel>
          <FileWarning className="mb-3 text-gold" />
          <p className="text-sm font-normal">مستوى المخاطر</p>
          <p className="mt-3 text-2xl font-normal text-palm">{review.riskLevel}</p>
        </Panel>
      </div>

      <Panel>
        <SectionTitle title="الملخص التنفيذي" subtitle="خلاصة قابلة للعرض على المسؤول عن المراجعة أو النشر." />
        <p className="leading-8 text-ink/75">{review.summary}</p>
      </Panel>

      <WorkflowSteps steps={review.workflow.map((step) => step.label)} />

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <SectionTitle title="ملاحظات الامتثال والمخاطر" subtitle="كل ملاحظة تعرض المصدر القانوني والمادة والشرح والتوصية." />
          <DataTable
            headers={["الملاحظة", "الشدة", "المصدر القانوني", "المادة", "الشرح القانوني", "التوصية"]}
            rows={review.findings.length > 0 ? review.findings.map((finding) => [
              finding.issue,
              <StatusBadge key={finding.evidence} tone="gold">{finding.severity}</StatusBadge>,
              <a key={finding.sourceUrl} href={finding.sourceUrl} className="font-normal text-palm underline underline-offset-4">{finding.sourceDocument}</a>,
              `${finding.ruleOrArticleNumber} - ${finding.articleTitle}`,
              `${finding.legalExplanation} نتيجة الفحص: ${finding.reviewOutcome}. مستوى الثقة: ${finding.confidenceLevel}.`,
              finding.advice
            ]) : [["لا توجد ملاحظات امتثال", <StatusBadge key="low" tone="good">منخفض</StatusBadge>, "قواعد السلوك المهني للمحامين واللائحة التنفيذية لنظام المحاماة", "-", review.summary, "استمر في الحفاظ على صياغة مهنية غير قطعية."]]}
          />
        </Panel>
        <Panel>
          <SectionTitle title="فرص التحسين" subtitle="مقترحات عملية لتحسين الصياغة قبل النشر." />
          <DataTable
            headers={["المجال", "الأولوية", "المقترح"]}
            rows={review.languageQuality.issues.map((issue) => [
              issue.category,
              <StatusBadge key={issue.id} tone="neutral">{issue.severity}</StatusBadge>,
              issue.suggestion
            ])}
          />
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <SectionTitle title="امتثال قواعد السلوك المهني" subtitle="الإعلان، الادعاءات المضللة، ضمان النتائج، السرية، تعارض المصالح، وكرامة المهنة." />
          <p className="leading-8 text-ink/75">{review.professionalConductCompliance.summary}</p>
          <div className="mt-3">
            <StatusBadge tone={review.professionalConductCompliance.passed ? "good" : "gold"}>
              {review.professionalConductCompliance.passed ? "لم ترصد ملاحظة ذات صلة" : "رصدت ملاحظات مرتبطة بالمصدر"}
            </StatusBadge>
          </div>
        </Panel>
        <Panel>
          <SectionTitle title="امتثال اللائحة التنفيذية لنظام المحاماة" subtitle="ضوابط الإعلان، التواصل المهني، الألفاظ المحظورة، الصفة المهنية، ومتطلبات التواصل العام." />
          <p className="leading-8 text-ink/75">{review.executiveRegulationCompliance.summary}</p>
          <div className="mt-3">
            <StatusBadge tone={review.executiveRegulationCompliance.passed ? "good" : "gold"}>
              {review.executiveRegulationCompliance.passed ? "لم ترصد ملاحظة ذات صلة" : "رصدت ملاحظات مرتبطة بالمصدر"}
            </StatusBadge>
          </div>
        </Panel>
      </div>

      <Panel>
        <SectionTitle title="تقييم المخاطر القانوني" subtitle="مستوى المخاطر وسبب التصنيف والمادة الداعمة." />
        <DataTable
          headers={["المستوى", "سبب التصنيف", "المادة الداعمة"]}
          rows={[[
            <StatusBadge key="risk" tone={review.riskLevel === "منخفض" ? "good" : review.riskLevel === "متوسط" ? "neutral" : "gold"}>{review.legalRiskAssessment.level}</StatusBadge>,
            review.legalRiskAssessment.reason,
            review.legalRiskAssessment.supportingArticle ? `${review.legalRiskAssessment.supportingArticle.sourceDocument} - ${review.legalRiskAssessment.supportingArticle.ruleOrArticleNumber} - ${review.legalRiskAssessment.supportingArticle.articleTitle}` : "-"
          ]]}
        />
      </Panel>

      <Panel>
        <SectionTitle title="المراجع ذات الصلة" subtitle="المواد والقواعد الرسمية التي استندت إليها النتيجة." />
        <DataTable
          headers={["المصدر", "المادة أو القاعدة", "عنوان المادة", "مقتطف النص", "الرابط الرسمي"]}
          rows={review.referencesPanel.length > 0 ? review.referencesPanel.map((reference) => [
            reference.sourceDocument,
            reference.ruleOrArticleNumber,
            reference.articleTitle,
            reference.articleTextExcerpt,
            <a key={reference.sourceUrl} href={reference.sourceUrl} className="font-normal text-palm underline underline-offset-4">فتح المصدر الرسمي</a>
          ]) : [["قواعد السلوك المهني للمحامين واللائحة التنفيذية لنظام المحاماة", "-", "-", review.summary, "لا توجد مادة محددة لأن المراجعة لم ترصد مخالفة ذات صلة."]]}
        />
      </Panel>

      <div className="grid gap-4 md:grid-cols-3">
        <ButtonLink href="/legal-compliance"><ShieldCheck size={16} />ملاحظات الامتثال</ButtonLink>
        <ButtonLink href="/risk-assessment"><FileWarning size={16} />مؤشرات المخاطر</ButtonLink>
        <ButtonLink href="/recommendations"><Lightbulb size={16} />فرص التحسين</ButtonLink>
      </div>
    </div>
  );
}
