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
  Eye,
  ArrowLeft,
  Sparkles,
  Menu,
  ChevronDown,
  Plus,
} from "lucide-react";
import { getNafathConfiguration } from "@/lib/nafath-config";
import { isAuthConfigured } from "@/lib/access-auth";
import { LoginForm, RegisterRequestForm } from "@/components/login-form";
import Link from "next/link";

export const dynamic = "force-dynamic";

// درجات كود المنصات الحكومية (DGA) — خلفية داكنة برمادي كحلي + الأخضر الخزامى.
// المحتوى صادق: لا أرقام ولا شعارات جهات ولا أسماء مُختلقة.
const FEATURES = [
  { icon: ShieldCheck, tone: "text-[#17B26A]", bg: "bg-[#25935F]/18", title: "مراجعة الامتثال", body: "وفق نظام المحاماة واللائحة التنفيذية." },
  { icon: AlertTriangle, tone: "text-[#F04438]", bg: "bg-[#F04438]/15", title: "تقييم المخاطر", body: "قياس أثر النشر على الأطراف قبله." },
  { icon: UserRound, tone: "text-[#80519F]", bg: "bg-[#80519F]/20", title: "الجوانب المهنية واللغة", body: "رصانة الصياغة ووقارها وسلامتها." },
  { icon: PenTool, tone: "text-[#DBA102]", bg: "bg-[#DBA102]/16", title: "تحسين الصياغة", body: "إعادة صياغة محكومة قبل النشر." },
  { icon: FileText, tone: "text-white/65", bg: "bg-white/[0.07]", title: "سجل موثّق", body: "إصداراتك واعتماداتك محفوظة." },
  { icon: BookOpen, tone: "text-[#2E90FA]", bg: "bg-[#2E90FA]/15", title: "مصادر معتمدة", body: "رسمية سعودية · دولية · أكاديمية." },
];

const TRUST = [
  "وسيلة وقائية لا رقابية — لا تُستخدم للمساءلة.",
  "سرية تامة لبياناتك ومحتواك.",
  "وصول مُحكَم للمحامين المرخّصين في المملكة.",
];

// بطاقات تطفو حول الجهاز (الحاسب فقط) — من القدرات الفعلية
const FLOATERS: { pos: string; icon: typeof ShieldCheck; tone: string; bg: string; title: string; body: string }[] = [
  { pos: "right-0 top-6", icon: Sparkles, tone: "text-[#80519F]", bg: "bg-[#80519F]/20", title: "إنشاء المحتوى", body: "متوافق مع الضوابط المهنية." },
  { pos: "right-2 bottom-8", icon: ShieldCheck, tone: "text-[#17B26A]", bg: "bg-[#25935F]/18", title: "مراجعة الامتثال", body: "وفق نظام المحاماة واللائحة." },
  { pos: "left-0 top-20", icon: FileText, tone: "text-white/65", bg: "bg-white/[0.07]", title: "سجل المحتوى", body: "إصداراتك محفوظة." },
  { pos: "left-2 bottom-10", icon: AlertTriangle, tone: "text-[#F04438]", bg: "bg-[#F04438]/15", title: "تقييم المخاطر", body: "أثر النشر على الأطراف." },
];

