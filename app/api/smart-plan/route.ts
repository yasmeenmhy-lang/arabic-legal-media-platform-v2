import { z } from "zod";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { governText } from "@/lib/services/governor-gate";

const recordSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.string(),
  sharingStatus: z.string().optional(),
  purpose: z.string().optional(),
  audience: z.string().optional(),
  channel: z.string().optional(),
  approved: z.boolean(),
  publicationLabel: z.string().optional(),
  channels: z.array(z.string()),
});

const schema = z.object({
  records: z.array(recordSchema),
  horizon: z.enum(["weekly", "monthly"]),
  startDate: z.string(),
});

type RecordInput = z.infer<typeof recordSchema>;

interface PlanItem {
  contentId: string;
  suggestedDate: string;
  channel: string;
  reason: string;
  priority: "high" | "medium" | "low";
}

interface PlanResult {
  plan: PlanItem[];
  gaps: string[];
  summary: string;
  demo?: boolean;
}

// ── Channel preferred days (0=Sun … 6=Sat) ──────────────────────────────────
const CHANNEL_DAYS: Record<string, number[]> = {
  linkedin:  [1, 2, 3],
  twitter:   [0, 4],
  instagram: [3, 4],
  snapchat:  [4, 5],
  youtube:   [2, 3],
  tiktok:    [4, 5],
};
const PROFESSIONAL_DAYS = [1, 2, 3];

function preferredDays(channel: string): number[] {
  const key = channel.toLowerCase();
  return CHANNEL_DAYS[key] ?? PROFESSIONAL_DAYS;
}

function nextAvailableDate(
  after: Date,
  preferred: number[],
  taken: Set<string>,
  horizon: number
): string | null {
  const d = new Date(after);
  for (let i = 0; i < horizon; i++) {
    d.setDate(d.getDate() + 1);
    const iso = d.toISOString().slice(0, 10);
    if (preferred.includes(d.getDay()) && !taken.has(iso)) return iso;
  }
  // fallback: any weekday not taken
  d.setTime(after.getTime());
  for (let i = 0; i < horizon; i++) {
    d.setDate(d.getDate() + 1);
    const iso = d.toISOString().slice(0, 10);
    const wd = d.getDay();
    if (wd !== 5 && wd !== 6 && !taken.has(iso)) return iso; // skip Fri/Sat
  }
  return null;
}

function priorityOf(r: RecordInput): "high" | "medium" | "low" {
  if (r.approved) return "high";
  if (r.publicationLabel) return "medium";
  return "low";
}

function reasonFor(r: RecordInput, priority: "high" | "medium" | "low"): string {
  if (priority === "high") return "محتوى معتمد — يُعطى أعلى أولوية للنشر";
  if (priority === "medium") return "محتوى مُحلَّل — جاهز للجدولة";
  return "مسودة — مقترح بعد المحتوى المعتمد";
}

// ── Fallback local planner (no API key required) ─────────────────────────────
function buildLocalPlan(data: z.infer<typeof schema>): PlanResult {
  const horizonDays = data.horizon === "weekly" ? 7 : 30;
  const start = new Date(data.startDate + "T12:00:00");
  const taken = new Set<string>();
  let cursor = new Date(start);
  cursor.setDate(cursor.getDate() - 1); // will increment on first use

  // sort: high → medium → low
  const sorted = [...data.records].sort((a, b) => {
    const p: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return p[priorityOf(a)] - p[priorityOf(b)];
  });

  const plan: PlanItem[] = [];

  for (const r of sorted) {
    const ch = r.channel ?? r.channels[0] ?? "linkedin";
    const pref = preferredDays(ch);
    const priority = priorityOf(r);
    const date = nextAvailableDate(cursor, pref, taken, horizonDays);
    if (!date) continue;

    taken.add(date);
    cursor = new Date(date + "T12:00:00");

    plan.push({
      contentId: r.id,
      suggestedDate: date,
      channel: ch,
      reason: reasonFor(r, priority),
      priority,
    });
  }

  // identify gap weeks
  const gaps: string[] = [];
  const weeks = Math.ceil(horizonDays / 7);
  for (let w = 0; w < weeks; w++) {
    const ws = new Date(start);
    ws.setDate(ws.getDate() + w * 7);
    const we = new Date(ws);
    we.setDate(we.getDate() + 6);
    const hasContent = plan.some((p) => p.suggestedDate >= ws.toISOString().slice(0, 10) && p.suggestedDate <= we.toISOString().slice(0, 10));
    if (!hasContent) {
      gaps.push(`الأسبوع ${w + 1} (${ws.toLocaleDateString("ar-SA", { day: "numeric", month: "long" })} – ${we.toLocaleDateString("ar-SA", { day: "numeric", month: "long" })}) خالٍ من المحتوى`);
    }
  }

  const highCount = plan.filter((p) => p.priority === "high").length;
  const summary = `تم جدولة ${plan.length} منشور${plan.length !== 1 ? "اً" : ""} على مدى ${horizonDays} يوماً، منها ${highCount} معتمد${highCount !== 1 ? "ة" : ""}. الخطة مبنية على الأولوية والقنوات المثلى لكل محتوى.`;

  return { plan, gaps, summary, demo: true };
}

