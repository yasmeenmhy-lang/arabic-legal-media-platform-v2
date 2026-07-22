import { AsyncLocalStorage } from "node:async_hooks";

// ─────────────────────────────────────────────────────────────────────────────
// عدّاد التكلفة الداخلي (بقرار مالكة المنصة — يظهر لها وحدها، لا لمستخدمي المنصة):
// كل نداء ذكاء يسجّل عدّادات استهلاكه الفعلية (usage) التي يرجعها المزوّد، فتُحسب
// تكلفة العملية الواحدة بدقة من الأسعار الرسمية المعلنة، وتُخصم من رصيد داخلي
// تُحدّثه المالكة عند كل شحن. لا يمسّ أي منطق — قياسٌ صرف.
//
// آلية التجميع: AsyncLocalStorage — المسار يفتح عدّاداً واحداً (runWithCostMeter)
// وكل خدمة تسجّل فيه (recordUsage) دون تمرير معاملات عبر عشرات الدوال.
// خارج أي عدّاد مفتوح، recordUsage لا يفعل شيئاً — آمن دائماً.
// ─────────────────────────────────────────────────────────────────────────────

// أسعار claude-sonnet-5 الرسمية لكل مليون توكن (دولار):
// سعر تمهيدي حتى 2026-08-31: إدخال 2$ / إخراج 10$، وبعده: 3$ / 15$.
// قراءة الذاكرة المؤقتة = 0.1× سعر الإدخال، كتابتها = 1.25× سعر الإدخال.
// البحث الحي: 10$ لكل 1000 عملية بحث (0.01$ للعملية) فوق تكلفة التوكنز.
function pricesNow() {
  const intro = Date.now() < Date.parse("2026-09-01T00:00:00Z");
  const inputPerMTok = intro ? 2 : 3;
  const outputPerMTok = intro ? 10 : 15;
  return {
    input: inputPerMTok / 1_000_000,
    output: outputPerMTok / 1_000_000,
    cacheRead: (inputPerMTok * 0.1) / 1_000_000,
    cacheWrite: (inputPerMTok * 1.25) / 1_000_000,
    perSearch: 0.01,
  };
}

export type UsageLike = {
  input_tokens?: number;
  output_tokens?: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  server_tool_use?: { web_search_requests?: number };
};

export type CostMeter = {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  searches: number;
  calls: number;
};

const store = new AsyncLocalStorage<CostMeter>();

export function newMeter(): CostMeter {
  return { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, searches: 0, calls: 0 };
}

// يفتح عدّاداً لهذا المسار وينفّذ العمل داخله — يرجع ناتج العمل والعدّاد معاً
export async function runWithCostMeter<T>(work: () => Promise<T>): Promise<{ result: T; meter: CostMeter }> {
  const meter = newMeter();
  const result = await store.run(meter, work);
  return { result, meter };
}

// العدّاد المفتوح حالياً (إن وُجد) — لقراءة التكلفة الجارية داخل النطاق الملفوف
export function currentMeter(): CostMeter | null {
  return store.getStore() ?? null;
}

// تسجيل استهلاك نداء واحد — يُستدعى من كل خدمة بعد قراءة رد المزوّد.
// متسامح تماماً: usage ناقص أو عدّاد غير مفتوح ⇒ لا شيء يحدث.
export function recordUsage(usage: unknown) {
  const m = store.getStore();
  if (!m || !usage || typeof usage !== "object") return;
  const u = usage as UsageLike;
  m.calls += 1;
  m.inputTokens += u.input_tokens ?? 0;
  m.outputTokens += u.output_tokens ?? 0;
  m.cacheReadTokens += u.cache_read_input_tokens ?? 0;
  m.cacheWriteTokens += u.cache_creation_input_tokens ?? 0;
  m.searches += u.server_tool_use?.web_search_requests ?? 0;
}

// التكلفة الإجمالية بالدولار — من الأسعار الرسمية وعدّادات الاستهلاك الفعلية.
// تقدير محاسبي دقيق بحدود ما يُبلّغ عنه المزوّد؛ فاتورة Console تبقى المرجع النهائي.
export function meterCostUsd(m: CostMeter): number {
  const p = pricesNow();
  return (
    m.inputTokens * p.input +
    m.outputTokens * p.output +
    m.cacheReadTokens * p.cacheRead +
    m.cacheWriteTokens * p.cacheWrite +
    m.searches * p.perSearch
  );
}
