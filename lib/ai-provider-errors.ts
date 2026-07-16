// ترجمة أخطاء مزود الذكاء الاصطناعي (Anthropic) إلى رسائل عربية واضحة قابلة للتنفيذ —
// حتى يعرف مسؤول المنصة فوراً إن كان السبب رصيداً أو مفتاحاً أو ضغطاً، لا «فشل» عاماً.
export function describeProviderError(raw: string): string | null {
  const s = raw.toLowerCase();
  if (s.includes("credit balance is too low"))
    return "خدمة الذكاء الاصطناعي متوقفة مؤقتاً لنفاد رصيد الاشتراك — تواصل مع مسؤول المنصة لإعادة تفعيلها.";
  if (s.includes("invalid x-api-key") || s.includes("authentication_error") || s.includes("upstream 401"))
    return "خدمة الذكاء الاصطناعي غير متاحة حالياً — تواصل مع مسؤول المنصة.";
  if (s.includes("rate_limit") || s.includes("upstream 429"))
    return "ضغط طلبات مؤقت لدى مزود الذكاء الاصطناعي — انتظر نحو دقيقة ثم أعد المحاولة.";
  if (s.includes("overloaded") || s.includes("upstream 529"))
    return "خدمة الذكاء الاصطناعي مشغولة مؤقتاً لدى المزود — أعد المحاولة بعد قليل.";
  return null;
}
