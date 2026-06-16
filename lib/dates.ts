const hijriFormatter = new Intl.DateTimeFormat("ar-SA", {
  calendar: "islamic-umalqura",
  day: "numeric",
  month: "long",
  year: "numeric"
});

const gregorianFormatter = new Intl.DateTimeFormat("ar-SA", {
  calendar: "gregory",
  day: "numeric",
  month: "long",
  year: "numeric"
});

const timeFormatter = new Intl.DateTimeFormat("ar-SA", {
  hour: "numeric",
  minute: "numeric",
  hour12: true
});

function toDate(input: Date | string | number) {
  return input instanceof Date ? input : new Date(input);
}

export function formatHijri(input: Date | string | number) {
  const date = toDate(input);
  if (Number.isNaN(date.getTime())) return "غير محدد";
  // Node/ICU already appends " هـ" with a leading space; tighten it to match
  // the platform's "١٥ محرم ١٤٤٧هـ" convention (no space before the suffix).
  return hijriFormatter.format(date).replace(/\s*هـ?$/, "هـ");
}

export function formatGregorian(input: Date | string | number) {
  const date = toDate(input);
  if (Number.isNaN(date.getTime())) return "غير محدد";
  return `${gregorianFormatter.format(date)}م`;
}

/** e.g. "١٥ محرم ١٤٤٧هـ / ١٦ يونيو ٢٠٢٦م" */
export function formatDualDate(input: Date | string | number) {
  const date = toDate(input);
  if (Number.isNaN(date.getTime())) return "غير محدد";
  return `${formatHijri(date)} / ${formatGregorian(date)}`;
}

/** Dual-calendar date followed by the time of day. */
export function formatDualDateTime(input: Date | string | number) {
  const date = toDate(input);
  if (Number.isNaN(date.getTime())) return "غير محدد";
  return `${formatDualDate(date)} - ${timeFormatter.format(date)}`;
}
