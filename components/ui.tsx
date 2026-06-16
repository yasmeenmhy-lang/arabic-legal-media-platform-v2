import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, FileText, ShieldAlert } from "lucide-react";
import { clsx } from "clsx";

type Tone = "neutral" | "good" | "warn" | "danger" | "gold";

const toneStyles: Record<Tone, { soft: string; text: string; border: string; solid: string }> = {
  neutral: { soft: "bg-slate-50", text: "text-ink/70", border: "border-line", solid: "bg-slate-500" },
  good: { soft: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", solid: "bg-emerald-600" },
  warn: { soft: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", solid: "bg-amber-500" },
  danger: { soft: "bg-red-50", text: "text-red-800", border: "border-red-200", solid: "bg-red-600" },
  gold: { soft: "bg-[#fbf6ea]", text: "text-gold", border: "border-[#ead8ad]", solid: "bg-gold" }
};

export function PageHeader({
  title,
  description,
  action,
  eyebrow
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-6 rounded-lg border border-line bg-white p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
        <div>
          {eyebrow ? <p className="mb-2 text-xs font-extrabold text-palm">{eyebrow}</p> : null}
          <h2 className="text-[1.65rem] font-extrabold leading-10 text-ink">{title}</h2>
          <p className="mt-2 max-w-4xl text-sm leading-7 text-ink/65">{description}</p>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

export function ButtonLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-md bg-palm px-4 py-2.5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#005647] focus-ring"
    >
      {children}
      <ArrowLeft size={16} />
    </Link>
  );
}

export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={clsx("rounded-lg border border-line bg-white p-5 shadow-sm", className)}>{children}</section>;
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4 flex flex-col gap-1">
      <h3 className="text-base font-extrabold text-ink">{title}</h3>
      {subtitle ? <p className="text-xs leading-6 text-ink/55">{subtitle}</p> : null}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon
}: {
  label: string;
  value: string;
  hint: string;
  tone?: Tone;
  icon?: React.ReactNode;
}) {
  const toneStyle = toneStyles[tone];
  return (
    <Panel className={clsx("relative overflow-hidden", toneStyle.border)}>
      <div className={clsx("absolute inset-x-0 top-0 h-1", toneStyle.solid)} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-ink/55">{label}</p>
          <p className={clsx("mt-2 break-words text-3xl font-extrabold leading-none", toneStyle.text)}>{value}</p>
        </div>
        {icon ? <div className={clsx("grid h-10 w-10 place-items-center rounded-md", toneStyle.soft, toneStyle.text)}>{icon}</div> : null}
      </div>
      <p className="mt-3 text-xs leading-6 text-ink/55">{hint}</p>
    </Panel>
  );
}

export function KpiGrid({ items }: { items: { label: string; value: string; hint: string; tone?: Tone; icon?: React.ReactNode }[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <KpiCard key={item.label} {...item} />
      ))}
    </div>
  );
}

export function StatusBadge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: Tone }) {
  const toneStyle = toneStyles[tone];
  return <span className={clsx("inline-flex rounded-md border px-2.5 py-1 text-xs font-extrabold", toneStyle.soft, toneStyle.text, toneStyle.border)}>{children}</span>;
}

export function ProgressBar({ value, tone = "good" }: { value: number; tone?: Tone }) {
  const bounded = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
      <div className={clsx("h-full rounded-full", toneStyles[tone].solid)} style={{ width: `${bounded}%` }} />
    </div>
  );
}

export function ScoreCard({
  label,
  value,
  tone = "good",
  detail
}: {
  label: string;
  value: number;
  tone?: Tone;
  detail?: string;
}) {
  return (
    <div className={clsx("rounded-lg border p-4", toneStyles[tone].soft, toneStyles[tone].border)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-extrabold text-ink">{label}</p>
        <p className={clsx("text-2xl font-extrabold", toneStyles[tone].text)}>{value}%</p>
      </div>
      <div className="mt-3">
        <ProgressBar value={value} tone={tone} />
      </div>
      {detail ? <p className="mt-2 text-xs leading-6 text-ink/60">{detail}</p> : null}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid min-h-48 place-items-center rounded-lg border border-dashed border-line bg-white p-8 text-center">
      <div>
        <FileText className="mx-auto text-ink/35" />
        <p className="mt-3 font-extrabold">{title}</p>
        <p className="mt-2 max-w-md text-sm leading-7 text-ink/60">{body}</p>
      </div>
    </div>
  );
}

export function WorkflowSteps({ steps }: { steps: string[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-5">
      {steps.map((step, index) => (
        <div key={step} className="rounded-lg border border-line bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-mint text-sm font-extrabold text-palm">{index + 1}</span>
            {index === 0 ? <Clock3 size={18} className="text-palm" /> : index === 1 ? <ShieldAlert size={18} className="text-amber-600" /> : <CheckCircle2 size={18} className="text-emerald-700" />}
          </div>
          <p className="text-sm font-extrabold leading-6">{step}</p>
        </div>
      ))}
    </div>
  );
}

export function DataTable({
  headers,
  rows
}: {
  headers: string[];
  rows: Array<Array<React.ReactNode>>;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-line bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-[#f8faf9] text-ink/65">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-3 text-right text-xs font-extrabold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-line align-top hover:bg-[#fbfcfb]">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3 leading-7">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function BarList({ items, tone = "good" }: { items: { label: string; value: number }[]; tone?: Tone }) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-2 flex justify-between text-sm">
            <span className="font-bold text-ink/75">{item.label}</span>
            <span className="font-extrabold">{item.value}%</span>
          </div>
          <ProgressBar value={item.value} tone={tone} />
        </div>
      ))}
    </div>
  );
}
