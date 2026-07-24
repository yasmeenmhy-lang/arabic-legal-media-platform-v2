import {
  Scale,
  ShieldCheck,
  AlertTriangle,
  UserRound,
  PenTool,
  FileText,
  BookOpen,
  LogIn,
  CheckCircle2,
} from "lucide-react";
import { getNafathConfiguration } from "@/lib/nafath-config";
import { isAuthConfigured } from "@/lib/access-auth";
import { LoginForm, RegisterRequestForm } from "@/components/login-form";
import Link from "next/link";

export const dynamic = "force-dynamic";

// الرئيسية — بخلفية المنصة الفاتحة وألوان كود المنصات وأحجام خطوطها نفسها.
// أيقونة + عنوان فقط، بلا أوصاف فرعية. محتوى صادق بلا أرقام أو شعارات أو أسماء مُختلقة.
const FEATURES = [
  { icon: ShieldCheck, tone: "text-palm", bg: "bg-mintDeep", title: "مراجعة الامتثال" },
  { icon: AlertTriangle, tone: "text-errorBase", bg: "bg-errorSoft", title: "تقييم المخاطر" },
  { icon: UserRound, tone: "text-violet", bg: "bg-violetSoft", title: "الجوانب المهنية واللغة" },
  { icon: PenTool, tone: "text-gold", bg: "bg-goldSoft", title: "تحسين الصياغة" },
  { icon: FileText, tone: "text-inkSecondary", bg: "bg-warmGraySoft", title: "سجل موثّق" },
  { icon: BookOpen, tone: "text-infoBase", bg: "bg-infoSoft", title: "مصادر معتمدة" },
];

const TRUST = ["وقائية لا رقابية", "سرية تامة لبياناتك", "وصول مُحكَم للمرخّصين"];

export default function LoginPage() {
  const nafath = getNafathConfiguration();
  const configured = isAuthConfigured();

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-xl px-4 pb-10 pt-5">
        {/* شريط الهوية */}
        <header className="flex items-center justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-palm to-palmDeep text-white">
              <Scale size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-bold leading-tight text-ink">إدارة المحتوى الإعلامي والإعلاني للمحامين</p>
              <p className="text-[10.5px] text-ink/50">الإدارة العامة للمحاماة</p>
            </div>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-ink/70 sm:flex">
            <Link href="/login" className="font-semibold text-palm focus-ring">الرئيسية</Link>
            <Link href="/content-studio" className="transition hover:text-palm focus-ring">مركز المحتوى</Link>
            <Link href="/content-management" className="transition hover:text-palm focus-ring">السجل</Link>
          </nav>
        </header>

        {/* البطل — بأحجام خطوط المنصة */}
        <section className="pt-7 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-mintDeep bg-mint px-3 py-1.5 text-xs font-semibold text-palmDeep">
            <ShieldCheck size={13} />
            خاص بالمحامين المرخّصين في المملكة
          </span>
          <h1 className="mt-4 text-xl font-semibold leading-9 text-ink sm:text-2xl">
            راجع محتواك، وتأكّد من <span className="text-palm">امتثاله</span> قبل نشره
          </h1>
        </section>

        {/* بطاقة الدخول — بنمط المنصة */}
        <section id="login" className="mx-auto mt-6 max-w-md rounded-2xl border border-line bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
            <LogIn size={18} className="text-palm" />
            تسجيل الدخول
          </h2>

          <div className="mt-4">
            {configured ? (
              <>
                <LoginForm />
                <p className="mt-3 text-xs leading-6 text-ink/55">
                  نسيتِ رمز الدخول؟ تواصلي مع مسؤول المنصة لإعادة تعيينه.
                </p>
                <div className="mt-4">
                  <RegisterRequestForm />
                </div>
              </>
            ) : (
              <Link
                href="/dashboard"
                className="block w-full rounded-lg bg-palm px-4 py-2.5 text-center font-normal text-white transition hover:bg-palmDark focus-ring"
              >
                دخول بالحساب الافتراضي — ياسمين
              </Link>
            )}
          </div>

          <div className="my-4 flex items-center gap-3 text-xs text-ink/40">
            <span className="h-px flex-1 bg-line" />أو<span className="h-px flex-1 bg-line" />
          </div>

          {nafath.enabled ? (
            <a
              href="/api/auth/nafath"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-palm px-4 py-2.5 font-normal text-palm transition hover:bg-mint focus-ring"
            >
              <ShieldCheck size={18} />
              الدخول عبر النفاذ الوطني الموحد
            </a>
          ) : (
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-line px-4 py-2.5 font-normal text-ink/45"
            >
              <ShieldCheck size={18} />
              النفاذ الوطني — قيد التفعيل
            </button>
          )}
        </section>

        {/* القدرات — أيقونة وعنوان فقط */}
        <section className="pt-8">
          <h3 className="mb-4 text-center text-base font-semibold text-ink">ماذا تقدّم المنصّة</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="flex flex-col items-center gap-2.5 rounded-xl border border-line bg-white p-4 text-center">
                  <span className={`grid h-11 w-11 place-items-center rounded-xl ${f.bg} ${f.tone}`}>
                    <Icon size={21} />
                  </span>
                  <p className="text-[13px] font-semibold text-ink">{f.title}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* الطمأنة — سطر واحد مضغوط */}
        <section className="mt-6 rounded-xl border border-mintDeep bg-mint px-4 py-3.5">
          <ul className="flex flex-col items-center gap-2.5 sm:flex-row sm:justify-center sm:gap-6">
            {TRUST.map((t) => (
              <li key={t} className="flex items-center gap-2 text-[13px] font-medium text-palmDeep">
                <CheckCircle2 size={15} className="text-palm" />
                {t}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
