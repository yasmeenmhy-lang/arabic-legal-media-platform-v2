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

// Truncate Arabic text to max chars, appending ellipsis
function trunc(s: string, max: number): string {
  if (!s) return "";
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
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
    return `<line x1="${ML}" y1="${y}" x2="${W - MR}" y2="${y}" stroke="#ececec" stroke-width="1"/>
<text x="${ML - 10}" y="${y + 5}" text-anchor="end" font-family="${FONT}" font-size="14" fill="#aaa">${v}</text>`;
  }).join("\n");

  const bars = items.map((item, i) => {
    const x = bx(i), y = toY(item.value), bh = H - MB - y;
    return `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="${BAR_COLORS[i % BAR_COLORS.length]}" rx="4"/>
<text x="${x + bw / 2}" y="${y - 9}" text-anchor="middle" font-family="${FONT}" font-size="14" font-weight="bold" fill="#1a1a2e">${item.value}</text>
<text x="${x + bw / 2}" y="${H - MB + 22}" text-anchor="middle" font-family="${FONT}" font-size="13" fill="#555">${trunc(item.label, 10)}</text>`;
  }).join("\n");

  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<rect width="${W}" height="${H}" fill="#fff"/>
<text x="${W / 2}" y="52" text-anchor="middle" font-family="${FONT}" font-size="22" font-weight="bold" fill="#1a1a2e">${trunc(d.title, 36)}</text>
<text x="${W / 2}" y="78" text-anchor="middle" font-family="${FONT}" font-size="14" fill="#999">${trunc(d.yLabel, 40)}</text>
${gridLines}
<line x1="${ML}" y1="${MT}" x2="${ML}" y2="${H - MB}" stroke="#ccc" stroke-width="1.5"/>
<line x1="${ML}" y1="${H - MB}" x2="${W - MR}" y2="${H - MB}" stroke="#ccc" stroke-width="1.5"/>
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
    return `<line x1="${ML}" y1="${y}" x2="${W - MR}" y2="${y}" stroke="#ececec" stroke-width="1"/>
<text x="${ML - 10}" y="${y + 5}" text-anchor="end" font-family="${FONT}" font-size="14" fill="#aaa">${v}</text>`;
  }).join("\n");

  const pts = items.map((it, i) => `${toX(i)},${toY(it.value)}`).join(" ");
  const fill = `${ML},${H - MB} ${pts} ${toX(items.length - 1)},${H - MB}`;

  const dots = items.map((it, i) =>
    `<circle cx="${toX(i)}" cy="${toY(it.value)}" r="6" fill="#fff" stroke="${PALM}" stroke-width="3"/>
<text x="${toX(i)}" y="${toY(it.value) - 14}" text-anchor="middle" font-family="${FONT}" font-size="13" font-weight="bold" fill="#1a1a2e">${it.value}</text>
<text x="${toX(i)}" y="${H - MB + 22}" text-anchor="middle" font-family="${FONT}" font-size="13" fill="#555">${trunc(it.label, 10)}</text>`
  ).join("\n");

  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<rect width="${W}" height="${H}" fill="#fff"/>
<text x="${W / 2}" y="52" text-anchor="middle" font-family="${FONT}" font-size="22" font-weight="bold" fill="#1a1a2e">${trunc(d.title, 36)}</text>
<text x="${W / 2}" y="78" text-anchor="middle" font-family="${FONT}" font-size="14" fill="#999">${trunc(d.yLabel, 40)}</text>
${gridLines}
<line x1="${ML}" y1="${MT}" x2="${ML}" y2="${H - MB}" stroke="#ccc" stroke-width="1.5"/>
<line x1="${ML}" y1="${H - MB}" x2="${W - MR}" y2="${H - MB}" stroke="#ccc" stroke-width="1.5"/>
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
    return `<line x1="${ML}" y1="${y}" x2="${W - MR}" y2="${y}" stroke="#ececec" stroke-width="1"/>
<text x="${ML - 10}" y="${y + 5}" text-anchor="end" font-family="${FONT}" font-size="14" fill="#aaa">${v}</text>`;
  }).join("\n");

  const pts = items.map((it, i) => `${toX(i)},${toY(it.value)}`).join(" ");
  const fill = `${ML},${H - MB} ${pts} ${toX(items.length - 1)},${H - MB}`;

  const dots = items.map((it, i) =>
    `<circle cx="${toX(i)}" cy="${toY(it.value)}" r="6" fill="${PALM}" stroke="#fff" stroke-width="2.5"/>
<text x="${toX(i)}" y="${toY(it.value) - 14}" text-anchor="middle" font-family="${FONT}" font-size="13" font-weight="bold" fill="#1a1a2e">${it.value}</text>
<text x="${toX(i)}" y="${H - MB + 22}" text-anchor="middle" font-family="${FONT}" font-size="13" fill="#555">${trunc(it.label, 10)}</text>`
  ).join("\n");

  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<rect width="${W}" height="${H}" fill="#fff"/>
