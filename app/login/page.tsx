import { PageHeader, Panel, StatusBadge } from "@/components/ui";
import { ShieldCheck } from "lucide-react";
import { getNafathConfiguration } from "@/lib/nafath-config";
import Link from "next/link";

export default function LoginPage() {
  const nafath = getNafathConfiguration();

  return (
    <>
      <PageHeader
        title="تسجيل الدخول"
        description="الدخول متاح بالحساب الافتراضي للتجربة، مع بنية جاهزة وآمنة للربط بالنفاذ الوطني الموحد في بيئة الإنتاج."
      />
      <Panel className="mx-auto max-w-lg">
        <label className="mb-3 block text-sm font-normal">
          البريد الإلكتروني
          <input className="mt-2 w-full rounded border border-line px-3 py-2 focus-ring" defaultValue="lawyer@example.com" />
        </label>
        <label className="mb-4 block text-sm font-normal">
          كلمة المرور
          <input className="mt-2 w-full rounded border border-line px-3 py-2 focus-ring" type="password" defaultValue="Demo@12345" />
        </label>
        <Link href="/dashboard" className="block w-full rounded bg-palm px-4 py-2 text-center font-normal text-white focus-ring">
          دخول بالحساب الافتراضي — أحمد عبدالعزيز
        </Link>
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
            النفاذ الوطني اعتماد خارجي غير مفعّل حاليًا. يستمر الدخول بالحساب الافتراضي دون تأثر.
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
