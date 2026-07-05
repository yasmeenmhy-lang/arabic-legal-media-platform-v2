"use client";

// DGA "شريط التقدم الدائري" — RTL-mirrored, aligned to platform design tokens.
// Arc runs counter-clockwise (right-to-left) for Arabic reading direction.

const SIZE = 64;
const SW   = 5;
const R    = (SIZE - SW) / 2;          // 29.5
const CIRC = 2 * Math.PI * R;          // ≈ 185.4

type Variant = "primary" | "neutral";
type StepSize = "sm" | "md" | "lg";

interface CircularStepperProps {
  current:      number;
  total:        number;
  title:        string;
  description?: string;
  next?:        string;
  prev?:        string;
  variant?:     Variant;
  size?:        StepSize;
  className?:   string;
}

const sizeMap: Record<StepSize, { outer: number; sw: number; counter: string; ring: string }> = {
  sm: { outer: 48, sw: 4, counter: "text-[11px]", ring: "text-[10px]" },
  md: { outer: 64, sw: 5, counter: "text-[13px]", ring: "text-[11px]" },
  lg: { outer: 80, sw: 6, counter: "text-base",   ring: "text-sm"     },
};

export function CircularStepper({
  current,
  total,
  title,
  description,
  next,
  prev,
  variant = "primary",
  size    = "md",
  className = "",
}: CircularStepperProps) {
  const cfg   = sizeMap[size];
  const outer = cfg.outer;
  const sw    = cfg.sw;
  const r     = (outer - sw) / 2;
  const circ  = 2 * Math.PI * r;
  const pct   = Math.min(Math.max(current / total, 0), 1);
  const offset = circ * (1 - pct);

  const trackColor   = "var(--color-line,  #e4e7ed)";
  const progressColor = variant === "primary"
    ? "var(--color-palm,  #1a6b4a)"
    : "var(--color-ink,   #1a1f2e)";
  const counterColor  = variant === "primary" ? "text-palm" : "text-ink";

  const cx = outer / 2;
  const cy = outer / 2;

  return (
    <div
      className={`flex items-center gap-3 ${className}`}
      role="progressbar"
      aria-valuenow={current}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={`الخطوة ${current} من ${total}: ${title}`}
    >
      {/* ── Circular indicator (DOM-first → RIGHT side in RTL) ── */}
      <div className="relative shrink-0" style={{ width: outer, height: outer }}>
        <svg
          width={outer}
          height={outer}
          viewBox={`0 0 ${outer} ${outer}`}
          aria-hidden="true"
          // Mirror horizontally so arc runs RTL (counter-clockwise from top)
          style={{ transform: "scaleX(-1)" }}
        >
          {/* Track ring */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={trackColor}
            strokeWidth={sw}
          />
          {/* Progress arc */}
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={progressColor}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            // Start from 12 o'clock
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: "stroke-dashoffset 0.4s ease" }}
          />
        </svg>

        {/* Step counter inside circle (not flipped) */}
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span className={`font-bold ${counterColor} ${cfg.counter}`}>{current}</span>
          <span className={`text-ink/40 ${cfg.ring}`}>من {total}</span>
        </div>
      </div>

      {/* ── Text block (DOM-second → LEFT side in RTL) ── */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-right">
        {prev && (
          <p className="text-[10px] leading-4 text-ink/40">
            السابق: <span className="text-ink/55">{prev}</span>
          </p>
        )}
        <p className={`font-bold leading-snug text-ink ${size === "sm" ? "text-xs" : size === "lg" ? "text-base" : "text-sm"}`}>
          {title}
        </p>
        {description && (
          <p className={`leading-snug text-ink/60 ${size === "sm" ? "text-[10px]" : "text-xs"}`}>
            {description}
          </p>
        )}
        {next && (
          <p className="text-[10px] leading-4 text-ink/40">
            التالي: <span className="text-ink/55">{next}</span>
          </p>
        )}
      </div>
    </div>
  );
}
