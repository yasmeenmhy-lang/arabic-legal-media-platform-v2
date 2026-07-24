import { ShieldCheck, AlertTriangle, UserRound, PenTool, FileText, BookOpen, LogIn } from "lucide-react";
import { PageHeader, Panel } from "@/components/ui";
import { getNafathConfiguration } from "@/lib/nafath-config";
import { isAuthConfigured } from "@/lib/access-auth";
import { LoginForm } from "@/components/login-form";
import Link from "next/link";

export const dynamic = "force-dynamic";

// الرئيسية داخل شل المنصة ومكوّناتها (PageHeader/Panel) — الخط والألوان والأحجام
// من المنصة نفسها. المزايا أيقونة + عنوان فقط. محتوى صادق بلا أرقام أو شعارات.
const FEATURES = [
  { icon: ShieldCheck, tone: "text-palm", bg: "bg-mintDeep", title: "مراجعة الامتثال" },
  { icon: AlertTriangle, tone: "text-errorBase", bg: "bg-errorSoft", title: "تقييم المخاطر" },
  { icon: UserRound, tone: "text-violet", bg: "bg-violetSoft", title: "الجوانب المهنية واللغة" },
  { icon: PenTool, tone: "text-gold", bg: "bg-goldSoft", title: "تحسين الصياغة" },
  { icon: FileText, tone: "text-inkSecondary", bg: "bg-warmGraySoft", title: "سجل موثّق" },
  { icon: BookOpen, tone: "text-infoBase", bg: "bg-infoSoft", title: "مصادر معتمدة" },
];

export default function LoginPage() {
  const nafath = getNafathConfiguration();
  const configured = isAuthConfigured();

  return (
    <>
      <PageHeader
        title="راجع محتواك، وتأكّد من امتثاله قبل نشره"
        description="منصّة متخصّصة للمحامين لمراجعة وإدارة المحتوى الإعلامي والإعلاني بما يتوافق مع الضوابط المهنية ونظام المحاماة ولائحته التنفيذية."
      />

      <Panel className="mx-auto max-w-lg">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-ink">
          <LogIn size={18} className="text-palm" />
          تسجيل الدخول
        </h2>

        {configured ? (
          <LoginForm />
        ) : (
          <Link
            href="/dashboard"
            className="block w-full rounded bg-palm px-4 py-2.5 text-center font-normal text-white transition hover:bg-palmDark focus-ring"
          >
            دخول بالحساب الافتراضي — ياسمين
          </Link>
        )}

        <div className="my-4 flex items-center gap-3 text-xs text-ink/45">
          <span className="h-px flex-1 bg-line" />أو<span className="h-px flex-1 bg-line" />
        </div>

        {nafath.enabled ? (
          <a
            href="/api/auth/nafath"
            className="flex w-full items-center justify-center gap-2 rounded border border-palm px-4 py-2.5 font-normal text-palm transition hover:bg-mint focus-ring"
          >
            <ShieldCheck size={18} />
            الدخول عبر النفاذ الوطني الموحد
          </a>
        ) : (
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded border border-line px-4 py-2.5 font-normal text-ink/45"
          >
            <ShieldCheck size={18} />
            النفاذ الوطني — قيد التفعيل
          </button>
        )}
      </Panel>

      <section className="mx-auto mt-6 max-w-3xl">
        <h3 className="mb-4 text-center text-base font-semibold text-ink">ماذا تقدّم المنصّة</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="flex flex-col items-center gap-2.5 rounded-lg border border-line bg-white p-4 text-center shadow-sm">
                <span className={`grid h-11 w-11 place-items-center rounded-xl ${f.bg} ${f.tone}`}>
                  <Icon size={21} />
                </span>
                <p className="text-sm font-semibold text-ink">{f.title}</p>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