function DeviceMock() {
  return (
    <div className="relative mx-auto hidden h-[560px] w-full max-w-[440px] place-items-center lg:grid">
      {FLOATERS.map((f) => {
        const Icon = f.icon;
        return (
          <div
            key={f.title}
            className={`absolute ${f.pos} z-10 w-[190px] rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.03] p-3.5 shadow-[0_20px_40px_-22px_rgba(0,0,0,0.7)]`}
          >
            <p className="flex items-center gap-2 text-[13px] font-bold">
              <span className={`grid h-6 w-6 place-items-center rounded-lg ${f.bg} ${f.tone}`}>
                <Icon size={14} />
              </span>
              {f.title}
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-white/45">{f.body}</p>
          </div>
        );
      })}

      {/* هيكل الجهاز */}
      <div className="relative z-20 w-[272px] rounded-[42px] border-[10px] border-[#05261a] bg-[#0b1a12] p-2.5 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.8)]">
        <div className="overflow-hidden rounded-[32px] bg-white text-ink">
          <div className="mx-auto h-[22px] w-[110px] rounded-b-[14px] bg-[#05261a]" />
          <div className="px-3 pb-3.5 pt-3">
            <div className="flex items-center justify-between text-[12px] font-bold">
              <Menu size={14} className="text-ink/70" />
              <span className="flex items-center gap-1.5 text-palmDeep">
                استوديو المحتوى المهني <Sparkles size={12} />
              </span>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5 text-[12px] font-bold text-palmDeep">
              <Plus size={13} /> إنشاء محتوى جديد
            </div>
            <p className="mt-2.5 text-[10.5px] text-ink/45">نوع المحتوى</p>
            <div className="mt-1 flex items-center justify-between rounded-lg border border-line px-2.5 py-2 text-[11.5px] font-bold">
              مقال قانوني <ChevronDown size={13} className="text-ink/40" />
            </div>
            <p className="mt-2.5 text-[10.5px] text-ink/45">المنصّة المستهدفة</p>
            <div className="mt-1 flex items-center justify-between rounded-lg border border-line px-2.5 py-2 text-[11.5px] font-bold text-[#0A66C2]">
              <span className="flex items-center gap-1.5">
                <span className="grid h-4 w-4 place-items-center rounded bg-[#0A66C2] text-[8px] font-black text-white">in</span>
                LinkedIn
              </span>
              <ChevronDown size={13} className="text-ink/40" />
            </div>
            <p className="mt-2.5 text-[10.5px] text-ink/45">وصف المحتوى</p>
            <div className="mt-1 rounded-lg border border-line p-2 text-[10.5px] leading-[1.7] text-ink2">
              يهدف هذا المقال إلى توضيح أبرز الالتزامات المهنية وفق نظام المحاماة واللائحة التنفيذية، مع التركيز على السرية المهنية وتجنّب تعارض المصالح.
            </div>
            <p dir="ltr" className="mt-1 text-right text-[9px] text-ink/40">194 / 3000</p>
            <div className="mt-2.5 rounded-lg bg-palmDeep py-2 text-center text-[11.5px] font-bold text-white">✦ إنشاء المحتوى</div>
            <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2 text-[8px] text-ink/45">
              <span>السجل</span><span>المراجعة</span>
              <span className="-mt-3.5 grid h-8 w-8 place-items-center rounded-full bg-palm text-white"><Sparkles size={14} /></span>
              <span>التخطيط</span><span>الرئيسية</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const nafath = getNafathConfiguration();
  const configured = isAuthConfigured();

  return (
    <div
      className="min-h-screen bg-[#0D121C] text-[#FCFCFD]"
      style={{ backgroundImage: "radial-gradient(1100px 460px at 82% -6%, rgba(37,147,95,0.14), transparent 60%)" }}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-8 lg:px-10">
        {/* شريط الهوية */}
        <header className="flex items-center justify-between gap-3 py-5">
          <div className="flex items-center gap-2.5">
            <span className="grid h-11 w-11 place-items-center rounded-[13px] bg-gradient-to-br from-[#17B26A] to-[#166A45] text-white">
              <Scale size={22} />
            </span>
            <div className="min-w-0">
              <p className="max-w-[210px] text-[13px] font-bold leading-tight sm:max-w-none">إدارة المحتوى الإعلامي والإعلاني للمحامين</p>
              <p className="text-[10.5px] text-white/45">الإدارة العامة للمحاماة</p>
            </div>
          </div>
          <nav className="hidden items-center gap-7 text-sm text-white/65 lg:flex">
            <span className="font-bold text-[#17B26A]">الرئيسية</span>
            <span>مركز المحتوى</span>
            <span>المراجعة</span>
            <span>السجل</span>
            <span>المصادر</span>
          </nav>
          <a
            href="#login"
            className="flex items-center gap-2 rounded-xl border border-white/15 px-4 py-2.5 text-[13px] font-bold text-[#FCFCFD] transition hover:border-[#17B26A]/60 focus-ring"
          >
            <LogIn size={15} />
            تسجيل الدخول
          </a>
        </header>

        {/* البطل */}
        <section className="grid items-center gap-8 pb-6 pt-4 lg:grid-cols-[1fr_440px] lg:gap-10 lg:pb-10">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[#25935F]/35 bg-[#25935F]/16 px-3.5 py-1.5 text-[12px] font-bold text-[#17B26A]">
              <ShieldCheck size={13} />
              خاص بالمحامين المرخّصين في المملكة
            </span>
            <h1 className="mt-4 text-[34px] font-bold leading-[1.32] sm:text-[46px]">
              إدارة المحتوى الإعلامي <span className="text-[#17B26A]">والإعلاني</span> للمحامين
            </h1>
            <p className="mt-5 max-w-[540px] text-[15px] leading-[2] text-white/65 sm:text-[16px]">
              منصّة متخصّصة للمحامين لإنشاء وإدارة المحتوى الإعلامي والإعلاني بما يتوافق مع الضوابط المهنية ونظام المحاماة ولائحته التنفيذية في المملكة العربية السعودية.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#login"
                className="flex items-center gap-2.5 rounded-[13px] bg-[#25935F] px-7 py-3.5 text-[15px] font-bold text-white shadow-[0_14px_30px_-12px_rgba(37,147,95,0.9)] transition hover:bg-[#1B8354] focus-ring"
              >
                ابدأ الآن <ArrowLeft size={18} />
              </a>
              <a
                href="#features"
                className="flex items-center gap-2.5 rounded-[13px] border border-white/15 px-6 py-3.5 text-[14px] font-bold text-[#FCFCFD] transition hover:border-white/30 focus-ring"
              >
                <Eye size={17} /> استعراض المنصّة
              </a>
            </div>
          </div>

          <DeviceMock />
        </section>

        {/* بطاقة الدخول الفعلية */}
        <section id="login" className="mx-auto mt-2 max-w-md scroll-mt-4 rounded-2xl bg-[#F4F8FC] p-5 text-ink shadow-[0_24px_50px_-24px_rgba(0,0,0,0.75)]">
          <h2 className="flex items-center gap-2 text-[15px] font-bold text-ink">
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

        {/* القدرات */}
        <section id="features" className="scroll-mt-4 border-t border-white/[0.08] pt-10">
          <h3 className="mb-6 text-center text-lg font-bold sm:text-xl">ماذا تقدّم المنصّة</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="rounded-2xl border border-white/[0.08] bg-white/[0.05] p-4 text-center">
                  <span className={`mx-auto mb-3 grid h-11 w-11 place-items-center rounded-xl ${f.bg} ${f.tone}`}>
                    <Icon size={22} />
                  </span>
                  <p className="text-[13.5px] font-bold">{f.title}</p>
                  <p className="mt-1.5 text-[11.5px] leading-relaxed text-white/45">{f.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* الطمأنة */}
        <section className="mt-6 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.03] p-6">
          <h4 className="flex items-center justify-center gap-2 text-[14px] font-bold text-[#17B26A]">
            <ShieldCheck size={17} />
            مراجعة وقائية آمنة
          </h4>
          <ul className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-8">
            {TRUST.map((t) => (
              <li key={t} className="flex items-center gap-2.5 text-[12.5px] leading-relaxed text-white/65">
                <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-md bg-[#25935F]/18 text-[#17B26A]">
                  <CheckCircle2 size={12} />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </section>

        <footer className="px-2 py-8 text-center text-[11.5px] leading-[1.9] text-white/45">
          جميع المراجعات وفق الضوابط المهنية ونظام المحاماة ولائحته التنفيذية في المملكة العربية السعودية — أداة وقائية لا رقابية.
        </footer>
      </div>
    </div>
  );
}
