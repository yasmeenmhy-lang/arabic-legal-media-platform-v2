import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, FileText, ShieldAlert } from "lucide-react";
import { clsx } from "clsx";

export function PageHeader({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <h2 className="text-2xl font-extrabold text-ink">{title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-ink/65">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function ButtonLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded bg-palm px-4 py-2 text-sm font-bold text-white focus-ring"
    >
      {children}
      <ArrowLeft size={16} />
    </Link>
  );
}

export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <section className={clsx("rounded border border-line bg-white p-5", className)}>{children}</section>;
}

export function KpiGrid({ items }: { items: { label: string; value: string; hint: string }[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Panel key={item.label}>
          <p className="text-sm text-ink/60">{item.label}</p>
          <p className="mt-3 text-3xl font-extrabold text-ink">{item.value}</p>
          <p className="mt-2 text-xs text-ink/55">{item.hint}</p>
        </Panel>
      ))}
    </div>
  );
}

export function StatusBadge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warn" | "danger" }) {
  const tones = {
    neutral: "bg-paper text-ink/70",
    good: "bg-mint text-palm",
    warn: "bg-[#fff5db] text-[#805b00]",
    danger: "bg-[#ffe8e8] text-[#9b1c1c]"
  };
  return <span className={clsx("rounded px-2.5 py-1 text-xs font-bold", tones[tone])}>{children}</span>;
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="grid min-h-48 place-items-center rounded border border-dashed border-line bg-white p-8 text-center">
      <div>
        <FileText className="mx-auto text-ink/35" />
        <p className="mt-3 font-bold">{title}</p>
        <p className="mt-2 max-w-md text-sm leading-7 text-ink/60">{body}</p>
      </div>
    </div>
  );
}

export function WorkflowSteps({ steps }: { steps: string[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {steps.map((step, index) => (
        <Panel key={step}>
          <div className="mb-4 flex items-center justify-between">
            <span className="grid h-8 w-8 place-items-center rounded bg-mint text-sm font-bold text-palm">{index + 1}</span>
            {index === 0 ? <Clock3 size={18} /> : index === 1 ? <ShieldAlert size={18} /> : <CheckCircle2 size={18} />}
          </div>
          <p className="font-bold">{step}</p>
        </Panel>
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
    <div className="overflow-hidden rounded border border-line bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead className="bg-paper text-ink/65">
            <tr>
              {headers.map((header) => (
                <th key={header} className="px-4 py-3 text-right font-bold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-line">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3">
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

export function BarList({ items }: { items: { label: string; value: number }[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-1 flex justify-between text-sm">
            <span>{item.label}</span>
            <span className="font-bold">{item.value}%</span>
          </div>
          <div className="h-2 rounded bg-paper">
            <div className="h-2 rounded bg-palm" style={{ width: `${item.value}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
