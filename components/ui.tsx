import Link from "next/link";
import { ArrowLeft, CheckCircle2, Clock3, FileText, ShieldAlert } from "lucide-react";
import { clsx } from "clsx";
import React from "react";

/* ═══════════════════════════════════════════════════════
   DGA كود المنصات — نظام الأزرار الموحد
   المصدر: design.dga.gov.sa/guidelines
   ═══════════════════════════════════════════════════════ */

type ButtonVariant =
  | "primary"         // أساسي - الهوية  (أخضر، تركيز عالٍ)
  | "primary-black"   // أساسي - حيادي   (أسود، تركيز عالٍ)
  | "secondary"       // ثانوي - لون واحد (إطار أخضر، تركيز متوسط)
  | "secondary-gray"  // ثانوي - محدد     (إطار رمادي، تركيز متوسط)
  | "light"           // خفيف             (خلفية خضراء خفيفة، تركيز منخفض)
  | "ghost"           // شفاف             (بلا خلفية، تركيز منخفض)
  | "destructive";    // تحذيري           (أحمر)

type ButtonSize = "sm" | "md" | "lg";

const btnVariant: Record<ButtonVariant, string> = {
  "primary":       "bg-palm text-white border border-transparent hover:bg-palmDark active:bg-palmDark/90 disabled:bg-palm",
  "primary-black": "bg-ink text-white border border-transparent hover:bg-ink/85 active:bg-ink/75 disabled:bg-ink",
  "secondary":     "bg-transparent text-palm border border-palm hover:bg-mint active:bg-mint/70 disabled:border-palm/40 disabled:text-palm/40",
  "secondary-gray":"bg-transparent text-ink border border-warmGrayBorder hover:bg-paper active:bg-warmGraySoft disabled:border-warmGrayBorder/40 disabled:text-ink/40",
  "light":         "bg-mint text-palm border border-transparent hover:bg-mint/70 active:bg-mint/50 disabled:bg-mint/50",
  "ghost":         "bg-transparent text-palm border border-transparent hover:bg-mint active:bg-mint/60 disabled:text-palm/40",
  "destructive":   "bg-red-600 text-white border border-transparent hover:bg-red-700 active:bg-red-800 disabled:bg-red-600",
};

const btnSize: Record<ButtonSize, string> = {
  sm: "px-2 py-0.5 text-xs gap-1 rounded-md min-h-[32px]",
  md: "px-[11px] py-[9px] text-sm gap-2 rounded-lg min-h-[40px]",
  lg: "px-4 py-3 text-sm gap-2 rounded-lg min-h-[44px] min-w-[44px]",
};

export function Button({
  variant = "primary",
  size = "md",
  leadingIcon,
  trailingIcon,
  children,
  className,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}) {
  return (
    <button
      disabled={disabled}
      className={clsx(
        "inline-flex items-center justify-center font-medium transition-colors",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palm",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        btnVariant[variant],
        btnSize[size],
        className
      )}
      {...props}
    >
      {leadingIcon && <span className="shrink-0 flex items-center">{leadingIcon}</span>}
      {children   && <span className="min-w-0">{children}</span>}
      {trailingIcon && <span className="shrink-0 flex items-center">{trailingIcon}</span>}
    </button>
  );
}

