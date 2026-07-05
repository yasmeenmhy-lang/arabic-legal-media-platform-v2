import { NextResponse } from "next/server";
import { z } from "zod";
import { badRequest } from "@/lib/api";

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

// ── SVG renderers (programmatic — no AI coordinates) ─────────────────────

const FONT = "Tahoma,Arial,sans-serif";
const PALM = "#1a6b4a";
const BAR_COLORS = [PALM, "#2d8f64", "#4aad82", "#6ecaa2", "#98d4c0", "#c0e5d8"];

function renderBarChartSvg(d: ChartData): string {
  const W = 800, H = 520, ML = 70, MR = 30, MT = 80, MB = 90;
  const cW = W - ML - MR, cH = H - MT - MB;
  const items = d.data.slice(0, 6);
  const maxVal = (Math.max(...items.map((x) => x.value)) || 1) * 1.25;
  const step = cW / items.length;
  const bw = Math.floor(step * 0.55);
  const toY = (v: number) => MT + cH - Math.round((v / maxVal) * cH);
  const bx = (i: number) => ML + i * step + Math.floor((step - bw) / 2);

  const gridLines = [0, 1, 2, 3, 4].map((i) => {
    const v = Math.round((maxVal * i) / 4);
    const y = toY(v);
    return `<line x1="${ML}" y1="${y}" x2="${W - MR}" y2="${y}" stroke="#e8e8e8" stroke-width="1"/>
<text x="${ML - 8}" y="${y + 4}" text-anchor="end" font-family="${FONT}" font-size="11" fill="#999">${v}</text>`;
  }).join("\n");

  const bars = items.map((item, i) => {
    const x = bx(i), y = toY(item.value), bh = H - MB - y;
    return `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="${PALM}" rx="3"/>
<text x="${x + bw / 2}" y="${y - 7}" text-anchor="middle" font-family="${FONT}" font-size="12" font-weight="bold" fill="#1a1a2e">${item.value}</text>
<text x="${x + bw / 2}" y="${H - MB + 18}" text-anchor="middle" font-family="${FONT}" font-size="11" fill="#555">${item.label}</text>`;
  }).join("\n");

  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<rect width="${W}" height="${H}" fill="#fff"/>
<text x="${W / 2}" y="42" text-anchor="middle" font-family="${FONT}" font-size="17" font-weight="bold" fill="#1a1a2e">${d.title}</text>
<text x="${W / 2}" y="63" text-anchor="middle" font-family="${FONT}" font-size="12" fill="#888">${d.yLabel}</text>
${gridLines}
<line x1="${ML}" y1="${MT}" x2="${ML}" y2="${H - MB}" stroke="#ccc" stroke-width="1.5"/>
<line x1="${ML}" y1="${H - MB}" x2="${W - MR}" y2="${H - MB}" stroke="#ccc" stroke-width="1.5"/>
${bars}
</svg>`;
}

function renderLineChartSvg(d: ChartData): string {
  const W = 800, H = 520, ML = 70, MR = 30, MT = 80, MB = 90;
  const cW = W - ML - MR, cH = H - MT - MB;
  const items = d.data.slice(0, 6);
  const maxVal = (Math.max(...items.map((x) => x.value)) || 1) * 1.25;
  const gapX = cW / Math.max(items.length - 1, 1);
  const toX = (i: number) => ML + i * gapX;
  const toY = (v: number) => MT + cH - Math.round((v / maxVal) * cH);

  const gridLines = [0, 1, 2, 3, 4].map((i) => {
    const v = Math.round((maxVal * i) / 4);
    const y = toY(v);
    return `<line x1="${ML}" y1="${y}" x2="${W - MR}" y2="${y}" stroke="#e8e8e8" stroke-width="1"/>
<text x="${ML - 8}" y="${y + 4}" text-anchor="end" font-family="${FONT}" font-size="11" fill="#999">${v}</text>`;
  }).join("\n");

  const pts = items.map((it, i) => `${toX(i)},${toY(it.value)}`).join(" ");
  const fill = `${ML},${H - MB} ${pts} ${toX(items.length - 1)},${H - MB}`;

  const dots = items.map((it, i) =>
    `<circle cx="${toX(i)}" cy="${toY(it.value)}" r="5" fill="#fff" stroke="${PALM}" stroke-width="2.5"/>
<text x="${toX(i)}" y="${toY(it.value) - 12}" text-anchor="middle" font-family="${FONT}" font-size="11" font-weight="bold" fill="#1a1a2e">${it.value}</text>
<text x="${toX(i)}" y="${H - MB + 18}" text-anchor="middle" font-family="${FONT}" font-size="11" fill="#555">${it.label}</text>`
  ).join("\n");

  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<rect width="${W}" height="${H}" fill="#fff"/>
<text x="${W / 2}" y="42" text-anchor="middle" font-family="${FONT}" font-size="17" font-weight="bold" fill="#1a1a2e">${d.title}</text>
<text x="${W / 2}" y="63" text-anchor="middle" font-family="${FONT}" font-size="12" fill="#888">${d.yLabel}</text>
${gridLines}
<line x1="${ML}" y1="${MT}" x2="${ML}" y2="${H - MB}" stroke="#ccc" stroke-width="1.5"/>
<line x1="${ML}" y1="${H - MB}" x2="${W - MR}" y2="${H - MB}" stroke="#ccc" stroke-width="1.5"/>
<polygon points="${fill}" fill="${PALM}" opacity="0.08"/>
<polyline points="${pts}" fill="none" stroke="${PALM}" stroke-width="2.5" stroke-linejoin="round"/>
${dots}
</svg>`;
}

