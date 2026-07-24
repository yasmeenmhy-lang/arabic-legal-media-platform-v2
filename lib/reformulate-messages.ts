// رسائل توجيهية لإعادة الصياغة — تُعرض كبطاقة تحذير (لا كخطأ تقني ولا كصياغة مقترحة).
// مصدر واحد للحقيقة يقرؤه الخادم (لإرسالها) والواجهة (لتمييزها وعرضها بهيئة تحذير).

// النص المُدخل لا مضمون فيه يُعاد صياغته (تفضيل/دعاية عامة).
export const NO_SUBSTANCE_MESSAGE =
  "لا يتضمّن النص مضموناً تثقيفياً يُعاد صياغته — فهو عبارة تفضيل عامة. اكتب المسألة النظامية أو الفكرة التي تريد التوعية بها (مثل: مدة التقادم، أو شروط عقد العمل) ثم أعد المحاولة.";

// تعذّر بلوغ صياغة ملتزمة بالكامل بعد جولات المعالجة.
export const NON_COMPLIANT_MESSAGE =
  "تعذّر إنتاج صياغة ملتزمة بالكامل بقواعد السلوك المهني واللائحة التنفيذية — عدّل النص الأصلي ثم أعد المحاولة.";

// الرسائل التوجيهية التي تُعرض بهيئة تحذير (لا خطأ تقني).
export const REFORMULATE_GUIDANCE_MESSAGES: readonly string[] = [NO_SUBSTANCE_MESSAGE, NON_COMPLIANT_MESSAGE];

export function isReformulateGuidance(message: string): boolean {
  return REFORMULATE_GUIDANCE_MESSAGES.includes(message.trim());
}
