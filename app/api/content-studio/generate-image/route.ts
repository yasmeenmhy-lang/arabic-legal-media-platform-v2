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
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent",
    {
      method: "POST",
      headers: { "x-goog-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    }
  );
  if (!res.ok) throw new Error(`Gemini ${res.status}`);
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[];
  };
  const part = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  return part?.inlineData?.data
    ? `data:${part.inlineData.mimeType ?? "image/png"};base64,${part.inlineData.data}`
    : null;
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

// ── Mind map: 1080×1080 (square — Instagram / general social) ─────────────

function renderMindMapSvg(d: MindMapData): string {
  const W = 1080, H = 1080;
  const HDR = 90;
  const cx = 540;
  const cy = HDR + Math.round((H - HDR) / 2); // 585 — geometric center of usable area
  // branchR=255 keeps 5 nodes (200px wide) ~100px apart — no overlap
  const branchR = 255;
  const subR = 128; // wider sub-nodes need a bit more clearance

  // DGA mint scale for branch backgrounds, palm scale for borders
  const BRANCH_BG = [MINT, MINT_DEEP, "#C5EDD6", "#A8E0C0", "#8DD4AB"];
  const BRANCH_BD = [PALM, PALM_DARK, PALM_DEEP, PALM, PALM_DARK];
  const branches = (d.branches || []).slice(0, 5);
  const BASE_ANGLES = [-90, -18, 54, 126, 198]; // degrees, 0° = rightward

  const connectors: string[] = [];
  const nodes: string[] = [];

  branches.forEach((b, i) => {
    const a = (BASE_ANGLES[i] * Math.PI) / 180;
    const bx = Math.round(cx + branchR * Math.cos(a));
    const by = Math.round(cy + branchR * Math.sin(a));
    // 200×52: holds up to 16 Arabic chars at 12px comfortably
    const bw = 200, bh = 52;

    const perpX = -Math.sin(a) * 18;
    const perpY =  Math.cos(a) * 18;
    const qx = Math.round((cx + bx) / 2 + perpX);
    const qy = Math.round((cy + by) / 2 + perpY);
    connectors.push(
      `<path d="M ${cx} ${cy} Q ${qx} ${qy} ${bx} ${by}" fill="none" stroke="${BRANCH_BD[i]}" stroke-width="2" stroke-linecap="round" opacity="0.45"/>`
    );

    // wrap to two lines instead of truncating — full labels stay readable
    const bLines = wrap2(b.label, 15);
    const bText = bLines.length === 1
      ? `<text x="${bx}" y="${by + 5}" text-anchor="middle" font-family="${FONT}" font-size="14" font-weight="600" fill="${INK}">${bLines[0]}</text>`
      : `<text x="${bx}" y="${by - 4}" text-anchor="middle" font-family="${FONT}" font-size="13" font-weight="600" fill="${INK}">${bLines[0]}<tspan x="${bx}" dy="17">${bLines[1]}</tspan></text>`;
    nodes.push(
      `<rect x="${bx - bw / 2}" y="${by - bh / 2}" width="${bw}" height="${bh}" rx="26" fill="${BRANCH_BG[i]}" stroke="${BRANCH_BD[i]}" stroke-width="1.8"/>
${bText}`
    );

    const subs = [b.sub1, b.sub2].filter(Boolean) as string[];
    subs.forEach((sub, si) => {
      const sa = a + (si === 0 ? -0.44 : 0.44); // ±25°
      const sx = Math.round(bx + subR * Math.cos(sa));
      const sy = Math.round(by + subR * Math.sin(sa));
      // 160×40: holds up to 17 Arabic chars at 12px
      const sw = 160, sh = 40;
      connectors.push(
        `<line x1="${bx}" y1="${by}" x2="${sx}" y2="${sy}" stroke="${BRANCH_BD[i]}" stroke-width="1.4" stroke-linecap="round" opacity="0.35"/>`
      );
      nodes.push(
        `<rect x="${sx - sw / 2}" y="${sy - sh / 2}" width="${sw}" height="${sh}" rx="20" fill="${MINT}" stroke="${BRANCH_BD[i]}" stroke-width="1.2"/>
<text x="${sx}" y="${sy + 4}" text-anchor="middle" font-family="${FONT}" font-size="12" fill="${INK_SEC}">${trunc(sub, 17)}</text>`
      );
    });
  });

  const headerTitle = trunc(d.title || d.center, 44);
  const cr = 78;
  const cLines = wrap2(d.center, 12);
  const centerText = cLines.length === 1
    ? `<text x="${cx}" y="${cy + 6}" text-anchor="middle" font-family="${FONT}" font-size="16" font-weight="600" fill="#fff">${cLines[0]}</text>`
    : `<text x="${cx}" y="${cy - 3}" text-anchor="middle" font-family="${FONT}" font-size="15" font-weight="600" fill="#fff">${cLines[0]}<tspan x="${cx}" dy="20">${cLines[1]}</tspan></text>`;

  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<defs>
  <pattern id="dotGrid" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse">
    <circle cx="14" cy="14" r="1" fill="${PALM}" opacity="0.06"/>
  </pattern>
  <linearGradient id="mmHdr" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="${PALM_DEEP}"/>
    <stop offset="100%" stop-color="${PALM}"/>
  </linearGradient>
  <filter id="nodeShad" x="-30%" y="-30%" width="160%" height="160%">
    <feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="${PALM}" flood-opacity="0.13"/>
  </filter>
</defs>
<rect width="${W}" height="${H}" fill="${CANVAS_BG}"/>
<rect width="${W}" height="${H}" fill="url(#dotGrid)"/>
<rect width="${W}" height="${HDR}" fill="url(#mmHdr)"/>
<text x="${W / 2}" y="${Math.round(HDR * 0.64)}" text-anchor="middle" font-family="${FONT}" font-size="20" font-weight="600" fill="#fff">${headerTitle}</text>
${connectors.join("\n")}
${nodes.join("\n")}
<circle cx="${cx}" cy="${cy}" r="${cr}" fill="${PALM}" filter="url(#nodeShad)"/>
<circle cx="${cx}" cy="${cy}" r="${cr - 6}" fill="none" stroke="#fff" stroke-width="1.5" opacity="0.2"/>
${centerText}
</svg>`;
}

// ── Infographic: 1080×dynamic portrait — safe for all platforms ───────────

function renderInfographicSvg(d: InfographicData): string {
  const W = 1080;
  const PAD = 48;
  const sections = (d.sections || []).slice(0, 4);
  const HEADER_H = 170;
  const SUB_H    = 88;
  const SEC_H    = 240;
  const FOOTER_H = 72;
  const H = HEADER_H + SUB_H + sections.length * SEC_H + FOOTER_H;

  // Section accent colours — DGA palm scale
  const ACCENTS = [PALM, PALM_DARK, PALM_DEEP, PALM];
  const CARD_W  = W - 2 * PAD;
  const ACCENT_W = 10;
  // Text is right-aligned at the RIGHT edge of the card (RTL Arabic)
  const TR = W - PAD;   // text right anchor (text-anchor="end" → right edge at TR)

  const sectionBlocks = sections.map((sec, i) => {
    const y0    = HEADER_H + SUB_H + i * SEC_H + 14;
    const cardH = SEC_H - 28;
    const bg    = i % 2 === 0 ? MINT : "#ffffff";
    const ac    = ACCENTS[i % 4];

    // Large translucent background number — decorative only
    const numBgX = PAD + ACCENT_W + 52;
    const numBgY = y0 + cardH / 2 + 22;

    const line3 = sec.line3
      ? `<text x="${TR}" y="${y0 + 120}" text-anchor="end" font-family="${FONT}" font-size="12" fill="${INK_TER}">${trunc(sec.line3, 36)}</text>`
      : "";
    const stat  = sec.stat
      ? `<text x="${TR}" y="${y0 + (sec.line3 ? 144 : 126)}" text-anchor="end" font-family="${FONT}" font-size="12" fill="${ac}" font-weight="600">${trunc(sec.stat, 34)}</text>`
      : "";

    return `<rect x="${PAD}" y="${y0}" width="${CARD_W}" height="${cardH}" rx="16" fill="${bg}" stroke="${LINE}" stroke-width="1.5"/>
<rect x="${PAD}" y="${y0}" width="${ACCENT_W}" height="${cardH}" rx="5" fill="${ac}"/>
<circle cx="${PAD + ACCENT_W / 2}" cy="${y0 + 28}" r="3" fill="#fff" opacity="0.45"/>
<circle cx="${PAD + ACCENT_W / 2}" cy="${y0 + cardH - 28}" r="3" fill="#fff" opacity="0.45"/>
<text x="${numBgX}" y="${numBgY}" text-anchor="middle" font-family="${FONT}" font-size="96" font-weight="600" fill="${ac}" opacity="0.07">${i + 1}</text>
<text x="${TR}" y="${y0 + 48}" text-anchor="end" font-family="${FONT}" font-size="17" font-weight="600" fill="${INK}">${trunc(sec.heading, 26)}</text>
<text x="${TR}" y="${y0 + 74}" text-anchor="end" font-family="${FONT}" font-size="13" fill="${INK_SEC}">${trunc(sec.line1, 36)}</text>
<text x="${TR}" y="${y0 + 96}" text-anchor="end" font-family="${FONT}" font-size="13" fill="${INK_SEC}">${trunc(sec.line2, 36)}</text>
${line3}${stat}`;
  }).join("\n");

  const footerY = H - FOOTER_H;
  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="hdrGrad" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0%" stop-color="${PALM_DEEP}"/>
    <stop offset="100%" stop-color="${PALM}"/>
  </linearGradient>
</defs>
<rect width="${W}" height="${H}" fill="#fff"/>
<rect width="${W}" height="${HEADER_H}" fill="url(#hdrGrad)"/>
<text x="${W / 2}" y="${HEADER_H / 2 + 8}" text-anchor="middle" font-family="${FONT}" font-size="28" font-weight="600" fill="#fff">${trunc(d.title, 24)}</text>
<rect y="${HEADER_H}" width="${W}" height="${SUB_H}" fill="${MINT}"/>
<text x="${W / 2}" y="${HEADER_H + 50}" text-anchor="middle" font-family="${FONT}" font-size="15" fill="${PALM_DARK}">${trunc(d.subtitle, 42)}</text>
${sectionBlocks}
<rect x="0" y="${footerY}" width="${W}" height="${FOOTER_H}" fill="${MINT}"/>
<line x1="${PAD}" y1="${footerY + 1}" x2="${W - PAD}" y2="${footerY + 1}" stroke="${LINE}" stroke-width="1"/>
<text x="${W / 2}" y="${footerY + 42}" text-anchor="middle" font-family="${FONT}" font-size="12" fill="${INK_TER}">${trunc(d.source, 60)}</text>
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

  const { description, visualType, chartType, style, dimensions, channel } = parsed.data;

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
      const raw = await callClaude(apiKey, "claude-haiku-4-5-20251001", 600, chartDataPrompt(description, chartType ?? ""));
      const data = parseJson<ChartData>(raw);
      const svgCode = renderChartSvg(data, chartType ?? "");
      return NextResponse.json({ svgCode });
    } catch (e) {
      console.error("[chart]", e);
      return NextResponse.json({ error: "فشل إنشاء الرسم البياني" }, { status: 500 });
    }
  }

  // ── Mind map ──────────────────────────────────────────────────────────────
  if (visualType === "mindmap") {
    try {
      const raw = await callClaude(apiKey, "claude-haiku-4-5-20251001", 600, mindMapDataPrompt(description));
      const data = parseJson<MindMapData>(raw);
      // مزود صور خارجي (نانوبنانا / OpenAI) إن توفر مفتاحه — وإلا المحرك الداخلي
      const aiUrl = await providerImage(mindMapImagePrompt(data), 1080, 1080);
      if (aiUrl) return NextResponse.json({ imageUrl: aiUrl });
      const svgCode = renderMindMapSvg(data);
      return NextResponse.json({ svgCode });
    } catch (e) {
      console.error("[mindmap]", e);
      return NextResponse.json({ error: "فشل إنشاء الخريطة الذهنية" }, { status: 500 });
    }
  }

  // ── Infographic ───────────────────────────────────────────────────────────
  if (visualType === "infographic") {
    try {
      const raw = await callClaude(apiKey, "claude-haiku-4-5-20251001", 800, infographicDataPrompt(description));
      const data = parseJson<InfographicData>(raw);
      // مزود صور خارجي (نانوبنانا / OpenAI) إن توفر مفتاحه — وإلا المحرك الداخلي
      const aiUrl = await providerImage(infographicImagePrompt(data), 1024, 1536);
      if (aiUrl) return NextResponse.json({ imageUrl: aiUrl });
      const svgCode = renderInfographicSvg(data);
      return NextResponse.json({ svgCode });
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
Description: ${description}
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
