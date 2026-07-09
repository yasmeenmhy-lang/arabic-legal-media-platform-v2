// طبقة مزودي توليد الصور الاحترافية — اختيار عبر متغيرات البيئة مع تسلسل احتياطي.
// IMAGE_PROVIDER=openai | gemini | auto | mock (الافتراضي auto)
// النماذج: OPENAI_IMAGE_MODEL (افتراضي gpt-image-1)، GEMINI_IMAGE_MODEL (افتراضي gemini-2.5-flash-image)

export type PremiumImageResult = {
  imageBase64?: string; // data URL
  imageUrl?: string;
  provider: "openai" | "gemini" | "pollinations" | "mock";
  /** سبب سقوط المزودين الرئيسيين إن حدث — أكواد حالة فقط، لا أسرار */
  failureNote?: string;
};

export type ProviderStatus = {
  mode: string;
  openai: boolean;
  gemini: boolean;
  premiumAvailable: boolean;
};

export function providerStatus(): ProviderStatus {
  const mode = (process.env.IMAGE_PROVIDER ?? "auto").toLowerCase();
  const openai = Boolean(process.env.OPENAI_API_KEY);
  const gemini = Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  return { mode, openai, gemini, premiumAvailable: mode === "mock" ? false : openai || gemini };
}

async function openAiGenerate(prompt: string, w: number, h: number): Promise<PremiumImageResult | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
  const size = w > h ? "1536x1024" : h > w ? "1024x1536" : "1024x1024";
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ model, prompt, size, quality: "medium", output_format: "png" }),
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

function pollinationsGenerate(prompt: string, w: number, h: number): PremiumImageResult {
  const seed = Math.floor(Math.random() * 1e6);
  return {
    imageUrl: `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&model=flux&nologo=true&safe=true&seed=${seed}`,
    provider: "pollinations",
  };
}

// عنصر نائب حتمي بلا شبكة — لوضع mock وللاختبارات
function mockGenerate(w: number, h: number): PremiumImageResult {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#F4F7F6"/><rect x="24" y="24" width="${w - 48}" height="${h - 48}" rx="24" fill="#FFFFFF" stroke="#DFF6E7" stroke-width="3"/><text x="${w / 2}" y="${h / 2}" text-anchor="middle" font-family="Tahoma" font-size="${Math.round(w / 28)}" fill="#166A45">وضع تجريبي — لا مزود صور مهيأ</text></svg>`;
  return { imageBase64: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`, provider: "mock" };
}

// التوليد الاحترافي وفق IMAGE_PROVIDER مع تسلسل احتياطي آمن — لا يرمي أبداً
export async function generatePremiumImage(prompt: string, w: number, h: number): Promise<PremiumImageResult> {
  const mode = (process.env.IMAGE_PROVIDER ?? "auto").toLowerCase();
  if (mode === "mock") return mockGenerate(w, h);

  const attempts: Array<() => Promise<PremiumImageResult | null>> =
    mode === "openai" ? [() => openAiGenerate(prompt, w, h)]
    : mode === "gemini" ? [() => geminiGenerate(prompt)]
    : [() => openAiGenerate(prompt, w, h), () => geminiGenerate(prompt)]; // auto

  const failures: string[] = [];
  const names = mode === "openai" ? ["openai"] : mode === "gemini" ? ["gemini"] : ["openai", "gemini"];
  for (let i = 0; i < attempts.length; i++) {
    try {
      const r = await attempts[i]();
      if (r) return r;
      failures.push(`${names[i]}: بلا نتيجة`);
    } catch (e) {
      // نلتقط كود الحالة فقط (مثل OpenAI 403) — لا رؤوس ولا مفاتيح
      const msg = e instanceof Error ? e.message : "خطأ";
      failures.push(msg.replace(/Bearer\s+\S+/gi, "").slice(0, 60));
      console.error("[image-provider]", msg);
    }
  }
  const failureNote = failures.join(" | ") || undefined;
  // احتياط auto القائم: Pollinations ثم mock — التطبيق لا ينهار بلا مفاتيح
  if (mode === "auto") {
    try {
      return { ...pollinationsGenerate(prompt, w, h), failureNote };
    } catch { /* fallthrough */ }
  }
  return { ...mockGenerate(w, h), failureNote };
}
