// رسائل توجيهية لإعادة الصياغة — تُعرض كبطاقة تحذير (لا كخطأ تقني ولا كصياغة مقترحة).
// مصدر واحد للحقيقة يقرؤه الخادم (لإرسالها) والواجهة (لتمييزها وعرضها بهيئة تحذير).

// النص المُدخل لا مضمون فيه يُعاد صياغته (عبارة خالية من أي فكرة).
export const NO_SUBSTANCE_MESSAGE =
  "لا يتضمّن النص فكرة أو مضموناً يُعاد صياغته. اكتب الفكرة أو المسألة التي تريد طرحها ثم أعد المحاولة.";

// النص خارج ما تغطّيه المنصة (الخطاب الديني والعقدي والفتوى).
export const OUT_OF_MANDATE_MESSAGE =
  "هذا المحتوى خارج نطاق ما تغطّيه المنصة.";

// تعذّر بلوغ صياغة ملتزمة بالكامل بعد جولات المعالجة.
export const NON_COMPLIANT_MESSAGE =
  "تعذّر إنتاج صياغة ملتزمة بالكامل بقواعد السلوك المهني واللائحة التنفيذية — عدّل النص الأصلي ثم أعد المحاولة.";

// الرسائل التوجيهية التي تُعرض بهيئة تحذير (لا خطأ تقني).
export const REFORMULATE_GUIDANCE_MESSAGES: readonly string[] = [NO_SUBSTANCE_MESSAGE, OUT_OF_MANDATE_MESSAGE, NON_COMPLIANT_MESSAGE];

export function isReformulateGuidance(message: string): boolean {
  return REFORMULATE_GUIDANCE_MESSAGES.includes(message.trim());
}