export function IconButton({
  label,
  size = "md",
  variant = "secondary-gray",
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  size?: ButtonSize;
  variant?: ButtonVariant;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      className={clsx(
        "inline-flex items-center justify-center font-medium transition-colors rounded-lg",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palm",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        size === "sm" ? "h-8 w-8" : size === "lg" ? "h-11 w-11" : "h-10 w-10",
        btnVariant[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

type Tone = "neutral" | "good" | "gold" | "warning" | "danger";

const toneStyles: Record<Tone, { soft: string; text: string; border: string; solid: string }> = {
  good: { soft: "bg-mint", text: "text-palm", border: "border-palm/25", solid: "bg-palm" },
  neutral: { soft: "bg-warmGraySoft", text: "text-warmGrayText", border: "border-warmGrayBorder", solid: "bg-warmGray" },
  gold: { soft: "bg-goldSoft", text: "text-gold", border: "border-goldBorder", solid: "bg-gold" },
  // تحذيري برتقالي وفق كود المنصات — لحالات مثل «غير جاهز للنشر» التي لا تستحق الأحمر
  // (محجوز لمخالفة صريحة قائمة) لكنها ليست سليمة أيضاً.
  warning: { soft: "bg-[#FFFAEB]", text: "text-[#93370D]", border: "border-[#FEDF89]", solid: "bg-[#F79009]" },
  danger: { soft: "bg-red-50", text: "text-red-700", border: "border-red-200", solid: "bg-red-600" }
};

export function PageHeader({
  title,
  description,
  action,
  eyebrow,
  illustration
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  eyebrow?: string;
  // رسم مسطّح اختياري بألوان المنصة — يُعرض بجانب العنوان على الشاشات الواسعة
  illustration?: React.ReactNode;
}) {
  return (
    // ترويسة الصفحة — معالجة بصرية بألوان هوية DGA وحدها (بقرار مالكة المنصة:
    // خفيفة ورشيقة، غير حادة ولا مظلمة). التدرّج شعاعيّ من الزاوية الرائدة
    // (أعلى اليمين في RTL) بدل التدرّج المسطّح، ليعطي عمقاً هادئاً بلا ثِقَل.
    <div className="relative mb-6 w-full max-w-full overflow-hidden rounded-xl border border-line bg-[radial-gradient(130%_150%_at_100%_0%,#F3FCF6_0%,#FFFFFF_48%,#FFFFFF_100%)] p-4 shadow-sm sm:p-6 lg:p-7">
      {/* شريط الهوية على الحافة الرائدة — يتلاشى نزولاً فلا يكون خطاً حاداً */}
      <span aria-hidden="true" className="absolute inset-y-0 right-0 w-[3px] bg-gradient-to-b from-palm via-palm/40 to-transparent" />
      <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
        {/* الرسم بجانب العنوان في كل المقاسات (الجوال أصغر) — لا يُخفى على الجوال */}
        <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-6">
          <div className="min-w-0 max-w-full flex-1">
            {/* اللافتة العلوية بخطٍّ فاصل رفيع — تُقرأ تصنيفاً مقصوداً لا سطراً عابراً */}
            {eyebrow ? (
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.06em] text-palm">
                <span aria-hidden="true" className="h-px w-6 shrink-0 bg-gradient-to-l from-palm/70 to-transparent" />
                <span className="min-w-0 truncate">{eyebrow}</span>
              </p>
            ) : null}
            {/* العنوان يأخذ حاجته من العرض ولا ينكسر لعرضٍ محجوز بجانبه (بقرار المالكة) */}
            <h2 className="text-balance text-lg font-semibold leading-8 text-ink sm:text-xl sm:leading-9 lg:text-[1.7rem] lg:leading-[2.5rem]">{title}</h2>
            {description ? <p className="mt-2 max-w-4xl text-sm leading-7 text-ink/65">{description}</p> : null}
          </div>
          {illustration ? <div className="max-w-[170px] shrink-0 sm:max-w-[250px]">{illustration}</div> : null}
        </div>
        {action ? <div className="min-w-0 shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}

// رسم مسطّح للتحليل: مستند بأسطره، عدسة فحص، وعلامة اعتماد — بألوان المنصة وحدها،
// بلا أي أصل خارجي ولا محاكاة ثلاثية الأبعاد.
export function AnalysisArt() {
  return (
    <svg viewBox="0 0 150 150" fill="none" aria-hidden="true" className="h-auto w-full">
      <circle cx="75" cy="75" r="66" fill="#DFF6E7" />
      <circle cx="75" cy="75" r="50" fill="#F3FCF6" />
      {/* ورقة خلفية تعطي عمقاً بلا محاكاة ثلاثية الأبعاد */}
      <rect x="46" y="24" width="58" height="80" rx="9" fill="#fff" opacity="0.65" transform="rotate(-7 75 64)" />
      {/* المستند */}
      <rect x="42" y="26" width="60" height="82" rx="9" fill="#fff" stroke="#25935F" strokeWidth="2.5" />
      <rect x="53" y="41" width="38" height="5" rx="2.5" fill="#DFF6E7" />
      <rect x="53" y="54" width="28" height="5" rx="2.5" fill="#DFF6E7" />
      <rect x="53" y="67" width="33" height="5" rx="2.5" fill="#DFF6E7" />
      <rect x="53" y="80" width="20" height="5" rx="2.5" fill="#DFF6E7" />
      {/* عدسة الفحص */}
      <circle cx="94" cy="88" r="21" fill="#fff" fillOpacity="0.95" stroke="#166A45" strokeWidth="4" />
      <path d="M86 84a8 8 0 0 1 8-6" stroke="#25935F" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.5" />
      <path d="M109 103 L124 118" stroke="#166A45" strokeWidth="6" strokeLinecap="round" />
      {/* شارة الاعتماد */}
      <circle cx="40" cy="100" r="16" fill="#25935F" />
      <path d="M33 100 l5 5 l9 -10" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* لمعات خفيفة */}
      <circle cx="118" cy="38" r="3.5" fill="#25935F" opacity="0.35" />
      <circle cx="30" cy="46" r="2.5" fill="#25935F" opacity="0.3" />
      <circle cx="126" cy="62" r="2" fill="#25935F" opacity="0.25" />
    </svg>
  );
}

// رسم مسطّح لمركز المحتوى: مستند ولمعة الإنشاء — بلوني المنصة الأخضر والبنفسجي،
// إذ يجمع المركز مسارَي المراجعة والإنشاء.
export function StudioArt() {
  return (
    <svg viewBox="0 0 150 150" fill="none" aria-hidden="true" className="h-auto w-full">
      <circle cx="75" cy="75" r="66" fill="#DFF6E7" />
      <circle cx="75" cy="75" r="50" fill="#F3FCF6" />
      <rect x="46" y="24" width="58" height="80" rx="9" fill="#fff" opacity="0.65" transform="rotate(-7 75 64)" />
      <rect x="42" y="26" width="60" height="82" rx="9" fill="#fff" stroke="#25935F" strokeWidth="2.5" />
      <rect x="53" y="41" width="38" height="5" rx="2.5" fill="#DFF6E7" />
      <rect x="53" y="54" width="28" height="5" rx="2.5" fill="#DFF6E7" />
      <rect x="53" y="67" width="33" height="5" rx="2.5" fill="#DFF6E7" />
      <rect x="53" y="80" width="20" height="5" rx="2.5" fill="#DFF6E7" />
      {/* لمعة الإنشاء بالبنفسجي — لون مسار الإنشاء في المنصة */}
      <circle cx="99" cy="94" r="21" fill="#80519F" />
      <path
        d="M99 83 l3.2 6.6 l6.8 3.4 l-6.8 3.4 l-3.2 6.6 l-3.2 -6.6 l-6.8 -3.4 l6.8 -3.4 z"
        fill="#fff"
      />
      <circle cx="40" cy="100" r="16" fill="#25935F" />
      <path d="M33 100 l5 5 l9 -10" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="118" cy="38" r="3.5" fill="#25935F" opacity="0.35" />
      <circle cx="30" cy="46" r="2.5" fill="#80519F" opacity="0.3" />
      <circle cx="126" cy="62" r="2" fill="#25935F" opacity="0.25" />
    </svg>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: ButtonVariant;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={clsx(
        "inline-flex cursor-pointer items-center justify-center gap-2 font-medium transition",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-palm",
        btnVariant[variant],
        btnSize["md"],
        className
      )}
    >
      {children}
    </Link>
  );
}

export function ModuleTabs({
  items
}: {
  items: Array<{ label: string; href: string; active?: boolean }>;
}) {
  return (
    <nav className="mb-6 flex w-full max-w-full gap-2 overflow-x-auto rounded-lg border border-line bg-white p-2 shadow-sm">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={clsx(
            "shrink-0 rounded-md px-4 py-2.5 text-sm font-normal transition focus-ring",
            item.active ? "bg-palm text-white" : "text-ink/70 hover:bg-paper hover:text-ink"
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

export function Panel({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLElement> & { children: React.ReactNode }) {
  // القصّ أفقي فقط (overflow-x-clip): يمنع تجاوز المحتوى العريض عرض البطاقة كما كان،
  // ويسمح في الوقت نفسه للقوائم المنسدلة بالظهور كاملةً خارج حدّ البطاقة بدل قصّها
  // (كان overflow-hidden يقصّ قائمة البحث المنسدلة عند حافة البطاقة السفلية).
  return <section {...props} className={clsx("w-full max-w-full overflow-x-clip rounded-lg border border-line bg-white p-4 shadow-sm sm:p-5", className)}>{children}</section>;
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4 flex max-w-full flex-col gap-1">
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
    <div className={clsx("group relative h-full w-full max-w-full rounded-lg border bg-white shadow-sm", toneStyle.border)}>
      <div className={clsx("h-[3px] rounded-t-lg", toneStyle.solid)} />
      <div className="relative p-4 sm:p-5">
        {/* hint → tooltip on hover */}
        <div className="pointer-events-none absolute bottom-full right-0 z-50 mb-1.5 hidden max-w-[200px] break-words rounded-md bg-ink/90 px-2.5 py-1.5 text-xs leading-5 text-white shadow-md group-hover:block">
          {hint}
        </div>
        {icon ? <div className={clsx("mb-2.5 grid h-9 w-9 place-items-center rounded-md", toneStyle.soft, toneStyle.text)}>{icon}</div> : null}
        <p className={clsx("break-words text-[26px] font-semibold leading-none", toneStyle.text)}>{value}</p>
        <p className="mt-2 text-[12px] text-ink/55">{label}</p>
      </div>
    </div>
  );

  if (!href) return content;

  return (
    <Link href={href} aria-label={label} className="block w-full max-w-full rounded-lg transition hover:-translate-y-0.5 hover:shadow-md focus-ring">
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
  return <span className={clsx("inline-flex max-w-full rounded-full border px-2.5 py-1 text-xs font-normal leading-5", toneStyle.soft, toneStyle.text, toneStyle.border)}>{children}</span>;
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
    <div className={clsx("w-full max-w-full rounded-lg border p-4", toneStyles[tone].soft, toneStyles[tone].border)}>
      <div className="flex min-w-0 items-center justify-between gap-3">
        <p className="text-sm font-normal text-ink">{label}</p>
        <p className={clsx("shrink-0 text-2xl font-normal", toneStyles[tone].text)}>{value}%</p>
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
        <div key={step} className="w-full max-w-full overflow-hidden rounded-lg border border-line bg-white p-4 shadow-sm">
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
    <div className="w-full max-w-full overflow-hidden rounded-lg border border-line bg-white">
      <div className="md:hidden">
        <div className="space-y-4 p-3">
          {rows.map((row, rowIndex) => (
            <article key={rowIndex} className="w-full max-w-full rounded-lg border border-line bg-white p-4 shadow-sm">
              <dl className="space-y-4">
                {row.map((cell, cellIndex) => (
                  <div key={cellIndex} className="w-full max-w-full border-b border-line/70 pb-3 last:border-b-0 last:pb-0">
                    <dt className="mb-1 text-xs font-normal leading-6 text-ink/55">{headers[cellIndex] ?? ""}</dt>
                    <dd className="min-w-0 max-w-full text-sm leading-7 text-ink">
                      {cell}
                    </dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>
      </div>
      <div className="hidden md:block">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-paper text-ink/65">
            <tr>
              {headers.map((header) => (
                <th key={header} className="whitespace-normal break-words px-4 py-3 text-right text-xs font-normal leading-6">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-line align-top hover:bg-paper">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="max-w-0 whitespace-normal break-words px-4 py-3 leading-7">
                    <div className="min-w-0 max-w-full whitespace-normal break-words">
                      {cell}
                    </div>
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

/* ═══════════════════════════════════════════════════════
   DGA كود المنصات — مكوّن الاقتباس
   المصدر: design.dga.gov.sa/guidelines → الاقتباس
   ═══════════════════════════════════════════════════════ */

export function DgaBlockquote({
  title,
  text,
  author,
  authorDescription,
  transparent = false,
}: {
  title?: string;
  text: string;
  author?: string;
  authorDescription?: string;
  transparent?: boolean;
}) {
  const closeMarks = '\u201d\u201d';
  const openMarks = '\u201c\u201c';
  return (
    <figure
      className={clsx(
        "relative rounded-lg p-4",
        transparent ? "" : "border border-line bg-white"
      )}
    >
      {title && (
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-ink">{title}</p>
          <span aria-hidden="true" className="shrink-0 select-none text-2xl leading-none text-palm">{closeMarks}</span>
        </div>
      )}
      <blockquote className="text-sm leading-8 text-ink/80">{text}</blockquote>
      <figcaption className="mt-3 flex items-end justify-between gap-3">
        <span aria-hidden="true" className="shrink-0 select-none text-2xl leading-none text-palm">{openMarks}</span>
        {author && (
          <div className="text-right">
            <p className="text-sm font-semibold text-ink">{author}</p>
            {authorDescription && <p className="text-xs text-ink/55">{authorDescription}</p>}
          </div>
        )}
      </figcaption>
    </figure>
  );
}
/* ═══════════════════════════════════════════════════════
   DGA كود المنصات — مؤشر التحميل الدوّار
   المصدر: design.dga.gov.sa/guidelines → مؤشر التحميل
   ═══════════════════════════════════════════════════════ */

const spinnerSize: Record<"xs" | "sm" | "md" | "lg" | "xl", string> = {
  xs: "h-3 w-3 border-[1.5px]",
  sm: "h-4 w-4 border-2",
  md: "h-5 w-5 border-2",
  lg: "h-6 w-6 border-[2.5px]",
  xl: "h-8 w-8 border-[3px]",
};

const spinnerTone: Record<"palm" | "violet", string> = {
  palm:   "border-palm border-t-transparent",
  violet: "border-violet border-t-transparent",
};

export function DgaSpinner({ size = "md", tone = "palm", label = "جاري التحميل..." }: { size?: keyof typeof spinnerSize; tone?: keyof typeof spinnerTone; label?: string }) {
  return (
    <span role="status" aria-live="polite" aria-label={label} className="inline-flex items-center justify-center">
      <span
        className={clsx("animate-spin rounded-full motion-reduce:animate-none", spinnerSize[size], spinnerTone[tone])}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </span>
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
