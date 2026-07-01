import { Bot } from "lucide-react";
import { Panel, SectionTitle } from "@/components/ui";
import type { ReviewResult } from "@/lib/types";

export function SmartAssistantPanel({ review }: { review: ReviewResult }) {
  const firstFinding = review.findings[0];
  const firstLanguageIssue = review.languageQuality.issues[0];
  const guidance = firstFinding
    ? [
        `ابدأ بمعالجة: ${firstFinding.title}.`,
        `سبب الملاحظة: ${firstFinding.legalExplanation}`,
        `العبارة المرتبطة داخل المحتوى: "${firstFinding.evidence}".`,
        `المرجع: ${firstFinding.sourceDocument} — ${firstFinding.legalReference}.`,
        `اقتراح التعديل: ${firstFinding.suggestedSaferWording}`
      ]
    : firstLanguageIssue
      ? [
          `ابدأ بتحسين اللغة: ${firstLanguageIssue.message}`,
          `العبارة المرتبطة: "${firstLanguageIssue.excerpt}".`,
          `التصحيح أو التحسين المقترح: ${firstLanguageIssue.suggestion}`,
          "بعد التصحيح، أعد التحليل للتأكد من أثر التعديل على جاهزية النشر."
        ]
      : [
          "لم تظهر ملاحظة مهنية أو إملائية واضحة في التحليل الحالي.",
          "راجع السياق والجمهور والقناة قبل النشر، ثم اعتمد النسخة النهائية عند اكتمال المراجعة."
        ];

  return (
    <Panel id="smart-assistant">
      <SectionTitle
        title="المساعد الذكي داخل النافذة"
        subtitle="يساعدك على فهم الملاحظة وسببها والقاعدة المرتبطة بها وطريقة تعديل النص، دون أن يحل محل مسؤولية المستخدم في النشر."
      />
      <div className="rounded-xl border border-violetBorder bg-violetSoft p-4">
        <div className="flex items-center gap-2 text-violet"><Bot size={20} aria-hidden="true" /><h3 className="font-semibold">توجيه عملي للمراجعة الحالية</h3></div>
        <ul className="mt-3 list-disc space-y-2 pr-5 text-sm leading-7">
          {guidance.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </div>
    </Panel>
  );
}
