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
  Search,
} from "lucide-react";
import { getNafathConfiguration } from "@/lib/nafath-config";
import { isAuthConfigured } from "@/lib/access-auth";
import { LoginForm, RegisterRequestForm } from "@/components/login-form";
import Link from "next/link";

export const dynamic = "force-dynamic";

// مزايا المنصّة — محتوى صادق يعكس ما تقدّمه فعلاً (لا أرقام ولا شعارات ولا أسماء مُختلقة)
const FEATURES = [
  { icon: ShieldCheck, tone: "text-[#3BB27C]", bg: "bg-[#3BB27C]/14", title: "مراجعة الامتثال", body: "وفق نظام المحاماة واللائحة التنفيذية." },
  { icon: AlertTriangle, tone: "text-[#F87171]", bg: "bg-[#F87171]/14", title: "تقييم المخاطر", body: "قياس أثر النشر على الأطراف قبله." },
  { icon: UserRound, tone: "text-[#B191D6]", bg: "bg-[#B191D6]/16", title: "الجوانب المهنية واللغة", body: "رصانة الصياغة ووقارها وسلامتها." },
  { icon: PenTool, tone: "text-[#E6B84C]", bg: "bg-[#E6B84C]/13", title: "تحسين الصياغة", body: "إعادة صياغة محكومة قبل النشر." },
  { icon: FileText, tone: "text-[#9DB0C6]", bg: "bg-white/7", title: "سجل موثّق", body: "إصداراتك واعتماداتك محفوظة." },
  { icon: BookOpen, tone: "text-[#67B0FA]", bg: "bg-[#67B0FA]/14", title: "مصادر معتمدة", body: "رسمية سعودية · دولية · أكاديمية." },
];

const TRUST = [
  "وسيلة وقائية لا رقابية — لا تُستخدم للمساءلة.",
  "سرية تامة لبياناتك ومحتواك.",
  "وصول مُحكَم للمحامين المرخّصين في المملكة.",
];

export default function LoginPage() {
  const nafath = getNafathConfiguration();
  const configured = isAuthConfigured();

  return (
    <div className="min-h-screen bg-[#0A121E] text-[#F4F8FC]">
      <div className="mx-auto max-w-md px-4 pb-10">
        {/* شريط الهوية */}
        <header className="flex items-center justify-between py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-[#3BB27C] to-[#1C6E4C] text-white">
              <Scale size={20} />
            </span>
            <div className="min-w-0">
              <p className="max-w-[190px] text-[12.5px] font-extrabold leading-tight">إدارة المحتوى الإعلامي والإعلاني للمحامين</p>
              <p className="text-[10px] text-[#6E819A]">الإدارة العامة للمحاماة</p>
            </div>
          </div>
          <a
            href="#login"
            className="flex items-center gap-1.5 rounded-lg border border-white/15 px-3.5 py-2 text-xs font-bold text-[#F4F8FC] transition hover:border-[#3BB27C]/60 focus-ring"
          >
            <LogIn size={14} />
            دخول
          </a>
        </header>

        {/* البطل */}
        <section className="relative overflow-hidden pb-2 pt-2">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(59,178,124,0.22),transparent_70%)]" />
          <span className="relative inline-flex items-center gap-2 rounded-full border border-[#3BB27C]/30 bg-[#3BB27C]/14 px-3 py-1.5 text-[11px] font-bold text-[#7FE0B4]">
            <ShieldCheck size={12} />
            خاص بالمحامين المرخّصين في المملكة
          </span>
          <h1 className="relative mt-3.5 text-[26px] font-extrabold leading-[1.5]">
            راجع محتواك، وتأكّد من <span className="text-[#3BB27C]">امتثاله</span> قبل نشره.
          </h1>
          <p className="relative mt-3 text-[13px] leading-[1.9] text-[#9DB0C6]">
            منصّة متخصّصة لإنشاء وإدارة المحتوى الإعلامي والإعلاني بما يتوافق مع الضوابط المهنية ونظام المحاماة ولائحته.
          </p>
          <div className="relative mt-5 flex gap-2.5">
            <a
              href="#login"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#3BB27C] px-4 py-3 text-sm font-extrabold text-[#04140C] shadow-[0_10px_24px_-10px_rgba(59,178,124,0.7)] transition hover:bg-[#43c489] focus-ring"
            >
              <LogIn size={17} />
              تسجيل الدخول
            </a>
            <a
              href="#features"
              className="flex items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-[13px] font-bold text-[#F4F8FC] transition hover:border-white/30 focus-ring"
            >
              <Search size={16} />
              تعرّف على المنصّة
            </a>
          </div>
        </section>

        {/* بطاقة الدخول الفعلية */}
        <section id="login" className="mt-6 scroll-mt-4 rounded-2xl bg-[#F4F8FC] p-5 text-ink shadow-[0_20px_45px_-20px_rgba(0,0,0,0.7)]">
          <h2 className="flex items-center gap-2 text-[15px] font-extrabold text-ink">
            <LogIn size={18} className="text-palm" />
            تسجيل الدخول
          </h2>
          <p className="mt-1 text-xs leading-6 text-ink/60">
            {configured
              ? "الدخول بحساب فردي مستقل لكل مستخدم. تُدار الحسابات والرموز من إدارة المنصة."
              : "نظام الدخول الفردي قيد التهيئة، والدخول متاح بالحساب الافتراضي للتجربة."}
          </p>

          <div className="mt-4">
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
              قيد التفعيل بعد استكمال الربط الرسمي
            </button>
          )}
          {!nafath.enabled ? (
            <p className="mt-2 text-xs leading-6 text-ink/55">
              النفاذ الوطني اعتماد خارجي غير مفعّل حاليًا. {configured ? "يستمر الدخول بالحسابات الفردية دون تأثر." : "يستمر الدخول بالحساب الافتراضي دون تأثر."}
            </p>
          ) : null}
        </section>

        {/* المزايا */}
        <section id="features" className="scroll-mt-4 pt-8">
          <h3 className="mb-4 flex items-center gap-2 text-base font-extrabold">
            <CheckCircle2 size={17} className="text-[#3BB27C]" />
            ماذا تقدّم المنصّة
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="rounded-2xl border border-white/[0.09] bg-[#141F30] p-4">
                  <span className={`mb-2.5 grid h-10 w-10 place-items-center rounded-xl ${f.bg} ${f.tone}`}>
                    <Icon size={20} />
                  </span>
                  <p className="text-[13px] font-bold">{f.title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#6E819A]">{f.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* الطمأنة */}
        <section className="mt-5 rounded-2xl border border-white/[0.09] bg-gradient-to-b from-[#18253A] to-[#141F30] p-5">
          <h4 className="flex items-center gap-2 text-[13.5px] font-extrabold text-[#7FE0B4]">
            <ShieldCheck size={16} />
            مراجعة وقائية آمنة
          </h4>
          <ul className="mt-3 flex flex-col gap-2.5">
            {TRUST.map((t) => (
              <li key={t} className="flex items-center gap-2.5 text-xs leading-relaxed text-[#9DB0C6]">
                <span className="grid h-[17px] w-[17px] shrink-0 place-items-center rounded-md bg-[#3BB27C]/14 text-[#3BB27C]">
                  <CheckCircle2 size={11} />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </section>

        <footer className="px-2 pt-6 text-center text-[11px] leading-[1.9] text-[#6E819A]">
          منصّة مهنية لمراجعة المحتوى الإعلامي والإعلاني ودعم الامتثال قبل النشر.
        </footer>
      </div>
    </div>
  );
}
