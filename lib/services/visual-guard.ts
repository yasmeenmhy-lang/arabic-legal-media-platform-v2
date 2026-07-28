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
import { governText } from "@/lib/services/governor-gate";
import { article10Violations, normalizeClaim } from "@/lib/services/article10-enforcer";
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

// البوابة الكاملة على نصوص المرئي: الفحص الدلالي وحده (الحارس المعتمد) — بعد
// حذف قاعدة المعرفة لم يعد للطبقة الأولى حكمٌ حرفي مستقل تُبنى منه تصحيحات هنا؛
// مواضعها ترفع للقاضي الدلالي نفسه ضمن governText. مخالفة الحارس ⇒ رفض بتصحيحاته.
// تعطل الحارس الدلالي يصل هنا compliant=false برسالة «لا يُسلَّم نص لم يُفحص»
// من الحاكم نفسه — فالمسار مغلق تلقائياً.
export async function guardVisualTexts(
  texts: string[],
  judge: VisualJudge = productionJudge
): Promise<VisualGuardVerdict> {
  const joined = texts.join(". ").trim();
  if (!joined) return { ok: true };

  const corrections: string[] = [];

  const verdict = await judge(joined);
  if (!verdict.compliant) corrections.push(...verdict.corrections);

  return corrections.length === 0 ? { ok: true } : { ok: false, corrections };
}

// ─── بوابة حوكمة المصادر على النص النهائي للمرئي ─────────────────────────────
// بأمر مالكة المنصة (أمر الإغلاق النهائي، البند أولاً): لا يكفي أن تكون حوكمة
// المصادر سرت على النص الأصلي — المترجم البصري يختصر ويعيد الصياغة وقد يضيف
// دلالة جديدة، فيُفحص النص النهائي الذي سيُرسم أيضاً.
//
// شرطا التسليم مستقلان: الامتثال المهني (guardVisualTexts أعلاه) والامتثال
// لحوكمة المصادر (هذه البوابة) — ومخالفة أحدهما لا تُسجل على أنها الآخر.

// سياق حوكمة المصادر المنقول من النسخة الأصلية — الحد الأدنى اللازم فقط
export type VisualSourceContext = {
  // النص الأصلي المحكوم الذي بُني منه المرئي — مرجع مطابقة الادعاءات:
  // التفصيلة الموجودة فيه حُكمت في مسارها؛ والغائبة عنه «إضافة جديدة» ممنوعة.
  originalText?: string;
  // هل النسخة الأصلية موقوفة بالمادة (١٠)؟ ⇒ يمنع إنشاء مرئي منها أصلاً
  stopped?: boolean;
  article10Applied?: boolean;
  officialSourceFound?: boolean;
  // التصريح المرجعي المرافق للنسخة إن وُجد — يُعاد عرضه مع المنع بحسب النطاق
  notice?: string;
};

export type VisualGovernanceVerdict =
  | { ok: true }
  | { ok: false; corrections: string[]; blockedByStop?: boolean };

// يفحص نصوص المرئي النهائية بفئات المادة (١٠) الثلاث عشرة، ويطابق كل تفصيلة
// مرصودة مع النص الأصلي: الواردة فيه حرفياً (بالتطبيع) مرّت بحوكمتها في مسارها؛
// وغير الواردة «تفصيلة جديدة غير مسندة» أضافها المترجم — تُرصد للتصحيح أو المنع.
// غياب السياق الأصلي مع وجود ادعاء يحتاج مصدراً ⇒ فشل مغلق (لا مطابقة ممكنة).
// لا بحث حي داخل مسار المرئي — سياق النسخة الأصلية هو المرجع (بنص الأمر).
export function guardVisualSourceGovernance(
  texts: string[],
  ctx?: VisualSourceContext
): VisualGovernanceVerdict {
  // النسخة الأصلية موقوفة بالمادة (١٠) ⇒ لا مرئي منها (بنص الأمر، البند ٦)
  if (ctx?.stopped) {
    return {
      ok: false,
      blockedByStop: true,
      corrections: ["- النسخة الأصلية موقوفة بموجب المادة (١٠) من وثيقة حوكمة المصادر — لا يُنشأ مرئي منها."],
    };
  }
  const joined = texts.join(". ").trim();
  if (!joined) return { ok: true };

  // كل التفاصيل النظامية في نص المرئي — تُرصد دائماً (sourceCount=0) ثم تُطابَق
  const hits = article10Violations(joined, 0);
  if (hits.length === 0) return { ok: true };

  const normalizedOriginal = normalizeClaim(ctx?.originalText ?? "");
  const uncovered = hits.filter((hit) => {
    // المقتطف المرصود بين «» — إن ورد في الأصل المطبَّع فقد حُكم في مساره
    const excerpt = hit.match(/«(.+?)»/)?.[1] ?? "";
    if (!excerpt) return true;
    return !normalizedOriginal.includes(normalizeClaim(excerpt));
  });
  if (uncovered.length === 0) return { ok: true };

  return {
    ok: false,
    corrections: uncovered.map((h) =>
      `- تفصيلة نظامية في نص المرئي غير واردة في النص الأصلي المحكوم (${h}): المترجم البصري ممنوع من إضافة تفصيلة غير مسندة — احذفها أو أعد صياغة الفكرة عامة.`
    ),
  };
}