<text x="${W / 2}" y="52" text-anchor="middle" font-family="${FONT}" font-size="22" font-weight="bold" fill="#1a1a2e">${trunc(d.title, 36)}</text>
<text x="${W / 2}" y="78" text-anchor="middle" font-family="${FONT}" font-size="14" fill="#999">${trunc(d.yLabel, 40)}</text>
${gridLines}
<line x1="${ML}" y1="${MT}" x2="${ML}" y2="${H - MB}" stroke="#ccc" stroke-width="1.5"/>
<line x1="${ML}" y1="${H - MB}" x2="${W - MR}" y2="${H - MB}" stroke="#ccc" stroke-width="1.5"/>
<polygon points="${fill}" fill="${PALM}" opacity="0.15"/>
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
    return `<line x1="${x}" y1="${MT}" x2="${x}" y2="${H - MB}" stroke="#ececec" stroke-width="1"/>
<text x="${x}" y="${H - MB + 20}" text-anchor="middle" font-family="${FONT}" font-size="13" fill="#aaa">${v}</text>`;
  }).join("\n");

  const bars = items.map((item, i) => {
    const y = by(i), barW = toW(item.value);
    return `<rect x="${ML}" y="${y}" width="${barW}" height="${bh}" fill="${BAR_COLORS[i % BAR_COLORS.length]}" rx="4"/>
<text x="${ML + barW + 8}" y="${y + bh / 2 + 5}" text-anchor="start" font-family="${FONT}" font-size="14" font-weight="bold" fill="#1a1a2e">${item.value}</text>
<text x="${ML - 12}" y="${y + bh / 2 + 5}" text-anchor="end" font-family="${FONT}" font-size="13" fill="#555">${trunc(item.label, 12)}</text>`;
  }).join("\n");

  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<rect width="${W}" height="${H}" fill="#fff"/>
<text x="${W / 2}" y="52" text-anchor="middle" font-family="${FONT}" font-size="22" font-weight="bold" fill="#1a1a2e">${trunc(d.title, 36)}</text>
<text x="${W / 2}" y="78" text-anchor="middle" font-family="${FONT}" font-size="14" fill="#999">${trunc(d.yLabel, 40)}</text>
${gridLines}
<line x1="${ML}" y1="${MT}" x2="${ML}" y2="${H - MB}" stroke="#ccc" stroke-width="1.5"/>
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
${pct >= 7 ? `<text x="${lx}" y="${ly + 6}" text-anchor="middle" font-family="${FONT}" font-size="18" font-weight="bold" fill="#fff">${pct}%</text>` : ""}`;
    }
    return `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z" fill="${BAR_COLORS[i]}" stroke="#fff" stroke-width="3"/>
${pct >= 5 ? `<text x="${lx}" y="${ly + 6}" text-anchor="middle" font-family="${FONT}" font-size="18" font-weight="bold" fill="#fff">${pct}%</text>` : ""}`;
  });

  const legendY = 870;
  const legend = items.map((item, i) => {
    const lx = 120 + Math.floor(i / 3) * 500;
    const ly = legendY + (i % 3) * 42;
    return `<rect x="${lx}" y="${ly}" width="22" height="22" rx="4" fill="${BAR_COLORS[i]}"/>