function renderAreaChartSvg(d: ChartData): string {
  const W = 800, H = 520, ML = 70, MR = 30, MT = 80, MB = 90;
  const cW = W - ML - MR, cH = H - MT - MB;
  const items = d.data.slice(0, 6);
  const maxVal = (Math.max(...items.map((x) => x.value)) || 1) * 1.25;
  const gapX = cW / Math.max(items.length - 1, 1);
  const toX = (i: number) => ML + i * gapX;
  const toY = (v: number) => MT + cH - Math.round((v / maxVal) * cH);

  const gridLines = [0, 1, 2, 3, 4].map((i) => {
    const v = Math.round((maxVal * i) / 4);
    const y = toY(v);
    return `<line x1="${ML}" y1="${y}" x2="${W - MR}" y2="${y}" stroke="#e8e8e8" stroke-width="1"/>
<text x="${ML - 8}" y="${y + 4}" text-anchor="end" font-family="${FONT}" font-size="11" fill="#999">${v}</text>`;
  }).join("\n");

  const pts = items.map((it, i) => `${toX(i)},${toY(it.value)}`).join(" ");
  const fill = `${ML},${H - MB} ${pts} ${toX(items.length - 1)},${H - MB}`;

  const dots = items.map((it, i) =>
    `<circle cx="${toX(i)}" cy="${toY(it.value)}" r="5" fill="${PALM}" stroke="#fff" stroke-width="2"/>
<text x="${toX(i)}" y="${toY(it.value) - 12}" text-anchor="middle" font-family="${FONT}" font-size="11" font-weight="bold" fill="#1a1a2e">${it.value}</text>
<text x="${toX(i)}" y="${H - MB + 18}" text-anchor="middle" font-family="${FONT}" font-size="11" fill="#555">${it.label}</text>`
  ).join("\n");

  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<rect width="${W}" height="${H}" fill="#fff"/>
<text x="${W / 2}" y="42" text-anchor="middle" font-family="${FONT}" font-size="17" font-weight="bold" fill="#1a1a2e">${d.title}</text>
<text x="${W / 2}" y="63" text-anchor="middle" font-family="${FONT}" font-size="12" fill="#888">${d.yLabel}</text>
${gridLines}
<line x1="${ML}" y1="${MT}" x2="${ML}" y2="${H - MB}" stroke="#ccc" stroke-width="1.5"/>
<line x1="${ML}" y1="${H - MB}" x2="${W - MR}" y2="${H - MB}" stroke="#ccc" stroke-width="1.5"/>
<polygon points="${fill}" fill="${PALM}" opacity="0.18"/>
<polyline points="${pts}" fill="none" stroke="${PALM}" stroke-width="2.5" stroke-linejoin="round"/>
${dots}
</svg>`;
}

function renderHBarChartSvg(d: ChartData): string {
  const W = 800, H = 520, ML = 150, MR = 80, MT = 80, MB = 40;
  const cW = W - ML - MR, cH = H - MT - MB;
  const items = d.data.slice(0, 6);
  const maxVal = (Math.max(...items.map((x) => x.value)) || 1) * 1.25;
  const step = cH / items.length;
  const bh = Math.floor(step * 0.55);
  const toW = (v: number) => Math.round((v / maxVal) * cW);
  const by = (i: number) => MT + i * step + Math.floor((step - bh) / 2);

  const gridLines = [0, 1, 2, 3, 4].map((i) => {
    const v = Math.round((maxVal * i) / 4);
    const x = ML + toW(v);
    return `<line x1="${x}" y1="${MT}" x2="${x}" y2="${H - MB}" stroke="#e8e8e8" stroke-width="1"/>
<text x="${x}" y="${H - MB + 16}" text-anchor="middle" font-family="${FONT}" font-size="11" fill="#999">${v}</text>`;
  }).join("\n");

  const bars = items.map((item, i) => {
    const y = by(i), barW = toW(item.value);
    return `<rect x="${ML}" y="${y}" width="${barW}" height="${bh}" fill="${PALM}" rx="3"/>
<text x="${ML + barW + 6}" y="${y + bh / 2 + 4}" text-anchor="start" font-family="${FONT}" font-size="12" font-weight="bold" fill="#1a1a2e">${item.value}</text>
<text x="${ML - 8}" y="${y + bh / 2 + 4}" text-anchor="end" font-family="${FONT}" font-size="11" fill="#555">${item.label}</text>`;
  }).join("\n");

  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<rect width="${W}" height="${H}" fill="#fff"/>
<text x="${W / 2}" y="42" text-anchor="middle" font-family="${FONT}" font-size="17" font-weight="bold" fill="#1a1a2e">${d.title}</text>
<text x="${W / 2}" y="63" text-anchor="middle" font-family="${FONT}" font-size="12" fill="#888">${d.yLabel}</text>
${gridLines}
<line x1="${ML}" y1="${MT}" x2="${ML}" y2="${H - MB}" stroke="#ccc" stroke-width="1.5"/>
${bars}
</svg>`;
}

