// ─────────────────────────────────────────────────────────────────────────────
// حارس المرئيات المهني — بأمر مالكة المنصة (أمر معالجة الفجوات، البند أولاً):
// «لا يكفي الفحص الحرفي لنصوص الخطة البصرية — يجب أن تمر جميع النصوص التي
// ستظهر داخل المرئي على الحارس المهني الكامل قبل الرسم».
//
// المرجع الحاكم حصراً: قواعد السلوك المهني للمحامين واللائحة التنفيذية لنظام
// المحاماة — عبر الحارس الدلالي المعتمد نفسه المستخدم في المسارات النصية
// (governText)، بلا منطق امتثال جديد ولا مرجع موازٍ.
//
// فشل مغلق كامل: مخالفة حرفية أو دلالية ⇒ لا رسم؛ وتعطل الحارس ⇒ لا رسم
// («لا يُسلَّم نص لم يُفحص» — governor-gate:65 تصل هنا بنفس المنطق).
//
// ★ لا يُعتمد على كون النص الأصلي اجتاز الفحص — المترجم البصري يختصر ويعيد
// الصياغة، فالمفحوص هو النص النهائي الذي سيُرسم (بنص الأمر، البند ١٠).
// ─────────────────────────────────────────────────────────────────────────────
import { scanAgainstCorpus } from "@/lib/services/corpus-scan";
import { governText } from "@/lib/services/governor-gate";
import type { VisualPlan } from "@/lib/visual-translator";

// كل نص سيظهر داخل المرئي — من الخطة البصرية النهائية (المعاد صياغتها)، لا من
// النص الأصلي: العنوان، الفرعي، الرسالة، العبارة البصرية، الأقسام بعناوينها
// ونقاطها وأرقامها، والأرقام المهمة بدلالاتها.
export function collectVisualPlanTexts(plan: VisualPlan): string[] {
  return [
    plan.title,
    plan.subtitle,
    plan.centralMessage,
    plan.shortVisualCopy,
    ...plan.keySections.flatMap((s) => [s.heading, ...(s.bullets ?? []), s.stat ?? ""]),
    ...(plan.importantNumbers ?? []),
  ].filter((t): t is string => Boolean(t && t.trim()));
}

export type VisualGuardVerdict =
  | { ok: true }
  | { ok: false; corrections: string[] };

// نوع القاضي القابل للحقن — الإنتاج يمرر governText نفسه؛ والاختبارات المحلية
// تمرر قاضياً صورياً لإثبات قرارات البوابة بلا شبكة ولا رصيد.
export type VisualJudge = (text: string) => Promise<{ compliant: boolean; corrections: string[] }>;

const productionJudge: VisualJudge = async (text) => {
  // نفس الحارس المعتمد في المسارات النصية — الامتثال وحده (النصوص البصرية
  // القصيرة لا تُفحص لغوياً، كالعناوين المقترحة تماماً)
  const gate = await governText(text, undefined, undefined, { checkLanguage: false });
  return { compliant: gate.compliant, corrections: gate.corrections };
};

// البوابة الكاملة على نصوص المرئي: فحص حرفي (الطبقة الأولى — كود مجاني) ثم
// فحص دلالي (الحارس المعتمد). أي مخالفة من أيهما ⇒ رفض بتصحيحاته المسماة.
// تعطل الحارس الدلالي يصل هنا compliant=false برسالة «لا يُسلَّم نص لم يُفحص»
// من الحاكم نفسه — فالمسار مغلق تلقائياً.
export async function guardVisualTexts(
  texts: string[],
  judge: VisualJudge = productionJudge
): Promise<VisualGuardVerdict> {
  const joined = texts.join(". ").trim();
  if (!joined) return { ok: true };

  const corrections: string[] = [];

  // (١) الفحص الحرفي — ألفاظ متن القواعد واللوائح، حتمي بلا تكلفة
  const scan = scanAgainstCorpus(joined);
  corrections.push(
    ...scan.hits.map((h) => `- عبارة مخالفة لمتن القواعد («${h.excerpt.slice(0, 60)}» — ${h.legalReference}): احذفها أو أعد صياغتها ملتزمة.`)
  );

  // (٢) الفحص الدلالي — الحارس المعتمد نفسه، بالمعنى والمقصد
  const verdict = await judge(joined);
  if (!verdict.compliant) corrections.push(...verdict.corrections);

  return corrections.length === 0 ? { ok: true } : { ok: false, corrections };
}
