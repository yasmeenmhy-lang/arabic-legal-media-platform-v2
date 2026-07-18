// ─────────────────────────────────────────────────────────────────────────────
// حاكم المنصة — بوابة واحدة يستدعيها كل مسار يقترح أو ينشئ نصاً، بلا استثناء.
// المرجع الحاكم: المتن الرسمي الكامل لقواعد السلوك المهني للمحامين واللائحة
// التنفيذية لنظام المحاماة (legal-official-corpus — النصوص الحرفية بأرقام موادها).
//
// بقرار مالكة المنصة: أُلغيت طبقة الأنماط الحرفية نهائياً — الحكم كله للعقل الذكي
// (نفس محرك المراجعة) الذي يقرأ المعنى فيمسك المخالفة ولو أُعيدت صياغتها.
// فشل مغلق: إذا تعذّر حكم الذكاء لا يُعد النص ممتثلاً — يُرفض التسليم بدل
// تمرير نص لم يُفحص (نفس مبدأ المراجعة: تحذير بلا نتائج عند التعطل).
// ─────────────────────────────────────────────────────────────────────────────
import { runSemanticAnalysis } from "@/lib/services/semantic-analysis-service";
import { evaluateContent } from "@/lib/services/content-evaluation-service";
import type { ContentKind, ReviewContext } from "@/lib/types";

// الحاكم الكامل: النص المقترح يجب أن يخرج نظيفاً من كل النواحي دفعة واحدة —
// (١) الامتثال بالعمق الدلالي (نفس محرك المراجعة على المتن الرسمي الكامل)،
// (٢) جودة اللغة بكل جوانبها: الإملاء والنحو والأسلوب والوضوح والمصطلحات —
// بنفس معايير المدقق التي تُعرض للمستخدم، فلا تنتقد المنصة نصها بنفسها.
// أي ملاحظة في أيّها = النص غير نظيف فيُعاد بتصحيحاته.
// `compliant` يميز الامتثال النظامي: المخالفة النظامية تحجب التسليم نهائياً،
// أما الملاحظة اللغوية المتبقية بعد كل المحاولات فلا تحجب نصاً ممتثلاً.
// checkLanguage=false يقصره على الامتثال (للنصوص القصيرة كالعناوين والوسوم).
export async function governText(
  text: string,
  context: ReviewContext | undefined,
  contentKind?: ContentKind,
  opts?: { checkLanguage?: boolean }
): Promise<{ clean: boolean; compliant: boolean; corrections: string[] }> {
  const checkLanguage = opts?.checkLanguage !== false;
  const [gov, evaluation] = await Promise.all([
    runSemanticAnalysis(text, context, contentKind),
    checkLanguage ? evaluateContent(text) : Promise.resolve(null),
  ]);

  // فشل مغلق: تعذّر حكم الذكاء (عطل مفتاح/خدمة) ⇒ لا يُعد النص ممتثلاً ولا يُسلَّم —
  // لا توجد طبقة أخرى تفحصه، وتمريره بلا فحص يناقض ضمانة «لا يخرج نص مخالف».
  if (gov.mode !== "full") {
    return {
      clean: false,
      compliant: false,
      corrections: ["- تعذّر التحقق من الامتثال بالذكاء الاصطناعي حالياً — لا يُسلَّم نص لم يُفحص. أعد المحاولة بعد قليل."],
    };
  }

  const semantic = gov.findings.map((v) => {
    const ref = v.legalReference || "قواعد السلوك المهني للمحامين";
    const title = v.articleTitle ? ` (${v.articleTitle})` : "";
    const safer = v.suggestedSaferWording ? ` — الصياغة الأسلم: ${v.suggestedSaferWording}` : "";
    return `- مخالفة لـ${ref}${title}: ${v.issue}${safer}`;
  });
  const language = (evaluation?.language.issues ?? []).map((i) => {
    const hard = i.category === "spelling" || i.category === "grammar";
    const kind = hard ? "خطأ لغوي" : "ملاحظة أسلوب أو وضوح";
    return `- ${kind}: «${i.excerpt ?? ""}» — ${i.message}${i.suggestion ? ` — التصحيح: ${i.suggestion}` : ""}`;
  });
  const corrections = [...semantic, ...language];
  return {
    clean: corrections.length === 0,
    compliant: semantic.length === 0,
    corrections,
  };
}