function renderPieOrDonutSvg(d: ChartData, isDonut: boolean): string {
  const W = 780, H = 520;
  const cx = 280, cy = 260, R = 160, ri = isDonut ? 80 : 0;
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
      return `<path d="M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${ri} ${ri} 0 ${large} 0 ${ix2} ${iy2} Z" fill="${BAR_COLORS[i]}" stroke="#fff" stroke-width="2"/>
${pct >= 8 ? `<text x="${lx}" y="${ly + 5}" text-anchor="middle" font-family="${FONT}" font-size="12" font-weight="bold" fill="#fff">${pct}%</text>` : ""}`;
    }
    return `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z" fill="${BAR_COLORS[i]}" stroke="#fff" stroke-width="2"/>
${pct >= 6 ? `<text x="${lx}" y="${ly + 5}" text-anchor="middle" font-family="${FONT}" font-size="12" font-weight="bold" fill="#fff">${pct}%</text>` : ""}`;
  });

  const legend = items.map((item, i) =>
    `<rect x="540" y="${80 + i * 38}" width="16" height="16" rx="3" fill="${BAR_COLORS[i]}"/>
<text x="562" y="${93 + i * 38}" font-family="${FONT}" font-size="12" fill="#333">${item.label}: ${item.value}</text>`
  ).join("\n");

  const center = isDonut
    ? `<circle cx="${cx}" cy="${cy}" r="${ri}" fill="#fff"/>
<text x="${cx}" y="${cy - 8}" text-anchor="middle" font-family="${FONT}" font-size="26" font-weight="bold" fill="${PALM}">${Math.round((items[0].value / total) * 100)}%</text>
<text x="${cx}" y="${cy + 16}" text-anchor="middle" font-family="${FONT}" font-size="11" fill="#666">${items[0].label}</text>`
    : "";

  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<rect width="${W}" height="${H}" fill="#fff"/>
<text x="${W / 2}" y="40" text-anchor="middle" font-family="${FONT}" font-size="17" font-weight="bold" fill="#1a1a2e">${d.title}</text>
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
  return renderBarChartSvg(data); // default
}

