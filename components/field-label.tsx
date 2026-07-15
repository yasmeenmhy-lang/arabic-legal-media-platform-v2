// عنوان حقل بنمط المنصات الحكومية — شريط جانبي أخضر + نص غامق + نجمة حمراء للإلزامي.
// طبقة عرض بحتة، لا تمس أي منطق حالة أو معادلة سياق.
export function FieldLabel({
  label,
  hint,
  required,
  optional,
  as = "p",
  className = "",
}: {
  label: string;
  hint?: string;
  required?: boolean;
  optional?: boolean;
  as?: "p" | "span";
  className?: string;
}) {
  const Tag = as;
  return (
    <Tag className={`mb-2 flex flex-wrap items-center gap-1.5 border-r-[3px] border-palm pr-2.5 text-sm font-bold leading-6 text-ink ${className}`}>
      <span>{label}</span>
      {required ? <span className="text-red-500" aria-hidden="true">*</span> : null}
      {optional ? <span className="text-xs font-normal text-ink/40">(اختياري)</span> : null}
      {hint ? <span className="text-xs font-normal text-ink/40">{hint}</span> : null}
    </Tag>
  );
}
