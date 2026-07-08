import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest } from "@/lib/api";

// توليد الصور عبر مزودين خارجيين قد يستغرق حتى دقيقة
export const maxDuration = 60;

const schema = z.object({
  description: z.string().min(5),
  visualType: z.enum(["image", "chart", "mindmap", "infographic"]).default("image"),
  chartType: z.string().optional(),
  style: z.string().optional(),
  dimensions: z.string().optional(),
  channel: z.string().optional(),
  // طلب تعديل على مرئي سبق إنشاؤه — يُطبق على البيانات والتصميم معاً
  editInstruction: z.string().max(500).optional(),
  // البنية الحالية للرسم — التعديل يُطبَّق عليها بدل إعادة التوليد من الصفر
  previousVisual: z.object({ type: z.string(), chartType: z.string().optional(), data: z.unknown() }).optional(),
});

// ── Types ─────────────────────────────────────────────────────────────────

interface ChartData {
  title: string;
  yLabel: string;
  data: { label: string; value: number }[];
}

interface MindMapData {
  title?: string;
  center: string;
  branches: { label: string; sub1?: string; sub2?: string }[];
}

interface InfographicData {
  title: string;
  subtitle: string;
  sections: { heading: string; line1: string; line2: string; line3?: string; stat?: string }[];
  source: string;
}

// ── Anthropic helper ──────────────────────────────────────────────────────

async function callClaude(
  apiKey: string,
  model: string,
  maxTokens: number,
  prompt: string
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Claude API ${res.status}`);
  const payload = (await res.json()) as { content?: { type: string; text: string }[] };
  return payload.content?.find((c) => c.type === "text")?.text?.trim() ?? "";
}

function parseJson<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(cleaned) as T;
}

// ── AI image providers: Nano Banana (Gemini) → OpenAI → Pollinations ──────
// يُستخدم المزود المتاح حسب مفاتيح البيئة، مع الرجوع للمحرك الداخلي إن غابت.

async function nanoBananaImage(prompt: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) return null;
  // النموذج الأساسي ثم البديل — أسماء إصدارات Google تتغير
  const models = ["gemini-2.5-flash-image", "gemini-2.5-flash-image-preview"];
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
    return part?.inlineData?.data
      ? `data:${part.inlineData.mimeType ?? "image/png"};base64,${part.inlineData.data}`
      : null;
  }
  return null;
}

async function openAiImage(prompt: string, w: number, h: number): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const size = w > h ? "1536x1024" : h > w ? "1024x1536" : "1024x1024";
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({ model: "gpt-image-1", prompt, size, quality: "medium", output_format: "jpeg" }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}`);
  const data = (await res.json()) as { data?: { b64_json?: string }[] };
  const b64 = data.data?.[0]?.b64_json;
  return b64 ? `data:image/jpeg;base64,${b64}` : null;
}

async function providerImage(prompt: string, w: number, h: number): Promise<string | null> {
  try {
    const g = await nanoBananaImage(prompt);
    if (g) return g;
  } catch (e) {
    console.error("[image][nanobanana]", e);
  }
  try {
    const o = await openAiImage(prompt, w, h);
    if (o) return o;
  } catch (e) {
    console.error("[image][openai]", e);
  }
  return null;
}

// وصف بنية الخريطة الذهنية للمزود — النصوص تُكتب حرفياً كما ولّدها المحرك
function mindMapImagePrompt(d: MindMapData): string {
  const branches = (d.branches || [])
    .slice(0, 5)
    .map((b, i) => `${i + 1}. "${b.label}"${b.sub1 ? ` — فرع فرعي: "${b.sub1}"` : ""}${b.sub2 ? ` و"${b.sub2}"` : ""}`)
    .join("\n");
  return `أنشئ صورة خريطة ذهنية إشعاعية احترافية عالية الدقة باللغة العربية (اتجاه RTL).
العنوان أعلى الصورة: "${d.title ?? d.center}"
الدائرة المركزية تحتوي: "${d.center}"
خمسة فروع رئيسية حول المركز:
${branches}
المواصفات الإلزامية: خلفية بيضاء نظيفة، عقد بيضاوية بحدود خضراء (اللون #25935F)، خطوط ربط منحنية أنيقة، خط عربي كبير وواضح ومقروء تماماً، بدون قصّ أو تشويه لأي نص، تصميم مؤسسي رسمي، دقة عالية جداً.
اكتب كل النصوص العربية أعلاه حرفياً كما هي دون أي تغيير أو اختصار.`;
}

// وصف بنية الإنفوغراف للمزود
function infographicImagePrompt(d: InfographicData): string {
  const sections = (d.sections || [])
    .slice(0, 4)
    .map((s, i) => `${i + 1}. العنوان: "${s.heading}" — ${s.line1}${s.line2 ? ` — ${s.line2}` : ""}${s.stat ? ` (${s.stat})` : ""}`)
    .join("\n");
  return `أنشئ صورة إنفوغراف عمودي احترافي عالي الدقة باللغة العربية (اتجاه RTL).
العنوان الرئيسي أعلى الصورة: "${d.title}"
العنوان الفرعي: "${d.subtitle}"
أربعة أقسام مرتبة عمودياً:
${sections}
أسفل الصورة: "${d.source}"
المواصفات الإلزامية: تدرج أخضر مؤسسي (#166A45 إلى #25935F) في الترويسة، بطاقات بيضاء نظيفة بحدود خفيفة، أيقونات خطية بسيطة لكل قسم، خط عربي كبير وواضح ومقروء تماماً بدون قصّ أو تشويه، تصميم رسمي راقٍ، دقة عالية جداً.
اكتب كل النصوص العربية أعلاه حرفياً كما هي دون أي تغيير أو اختصار.`;
}

// ── SVG renderers (programmatic — no AI coordinates) ─────────────────────

