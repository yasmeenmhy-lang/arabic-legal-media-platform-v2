import { clsx } from "clsx";

type OfficialEntityKey = "moj" | "najiz" | "sba" | "media" | "gmedia";

const entityStyles: Record<OfficialEntityKey, { label: string; short: string; color: string; bg: string; src: string }> = {
  moj: { label: "وزارة العدل", short: "MOJ", color: "text-emerald-800", bg: "bg-emerald-50", src: "https://laws.moj.gov.sa/logo.png" },
  najiz: { label: "ناجز", short: "ناجز", color: "text-teal-800", bg: "bg-teal-50", src: "https://najiz.sa/favicon.ico" },
  sba: { label: "الهيئة السعودية للمحامين", short: "SBA", color: "text-slate-800", bg: "bg-slate-100", src: "https://sba.gov.sa/favicon.ico" },
  media: { label: "وزارة الإعلام", short: "MEDIA", color: "text-sky-800", bg: "bg-sky-50", src: "https://media.gov.sa/favicon.ico" },
  gmedia: { label: "مركز التواصل الحكومي", short: "GOV", color: "text-indigo-800", bg: "bg-indigo-50", src: "https://gmedia.gov.sa/favicon.ico" }
};

export function officialEntityFromUrl(url: string): OfficialEntityKey {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host.includes("najiz.sa")) return "najiz";
    if (host.includes("sba.gov.sa")) return "sba";
    if (host.includes("media.gov.sa")) return "media";
    if (host.includes("gmedia.gov.sa")) return "gmedia";
    return "moj";
  } catch {
    return "moj";
  }
}

export function OfficialLogo({ entity, className }: { entity: OfficialEntityKey; className?: string }) {
  const style = entityStyles[entity];
  return (
    <span
      role="img"
      aria-label={`شعار ${style.label}`}
      title={`شعار ${style.label}`}
      className={clsx(
        "inline-flex min-h-11 min-w-28 shrink-0 items-center justify-center gap-2 rounded-md border border-line px-3 py-2 text-[11px] font-semibold tracking-wide",
        style.bg,
        style.color,
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={style.src} alt={`شعار ${style.label}`} className="h-7 w-7 object-contain" />
      <span aria-hidden="true">{style.label}</span>
    </span>
  );
}