// ── Prompt builder ────────────────────────────────────────────────────────────
function buildPrompt(data: z.infer<typeof schema>): string {
  const horizonLabel = data.horizon === "weekly" ? "أسبوع واحد (7 أيام)" : "شهر كامل (4 أسابيع)";
  const summaries = data.records
    .map(
      (r) =>
        `- المعرف: ${r.id}
  العنوان: ${r.title}
  الحالة: ${r.status}${r.approved ? " [معتمد]" : ""}
  الجمهور: ${r.audience ?? "غير محدد"}
  الهدف: ${r.purpose ?? "غير محدد"}
  القناة المفضلة: ${r.channel ?? "غير محددة"}
  القنوات المقترحة: ${r.channels.length ? r.channels.join("، ") : "لا توجد"}
  قرار النشر: ${r.publicationLabel ?? "لم يُحلَّل"}`
    )
    .join("\n\n");

  return `أنت مستشار تخطيط إعلامي متخصص للمحامين في المملكة العربية السعودية.

## المهمة
ضع خطة نشر ذكية لـ${horizonLabel} تبدأ من ${data.startDate} بناءً على المحتوى المتاح.

## قواعد التخطيط
- المحتوى المعتمد له أولوية قصوى (priority: "high")
- المحتوى المُحلَّل غير المعتمد: أولوية متوسطة (priority: "medium")
- المسودات غير المحللة: أولوية منخفضة (priority: "low")
- لا تضع أكثر من منشور واحد في اليوم الواحد
- فجوة يوم على الأقل بين كل منشورَين
- أيام الأسبوع (الاثنين–الخميس) للمحتوى القانوني والتعليمي
- الأحد والخميس للمحتوى العام والتعريف بالخدمات
- اختر القناة الأنسب بناءً على الجمهور والهدف
- نبّه عن أي أسبوع بلا محتوى مناسب للنشر في قسم gaps

## المحتوى المتاح
${summaries}

أرجع JSON فقط بدون أي نص إضافي:
{
  "plan": [
    {
      "contentId": "المعرف كما ورد أعلاه",
      "suggestedDate": "YYYY-MM-DD",
      "channel": "اسم القناة",
      "reason": "سبب الاختيار بجملة واحدة مختصرة",
      "priority": "high|medium|low"
    }
  ],
  "gaps": ["وصف الفجوة إن وجدت"],
  "summary": "ملخص الخطة في جملتين"
}`;
}

function extractJson(raw: string): string | null {
  const block = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (block) return block[1].trim();
  const obj = raw.match(/\{[\s\S]*\}/);
  return obj ? obj[0] : null;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات غير صالحة" }, { status: 400 });
  }
  if (parsed.data.records.length === 0) {
    return NextResponse.json({ error: "لا يوجد محتوى لتخطيطه" }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;

  // ── No API key → local fallback ────────────────────────────────────────────
  if (!apiKey) {
    return NextResponse.json(buildLocalPlan(parsed.data));
  }

  // ── Claude API ─────────────────────────────────────────────────────────────
  const client = new Anthropic({ apiKey });
  let rawText: string;
  try {
    const message = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 2048,
      thinking: { type: "disabled" },
      messages: [{ role: "user", content: buildPrompt(parsed.data) }],
    });
    rawText = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");
  } catch (err) {
    // API failed → fall back to local planner rather than erroring out
    console.warn("[smart-plan] Claude API error, falling back to local planner:", err);
    return NextResponse.json(buildLocalPlan(parsed.data));
  }

  const jsonStr = extractJson(rawText);
  if (!jsonStr) {
    return NextResponse.json(buildLocalPlan(parsed.data));
  }

  try {
    const result = JSON.parse(jsonStr) as PlanResult;
    // حاكم المنصة على ملاحظات التخطيط المعروضة (الملخص والفجوات والأسباب) —
    // حكم دلالي بالمعنى (بلا أنماط حرفية، بقرار مالكة المنصة): إن حملت أيّها مخالفة
    // أو تعذّر الحكم، يُرجَع المخطِّط المحلي الحتمي الآمن كاملاً، فلا يظهر للمستخدم
    // أي نص يخالف القواعد ولو كان ملاحظة تخطيط داخلية.
    const commentary = [result.summary, ...(result.gaps ?? []), ...result.plan.map((p) => p.reason)].join("\n");
    const gate = await governText(commentary, undefined, undefined, { checkLanguage: false });
    if (!gate.compliant) {
      return NextResponse.json(buildLocalPlan(parsed.data));
    }
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(buildLocalPlan(parsed.data));
  }
}