<text x="${lx + 32}" y="${ly + 16}" font-family="${FONT}" font-size="16" fill="#333">${trunc(item.label, 14)}: ${item.value}</text>`;
  }).join("\n");

  const center = isDonut
    ? `<circle cx="${cx}" cy="${cy}" r="${ri - 4}" fill="#fff"/>
<text x="${cx}" y="${cy - 12}" text-anchor="middle" font-family="${FONT}" font-size="44" font-weight="bold" fill="${PALM}">${Math.round((items[0].value / total) * 100)}%</text>
<text x="${cx}" y="${cy + 22}" text-anchor="middle" font-family="${FONT}" font-size="18" fill="#666">${trunc(items[0].label, 12)}</text>`
    : "";

  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<rect width="${W}" height="${H}" fill="#fff"/>
<text x="${W / 2}" y="60" text-anchor="middle" font-family="${FONT}" font-size="26" font-weight="bold" fill="#1a1a2e">${trunc(d.title, 32)}</text>
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
  const W = 1080, H = 1080, cx = 540, cy = 540, branchR = 290, subR = 120;
  const COLORS = ["#e8f5f0", "#d4ede4", "#c0e5d8", "#acdccc", "#98d4c0"];
  const branches = (d.branches || []).slice(0, 5);
  const baseAngles = [-90, -18, 54, 126, 198];

  const connectors: string[] = [];
  const nodes: string[] = [];

  branches.forEach((b, i) => {
    const a = (baseAngles[i] * Math.PI) / 180;
    const nx = Math.round(cx + branchR * Math.cos(a));
    const ny = Math.round(cy + branchR * Math.sin(a));
    const bw = 160, bh = 52;

    connectors.push(
      `<line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="${PALM}" stroke-width="2.5" opacity="0.3"/>`
    );
    nodes.push(
      `<rect x="${nx - bw / 2}" y="${ny - bh / 2}" width="${bw}" height="${bh}" rx="26" fill="${COLORS[i]}" stroke="${PALM}" stroke-width="2"/>
<text x="${nx}" y="${ny + 6}" text-anchor="middle" font-family="${FONT}" font-size="15" fill="#1a1a2e">${trunc(b.label, 10)}</text>`
    );

    const subs = [b.sub1, b.sub2].filter(Boolean) as string[];
    subs.forEach((sub, si) => {
      const sa = a + ((si === 0 ? -1 : 1) * Math.PI) / 7;
      const sx = Math.round(nx + subR * Math.cos(sa));
      const sy = Math.round(ny + subR * Math.sin(sa));
      const sw = 120, sh = 36;
      connectors.push(
        `<line x1="${nx}" y1="${ny}" x2="${sx}" y2="${sy}" stroke="#4a9b7f" stroke-width="1.5" opacity="0.35"/>`
      );
      nodes.push(
        `<rect x="${sx - sw / 2}" y="${sy - sh / 2}" width="${sw}" height="${sh}" rx="18" fill="#f0fbf7" stroke="#4a9b7f" stroke-width="1.5"/>
<text x="${sx}" y="${sy + 5}" text-anchor="middle" font-family="${FONT}" font-size="13" fill="#1a1a2e">${trunc(sub, 8)}</text>`
      );
    });
  });

  const cw = 176, ch = 58;
  nodes.push(
    `<rect x="${cx - cw / 2}" y="${cy - ch / 2}" width="${cw}" height="${ch}" rx="29" fill="${PALM}"/>
<text x="${cx}" y="${cy + 7}" text-anchor="middle" font-family="${FONT}" font-size="18" font-weight="bold" fill="#fff">${trunc(d.center, 10)}</text>`
  );

  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<rect width="${W}" height="${H}" fill="#f8fdf9"/>
${connectors.join("\n")}
${nodes.join("\n")}
</svg>`;
}

// ── Infographic: 1080×dynamic portrait — safe for all platforms ───────────