function renderMindMapSvg(d: MindMapData): string {
  const W = 900, H = 680, cx = 450, cy = 340, branchR = 220, subR = 95;
  const COLORS = ["#e8f5f0", "#d4ede4", "#c0e5d8", "#acdccc", "#98d4c0"];
  const branches = (d.branches || []).slice(0, 5);
  const baseAngles = [-90, -18, 54, 126, 198];

  const connectors: string[] = [];
  const nodes: string[] = [];

  branches.forEach((b, i) => {
    const a = (baseAngles[i] * Math.PI) / 180;
    const nx = Math.round(cx + branchR * Math.cos(a));
    const ny = Math.round(cy + branchR * Math.sin(a));
    const bw = 120, bh = 40;

    connectors.push(
      `<line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="${PALM}" stroke-width="2" opacity="0.35"/>`
    );
    nodes.push(
      `<rect x="${nx - bw / 2}" y="${ny - bh / 2}" width="${bw}" height="${bh}" rx="20" fill="${COLORS[i]}" stroke="${PALM}" stroke-width="1.5"/>
<text x="${nx}" y="${ny + 5}" text-anchor="middle" font-family="${FONT}" font-size="12" fill="#1a1a2e">${b.label}</text>`
    );

    const subs = [b.sub1, b.sub2].filter(Boolean) as string[];
    subs.forEach((sub, si) => {
      const sa = a + ((si === 0 ? -1 : 1) * Math.PI) / 7;
      const sx = Math.round(nx + subR * Math.cos(sa));
      const sy = Math.round(ny + subR * Math.sin(sa));
      const sw = 94, sh = 28;
      connectors.push(
        `<line x1="${nx}" y1="${ny}" x2="${sx}" y2="${sy}" stroke="#4a9b7f" stroke-width="1.2" opacity="0.4"/>`
      );
      nodes.push(
        `<rect x="${sx - sw / 2}" y="${sy - sh / 2}" width="${sw}" height="${sh}" rx="14" fill="#f0fbf7" stroke="#4a9b7f" stroke-width="1"/>
<text x="${sx}" y="${sy + 4}" text-anchor="middle" font-family="${FONT}" font-size="10" fill="#1a1a2e">${sub}</text>`
      );
    });
  });

  const cw = 140, ch = 46;
  nodes.push(
    `<rect x="${cx - cw / 2}" y="${cy - ch / 2}" width="${cw}" height="${ch}" rx="23" fill="${PALM}"/>
<text x="${cx}" y="${cy + 6}" text-anchor="middle" font-family="${FONT}" font-size="14" font-weight="bold" fill="#fff">${d.center}</text>`
  );

  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<rect width="${W}" height="${H}" fill="#f8fdf9"/>
${connectors.join("\n")}
${nodes.join("\n")}
</svg>`;
}

function renderInfographicSvg(d: InfographicData): string {
  const W = 680;
  const sections = (d.sections || []).slice(0, 4);
  const sectionH = 170;
  const headerH = 80;
  const subH = 50;
  const footerH = 44;
  const H = headerH + subH + sections.length * sectionH + footerH + 10;

  const sectionBlocks = sections.map((sec, i) => {
    const y0 = headerH + subH + i * sectionH + 10;
    const hasLine3 = sec.line3 ? `<text x="620" y="${y0 + 110}" text-anchor="end" font-family="${FONT}" font-size="12" fill="#555">${sec.line3}</text>` : "";
    const hasStat = sec.stat ? `<text x="620" y="${y0 + 140}" text-anchor="end" font-family="${FONT}" font-size="13" fill="${PALM}" font-weight="bold">${sec.stat}</text>` : "";
    return `<rect x="24" y="${y0}" width="${W - 48}" height="${sectionH - 14}" rx="8" fill="#f8fdf9" stroke="#e0f0e8" stroke-width="1"/>
<circle cx="88" cy="${y0 + 46}" r="24" fill="#e8f5f0" stroke="${PALM}" stroke-width="1.5"/>
<text x="88" y="${y0 + 54}" text-anchor="middle" font-family="${FONT}" font-size="22" font-weight="bold" fill="${PALM}">${i + 1}</text>
<text x="620" y="${y0 + 34}" text-anchor="end" font-family="${FONT}" font-size="15" font-weight="bold" fill="#1a1a2e">${sec.heading}</text>
<text x="620" y="${y0 + 62}" text-anchor="end" font-family="${FONT}" font-size="12" fill="#555">${sec.line1}</text>
<text x="620" y="${y0 + 85}" text-anchor="end" font-family="${FONT}" font-size="12" fill="#555">${sec.line2}</text>
${hasLine3}${hasStat}`;
  }).join("\n");

  const footerY = H - footerH;
  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<rect width="${W}" height="${H}" fill="#fff"/>
<rect width="${W}" height="${headerH}" fill="${PALM}"/>
<text x="${W / 2}" y="${headerH / 2 + 8}" text-anchor="middle" font-family="${FONT}" font-size="20" font-weight="bold" fill="#fff">${d.title}</text>
<text x="${W / 2}" y="${headerH + 32}" text-anchor="middle" font-family="${FONT}" font-size="13" fill="#666">${d.subtitle}</text>
<line x1="40" y1="${headerH + 46}" x2="${W - 40}" y2="${headerH + 46}" stroke="#e8e8e8" stroke-width="1"/>
${sectionBlocks}
<rect x="0" y="${footerY}" width="${W}" height="${footerH}" fill="#f0f8f4"/>
<text x="${W / 2}" y="${footerY + 28}" text-anchor="middle" font-family="${FONT}" font-size="10" fill="#888">${d.source}</text>
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
  "center": "موضوع مركزي 6-10 أحرف",
  "branches": [
    {"label": "فرع 1 — 5-8 أحرف", "sub1": "فرعي 1أ — 4-7 أحرف", "sub2": "فرعي 1ب — 4-7 أحرف"},
    {"label": "فرع 2 — 5-8 أحرف", "sub1": "فرعي 2أ — 4-7 أحرف", "sub2": "فرعي 2ب — 4-7 أحرف"},
    {"label": "فرع 3 — 5-8 أحرف", "sub1": "فرعي 3أ — 4-7 أحرف", "sub2": "فرعي 3ب — 4-7 أحرف"},
    {"label": "فرع 4 — 5-8 أحرف", "sub1": "فرعي 4أ — 4-7 أحرف"},
    {"label": "فرع 5 — 5-8 أحرف", "sub1": "فرعي 5أ — 4-7 أحرف"}
  ]
}

Rules:
- Exactly 5 main branches
- Labels must be very short Arabic (≤8 chars) — abbreviated if needed
- sub-labels ≤7 chars each
- Content must be legally relevant to the topic`;
}

