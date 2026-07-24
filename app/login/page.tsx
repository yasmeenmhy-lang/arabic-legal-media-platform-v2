import { PageHeader, Panel, StatusBadge } from "@/components/ui";
import { ShieldCheck } from "lucide-react";
import { getNafathConfiguration } from "@/lib/nafath-config";
import { isAuthConfigured } from "@/lib/access-auth";
import { LoginForm, RegisterRequestForm } from "@/components/login-form";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const nafath = getNafathConfiguration();
  const configured = isAuthConfigured();

  return (
    <>
      <PageHeader
        title="تسجيل الدخول"
        description={
          configured
            ? "الدخول بحساب فردي مستقل لكل مستخدم. تُدار الحسابات والرموز من إدارة المنصة."
            : "نظام الدخول الفردي قيد التهيئة، والدخول متاح بالحساب الافتراضي للتجربة."
        }
      />
      <Panel className="mx-auto max-w-lg">
        {configured ? (
          <>
            <LoginForm />
            <p className="mt-3 text-xs leading-6 text-ink/55">
              نسيتِ رمز الدخول؟ تواصلي مع مسؤول المنصة لإعادة تعيينه — لا يوجد بريد إلكتروني مسجَّل لاسترجاعه ذاتياً.
            </p>
            <div className="mt-4">
              <RegisterRequestForm />
            </div>
          </>
        ) : (
          <>
            {/* مرحلة ما قبل التهيئة: يبقى السلوك الحالي كما هو حتى تكتمل متغيرات البيئة */}
            <div className="mb-4 rounded-xl border border-infoBorder bg-infoSoft p-4">
              <p className="text-sm font-semibold text-infoDark">نظام الدخول الفردي غير مهيأ بعد</p>
              <p className="mt-1 text-xs leading-6 text-ink/70">
                بعد ضبط متغيرات البيئة (AUTH_SECRET وADMIN_USERNAME وADMIN_PASSWORD_HASH) يصبح
                الدخول إلزامياً بحسابات فردية ويُدار من لوحة إدارة الوصول.
              </p>
            </div>
            <Link href="/dashboard" className="block w-full rounded bg-palm px-4 py-2 text-center font-normal text-white focus-ring">
              دخول بالحساب الافتراضي — ياسمين
            </Link>
          </>
        )}
        <div className="my-4 flex items-center gap-3 text-xs text-ink/45"><span className="h-px flex-1 bg-line" />أو<span className="h-px flex-1 bg-line" /></div>
        {nafath.enabled ? (
          <a href="/api/auth/nafath" className="flex w-full items-center justify-center gap-2 rounded border border-palm px-4 py-2 font-normal text-palm focus-ring">
            <ShieldCheck size={18} />
            الدخول عبر النفاذ الوطني الموحد
          </a>
        ) : (
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded border border-line px-4 py-2 font-normal text-ink/45"
          >
            <ShieldCheck size={18} />
            قيد التفعيل بعد استكمال الربط الرسمي
          </button>
        )}
        {!nafath.enabled ? (
          <p className="mt-2 text-xs leading-6 text-ink/55">
            النفاذ الوطني اعتماد خارجي غير مفعّل حاليًا. {configured ? "يستمر الدخول بالحسابات الفردية دون تأثر." : "يستمر الدخول بالحساب الافتراضي دون تأثر."}
          </p>
        ) : null}
        <div className="mt-4 flex justify-between text-sm">
          <StatusBadge tone="good">محام</StatusBadge>
          <StatusBadge>مستخدم مصرح له</StatusBadge>
        </div>
      </Panel>
    </>
  );
}