function renderInfographicSvg(d: InfographicData): string {
  const W = 1080;
  const sections = (d.sections || []).slice(0, 4);
  const HEADER_H = 140;
  const SUB_H    = 80;
  const SEC_H    = 200;
  const FOOTER_H = 60;
  const H = HEADER_H + SUB_H + sections.length * SEC_H + FOOTER_H;

  // Layout: number circle on the RIGHT (RTL start), text fills LEFT portion
  const PAD       = 40;
  const CIRC_CX   = W - PAD - 50;          // circle centre — right side
  const CIRC_R    = 36;
  const TEXT_X    = W - PAD - CIRC_R * 2 - 28; // text right-edge before circle
  const CARD_W    = W - PAD * 2;

  const sectionBlocks = sections.map((sec, i) => {
    const y0   = HEADER_H + SUB_H + i * SEC_H + 12;
    const cardH = SEC_H - 24;
    const bg    = i % 2 === 0 ? "#f8fdf9" : "#ffffff";

    const line3  = sec.line3
      ? `<text x="${TEXT_X}" y="${y0 + 108}" text-anchor="end" font-family="${FONT}" font-size="15" fill="#555" clip-path="url(#cp${i})">${trunc(sec.line3, 30)}</text>`
      : "";
    const stat   = sec.stat
      ? `<text x="${TEXT_X}" y="${y0 + (sec.line3 ? 136 : 116)}" text-anchor="end" font-family="${FONT}" font-size="14" fill="${PALM}" font-weight="bold" clip-path="url(#cp${i})">${trunc(sec.stat, 28)}</text>`
      : "";

    return `<clipPath id="cp${i}"><rect x="${PAD}" y="${y0}" width="${CARD_W}" height="${cardH}"/></clipPath>
<rect x="${PAD}" y="${y0}" width="${CARD_W}" height="${cardH}" rx="14" fill="${bg}" stroke="#d4ede4" stroke-width="1.5"/>
<circle cx="${CIRC_CX}" cy="${y0 + 56}" r="${CIRC_R}" fill="#e8f5f0" stroke="${PALM}" stroke-width="2.5"/>
<text x="${CIRC_CX}" y="${y0 + 67}" text-anchor="middle" font-family="${FONT}" font-size="26" font-weight="bold" fill="${PALM}">${i + 1}</text>
<text x="${TEXT_X}" y="${y0 + 38}" text-anchor="end" font-family="${FONT}" font-size="18" font-weight="bold" fill="#1a1a2e" clip-path="url(#cp${i})">${trunc(sec.heading, 26)}</text>
<text x="${TEXT_X}" y="${y0 + 68}" text-anchor="end" font-family="${FONT}" font-size="15" fill="#444" clip-path="url(#cp${i})">${trunc(sec.line1, 30)}</text>
<text x="${TEXT_X}" y="${y0 + 92}" text-anchor="end" font-family="${FONT}" font-size="15" fill="#444" clip-path="url(#cp${i})">${trunc(sec.line2, 30)}</text>
${line3}${stat}`;
  }).join("\n");

  const footerY = H - FOOTER_H;
  return `<svg width="100%" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
<rect width="${W}" height="${H}" fill="#fff"/>
<rect width="${W}" height="${HEADER_H}" fill="${PALM}"/>
<text x="${W / 2}" y="${HEADER_H / 2 + 14}" text-anchor="middle" font-family="${FONT}" font-size="28" font-weight="bold" fill="#fff">${trunc(d.title, 26)}</text>
<text x="${W / 2}" y="${HEADER_H + 50}" text-anchor="middle" font-family="${FONT}" font-size="17" fill="#555">${trunc(d.subtitle, 44)}</text>
<line x1="80" y1="${HEADER_H + 64}" x2="${W - 80}" y2="${HEADER_H + 64}" stroke="#e0e0e0" stroke-width="1"/>
${sectionBlocks}
<rect x="0" y="${footerY}" width="${W}" height="${FOOTER_H}" fill="#f0f8f4"/>
<text x="${W / 2}" y="${footerY + 38}" text-anchor="middle" font-family="${FONT}" font-size="13" fill="#888">${trunc(d.source, 60)}</text>
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
