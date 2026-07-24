import { ShieldCheck, LogIn, AlertTriangle, UserRound, SpellCheck, Sparkles, FileClock, BookMarked, Scale, CheckCircle2 } from "lucide-react";
import { getNafathConfiguration } from "@/lib/nafath-config";
import { isAuthConfigured } from "@/lib/access-auth";
import { LoginForm, RegisterRequestForm } from "@/components/login-form";
import Link from "next/link";

export const dynamic = "force-dynamic";

const FEATURES = [
  { icon: ShieldCheck, tone: "bg-mintDeep text-palm", title: "مراجعة الامتثال", desc: "وفق نظام المحاماة واللائحة التنفيذية." },
  { icon: AlertTriangle, tone: "bg-errorSoft text-errorBase", title: "تقييم المخاطر", desc: "قياس أثر النشر على الأطراف قبله." },
  { icon: UserRound, tone: "bg-violetSoft text-violet", title: "الجوانب المهنية واللغة", desc: "وقار الصياغة وسلامة اللغة." },
  { icon: Sparkles, tone: "bg-goldSoft text-gold", title: "تحسين الصياغة", desc: "إعادة صياغة محكومة قبل النشر." },
  { icon: FileClock, tone: "bg-warmGraySoft text-inkSecondary", title: "سجل موثّق", desc: "إصداراتك واعتماداتك محفوظة." },
  { icon: BookMarked, tone: "bg-infoSoft text-infoBase", title: "مصادر معتمدة", desc: "رسمية سعودية · دولية · أكاديمية." }
];

const TRUST = [
  "وسيلة وقائية لا رقابية — لا تُستخدم للمساءلة.",
  "سرية تامة لبياناتك ومحتواك.",
  "وصول مُحكَم للمحامين المرخّصين في المملكة."
];

export default function LoginPage() {
  const nafath = getNafathConfiguration();
  const configured = isAuthConfigured();

  return (
    <div className="mx-auto min-h-screen max-w-md">
      {/* الهوية */}
      <div className="flex items-center gap-3 bg-white px-5 py-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-palm to-palmDeep text-white">
          <Scale size={22} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-extrabold leading-snug text-ink">إدارة المحتوى الإعلامي والإعلاني للمحامين</p>
          <p className="text-[11px] font-medium text-ink/50">الإدارة العامة للمحاماة</p>
        </div>
      </div>

      {/* البطل + الدخول */}
      <div className="relative overflow-hidden rounded-b-[26px] bg-gradient-to-b from-palmDeep to-palm px-5 pb-8 pt-6 text-white">
        <span className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-white/[.06]" aria-hidden="true" />
        <span className="relative inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-[11px] font-semibold">
          <ShieldCheck size={13} aria-hidden="true" /> خاص بالمحامين المرخّصين في المملكة
        </span>
        <h1 className="relative mt-3.5 text-[22px] font-extrabold leading-[1.5]">راجع محتواك الإعلامي وامتثاله وحسّن جاهزيته قبل نشره.</h1>
        <p className="relative mt-2.5 text-[13px] leading-8 text-white/85">منصّة متخصّصة لإنشاء وإدارة المحتوى الإعلامي والإعلاني بما يتوافق مع الضوابط المهنية ونظام المحاماة ولائحته.</p>

        {/* بطاقة الدخول */}
        <div className="relative mt-5 rounded-2xl bg-white p-5 text-ink shadow-2xl">
          <h2 className="flex items-center gap-2 text-[15px] font-extrabold">
            <LogIn size={18} className="text-palm" aria-hidden="true" /> تسجيل الدخول
          </h2>
          <div className="mt-3">
            {configured ? (
              <>
                <LoginForm />
                <p className="mt-3 text-xs leading-6 text-ink/55">
                  نسيتِ رمز الدخول؟ تواصلي مع مسؤول المنصة لإعادة تعيينه.
                </p>
                <div className="mt-4"><RegisterRequestForm /></div>
              </>
            ) : (
              <>
                <div className="mb-4 rounded-xl border border-infoBorder bg-infoSoft p-4">
                  <p className="text-sm font-semibold text-infoDark">نظام الدخول الفردي غير مهيأ بعد</p>
                  <p className="mt-1 text-xs leading-6 text-ink/70">
                    بعد ضبط متغيرات البيئة يصبح الدخول إلزامياً بحسابات فردية ويُدار من لوحة إدارة الوصول.
                  </p>
                </div>
                <Link href="/dashboard" className="block w-full rounded-lg bg-palm px-4 py-3 text-center text-sm font-semibold text-white focus-ring">
                  دخول بالحساب الافتراضي — ياسمين
                </Link>
              </>
            )}
            <div className="my-4 flex items-center gap-3 text-xs text-ink/40"><span className="h-px flex-1 bg-line" />أو<span className="h-px flex-1 bg-line" /></div>
            {nafath.enabled ? (
              <a href="/api/auth/nafath" className="flex w-full items-center justify-center gap-2 rounded-lg border border-palm px-4 py-3 text-sm font-semibold text-palm focus-ring">
                <ShieldCheck size={18} aria-hidden="true" /> الدخول عبر النفاذ الوطني الموحد
              </a>
            ) : (
              <button type="button" disabled aria-disabled="true" className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-line px-4 py-3 text-sm font-medium text-ink/40">
                <ShieldCheck size={18} aria-hidden="true" /> النفاذ الوطني — قيد التفعيل
              </button>
            )}
            <p className="mt-3 text-center text-[11.5px] text-ink/45">الوصول مُحكَم — للمحامين المرخّصين فقط</p>
          </div>
        </div>
      </div>

      {/* ماذا تقدّم المنصّة */}
      <section className="px-5 pt-6">
        <h3 className="mb-3.5 flex items-center gap-2 px-0.5 text-[15px] font-extrabold text-ink">
          <CheckCircle2 size={16} className="text-palm" aria-hidden="true" /> ماذا تقدّم المنصّة
        </h3>
        <div className="grid grid-cols-2 gap-2.5">
          {FEATURES.map(({ icon: Icon, tone, title, desc }) => (
            <div key={title} className="rounded-2xl border border-line bg-white p-3.5">
              <span className={`mb-2.5 grid h-9 w-9 place-items-center rounded-xl ${tone}`}><Icon size={19} aria-hidden="true" /></span>
              <p className="text-[13px] font-bold text-ink">{title}</p>
              <p className="mt-1 text-[11px] leading-6 text-ink/50">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* الطمأنة */}
      <section className="px-5 py-6">
        <div className="rounded-2xl border border-[#D3F0DE] bg-mint p-4">
          <p className="flex items-center gap-2 text-[13px] font-bold text-palmDeep">
            <ShieldCheck size={16} aria-hidden="true" /> مراجعة وقائية آمنة
          </p>
          <ul className="mt-3 space-y-2.5">
            {TRUST.map((t) => (
              <li key={t} className="flex items-center gap-2.5 text-xs leading-6 text-inkSecondary">
                <span className="grid h-4 w-4 shrink-0 place-items-center rounded bg-palm text-white"><CheckCircle2 size={11} aria-hidden="true" /></span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
