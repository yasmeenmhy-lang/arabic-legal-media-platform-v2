// طبقة مزودي توليد الصور الاحترافية — اختيار عبر متغيرات البيئة، بلا احتياط بصري خفي.
// IMAGE_PROVIDER=openai | gemini | auto | mock (الافتراضي auto)
// النماذج: OPENAI_IMAGE_MODEL (افتراضي gpt-image-1)، GEMINI_IMAGE_MODEL (افتراضي gemini-2.5-flash-image)
// عند فشل المزودين الحقيقيين يُعاد فشل صادق (provider="none") — لا صورة بديلة إلا بوضع mock الصريح.

export type PremiumImageResult = {
  imageBase64?: string; // data URL
  imageUrl?: string;
  provider: "openai" | "gemini" | "mock" | "none";
  /** سبب فشل المزودين المهيَّئين إن حدث — أكواد حالة ورسائل إرشادية فقط، لا أسرار */
  failureNote?: string;
};

export type ProviderStatus = {
  mode: string;
  openai: boolean;
  gemini: boolean;
  premiumAvailable: boolean;
};

// وجود المفتاح لا يعني صلاحيته — الحالة تعني «مهيأ» فقط، والتحقق الفعلي عبر verifyOpenAIKey
export function providerStatus(): ProviderStatus {
  const mode = (process.env.IMAGE_PROVIDER ?? "auto").toLowerCase();
  const openai = Boolean(process.env.OPENAI_API_KEY);
  const gemini = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  return { mode, openai, gemini, premiumAvailable: mode === "mock" ? false : openai || gemini };
}

// تحقق فعلي رخيص من صلاحية مفتاح OpenAI (قائمة النماذج — لا توليد ولا تكلفة صور)
// يُخزَّن مؤقتاً ٥ دقائق حتى لا يتكرر مع كل تحميل صفحة
let openaiVerifyCache: { at: number; verified: boolean; note?: string } | null = null;
export async function verifyOpenAIKey(): Promise<{ verified: boolean; note?: string }> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { verified: false, note: "مزود الصور الاحترافي غير مهيأ — تواصل مع مسؤول المنصة" };
  const now = Date.now();
  if (openaiVerifyCache && now - openaiVerifyCache.at < 5 * 60_000) {
    return { verified: openaiVerifyCache.verified, note: openaiVerifyCache.note };
  }
  let out: { verified: boolean; note?: string };
  try {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { authorization: `Bearer ${key}` },
    });
    out = res.ok
      ? { verified: true }
      : { verified: false, note: describeFailure("openai", new Error(`OpenAI ${res.status}`)) };
  } catch {
    out = { verified: false, note: "تعذر التحقق من جاهزية خدمة الصور الاحترافية" };
  }
  openaiVerifyCache = { at: now, ...out };
  return out;
}

async function openAiGenerate(prompt: string, w: number, h: number): Promise<PremiumImageResult | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  const size = w > h ? "1536x1024" : h > w ? "1024x1536" : "1024x1024";
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    // الجودة القصوى بقرار مالكة المنصة — أعلى دقة تفاصيل وخط (قابلة للتهيئة عبر OPENAI_IMAGE_QUALITY)
    body: JSON.stringify({ model, prompt, size, quality: process.env.OPENAI_IMAGE_QUALITY || "high", output_format: "png" }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = (await res.json()) as { data?: { b64_json?: string }[] };
  const b64 = data.data?.[0]?.b64_json;
  return b64 ? { imageBase64: `data:image/png;base64,${b64}`, provider: "openai" } : null;
}