// DGA Madkhel exact tokens (design.dga.gov.sa/guidelines)
const FONT       = "IBM Plex Sans Arabic,Tahoma,Arial,sans-serif";
const PALM       = "#25935F"; // SA-500 — brand primary
const PALM_DARK  = "#1B8354"; // SA-600
const PALM_DEEP  = "#166A45"; // SA-700
const MINT       = "#F3FCF6"; // SA-50
const MINT_DEEP  = "#DFF6E7"; // SA-100
const INK        = "#0D121C"; // Gray-950 — primary text
const INK_SEC    = "#384250"; // Gray-700
const INK_TER    = "#4D5761"; // Gray-600
const LINE       = "#E5E7EB"; // Gray-200 — borders
const CANVAS_BG  = "#F4F7F6"; // page background
// Chart bar palette — distinct DGA brand hues for multi-series data
const BAR_COLORS = [PALM, "#DBA102", "#80519F", "#2E90FA", PALM_DARK, PALM_DEEP];

// Truncate Arabic text to max chars, appending ellipsis
function trunc(s: string, max: number): string {
  if (!s) return "";
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

// Full word-wrap: returns ALL lines — no truncation, no data loss
function wrapFull(s: string, maxPerLine: number): string[] {
  const words = (s || "").trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const candidate = cur ? `${cur} ${w}` : w;
    if (candidate.length > maxPerLine && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = candidate;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

// Wrap text into up to two lines at word boundaries — no mid-word cuts
function wrap2(s: string, maxPerLine: number): string[] {
  const t = (s || "").trim();
  if (t.length <= maxPerLine) return [t];
  const words = t.split(/\s+/);
  let line1 = "";
  for (const w of words) {
    const candidate = line1 ? `${line1} ${w}` : w;
    if (candidate.length > maxPerLine && line1) break;
    line1 = candidate;
  }
  const rest = t.slice(line1.length).trim();
  if (!rest) return [line1];
  return [line1, trunc(rest, maxPerLine)];
}

// ── Charts: 1200×628 (16:9, matches LinkedIn / Twitter / YouTube) ─────────

function renderBarChartSvg(d: ChartData): string {
  const W = 1200, H = 628, ML = 90, MR = 40, MT = 100, MB = 110;
  const cW = W - ML - MR, cH = H - MT - MB;
  const items = d.data.slice(0, 6);
  const maxVal = (Math.max(...items.map((x) => x.value)) || 1) * 1.25;
  const step = cW / items.length;
  const bw = Math.floor(step * 0.52);
  const toY = (v: number) => MT + cH - Math.round((v / maxVal) * cH);
  const bx = (i: number) => ML + i * step + Math.floor((step - bw) / 2);

  const gridLines = [0, 1, 2, 3, 4].map((i) => {
    const v = Math.round((maxVal * i) / 4);
    const y = toY(v);
    return `<line x1="${ML}" y1="${y}" x2="${W - MR}" y2="${y}" stroke="${LINE}" stroke-width="1"/>
<text x="${ML - 10}" y="${y + 5}" text-anchor="end" font-family="${FONT}" font-size="14" fill="${INK_TER}">${v}</text>`;
  }).join("\n");

  const bars = items.map((item, i) => {
    const x = bx(i), y = toY(item.value), bh = H - MB - y;
    return `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="${BAR_COLORS[i % BAR_COLORS.length]}" rx="4"/>
<text x="${x + bw / 2}" y="${y - 9}" text-anchor="middle" font-family="${FONT}" font-size="14" font-weight="600" fill="${INK}">${item.value}</text>
<text x="${x + bw / 2}" y="${H - MB + 22}" text-anchor="middle" font-family="${FONT}" font-size="13" fill="${INK_SEC}">${trunc(item.label, 10)}</text>`;
  }).join("\n");

  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<rect width="${W}" height="${H}" fill="${CANVAS_BG}"/>
<text x="${W / 2}" y="52" text-anchor="middle" font-family="${FONT}" font-size="22" font-weight="600" fill="${INK}">${trunc(d.title, 36)}</text>
<text x="${W / 2}" y="78" text-anchor="middle" font-family="${FONT}" font-size="14" fill="${INK_TER}">${trunc(d.yLabel, 40)}</text>
${gridLines}
<line x1="${ML}" y1="${MT}" x2="${ML}" y2="${H - MB}" stroke="${LINE}" stroke-width="1.5"/>
<line x1="${ML}" y1="${H - MB}" x2="${W - MR}" y2="${H - MB}" stroke="${LINE}" stroke-width="1.5"/>
${bars}
</svg>`;
}

function renderLineChartSvg(d: ChartData): string {
  const W = 1200, H = 628, ML = 90, MR = 40, MT = 100, MB = 110;
  const cW = W - ML - MR, cH = H - MT - MB;
  const items = d.data.slice(0, 6);
  const maxVal = (Math.max(...items.map((x) => x.value)) || 1) * 1.25;
  const gapX = cW / Math.max(items.length - 1, 1);
  const toX = (i: number) => ML + i * gapX;
  const toY = (v: number) => MT + cH - Math.round((v / maxVal) * cH);

  const gridLines = [0, 1, 2, 3, 4].map((i) => {
    const v = Math.round((maxVal * i) / 4);
    const y = toY(v);
    return `<line x1="${ML}" y1="${y}" x2="${W - MR}" y2="${y}" stroke="${LINE}" stroke-width="1"/>
<text x="${ML - 10}" y="${y + 5}" text-anchor="end" font-family="${FONT}" font-size="14" fill="${INK_TER}">${v}</text>`;
  }).join("\n");

  const pts = items.map((it, i) => `${toX(i)},${toY(it.value)}`).join(" ");
  const fill = `${ML},${H - MB} ${pts} ${toX(items.length - 1)},${H - MB}`;

  const dots = items.map((it, i) =>
    `<circle cx="${toX(i)}" cy="${toY(it.value)}" r="6" fill="${CANVAS_BG}" stroke="${PALM}" stroke-width="3"/>
<text x="${toX(i)}" y="${toY(it.value) - 14}" text-anchor="middle" font-family="${FONT}" font-size="13" font-weight="600" fill="${INK}">${it.value}</text>
<text x="${toX(i)}" y="${H - MB + 22}" text-anchor="middle" font-family="${FONT}" font-size="13" fill="${INK_SEC}">${trunc(it.label, 10)}</text>`
  ).join("\n");

  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<rect width="${W}" height="${H}" fill="${CANVAS_BG}"/>
<text x="${W / 2}" y="52" text-anchor="middle" font-family="${FONT}" font-size="22" font-weight="600" fill="${INK}">${trunc(d.title, 36)}</text>
<text x="${W / 2}" y="78" text-anchor="middle" font-family="${FONT}" font-size="14" fill="${INK_TER}">${trunc(d.yLabel, 40)}</text>
${gridLines}
<line x1="${ML}" y1="${MT}" x2="${ML}" y2="${H - MB}" stroke="${LINE}" stroke-width="1.5"/>
<line x1="${ML}" y1="${H - MB}" x2="${W - MR}" y2="${H - MB}" stroke="${LINE}" stroke-width="1.5"/>
<polygon points="${fill}" fill="${PALM}" opacity="0.07"/>
<polyline points="${pts}" fill="none" stroke="${PALM}" stroke-width="3" stroke-linejoin="round"/>
${dots}
</svg>`;
}

function renderAreaChartSvg(d: ChartData): string {
  const W = 1200, H = 628, ML = 90, MR = 40, MT = 100, MB = 110;
  const cW = W - ML - MR, cH = H - MT - MB;
  const items = d.data.slice(0, 6);
  const maxVal = (Math.max(...items.map((x) => x.value)) || 1) * 1.25;
  const gapX = cW / Math.max(items.length - 1, 1);
  const toX = (i: number) => ML + i * gapX;
  const toY = (v: number) => MT + cH - Math.round((v / maxVal) * cH);

  const gridLines = [0, 1, 2, 3, 4].map((i) => {
    const v = Math.round((maxVal * i) / 4);
    const y = toY(v);
    return `<line x1="${ML}" y1="${y}" x2="${W - MR}" y2="${y}" stroke="${LINE}" stroke-width="1"/>
<text x="${ML - 10}" y="${y + 5}" text-anchor="end" font-family="${FONT}" font-size="14" fill="${INK_TER}">${v}</text>`;
  }).join("\n");

  const pts = items.map((it, i) => `${toX(i)},${toY(it.value)}`).join(" ");
  const fill = `${ML},${H - MB} ${pts} ${toX(items.length - 1)},${H - MB}`;

  const dots = items.map((it, i) =>
    `<circle cx="${toX(i)}" cy="${toY(it.value)}" r="6" fill="${PALM}" stroke="${CANVAS_BG}" stroke-width="2.5"/>
<text x="${toX(i)}" y="${toY(it.value) - 14}" text-anchor="middle" font-family="${FONT}" font-size="13" font-weight="600" fill="${INK}">${it.value}</text>
<text x="${toX(i)}" y="${H - MB + 22}" text-anchor="middle" font-family="${FONT}" font-size="13" fill="${INK_SEC}">${trunc(it.label, 10)}</text>`
  ).join("\n");

  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<rect width="${W}" height="${H}" fill="${CANVAS_BG}"/>
<text x="${W / 2}" y="52" text-anchor="middle" font-family="${FONT}" font-size="22" font-weight="600" fill="${INK}">${trunc(d.title, 36)}</text>
<text x="${W / 2}" y="78" text-anchor="middle" font-family="${FONT}" font-size="14" fill="${INK_TER}">${trunc(d.yLabel, 40)}</text>
${gridLines}
<line x1="${ML}" y1="${MT}" x2="${ML}" y2="${H - MB}" stroke="${LINE}" stroke-width="1.5"/>
<line x1="${ML}" y1="${H - MB}" x2="${W - MR}" y2="${H - MB}" stroke="${LINE}" stroke-width="1.5"/>
<polygon points="${fill}" fill="${PALM}" opacity="0.12"/>
<polyline points="${pts}" fill="none" stroke="${PALM}" stroke-width="3" stroke-linejoin="round"/>
${dots}
</svg>`;
}

function renderHBarChartSvg(d: ChartData): string {
  const W = 1200, H = 628, ML = 200, MR = 100, MT = 100, MB = 60;
  const cW = W - ML - MR, cH = H - MT - MB;
  const items = d.data.slice(0, 6);
  const maxVal = (Math.max(...items.map((x) => x.value)) || 1) * 1.25;
  const step = cH / items.length;
  const bh = Math.floor(step * 0.5);
  const toW = (v: number) => Math.round((v / maxVal) * cW);
  const by = (i: number) => MT + i * step + Math.floor((step - bh) / 2);

  const gridLines = [0, 1, 2, 3, 4].map((i) => {
    const v = Math.round((maxVal * i) / 4);
    const x = ML + toW(v);
    return `<line x1="${x}" y1="${MT}" x2="${x}" y2="${H - MB}" stroke="${LINE}" stroke-width="1"/>
<text x="${x}" y="${H - MB + 20}" text-anchor="middle" font-family="${FONT}" font-size="13" fill="${INK_TER}">${v}</text>`;
  }).join("\n");

  const bars = items.map((item, i) => {
    const y = by(i), barW = toW(item.value);
    return `<rect x="${ML}" y="${y}" width="${barW}" height="${bh}" fill="${BAR_COLORS[i % BAR_COLORS.length]}" rx="4"/>
<text x="${ML + barW + 8}" y="${y + bh / 2 + 5}" text-anchor="start" font-family="${FONT}" font-size="14" font-weight="600" fill="${INK}">${item.value}</text>
<text x="${ML - 12}" y="${y + bh / 2 + 5}" text-anchor="end" font-family="${FONT}" font-size="13" fill="${INK_SEC}">${trunc(item.label, 12)}</text>`;
  }).join("\n");

  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<rect width="${W}" height="${H}" fill="${CANVAS_BG}"/>
<text x="${W / 2}" y="52" text-anchor="middle" font-family="${FONT}" font-size="22" font-weight="600" fill="${INK}">${trunc(d.title, 36)}</text>
<text x="${W / 2}" y="78" text-anchor="middle" font-family="${FONT}" font-size="14" fill="${INK_TER}">${trunc(d.yLabel, 40)}</text>
${gridLines}
<line x1="${ML}" y1="${MT}" x2="${ML}" y2="${H - MB}" stroke="${LINE}" stroke-width="1.5"/>
${bars}
</svg>`;
}

function renderPieOrDonutSvg(d: ChartData, isDonut: boolean): string {
  // Square 1080×1080 — matches Instagram square
  const W = 1080, H = 1080;
  const cx = 540, cy = 520, R = 280, ri = isDonut ? 140 : 0;
  const items = d.data.slice(0, 6);
  const total = items.reduce((s, x) => s + x.value, 0) || 1;

  let angle = -Math.PI / 2;
  const slices = items.map((item, i) => {
    const frac = item.value / total;
    const start = angle;
    angle += frac * 2 * Math.PI;
    const end = angle;
    const x1 = cx + R * Math.cos(start), y1 = cy + R * Math.sin(start);
    const x2 = cx + R * Math.cos(end), y2 = cy + R * Math.sin(end);
    const large = frac > 0.5 ? 1 : 0;
    const pct = Math.round(frac * 100);
    const lAngle = start + (frac * Math.PI);
    const lx = cx + (R * 0.68) * Math.cos(lAngle);
    const ly = cy + (R * 0.68) * Math.sin(lAngle);

    if (isDonut) {
      const ix1 = cx + ri * Math.cos(end), iy1 = cy + ri * Math.sin(end);
      const ix2 = cx + ri * Math.cos(start), iy2 = cy + ri * Math.sin(start);
      return `<path d="M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${ri} ${ri} 0 ${large} 0 ${ix2} ${iy2} Z" fill="${BAR_COLORS[i]}" stroke="#fff" stroke-width="3"/>
${pct >= 7 ? `<text x="${lx}" y="${ly + 6}" text-anchor="middle" font-family="${FONT}" font-size="18" font-weight="600" fill="#fff">${pct}%</text>` : ""}`;
    }
    return `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z" fill="${BAR_COLORS[i]}" stroke="#fff" stroke-width="3"/>
${pct >= 5 ? `<text x="${lx}" y="${ly + 6}" text-anchor="middle" font-family="${FONT}" font-size="18" font-weight="600" fill="#fff">${pct}%</text>` : ""}`;
  });

  const legendY = 870;
  const legend = items.map((item, i) => {
    const lx = 120 + Math.floor(i / 3) * 500;
    const ly = legendY + (i % 3) * 42;
    return `<rect x="${lx}" y="${ly}" width="22" height="22" rx="4" fill="${BAR_COLORS[i]}"/>
<text x="${lx + 32}" y="${ly + 16}" font-family="${FONT}" font-size="16" fill="${INK_SEC}">${trunc(item.label, 14)}: ${item.value}</text>`;
  }).join("\n");

  const center = isDonut
    ? `<circle cx="${cx}" cy="${cy}" r="${ri - 4}" fill="${CANVAS_BG}"/>
<text x="${cx}" y="${cy - 12}" text-anchor="middle" font-family="${FONT}" font-size="44" font-weight="600" fill="${PALM}">${Math.round((items[0].value / total) * 100)}%</text>
<text x="${cx}" y="${cy + 22}" text-anchor="middle" font-family="${FONT}" font-size="18" fill="${INK_SEC}">${trunc(items[0].label, 12)}</text>`
    : "";

  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<rect width="${W}" height="${H}" fill="${CANVAS_BG}"/>
<text x="${W / 2}" y="60" text-anchor="middle" font-family="${FONT}" font-size="26" font-weight="600" fill="${INK}">${trunc(d.title, 32)}</text>
${slices.join("\n")}
${center}
${legend}
</svg>`;
}

function renderChartSvg(data: ChartData, chartType: string): string {
  const t = chartType.toLowerCase();
  if (t.includes("خطي") || t.includes("line")) return renderLineChartSvg(data);
  if (t.includes("مساحة") || t.includes("area")) return renderAreaChartSvg(data);
  if (t.includes("أفقية") || t.includes("hbar") || t.includes("h-bar")) return renderHBarChartSvg(data);
  if (t.includes("دائري") || t.includes("pie")) return renderPieOrDonutSvg(data, false);
  if (t.includes("حلقي") || t.includes("donut")) return renderPieOrDonutSvg(data, true);
  return renderBarChartSvg(data);
}

// ── Mind map: 1240×dynamic — RTL horizontal tree ──────────────────────────
// الجذر يمين، الفروع عمود أوسط، التفاصيل عمود يسار. لا قصّ للنصوص إطلاقاً:
// كل عقدة تلتفّ أسطراً كاملة ويتكيّف حجمها وارتفاع اللوحة مع المحتوى.

// Per-branch accent hues — same brand palette already used by the charts
const MM_ACCENTS = [PALM, "#DBA102", "#80519F", "#2E90FA", PALM_DARK];

// Average Arabic glyph width ≈ 0.56 × font-size (IBM Plex Sans Arabic)
function mmCharW(fontSize: number): number {
  return fontSize * 0.56;
}

// Centered multi-line <text> block around a vertical midpoint
function mmText(
  x: number, cyMid: number, lines: string[], fontSize: number, lineH: number,
  weight: number, fill: string, anchor: "middle" | "end" = "middle"
): string {
  const y0 = cyMid - ((lines.length - 1) * lineH) / 2 + fontSize * 0.35;
  const tspans = lines.slice(1).map((l) => `<tspan x="${x}" dy="${lineH}">${l}</tspan>`).join("");
  return `<text x="${x}" y="${Math.round(y0)}" text-anchor="${anchor}" font-family="${FONT}" font-size="${fontSize}" font-weight="${weight}" fill="${fill}">${lines[0]}${tspans}</text>`;
}

function renderMindMapSvg(d: MindMapData): string {
  const W = 1240;
  const branches = (d.branches || []).slice(0, 5);

  // Node metrics per level: [fontSize, lineHeight, maxWidth, padX, padY, minWidth]
  const ROOT = { fs: 20, lh: 30, maxW: 260, padX: 22, padY: 17, minW: 170 };
  const BR   = { fs: 17, lh: 26, maxW: 320, padX: 20, padY: 14, minW: 150 };
  const SUB  = { fs: 14.5, lh: 22, maxW: 340, padX: 18, padY: 11, minW: 130 };

  type NodeBox = { lines: string[]; w: number; h: number };
  const measure = (text: string, m: typeof ROOT): NodeBox => {
    const cw = mmCharW(m.fs);
    const maxChars = Math.floor((m.maxW - 2 * m.padX) / cw);
    const lines = wrapFull(text, Math.max(maxChars, 8));
    const longest = Math.max(...lines.map((l) => l.length));
    const w = Math.max(m.minW, Math.min(m.maxW, Math.ceil(longest * cw) + 2 * m.padX));
    const h = lines.length * m.lh + 2 * m.padY;
    return { lines, w, h };
  };

  const rootBox = measure(d.center || d.title || "", ROOT);
  const branchBoxes = branches.map((b) => measure(b.label, BR));
  const subBoxes = branches.map((b) =>
    ([b.sub1, b.sub2].filter(Boolean) as string[]).map((s) => measure(s, SUB))
  );

  // Header — wraps instead of truncating; band grows for two lines
  const hLines = wrapFull(d.title || d.center || "", 78);
  const HDR = hLines.length > 1 ? 132 : 96;

  // Vertical rhythm: each branch group = branch node + its sub nodes
  const SUB_GAP = 14, GROUP_GAP = 38, TOP_PAD = 54, BOT_PAD = 54;
  const groupHs = branches.map((_, i) => {
    const subsTotal = subBoxes[i].reduce((acc, s) => acc + s.h, 0)
      + Math.max(subBoxes[i].length - 1, 0) * SUB_GAP;
    return Math.max(branchBoxes[i].h, subsTotal);
  });
  const contentH = groupHs.reduce((a, b) => a + b, 0) + Math.max(branches.length - 1, 0) * GROUP_GAP;
  const H = Math.max(HDR + TOP_PAD + contentH + BOT_PAD, HDR + TOP_PAD + rootBox.h + BOT_PAD, 560);

  // Columns (right-anchored — RTL): root | branches | subs
  const rootRight = W - 56;
  const branchRight = 830;
  const subRight = 420;

  const rootCy = HDR + TOP_PAD + Math.max(contentH, rootBox.h) / 2;
  const rootLeft = rootRight - rootBox.w;

  const connectors: string[] = [];
  const nodes: string[] = [];

  let yCursor = HDR + TOP_PAD;
  branches.forEach((b, i) => {
    const acc = MM_ACCENTS[i % MM_ACCENTS.length];
    const gH = groupHs[i];
    const gy = Math.round(yCursor + gH / 2);
    const bb = branchBoxes[i];
    const bLeft = branchRight - bb.w;

    // root → branch: smooth horizontal bezier
    connectors.push(
      `<path d="M ${rootLeft} ${Math.round(rootCy)} C ${rootLeft - 70} ${Math.round(rootCy)}, ${branchRight + 70} ${gy}, ${branchRight} ${gy}" fill="none" stroke="${acc}" stroke-width="2.5" stroke-linecap="round" opacity="0.7"/>`
    );

    // branch node: white card, accent border + soft accent tint, junction dot
    const bRx = bb.lines.length === 1 ? Math.round(bb.h / 2) : 18;
    nodes.push(
      `<g filter="url(#cardShad)">
<rect x="${bLeft}" y="${gy - Math.round(bb.h / 2)}" width="${bb.w}" height="${bb.h}" rx="${bRx}" fill="#FFFFFF"/>
<rect x="${bLeft}" y="${gy - Math.round(bb.h / 2)}" width="${bb.w}" height="${bb.h}" rx="${bRx}" fill="${acc}" opacity="0.08"/>
<rect x="${bLeft}" y="${gy - Math.round(bb.h / 2)}" width="${bb.w}" height="${bb.h}" rx="${bRx}" fill="none" stroke="${acc}" stroke-opacity="0.6" stroke-width="1.8"/>
</g>
${mmText(branchRight - Math.round(bb.w / 2), gy, bb.lines, BR.fs, BR.lh, 600, INK)}
<circle cx="${branchRight}" cy="${gy}" r="4.5" fill="${acc}" stroke="#FFFFFF" stroke-width="1.5"/>`
    );

    // sub nodes stacked and centered within the group
    const sbs = subBoxes[i];
    const subsTotal = sbs.reduce((acc2, s) => acc2 + s.h, 0) + Math.max(sbs.length - 1, 0) * SUB_GAP;
    let sy = gy - subsTotal / 2;
    sbs.forEach((sb) => {
      const scy = Math.round(sy + sb.h / 2);
      const sLeft = subRight - sb.w;
      connectors.push(
        `<path d="M ${bLeft} ${gy} C ${bLeft - 50} ${gy}, ${subRight + 50} ${scy}, ${subRight} ${scy}" fill="none" stroke="${acc}" stroke-width="1.8" stroke-linecap="round" opacity="0.5"/>`
      );
      nodes.push(
        `<g filter="url(#cardShad)"><rect x="${sLeft}" y="${scy - Math.round(sb.h / 2)}" width="${sb.w}" height="${sb.h}" rx="12" fill="#FFFFFF" stroke="${LINE}" stroke-width="1.2"/></g>
<circle cx="${subRight - 14}" cy="${scy}" r="3.5" fill="${acc}"/>
${mmText(subRight - Math.round(sb.w / 2) - 6, scy, sb.lines, SUB.fs, SUB.lh, 400, INK_SEC)}`
      );
      sy += sb.h + SUB_GAP;
    });

    yCursor += gH + GROUP_GAP;
  });

  // Root node — gradient card, fully wrapped text
  const rootRx = rootBox.lines.length === 1 ? Math.round(rootBox.h / 2) : 22;
  const rootNode = `<g filter="url(#rootShad)">
<rect x="${rootLeft}" y="${Math.round(rootCy - rootBox.h / 2)}" width="${rootBox.w}" height="${rootBox.h}" rx="${rootRx}" fill="url(#rootGrad)"/>
<rect x="${rootLeft + 4}" y="${Math.round(rootCy - rootBox.h / 2) + 4}" width="${rootBox.w - 8}" height="${rootBox.h - 8}" rx="${Math.max(rootRx - 4, 8)}" fill="none" stroke="#FFFFFF" stroke-width="1.2" opacity="0.25"/>
</g>
${mmText(rootRight - Math.round(rootBox.w / 2), Math.round(rootCy), rootBox.lines, ROOT.fs, ROOT.lh, 700, "#FFFFFF")}`;

  const headerText = hLines.length === 1
    ? `<text x="${W / 2}" y="${Math.round(HDR * 0.62)}" text-anchor="middle" font-family="${FONT}" font-size="24" font-weight="700" fill="#fff">${hLines[0]}</text>`
    : `<text x="${W / 2}" y="${Math.round(HDR * 0.42)}" text-anchor="middle" font-family="${FONT}" font-size="23" font-weight="700" fill="#fff">${hLines[0]}<tspan x="${W / 2}" dy="32">${hLines.slice(1).join(" ")}</tspan></text>`;

  return `<svg width="100%" viewBox="0 0 ${W} ${Math.round(H)}" xmlns="http://www.w3.org/2000/svg" direction="rtl">
<defs>
  <pattern id="dotGrid" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
    <circle cx="14" cy="14" r="1" fill="${PALM}" opacity="0.06"/>
  </pattern>
  <linearGradient id="mmHdr" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="${PALM_DEEP}"/>
    <stop offset="100%" stop-color="${PALM}"/>
  </linearGradient>
  <linearGradient id="rootGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="${PALM}"/>
    <stop offset="100%" stop-color="${PALM_DEEP}"/>
  </linearGradient>
  <filter id="cardShad" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="${INK}" flood-opacity="0.10"/>
  </filter>
  <filter id="rootShad" x="-25%" y="-25%" width="150%" height="150%">
    <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="${PALM_DEEP}" flood-opacity="0.30"/>
  </filter>
</defs>
<rect width="${W}" height="${Math.round(H)}" fill="${CANVAS_BG}"/>
<rect width="${W}" height="${Math.round(H)}" fill="url(#dotGrid)"/>
<rect width="${W}" height="${HDR}" fill="url(#mmHdr)"/>
${headerText}
${connectors.join("\n")}
${nodes.join("\n")}
${rootNode}
</svg>`;
}

// ── Infographic: 1080×dynamic portrait — safe for all platforms ───────────

function renderInfographicSvg(d: InfographicData): string {
  // إنفوغراف عمودي عالي الجودة: التفاف كامل للنصوص بلا قصّ، ارتفاعات متكيفة،
  // لون مميز لكل قسم من لوحة العلامة، وظلال بطاقات — بنفس مستوى الخريطة الذهنية.
  const W = 1080, PAD = 56;
  const ACCENTS = MM_ACCENTS;
  const CARD_W = W - 2 * PAD;
  const BAR_W = 10;
  const TR = W - PAD - 34;              // مرساة النص يمين (RTL) داخل البطاقة
  const textMax = CARD_W - 34 - 120;    // مساحة النص: نطرح الشريط ورقم الخلفية

  const chars = (fs: number) => Math.max(Math.floor(textMax / (fs * 0.56)), 12);
  const sections = (d.sections || []).slice(0, 4);

  // الترويسة والعنوان الفرعي يلتفان بدل القص
  const titleLines = wrapFull(d.title, Math.floor((W - 160) / (30 * 0.56)));
  const HEADER_H = 96 + titleLines.length * 42;
  const subLines = wrapFull(d.subtitle, Math.floor((W - 160) / (16 * 0.56)));
  const SUB_H = 40 + subLines.length * 26;

  // قياس كل قسم حسب محتواه الفعلي
  type Sec = { heading: string[]; lines: string[][]; stat: string; h: number };
  const measured: Sec[] = sections.map((sec) => {
    const heading = wrapFull(sec.heading, chars(20));
    const lines = [sec.line1, sec.line2, sec.line3].filter(Boolean).map((l) => wrapFull(l as string, chars(14.5)));
    const bodyLines = lines.reduce((a, l) => a + l.length, 0);
    const h = Math.max(26 + heading.length * 30 + 10 + bodyLines * 25 + (sec.stat ? 34 : 0) + 26, 150);
    return { heading, lines, stat: sec.stat ?? "", h };
  });

  const GAP = 24;
  const srcLines = wrapFull(d.source, 70);
  const FOOTER_H = 40 + srcLines.length * 22;
  const bodyH = measured.reduce((a, m) => a + m.h, 0) + GAP * (measured.length + 1);
  const H = HEADER_H + SUB_H + bodyH + FOOTER_H;

  let y = HEADER_H + SUB_H + GAP;
  const blocks = measured.map((m, i) => {
    const ac = ACCENTS[i % ACCENTS.length];
    const y0 = y;
    y += m.h + GAP;
    let ty = y0 + 26 + 20;
    const headingText = `<text x="${TR}" y="${ty}" text-anchor="end" font-family="${FONT}" font-size="20" font-weight="700" fill="${INK}">${m.heading[0]}${m.heading.slice(1).map(() => "").join("")}${m.heading.slice(1).map((l) => `<tspan x="${TR}" dy="30">${l}</tspan>`).join("")}</text>`;
    ty += (m.heading.length - 1) * 30 + 10;
    const bodyText = m.lines.map((wrapped) => {
      const first = ty + 25;
      const t = `<text x="${TR}" y="${first}" text-anchor="end" font-family="${FONT}" font-size="14.5" fill="${INK_SEC}">${wrapped[0]}${wrapped.slice(1).map((l) => `<tspan x="${TR}" dy="25">${l}</tspan>`).join("")}</text>`;
      ty = first + (wrapped.length - 1) * 25;
      return t;
    }).join("\n");
    const statText = m.stat
      ? `<text x="${TR}" y="${ty + 32}" text-anchor="end" font-family="${FONT}" font-size="15" font-weight="700" fill="${ac}">${m.stat}</text>`
      : "";
    return `<g filter="url(#infShad)"><rect x="${PAD}" y="${y0}" width="${CARD_W}" height="${m.h}" rx="16" fill="#FFFFFF" stroke="${LINE}" stroke-width="1"/></g>
<rect x="${W - PAD - BAR_W}" y="${y0}" width="${BAR_W}" height="${m.h}" rx="5" fill="${ac}"/>
<text x="${PAD + 64}" y="${y0 + m.h / 2 + 30}" text-anchor="middle" font-family="${FONT}" font-size="92" font-weight="700" fill="${ac}" opacity="0.09">${i + 1}</text>
${headingText}
${bodyText}
${statText}`;
  }).join("\n");

  const titleText = `<text x="${W / 2}" y="${64 + 21}" text-anchor="middle" font-family="${FONT}" font-size="30" font-weight="700" fill="#fff">${titleLines[0]}${titleLines.slice(1).map((l) => `<tspan x="${W / 2}" dy="42">${l}</tspan>`).join("")}</text>`;
  const subText = `<text x="${W / 2}" y="${HEADER_H + 34}" text-anchor="middle" font-family="${FONT}" font-size="16" fill="${PALM_DARK}">${subLines[0]}${subLines.slice(1).map((l) => `<tspan x="${W / 2}" dy="26">${l}</tspan>`).join("")}</text>`;
  const footerY = H - FOOTER_H;
  const srcText = `<text x="${W / 2}" y="${footerY + 30}" text-anchor="middle" font-family="${FONT}" font-size="12.5" fill="${INK_TER}">${srcLines[0]}${srcLines.slice(1).map((l) => `<tspan x="${W / 2}" dy="22">${l}</tspan>`).join("")}</text>`;

  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="hdrGrad" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="${PALM_DEEP}"/>
    <stop offset="100%" stop-color="${PALM}"/>
  </linearGradient>
  <filter id="infShad" x="-20%" y="-20%" width="140%" height="140%">
    <feDropShadow dx="0" dy="2" stdDeviation="5" flood-color="${INK}" flood-opacity="0.08"/>
  </filter>
</defs>
<rect width="${W}" height="${H}" fill="${CANVAS_BG}"/>
<rect width="${W}" height="${HEADER_H}" fill="url(#hdrGrad)"/>
${titleText}
<rect y="${HEADER_H}" width="${W}" height="${SUB_H}" fill="${MINT}"/>
${subText}
${blocks}
<rect x="0" y="${footerY}" width="${W}" height="${FOOTER_H}" fill="${MINT}"/>
${srcText}
</svg>`;
}


// ── Data prompts ───────────────────────────────────────────────────────────

function chartDataPrompt(description: string, chartType: string): string {
  return `Generate Arabic legal chart data for: "${description}"
Chart type: ${chartType || "أعمدة (bar)"}

Return ONLY valid JSON with no markdown fences or explanation:
{
  "title": "عنوان عربي لا يتجاوز 28 حرفاً",
  "yLabel": "وحدة القياس بالعربية مثل (قضية / مليون ريال / %)",
  "data": [
    {"label": "نص عربي 5-8 أحرف", "value": 45},
    {"label": "نص عربي 5-8 أحرف", "value": 30},
    {"label": "نص عربي 5-8 أحرف", "value": 60},
    {"label": "نص عربي 5-8 أحرف", "value": 25},
    {"label": "نص عربي 5-8 أحرف", "value": 50}
  ]
}

Rules:
- Exactly 5 data items
- Labels: short Arabic (5-8 chars max), relevant to the legal topic
- Values: realistic positive integers plausible for the context
- Title: concise and informative`;
}

function mindMapDataPrompt(description: string): string {
  return `Generate an Arabic legal mind map structure for: "${description}"

Return ONLY valid JSON with no markdown fences or explanation:
{
  "title": "عنوان توضيحي للخريطة — أقصى 24 حرفاً",
  "center": "اختصار المفهوم المركزي — أقصى 13 حرفاً",
  "branches": [
    {"label": "فرع رئيسي 1 — أقصى 14 حرفاً", "sub1": "فرعي 1أ — أقصى 12 حرفاً", "sub2": "فرعي 1ب — أقصى 12 حرفاً"},
    {"label": "فرع رئيسي 2 — أقصى 14 حرفاً", "sub1": "فرعي 2أ — أقصى 12 حرفاً", "sub2": "فرعي 2ب — أقصى 12 حرفاً"},
    {"label": "فرع رئيسي 3 — أقصى 14 حرفاً", "sub1": "فرعي 3أ — أقصى 12 حرفاً", "sub2": "فرعي 3ب — أقصى 12 حرفاً"},
    {"label": "فرع رئيسي 4 — أقصى 14 حرفاً", "sub1": "فرعي 4أ — أقصى 12 حرفاً"},
    {"label": "فرع رئيسي 5 — أقصى 14 حرفاً", "sub1": "فرعي 5أ — أقصى 12 حرفاً"}
  ]
}

IMPORTANT: Strictly respect every character limit. Nodes are sized to fit exactly these limits — any longer text will be cut off visually with "…".
Rules:
- Exactly 5 main branches covering distinct legal aspects of the topic
- title: full descriptive heading displayed in the header banner ≤24 Arabic chars
- center: short core concept for the central circle ≤13 Arabic chars
- branch labels: ≤14 Arabic chars — abbreviate if needed (حق → حقوق الملكية ✗, حق الملكية ✓)
- sub-labels: ≤12 Arabic chars each
- All content must be legally accurate and topic-specific`;
}

function infographicDataPrompt(description: string): string {
  return `Generate Arabic legal infographic content for: "${description}"

Return ONLY valid JSON with no markdown fences or explanation:
{
  "title": "عنوان رئيسي عربي — أقصى 24 حرفاً",
  "subtitle": "وصف توضيحي عربي — أقصى 42 حرفاً",
  "sections": [
    {
      "heading": "عنوان القسم — أقصى 26 حرفاً",
      "line1": "نص عربي وصفي أول — أقصى 36 حرفاً",
      "line2": "نص عربي وصفي ثانٍ — أقصى 36 حرفاً",
      "line3": "نص عربي ثالث اختياري — أقصى 36 حرفاً",
      "stat": "مثال: المادة 74 — نظام العمل السعودي"
    },
    { "heading": "...", "line1": "...", "line2": "...", "stat": "..." },
    { "heading": "...", "line1": "...", "line2": "..." },
    { "heading": "...", "line1": "...", "line2": "...", "line3": "..." }
  ],
  "source": "المرجع: نظام العمل السعودي — المادة ٧٤"
}

Rules:
- Exactly 4 sections, each covering a distinct aspect of the topic
- CRITICAL: each field must NOT exceed the char limit or it will be cut off
- All text in Arabic, professional legal tone with accurate information
- stat is optional — use only when there is a real article number or statistic
- source must be a proper legal citation: the relevant Saudi law/regulation name + article number (معايير الاقتباس)
- source must NEVER contain an entity or authority name such as "وزارة العدل" or "هيئة المحامين" — cite the document, not the entity`;
}

// ── Route ──────────────────────────────────────────────────────────────────

function getDimensions(dim?: string): [number, number] {
  if (dim === "16:9") return [1280, 720];
  if (dim === "9:16") return [720, 1280];
  if (dim === "4:5") return [820, 1024];
  return [1024, 1024];
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return badRequest("المدخلات غير مكتملة");

  const { description, visualType, chartType, style, dimensions, channel, editInstruction, previousVisual } = parsed.data;

  // عند طلب تعديل: يُلحق الطلب بالوصف فيُطبق على البيانات المولدة والتصميم
  // عند وجود بنية سابقة: التعديل يُطبَّق عليها حرفياً وكل ما عداه يبقى كما هو
  const editGrounding = editInstruction?.trim() && previousVisual?.data
    ? `\n\nالبنية الحالية المعتمدة للرسم (أعد نفس هذه البيانات حرفياً مع تطبيق طلب التعديل فقط — لا تغيّر أي نص أو قيمة لم يشملها الطلب):\n${JSON.stringify(previousVisual.data)}`
    : "";
  const effectiveDescription = editInstruction?.trim()
    ? `${description}\n\nطلب تعديل من المستخدم يجب تطبيقه حرفياً على النتيجة: ${editInstruction.trim()}${editGrounding}`
    : description;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "خدمة الإنشاء غير مهيأة — تأكد من ضبط ANTHROPIC_API_KEY" },
      { status: 503 }
    );
  }

  // ── Chart ─────────────────────────────────────────────────────────────────
  if (visualType === "chart") {
    try {
      const raw = await callClaude(apiKey, "claude-haiku-4-5-20251001", 600, chartDataPrompt(effectiveDescription, chartType ?? ""));
      const data = parseJson<ChartData>(raw);
      const svgCode = renderChartSvg(data, chartType ?? "");
      // visual: بيانات البنية لتصدير PowerPoint قابل للتعديل عنصراً عنصراً
      return NextResponse.json({ svgCode, visual: { type: "chart", chartType: chartType ?? "", data } });
    } catch (e) {
      console.error("[chart]", e);
      return NextResponse.json({ error: "فشل إنشاء الرسم البياني" }, { status: 500 });
    }
  }

  // ── Mind map ──────────────────────────────────────────────────────────────
  if (visualType === "mindmap") {
    try {
      const raw = await callClaude(apiKey, "claude-haiku-4-5-20251001", 600, mindMapDataPrompt(effectiveDescription));
      const data = parseJson<MindMapData>(raw);
      // المحرك الداخلي دائماً: يتيح تصدير PowerPoint بعناصر قابلة للتعديل (لا صورة مسطحة)
      const svgCode = renderMindMapSvg(data);
      return NextResponse.json({ svgCode, visual: { type: "mindmap", data } });
    } catch (e) {
      console.error("[mindmap]", e);
      return NextResponse.json({ error: "فشل إنشاء الخريطة الذهنية" }, { status: 500 });
    }
  }

  // ── Infographic ───────────────────────────────────────────────────────────
  if (visualType === "infographic") {
    try {
      const raw = await callClaude(apiKey, "claude-haiku-4-5-20251001", 800, infographicDataPrompt(effectiveDescription));
      const data = parseJson<InfographicData>(raw);
      // المحرك الداخلي دائماً: يتيح تصدير PowerPoint بعناصر قابلة للتعديل (لا صورة مسطحة)
      const svgCode = renderInfographicSvg(data);
      return NextResponse.json({ svgCode, visual: { type: "infographic", data } });
    } catch (e) {
      console.error("[infographic]", e);
      return NextResponse.json({ error: "فشل إنشاء الإنفوغراف" }, { status: 500 });
    }
  }

  // ── Photo via Pollinations.ai ─────────────────────────────────────────────
  try {
    const promptRaw = await callClaude(
      apiKey,
      "claude-haiku-4-5-20251001",
      300,
      `Convert this Arabic legal media description into a high-quality English prompt for the Flux image generation model.
Description: ${effectiveDescription}
Style: ${style ?? "professional, clean, corporate"}
Platform: ${channel ?? "social media"}
Format: ${dimensions ?? "square"}

Rules:
- Professional corporate aesthetic — law office, justice, document, scale of justice themes
- NO human faces or identifiable people
- Soft neutral backgrounds (light grey, off-white, or pale green)
- Sharp details, clean lines, high resolution, professional studio lighting
- Add quality boosters: "sharp focus, high detail, professional photography, clean composition"
- Maximum 120 words
Output ONLY the English prompt, nothing else.`
    );
    const [w, h] = getDimensions(dimensions);
    // مزود صور خارجي (نانوبنانا / OpenAI) إن توفر مفتاحه — وإلا Flux المجاني
    const aiUrl = await providerImage(promptRaw, w, h);
    if (aiUrl) return NextResponse.json({ prompt: promptRaw, imageUrl: aiUrl });
    const seed = Date.now() % 99999;
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptRaw)}?width=${w}&height=${h}&model=flux&nologo=true&safe=true&seed=${seed}`;
    return NextResponse.json({ prompt: promptRaw, imageUrl });
  } catch (e) {
    console.error("[image]", e);
    return NextResponse.json({ error: "فشل إنشاء الصورة" }, { status: 500 });
  }
}
