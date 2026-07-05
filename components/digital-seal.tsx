"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

/* ── DGA shield SVG (official-style) ──────────────────────────────────────── */
function DgaShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden="true"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M20 3L5 9v10c0 9.5 6.5 18.4 15 21 8.5-2.6 15-11.5 15-21V9L20 3z"
        fill="currentColor"
        opacity="0.15"
      />
      <path
        d="M20 3L5 9v10c0 9.5 6.5 18.4 15 21 8.5-2.6 15-11.5 15-21V9L20 3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M14 20l4 4 8-8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── Link icon ─────────────────────────────────────────────────────────────── */
function LinkIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 text-palm" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8.5 11.5a4.5 4.5 0 006.364 0l2-2a4.5 4.5 0 00-6.364-6.364l-1 1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.5 8.5a4.5 4.5 0 00-6.364 0l-2 2a4.5 4.5 0 006.364 6.364l1-1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── HTTPS lock icon ───────────────────────────────────────────────────────── */
function HttpsIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 text-palm" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="3" y="9" width="14" height="10" rx="2" strokeLinejoin="round" />
      <path d="M7 9V6a3 3 0 016 0v3" strokeLinecap="round" />
      <circle cx="10" cy="14" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ── Fingerprint icon ──────────────────────────────────────────────────────── */
function FingerprintIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 text-palm" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 3a7 7 0 00-7 7c0 3 1.5 5.5 3.5 7" strokeLinecap="round" />
      <path d="M10 6a4 4 0 014 4c0 1.5-.5 3-1.5 4" strokeLinecap="round" />
      <path d="M10 9a1 1 0 011 1c0 2-1 3.5-2.5 4.5" strokeLinecap="round" />
      <path d="M13.5 5.5A7 7 0 0117 10c0 2-.6 3.9-1.5 5.5" strokeLinecap="round" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */

export function DigitalSeal() {
  const [open, setOpen] = useState(false);

  return (
    <div
      role="status"
      aria-label="الختم الرقمي — موقع حكومي مسجل لدى هيئة الحكومة الرقمية"
      className="overflow-hidden rounded-xl border border-palm/20 bg-white shadow-sm"
    >
      {/* ── Closed / header row ─────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="digital-seal-panel"
        className="group flex w-full items-center gap-2.5 bg-mint/40 px-3 py-2.5 text-right transition hover:bg-mint/70 focus-ring"
      >
        {/* Flag */}
        <span aria-hidden="true" className="shrink-0 text-base leading-none">🇸🇦</span>

        {/* Label */}
        <span className="flex-1 text-[11px] font-semibold leading-[1.5] text-palm">
          موقع حكومي مسجل لدى هيئة الحكومة الرقمية
        </span>

        {/* Verify link */}
        <span className="flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-palm underline decoration-palm/30 underline-offset-2 group-hover:decoration-palm/60">
          كيف تتحقق؟
          {open
            ? <ChevronUp  size={11} aria-hidden="true" className="no-underline" />
            : <ChevronDown size={11} aria-hidden="true" className="no-underline" />
          }
        </span>
      </button>

      {/* ── Expanded panel ──────────────────────────────────────────── */}
      {open && (
        <div id="digital-seal-panel" className="space-y-2.5 px-3 pb-3 pt-3">

          {/* Two trust cards */}
          <div className="grid grid-cols-2 gap-2">

            {/* Domain card */}
            <div className="rounded-lg border border-palm/15 bg-mint/50 p-2.5">
              <div className="mb-1.5">
                <LinkIcon />
              </div>
              <p className="text-[10px] font-semibold leading-[1.5] text-palm">
                روابط المواقع الإلكترونية الحكومية الرسمية تنتهي بـ gov.sa
              </p>
              <p className="mt-1 text-[9px] leading-[1.45] text-ink/50">
                جميع روابط المواقع الرسمية للجهات الحكومية في المملكة العربية السعودية تنتهي بـ gov.sa.
              </p>
            </div>

            {/* HTTPS card */}
            <div className="rounded-lg border border-palm/15 bg-mint/50 p-2.5">
              <div className="mb-1.5">
                <HttpsIcon />
              </div>
              <p className="text-[10px] font-semibold leading-[1.5] text-palm">
                المواقع الإلكترونية الحكومية الموثوقة تستخدم بروتوكول HTTPS
              </p>
              <p className="mt-1 text-[9px] leading-[1.45] text-ink/50">
                تحقق من أن الموقع يستخدم بروتوكول HTTPS.
              </p>
            </div>
          </div>

          {/* Registration row */}
          <div className="flex items-center gap-2.5 rounded-lg border border-palm/15 bg-paper px-3 py-2">
            <FingerprintIcon />
            <p className="flex-1 text-[10px] leading-[1.5] text-ink/65">
              مسجل لدى هيئة الحكومة الرقمية برقم:
            </p>
            <span className="font-mono text-[11px] font-bold text-palm">20230103200</span>
          </div>

          {/* DGA logo row */}
          <div className="flex items-center justify-between border-t border-line pt-2">
            <a
              href="https://www.dga.gov.sa"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-ink/40 underline decoration-ink/20 underline-offset-2 transition hover:text-palm hover:decoration-palm/40 focus-ring rounded"
            >
              هيئة الحكومة الرقمية
            </a>
            <DgaShieldIcon className="h-5 w-5 text-palm" />
          </div>
        </div>
      )}
    </div>
  );
}