function infographicDataPrompt(description: string): string {
  return `Generate Arabic legal infographic content for: "${description}"

Return ONLY valid JSON with no markdown fences or explanation:
{
  "title": "عنوان رئيسي عربي 15-25 حرف",
  "subtitle": "وصف توضيحي عربي 30-45 حرف",
  "sections": [
    {
      "heading": "عنوان القسم 10-18 حرف",
      "line1": "نص عربي وصفي أول 35-45 حرف",
      "line2": "نص عربي وصفي ثانٍ 35-45 حرف",
      "line3": "نص عربي ثالث اختياري 35-45 حرف",
      "stat": "إحصاء أو مرجع قصير مثل: المادة 35 — نظام العمل"
    },
    { ... },
    { ... },
    { ... }
  ],
  "source": "مصدر: وزارة العدل / هيئة المحامين السعوديين / ..."
}

Rules:
- Exactly 4 sections
- All text in Arabic, professional legal tone
- line1/line2/line3 each ≤45 chars so they fit in one line
- stat is optional but helpful for authority
- source must be a real Saudi legal authority relevant to the topic`;
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
      250,
      `Convert this Arabic legal media description to an English image generation prompt.
Description: ${description}
Style: ${style ?? "professional, clean, corporate"}
Platform: ${channel ?? "social media"}
Format: ${dimensions ?? "square"}

Rules: photorealistic or clean illustration, professional corporate aesthetic, NO human faces, soft neutral backgrounds, max 100 words. Output ONLY the prompt.`
    );
    const [w, h] = getDimensions(dimensions);
    const seed = Date.now() % 99999;
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptRaw)}?width=${w}&height=${h}&model=flux&nologo=true&safe=true&seed=${seed}`;
    return NextResponse.json({ prompt: promptRaw, imageUrl });
  } catch (e) {
    console.error("[image]", e);
    return NextResponse.json({ error: "فشل إنشاء الصورة" }, { status: 500 });
  }
}
