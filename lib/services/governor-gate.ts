// ─────────────────────────────────────────────────────────────────────────────
// حاكم المنصة — بوابة واحدة يستدعيها كل مسار يقترح أو ينشئ نصاً، بلا استثناء.
//
// هذه البوابة هي المنفّذ الفعلي للقاعدة العليا للمنصة PLATFORM_SUPREME_RULE
// (lib/governance.ts — بقرار مالكة المنصة، داخلية لا تُعرض للمستخدم): يحظر عرض
// أو اقتراح أو اعتماد أو مشاركة أي محتوى فيه مخالفة أو تضليل أو اختلاق، ولا
// يجوز لأي نموذج أو وكيل أو مكوّن تجاوز حكمها أو تعديله أو تخفيفه.
//
// ★ القاعدة الأساسية (بقرار مالكة المنصة — ثابتة غير قابلة للتفاوض):
// ممنوع أن تعرض المنصة أي نص من إنتاجها — إنشاءً جديداً في الاستديو، أو صياغة
// مقترحة في نتائج المراجعة، أو إعادة صياغة تحسينية — وفيه مخالفة لقواعد السلوك
// المهني للمحامين أو اللائحة التنفيذية لنظام المحاماة. كل نص تُخرجه المنصة يمر
// على هذه البوابة قبل عرضه، وفشل مغلق: بقاء مخالفة أو تعذُّر الفحص ⇒ لا يُعرض.
// المسارات الملزمة بها: الإنشاء (generate)، إعادة الصياغة (reformulate)،
// الصياغة المقترحة (recommendation-service)، العناوين (suggest-title)،
// الخطط (smart-plan) — وأي مسار مستقبلي يُخرج نصاً.
//
// المرجع الحاكم: المتن الرسمي الكامل لقواعد السلوك المهني للمحامين واللائحة
// التنفيذية لنظام المحاماة (legal-official-corpus — النصوص الحرفية بأرقام موادها).
//
// بقرار مالكة المنصة: أُلغيت طبقة الأنماط الحرفية نهائياً — الحكم كله للعقل الذكي
// (نفس محرك المراجعة) الذي يقرأ المعنى فيمسك المخالفة ولو أُعيدت صياغتها.
// فشل مغلق: إذا تعذّر حكم الذكاء لا يُعد النص ممتثلاً — يُرفض التسليم بدل
// تمرير نص لم يُفحص (نفس مبدأ المراجعة: تحذير بلا نتائج عند التعطل).
// ─────────────────────────────────────────────────────────────────────────────
import { runSemanticAnalysis } from "@/lib/services/semantic-analysis-service";
import type { SemanticAnalysisResult } from "@/lib/services/semantic-analysis-service";
import { evaluateContent } from "@/lib/services/content-evaluation-service";
import type { ContentEvaluation, ContentKind, ReviewContext } from "@/lib/types";

// الحاكم الكامل: النص المقترح يجب أن يخرج نظيفاً من كل النواحي دفعة واحدة —
// (١) الامتثال بالعمق الدلالي (نفس محرك المراجعة على المتن الرسمي الكامل)،
// (٢) جودة اللغة بكل جوانبها: الإملاء والنحو والأسلوب والوضوح والمصطلحات —
// بنفس معايير المدقق التي تُعرض للمستخدم، فلا تنتقد المنصة نصها بنفسها.
// أي ملاحظة في أيّها = النص غير نظيف فيُعاد بتصحيحاته.
// `compliant` يميز الامتثال النظامي: المخالفة النظامية تحجب التسليم نهائياً،
// أما الملاحظة اللغوية المتبقية بعد كل المحاولات فلا تحجب نصاً ممتثلاً.
// checkLanguage=false يقصره على الامتثال (للنصوص القصيرة كالعناوين والوسوم).
export type GovernTextFullResult = {
  clean: boolean;
  compliant: boolean;
  corrections: string[];
  // نتائج الذكاء الخام كما حكم بها الحاكم فعلاً — تُستخدم لبناء تقرير المراجعة الكامل
  // من الحكم نفسه دون استدعاء ذكاء ثانٍ مستقل قد يختلف حكمه (سبب تناقض «ممتثل عند
  // الإنشاء» ثم «به مخالفة عند المراجعة»). null عند فشل الحكم أو تعطيل فحص اللغة.
  semanticResult: SemanticAnalysisResult | null;
  contentEval: ContentEvaluation | null;
};

async function governTextFull(
  text: string,
  context: ReviewContext | undefined,
  contentKind?: ContentKind,
  opts?: { checkLanguage?: boolean }
): Promise<GovernTextFullResult> {
  const checkLanguage = opts?.checkLanguage !== false;
  const [gov, evaluation] = await Promise.all([
    runSemanticAnalysis(text, context, contentKind),
    checkLanguage ? evaluateContent(text, context) : Promise.resolve(null),
  ]);

  // فشل مغلق: تعذّر حكم الذكاء (عطل مفتاح/خدمة) ⇒ لا يُعد النص ممتثلاً ولا يُسلَّم —
  // لا توجد طبقة أخرى تفحصه، وتمريره بلا فحص يناقض ضمانة «لا يخرج نص مخالف».
  if (gov.mode !== "full") {
    return {
      clean: false,
      compliant: false,
      corrections: ["- تعذّر التحقق من الامتثال بالذكاء الاصطناعي حالياً — لا يُسلَّم نص لم يُفحص. أعد المحاولة بعد قليل."],
      semanticResult: null,
      contentEval: evaluation,
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
    semanticResult: gov,
    contentEval: evaluation,
  };
}

export async function governText(
  text: string,
  context: ReviewContext | undefined,
  contentKind?: ContentKind,
  opts?: { checkLanguage?: boolean }
): Promise<{ clean: boolean; compliant: boolean; corrections: string[] }> {
  const full = await governTextFull(text, context, contentKind, opts);
  return { clean: full.clean, compliant: full.compliant, corrections: full.corrections };
}

// نسخة الحاكم التي تُبقي نتائج الذكاء الخام — تُستخدم فقط حين يحتاج المستدعي بناء
// تقرير مراجعة كامل من نفس الحكم لاحقاً (توحيد الإنشاء والمراجعة). لا تُغيّر سلوك
// governText القائم إطلاقاً — إضافة صرفة بجانبها.
export { governTextFull };
