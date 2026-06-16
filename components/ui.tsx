import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, FileText, ShieldAlert } from "lucide-react";
import { clsx } from "clsx";

type Tone = "neutral" | "good" | "gold";

const toneStyles: Record<Tone, { soft: string; text: string; border: string; solid: string }> = {
  good: { soft: "bg-mint", text: "text-palm", border: "border-palm/25", solid: "bg-palm" },
  neutral: { soft: "bg-warmGraySoft", text: "text-warmGrayText", border: "border-warmGrayBorder", solid: "bg-warmGray" },
  gold: { soft: "bg-goldSoft", text: "text-gold", border: "border-goldBorder", solid: "bg-gold" }
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
          {eyebrow ? <p className="mb-2 text-xs font-normal text-palm">{eyebrow}</p> : null}
          <h2 className="text-[1.65rem] font-bold leading-10 text-ink">{title}</h2>
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
      className="inline-flex items-center gap-2 rounded-md bg-palm px-4 py-2.5 text-sm font-normal text-white shadow-sm transition hover:bg-palmDark focus-ring"
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
      <h3 className="text-base font-normal text-ink">{title}</h3>
      {subtitle ? <p className="text-xs leading-6 text-ink/55">{subtitle}</p> : null}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
  href
}: {
  label: string;
  value: string;
  hint: string;
  tone?: Tone;
  icon?: React.ReactNode;
  href?: string;
}) {
  const toneStyle = toneStyles[tone];
  const content = (
    <Panel className={clsx("relative overflow-hidden", toneStyle.border)}>
      <div className={clsx("absolute inset-x-0 top-0 h-1", toneStyle.solid)} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-normal text-ink/55">{label}</p>
          <p className={clsx("mt-2 break-words text-3xl font-normal leading-none", toneStyle.text)}>{value}</p>
        </div>
        {icon ? <div className={clsx("grid h-10 w-10 place-items-center rounded-md", toneStyle.soft, toneStyle.text)}>{icon}</div> : null}
      </div>
      <p className="mt-3 text-xs leading-6 text-ink/55">{hint}</p>
    </Panel>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block rounded-lg transition hover:-translate-y-0.5 hover:shadow-md focus-ring">
      {content}
    </Link>
  );
}

export function KpiGrid({ items }: { items: { label: string; value: string; hint: string; tone?: Tone; icon?: React.ReactNode; href?: string }[] }) {
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
  return <span className={clsx("inline-flex rounded-md border px-2.5 py-1 text-xs font-normal", toneStyle.soft, toneStyle.text, toneStyle.border)}>{children}</span>;
}

export function ProgressBar({ value, tone = "good" }: { value: number; tone?: Tone }) {
  const bounded = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-paper">
      <div className={clsx("h-full rounded-full opacity-80", toneStyles[tone].solid)} style={{ width: `${bounded}%` }} />
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
        <p className="text-sm font-normal text-ink">{label}</p>
        <p className={clsx("text-2xl font-normal", toneStyles[tone].text)}>{value}%</p>
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
        <p className="mt-3 font-normal">{title}</p>
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
            <span className="grid h-8 w-8 place-items-center rounded-md bg-mint text-sm font-normal text-palm">{index + 1}</span>
            {index === 0 ? <Clock3 size={18} className="text-palm" /> : index === 1 ? <ShieldAlert size={18} className="text-gold" /> : <CheckCircle2 size={18} className="text-palm" />}
          </div>
          <p className="text-sm font-normal leading-6">{step}</p>
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
          <thead className="bg-paper text-ink/65">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-3 text-right text-xs font-normal">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-line align-top hover:bg-paper">
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
            <span className="font-normal text-ink/75">{item.label}</span>
            <span className="font-normal">{item.value}%</span>
          </div>
          <ProgressBar value={item.value} tone={tone} />
        </div>
      ))}
    </div>
  );
}

export function CircularGauge({ value, label, tone = "good" }: { value: number; label?: string; tone?: Tone }) {
  const bounded = Math.max(0, Math.min(100, value));
  const size = 124;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (circumference * bounded) / 100;
  const toneStyle = toneStyles[tone];

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} className="fill-none stroke-line" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            stroke="currentColor"
            className={clsx("fill-none opacity-80 transition-[stroke-dashoffset]", toneStyle.text)}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className={clsx("text-2xl font-normal", toneStyle.text)}>{bounded}%</span>
        </div>
      </div>
      {label ? <p className="max-w-32 text-center text-xs leading-6 text-ink/60">{label}</p> : null}
    </div>
  );
}

export function NeedleGauge({ value, label, tone = "gold" }: { value: number; label?: string; tone?: Tone }) {
  const bounded = Math.max(0, Math.min(100, value));
  const angle = -90 + (bounded / 100) * 180;
  const size = 180;
  const inset = 16;
  const radius = size / 2 - inset;
  const arcLength = Math.PI * radius;
  const toneStyle = toneStyles[tone];

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width={size} height={size / 2 + inset} viewBox={`0 0 ${size} ${size / 2 + inset}`} className="max-w-full">
        <path
          d={`M ${inset} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - inset} ${size / 2}`}
          strokeWidth={12}
          strokeLinecap="round"
          className="fill-none stroke-line"
        />
        <path
          d={`M ${inset} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - inset} ${size / 2}`}
          strokeWidth={12}
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={arcLength}
          strokeDashoffset={arcLength * (1 - bounded / 100)}
          className={clsx("fill-none opacity-80", toneStyle.text)}
        />
        <g transform={`translate(${size / 2} ${size / 2}) rotate(${angle})`}>
          <line x1="0" y1="4" x2="0" y2={-(radius - 18)} strokeWidth={3} strokeLinecap="round" className="stroke-ink/70" />
          <circle cx="0" cy="0" r="6" className="fill-ink/70" />
        </g>
      </svg>
      <span className={clsx("text-base font-normal", toneStyle.text)}>{bounded}%</span>
      {label ? <p className="max-w-44 text-center text-xs leading-6 text-ink/60">{label}</p> : null}
    </div>
  );
}
