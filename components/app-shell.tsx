"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, ExternalLink, FileCheck2, FileClock, Headphones, KeyRound, Menu, Sparkles } from "lucide-react";
import { navItems, platformTitle } from "@/lib/navigation";

// شريط تنقّل سفلي للجوال فقط (تجربة الجوال) — يعيد استخدام المسارات الفعلية،
// و«المزيد» يفتح القائمة الجانبية القائمة. الحاسوب لا يتأثر (sm:hidden).
// الاستوديو في الوسط بزر بارز مرتفع (تجربة الجوال)
// بقرار مالكة المنصة: «المزيد» في أول الشريط (أقصى اليمين) و«السجل» في آخره
const bottomTabs = [
  { title: "التحليل", href: "/content-review", icon: FileCheck2, primary: false, soon: false },
  { title: "مركز المحتوى", href: "/content-studio", icon: Sparkles, primary: true, soon: false },
  // «التخطيط» تبقى ظاهرة لكن معطّلة (قريبًا) — لا تُحذف
  { title: "التخطيط", href: "/calendar-v2", icon: CalendarDays, primary: false, soon: true },
  { title: "السجل", href: "/content-management", icon: FileClock, primary: false, soon: false },
];
import { SessionChip } from "@/components/session-chip";
import { clsx } from "clsx";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const visibleItems = navItems;

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") setNavOpen(false);
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  // اسم المستخدم يُعرض في رأس الدرج (نُقل من الشريط العلوي كي لا يزاحم العنوان مهما طال)
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d: { authenticated?: boolean; username?: string; role?: string }) => {
        if (d?.authenticated && d.username) setUsername(d.username);
        if (d?.role) setRole(d.role);
      })
      .catch(() => undefined);
  }, []);

  // بوكسا «دليل الاستخدام» و«دعم المحامين» أسفل القائمة (الحاسب والجوال — درج واحد).
  // «دليل الاستخدام» مدموج مع «الوصول السريع»: يفتح صفحة المراجع، والدليل نفسه «قريبًا».
  const helpCards = (
    <div className="flex flex-col gap-3">
      {/* «مركز التخطيط» بطاقة «قريبًا» (مثل دعم المحامين) — قيد الدراسة، تُفعَّل لاحقاً */}
      <div className="rounded-xl border border-line p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2 text-ink">
            <CalendarDays size={15} className="mt-0.5 shrink-0 text-palm" />
            <p className="text-sm font-semibold leading-6">مركز التخطيط الإعلامي والإعلاني</p>
          </div>
          <span className="shrink-0 rounded-full bg-mint px-2 py-0.5 text-[10px] font-bold text-palm">قريبًا</span>
        </div>
        <p className="mt-1.5 text-xs leading-5 text-ink/55">تخطيط ونشر المحتوى الإعلامي والإعلاني — قيد التطوير.</p>
      </div>
      <Link
        href="/library"
        onClick={() => setNavOpen(false)}
        className="block rounded-xl border border-line p-3 transition hover:border-palm focus-ring"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-ink">
            <BookOpen size={15} className="text-palm" />
            <p className="text-sm font-semibold">دليل الاستخدام</p>
          </div>
          <ExternalLink size={13} className="text-ink/40" />
        </div>
        <p className="mt-1.5 text-xs leading-5 text-ink/55">المراجع والمصادر الرسمية المعتمدة، ودليل استخدام النظام (قريبًا).</p>
      </Link>
      <div className="rounded-xl border border-line p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-ink">
            <Headphones size={15} className="text-palm" />
            <p className="text-sm font-semibold">دعم المحامين</p>
          </div>
          <span className="rounded-full bg-mint px-2 py-0.5 text-[10px] font-bold text-palm">قريبًا</span>
        </div>
        <p className="mt-1.5 text-xs leading-5 text-ink/55">خدمة الدعم والاستفسارات قيد التطوير.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-paper">
      {navOpen ? (
        <div
          aria-hidden="true"
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-20 bg-ink/30"
        />
      ) : null}

      <aside
        className={clsx(
          // يبدأ الدرج أسفل الشريط العلوي (top-16) لا خلفه — فلا يُخفى رأسه عند الفتح
          "fixed bottom-0 right-0 top-16 z-30 flex w-[min(20rem,100vw)] max-w-full flex-col border-l border-line bg-white transition-transform duration-200 ease-out",
          navOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* الحساب والتنقّل أعلى الدرج (قابل للتمرير)، وبطاقات الدليل والدعم مثبّتة أسفله */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {/* حساب المستخدم — الاسم الكامل والمفتاح (تغيير الرمز) بجانبه */}
          {username ? (
            <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-line bg-paper px-3 py-2.5">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-mint text-sm font-bold text-palm">
                {username.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] leading-4 text-ink/45">الحساب</p>
                <p className="truncate text-sm font-semibold text-ink">{username}</p>
              </div>
              {role !== "admin" ? (
                <Link
                  href="/account"
                  onClick={() => setNavOpen(false)}
                  title="تغيير الرمز"
                  aria-label="تغيير الرمز"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line text-ink/55 transition hover:border-palm hover:text-palm focus-ring"
                >
                  <KeyRound size={15} />
                </Link>
              ) : null}
            </div>
          ) : null}
          <nav>
            {/* «الوصول السريع» مدموجة في بطاقة «دليل الاستخدام» أدناه، فتُخفى كبند مكرّر */}
            {visibleItems.filter((item) => item.href !== "/library").map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setNavOpen(false)}
                  className={clsx(
                    "mb-1.5 flex items-center gap-3 rounded-lg border px-3 py-3 text-sm transition focus-ring",
                    active
                      ? "border-palm bg-mint font-semibold text-palm"
                      : "border-transparent text-ink/75 hover:border-line hover:bg-paper hover:text-ink"
                  )}
                >
                  <Icon size={18} className="shrink-0" />
                  <span className="min-w-0 leading-6">{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>
        {/* بطاقات الدليل والدعم — مثبّتة أسفل الدرج */}
        <div className="border-t border-line p-4">{helpCards}</div>
      </aside>

      <div className="w-full max-w-full overflow-x-hidden">
        {/* المبدأ (١٢) الخامات: طبقة واحدة بقيم المهارة blur(20px) saturate(180%) */}
        <header className="lm-material sticky top-0 z-40 border-b border-line">
          <div className="flex min-h-16 max-w-full items-center justify-between gap-3 px-4 sm:gap-4 sm:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setNavOpen((open) => !open)}
                className="grid h-10 w-10 place-items-center rounded-md border border-line transition hover:border-palm hover:text-palm focus-ring"
                title="القائمة"
                aria-label="فتح أو إغلاق القائمة"
                aria-expanded={navOpen}
              >
                <Menu size={20} />
              </button>
              <div className="min-w-0">
                <h1 className="whitespace-nowrap text-[12px] font-bold leading-tight text-ink sm:max-w-4xl sm:whitespace-normal sm:text-base">{platformTitle}</h1>
                <p className="hidden text-xs text-ink/50 sm:block">
                  مراجعة، امتثال، مخاطر، وتحسين جاهزية النشر للمحتوى المهني
                </p>
              </div>
            </div>
            {/* بقرارها: اسم المستخدم الداخل فعلاً فقط، بلا مسمى وظيفي، ولا شيء قبل الدخول */}
            <SessionChip />
          </div>
        </header>
        <main className="min-w-0 max-w-full overflow-x-hidden px-4 pb-24 pt-5 sm:px-8 sm:py-6">{children}</main>
      </div>

      {/* شريط التنقّل السفلي — الجوال فقط، ويختفي على الدخول وعند فتح القائمة الجانبية */}
      {pathname !== "/login" && !navOpen ? (
        <nav
          aria-label="التنقّل السريع"
          className="lm-material fixed inset-x-0 bottom-0 z-40 flex items-end justify-around border-t border-line px-1 pb-1.5 pt-1 sm:hidden"
        >
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="flex flex-1 flex-col items-center gap-1 py-2 text-[11px] text-ink/55 transition focus-ring"
          >
            <Menu size={20} aria-hidden="true" />
            <span>المزيد</span>
          </button>
          {bottomTabs.map((tab) => {
            const Icon = tab.icon;
            const active = pathname === tab.href;
            if (tab.soon) {
              return (
                <div
                  key={tab.href}
                  aria-disabled="true"
                  title="قريبًا"
                  className="flex flex-1 cursor-not-allowed flex-col items-center gap-1 py-2 text-[11px] text-ink/30"
                >
                  <Icon size={20} aria-hidden="true" />
                  <span>{tab.title}</span>
                </div>
              );
            }
            if (tab.primary) {
              return (
                <Link key={tab.href} href={tab.href} className="flex flex-1 flex-col items-center focus-ring">
                  <span
                    className={clsx(
                      "grid h-16 w-16 -translate-y-5 place-items-center rounded-full shadow-lg ring-4 ring-paper transition",
                      // اللون عند التحديد فقط: أخضر ممتلئ حين تكون الصفحة الحالية،
                      // وإلا زر أبيض مرتفع بأيقونة بلون الهوية (شكل بارز أجمل)
                      active ? "bg-palm text-white" : "border border-palm/25 bg-white text-palm"
                    )}
                  >
                    <Icon size={26} aria-hidden="true" />
                  </span>
                  <span className={clsx("-mt-3 text-[11px]", active ? "font-semibold text-palm" : "text-ink/60")}>{tab.title}</span>
                </Link>
              );
            }
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={clsx(
                  "flex flex-1 flex-col items-center gap-1 py-2 text-[11px] transition focus-ring",
                  active ? "font-semibold text-palm" : "text-ink/55"
                )}
              >
                <Icon size={20} aria-hidden="true" />
                <span>{tab.title}</span>
              </Link>
            );
          })}
        </nav>
      ) : null}
    </div>
  );
}
