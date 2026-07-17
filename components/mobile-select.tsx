"use client";

import { useState } from "react";
import { ChevronDown, Globe } from "lucide-react";
import { InstagramIcon, LinkedInIcon, SnapchatIcon, TikTokIcon, XIcon, YouTubeIcon } from "@/components/social-icons";

// قائمة منسدلة للجوال فقط (sm:hidden) — تجربة الجوال: بدل شبكة الأزرار الطويلة.
// الحاسوب يبقى على الأزرار. emptyLabel لخيار فارغ اختياري (كالقناة)؛ وإلا placeholder معطّل.
export function MobileSelect({ value, onChange, placeholder, emptyLabel, options }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  emptyLabel?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative sm:hidden">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-lg border border-line bg-white py-2.5 pl-9 pr-3 text-sm text-ink focus-ring"
      >
        {emptyLabel !== undefined ? (
          <option value="">{emptyLabel}</option>
        ) : (
          <option value="" disabled>{placeholder ?? "اختر"}</option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40" />
    </div>
  );
}

// القناة تحتاج لوقو ملوّناً + اسماً (القائمة الأصلية لا تعرض أيقونات) — قائمة مخصّصة للجوال
const channelBrand: Record<string, { icon: (p: { size?: number; className?: string }) => JSX.Element; color: string }> = {
  LinkedIn: { icon: LinkedInIcon, color: "text-[#0A66C2]" },
  X: { icon: XIcon, color: "text-black" },
  Instagram: { icon: InstagramIcon, color: "text-[#E4405F]" },
  TikTok: { icon: TikTokIcon, color: "text-black" },
  Snapchat: { icon: SnapchatIcon, color: "text-[#E5CF00]" },
  YouTube: { icon: YouTubeIcon, color: "text-[#FF0000]" },
};

export function ChannelGlyph({ name, size = 16 }: { name: string; size?: number }) {
  const b = channelBrand[name];
  if (!b) return <Globe size={size} className="text-ink/55" />;
  const Icon = b.icon;
  return <span className={b.color}><Icon size={size} /></span>;
}

export function ChannelSelect({ value, onChange, channels }: { value: string; onChange: (v: string) => void; channels: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-line bg-white px-3 py-2.5 text-sm focus-ring"
      >
        <span className="flex items-center gap-2">
          {value ? <ChannelGlyph name={value} /> : null}
          <span className={value ? "text-ink" : "text-ink/45"}>{value || "بلا قناة (نص عام)"}</span>
        </span>
        <ChevronDown size={16} className={`shrink-0 text-ink/40 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden="true" />
          <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-line bg-white py-1 shadow-lg">
            <li>
              <button type="button" onClick={() => { onChange(""); setOpen(false); }}
                className={`flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-mint ${!value ? "bg-mint/60 font-semibold text-palm" : "text-ink/60"}`}>
                بلا قناة (نص عام)
              </button>
            </li>
            {channels.map((c) => (
              <li key={c}>
                <button type="button" onClick={() => { onChange(c); setOpen(false); }}
                  className={`flex w-full items-center gap-2 px-3 py-2.5 text-sm hover:bg-mint ${value === c ? "bg-mint/60 font-semibold text-palm" : "text-ink"}`}>
                  <ChannelGlyph name={c} />
                  {c}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
