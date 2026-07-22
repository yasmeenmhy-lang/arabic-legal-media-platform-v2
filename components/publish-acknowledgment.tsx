"use client";

// ─────────────────────────────────────────────────────────────────────────────
// بوابة الإقرار قبل الاعتماد/النشر (بقرار مالكة المنصة) — إقرار مهني متدرّج يوقّعه
// المستخدم المخوّل عن صاحب الحساب، يُسند مسؤولية النشر للمحامي المرخَّص مالك الحساب،
// ويحمي المنصة قانونياً. متدرّج حسب مستوى المخاطر:
// - منخفض: إقرار أساسي.
// - منخفض مع تضرّر المحامي وحده: إقرار أساسي + تنبيه احترازي.
// - متوسط: إقرار مشدَّد يذكر الجهات والسبب والإجراء، وتُسجَّل واقعته.
// (المرتفع/البالغ والمخالفة محجوبة قبل الوصول هنا — لا إقرار لها.)
//
// الصياغة معتمدة من مالكة المنصة (محامية مرخَّصة). عرضٌ لا يمسّ منطق الفحص.
// ─────────────────────────────────────────────────────────────────────────────
import { useState } from "react";
import { ShieldCheck, AlertTriangle, X } from "lucide-react";

export type AckTier = "low" | "medium";

// النص الثابت لتعريف دور المنصة — حصنها الأول (لا يُعدّل إلا باعتماد مالكة المنصة)
const FRAMEWORK_TEXT =
  "تُوفّر المنصة أدوات مساندة تقنية لتحليل المحتوى وتجويده وفق ضوابط مهنية، ولا تُعدّ استشارةً قانونية، ولا تضمن نتيجةً نظاميةً أو قضائية، ولا تُغني عن إعمال المحامي لتقديره المهني المستقل.";

const LOW_ACK =
  "أُقِرّ بأنني مخوّل باستخدام هذا الحساب، وأن المحتوى يُراجَع ويُنشر تحت المسؤولية النظامية والمهنية للمحامي المرخَّص صاحب الحساب وإشرافه، ويتحمّل صاحب الحساب المسؤولية عن قرار النشر وما يترتب عليه، في حدود ما تقرّره الأنظمة المرعيّة.";

const MEDIUM_ACK =
  "أُقِرّ بأنني مخوّل باستخدام هذا الحساب، وباطّلاعي على التنبيه الاحترازي أعلاه، وأن نشر المحتوى يتم باختيار صاحب الحساب وتقديره المهني المستقل، ويتحمّل المحامي المرخَّص صاحب الحساب وحده المسؤولية النظامية والمهنية عن هذا النشر ونتائجه، في حدود ما تقرّره الأنظمة المرعيّة.";

// النص الذي يُسجَّل مع واقعة الإقرار (للقيمة الإثباتية)
export function acknowledgmentTextFor(tier: AckTier): string {
  return `${tier === "medium" ? MEDIUM_ACK : LOW_ACK}\n\n${FRAMEWORK_TEXT}`;
}

export function PublishAcknowledgment({
  open,
  tier,
  lawyerNotice,
  parties,
  reason,
  action,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  tier: AckTier;
  lawyerNotice?: boolean;   // منخفض مع تضرّر المحامي وحده
  parties?: string[];       // للمتوسط
  reason?: string;          // للمتوسط
  action?: string;          // للتنبيه/المتوسط
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [checked, setChecked] = useState(false);
  if (!open) return null;

  const ackText = tier === "medium" ? MEDIUM_ACK : LOW_ACK;
  const title = tier === "medium" ? "إقرار احترازي قبل النشر" : "إقرار قبل الاعتماد والنشر";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {tier === "medium"
              ? <AlertTriangle size={18} className="text-amber-600" aria-hidden="true" />
              : <ShieldCheck size={18} className="text-palm" aria-hidden="true" />}
            <h3 className="font-semibold text-ink">{title}</h3>
          </div>
          <button type="button" onClick={onCancel} aria-label="إغلاق" className="text-ink/40 transition hover:text-ink">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        {/* تنبيه المحامي وحده (ضمن منخفض) */}
        {tier === "low" && lawyerNotice && (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-800">
            تنبيه احترازي: قد يشتمل المحتوى على ما قد يُعرّض المحامي لمساءلة مهنية.
            {action ? ` يُوصى بمراجعة ${action} قبل النشر.` : " يُوصى بمراجعته قبل النشر."}
          </div>
        )}

        {/* متن المتوسط: الجهات + السبب + الإجراء */}
        {tier === "medium" && (
          <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-7 text-amber-900">
            <p>رصدت المراجعة أثراً احترازياً محتملاً{parties && parties.length ? ` على: ${parties.join("، ")}` : ""}.</p>
            {reason && <p className="mt-1">السبب: {reason}</p>}
            {action && <p className="mt-1">الإجراء المُوصى به: {action}</p>}
          </div>
        )}

        {/* صندوق الإقرار */}
        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-paper/40 p-3">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-palm"
          />
          <span className="text-sm leading-7 text-ink/85">{ackText}</span>
        </label>

        {/* النص الثابت لدور المنصة */}
        <p className="mt-3 text-xs leading-6 text-ink/45">{FRAMEWORK_TEXT}</p>

        <div className="mt-4 flex flex-wrap justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-line px-4 py-2 text-sm text-ink/70 transition hover:bg-paper focus-ring"
          >
            إلغاء
          </button>
          <button
            type="button"
            disabled={!checked}
            onClick={onConfirm}
            className="inline-flex items-center gap-2 rounded-lg bg-palm px-5 py-2 text-sm font-medium text-white transition hover:bg-palmDark disabled:cursor-not-allowed disabled:opacity-50 focus-ring"
          >
            <ShieldCheck size={15} aria-hidden="true" />
            إقرار واعتماد
          </button>
        </div>
      </div>
    </div>
  );
}
