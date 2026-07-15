// ترجمة أخطاء مزود الذكاء الاصطناعي (Anthropic) إلى رسائل عربية واضحة قابلة للتنفيذ —
// حتى يعرف مسؤول المنصة فوراً إن كان السبب رصيداً أو مفتاحاً أو ضغطاً، لا «فشل» عاماً.
export function describeProviderError(raw: string): string | null {
  const s = raw.toLowerCase();
  if (s.includes("credit balance is too low"))
    return "رصيد حساب مزود الذكاء الاصطناعي (Anthropic) نفد — يلزم شحن الرصيد من console.anthropic.com (قائمة Plans & Billing ثم Purchase credits)، وبعد الشحن أعد المحاولة مباشرة دون أي تعديل في المنصة.";
  if (s.includes("invalid x-api-key") || s.includes("authentication_error") || s.includes("upstream 401"))
    return "مفتاح الذكاء الاصطناعي غير صالح — تحقق من قيمة ANTHROPIC_API_KEY في إعدادات Vercel ثم أعد النشر.";
  if (s.includes("rate_limit") || s.includes("upstream 429"))
    return "ضغط طلبات مؤقت لدى مزود الذكاء الاصطناعي — انتظر نحو دقيقة ثم أعد المحاولة.";
  if (s.includes("overloaded") || s.includes("upstream 529"))
    return "خدمة الذكاء الاصطناعي مشغولة مؤقتاً لدى المزود — أعد المحاولة بعد قليل.";
  return null;
}