async function geminiGenerate(prompt: string): Promise<PremiumImageResult | null> {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) return null;
  const preferred = process.env.GEMINI_IMAGE_MODEL;
  const models = preferred
    ? [preferred, "gemini-2.5-flash-image", "gemini-2.5-flash-image-preview"]
    : ["gemini-2.5-flash-image", "gemini-2.5-flash-image-preview"];
  for (const model of models) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": key, "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
      }
    );
    if (res.status === 404) continue;
    if (!res.ok) throw new Error(`Gemini ${res.status}`);
    const data = (await res.json()) as {
      candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[];
    };
    const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    if (part?.inlineData?.data) {
      return {
        imageBase64: `data:${part.inlineData.mimeType ?? "image/png"};base64,${part.inlineData.data}`,
        provider: "gemini",
      };
    }
    return null;
  }
  return null;
}

// عنصر نائب حتمي بلا شبكة — لوضع mock الصريح (demo) وللاختبارات فقط
function mockGenerate(w: number, h: number): PremiumImageResult {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#F4F7F6"/><rect x="24" y="24" width="${w - 48}" height="${h - 48}" rx="24" fill="#FFFFFF" stroke="#DFF6E7" stroke-width="3"/><text x="${w / 2}" y="${h / 2}" text-anchor="middle" font-family="Tahoma" font-size="${Math.round(w / 28)}" fill="#166A45">وضع تجريبي — لا مزود صور مهيأ</text></svg>`;
  return { imageBase64: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`, provider: "mock" };
}

// تحويل أكواد الفشل إلى رسائل عربية دقيقة تنسب الخطأ لمزوده الصحيح — لا أسرار
function describeFailure(name: "openai" | "gemini", e: unknown): string {
  const raw = e instanceof Error ? e.message : "خطأ غير معروف";
  const msg = raw.replace(/Bearer\s+\S+/gi, "").slice(0, 60);
  if (name === "openai") {
    if (/\b401\b/.test(msg)) return "خدمة الصور الاحترافية غير متاحة حالياً — تواصل مع مسؤول المنصة.";
    if (/\b403\b/.test(msg)) return "خدمة الصور الاحترافية غير متاحة حالياً — تواصل مع مسؤول المنصة.";
    if (/\b429\b/.test(msg)) return "ازدحام مؤقت على خدمة الصور — أعد المحاولة بعد قليل.";
    return "تعذر إنشاء الصورة عبر الخدمة الاحترافية — أعد المحاولة، وإن استمرت المشكلة تواصل مع مسؤول المنصة.";
  }
  if (/\b40[13]\b/.test(msg)) return "خدمة الصور الاحترافية غير متاحة حالياً — تواصل مع مسؤول المنصة.";
  return "تعذر إنشاء الصورة عبر الخدمة الاحترافية — أعد المحاولة، وإن استمرت المشكلة تواصل مع مسؤول المنصة.";
}

// توليد عدة نسخ لنفس الموجّه — بأمر مالكة المنصة: كل توليد بصري ثلاث نسخ يختار منها المستخدم.
// OpenAI يدعم n في طلب واحد؛ Gemini يُكرَّر. عند فشل OpenAI كلياً يتولّى Gemini بديلاً.
async function openAiVariants(prompt: string, w: number, h: number, count: number): Promise<PremiumImageResult[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return [];
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  const size = w > h ? "1536x1024" : h > w ? "1024x1536" : "1024x1024";
  const res = await fetch(`${process.env.OPENAI_BASE_URL ?? "https://api.openai.com"}/v1/images/generations`, {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ model, prompt, size, quality: process.env.OPENAI_IMAGE_QUALITY || "high", n: count, output_format: "png" }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = (await res.json()) as { data?: { b64_json?: string }[] };
  return (data.data ?? []).map((d) => d.b64_json).filter((b): b is string => Boolean(b))
    .map((b64) => ({ imageBase64: `data:image/png;base64,${b64}`, provider: "openai" as const }));
}

async function geminiVariants(prompt: string, count: number, failures: string[]): Promise<PremiumImageResult[]> {
  if (!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)) return [];
  const images: PremiumImageResult[] = [];
  // Gemini لا يدعم n — تُطلب النسخ بالتوازي لتقليص الزمن
  const results = await Promise.allSettled(Array.from({ length: count }, () => geminiGenerate(prompt)));
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) images.push(r.value);
    else if (r.status === "rejected") failures.push(describeFailure("gemini", r.reason));
  }
  return images;
}

// توليد ثلاث نسخ مع تفضيل مزوّد حسب كثافة النص العربي:
// prefer="gemini" (نانو بنانا) للمخرجات النصية — الأقوى في رسم العربية داخل الصور.
// prefer="openai" (gpt-image-1) للمخرجات قليلة النص (صور الغلاف). البديل يتولّى عند الفشل.
export async function generatePremiumVariants(
  prompt: string, w: number, h: number, count = 3, prefer: "gemini" | "openai" = "gemini",
): Promise<{ images: PremiumImageResult[]; failureNote?: string }> {
  const mode = (process.env.IMAGE_PROVIDER ?? "auto").toLowerCase();
  if (mode === "mock") return { images: Array.from({ length: count }, () => mockGenerate(w, h)) };

  const failures: string[] = [];
  const runOpenai = async () => {
    try { const im = await openAiVariants(prompt, w, h, count); if (im.length) return im; failures.push("لم تصل صور من OpenAI."); }
    catch (e) { failures.push(describeFailure("openai", e)); console.error("[image-variants] openai", e instanceof Error ? e.message : e); }
    return [];
  };
  const runGemini = async () => {
    const im = await geminiVariants(prompt, count, failures);
    if (!im.length) failures.push("لم تصل صور من Gemini.");
    return im;
  };

  // ترتيب المحاولات حسب التفضيل، مع احترام IMAGE_PROVIDER إن ثُبّت على مزوّد واحد
  const order: Array<() => Promise<PremiumImageResult[]>> =
    mode === "openai" ? [runOpenai]
    : mode === "gemini" ? [runGemini]
    : prefer === "gemini" ? [runGemini, runOpenai]
    : [runOpenai, runGemini];

  for (const run of order) {
    const im = await run();
    if (im.length) return { images: im };
  }
  if (!process.env.OPENAI_API_KEY && !(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)) {
    failures.push("خدمة الصور الاحترافية غير مهيأة — تواصل مع مسؤول المنصة.");
  }
  return { images: [], failureNote: [...new Set(failures)].join(" | ") || "تعذر إنشاء الصور — أعد المحاولة." };
}

// التوليد الاحترافي وفق IMAGE_PROVIDER — لا يرمي أبداً، والفشل يُعاد فشلاً صادقاً بلا صورة بديلة
export async function generatePremiumImage(prompt: string, w: number, h: number): Promise<PremiumImageResult> {
  const mode = (process.env.IMAGE_PROVIDER ?? "auto").toLowerCase();
  if (mode === "mock") return mockGenerate(w, h);

  // المحاولات تُبنى فقط للمزودين المهيَّئين فعلاً — لا يُنسب فشل لمزود غير مفعّل
  const attempts: Array<{ name: "openai" | "gemini"; run: () => Promise<PremiumImageResult | null> }> = [];
  if ((mode === "openai" || mode === "auto") && process.env.OPENAI_API_KEY) {
    attempts.push({ name: "openai", run: () => openAiGenerate(prompt, w, h) });
  }
  if ((mode === "gemini" || mode === "auto") && (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)) {
    attempts.push({ name: "gemini", run: () => geminiGenerate(prompt) });
  }

  const failures: string[] = [];
  if (!attempts.length) {
    failures.push(
      "خدمة الصور الاحترافية غير مهيأة — تواصل مع مسؤول المنصة."
    );
  }
  for (const a of attempts) {
    try {
      const r = await a.run();
      if (r) return r;
      failures.push("لم تصل صورة من الخدمة — أعد المحاولة.");
    } catch (e) {
      failures.push(describeFailure(a.name, e));
      console.error("[image-provider]", a.name, e instanceof Error ? e.message : e);
    }
  }
  return { provider: "none", failureNote: [...new Set(failures)].join(" | ") || "تعذر إنشاء الصورة — أعد المحاولة." };
}
