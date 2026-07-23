"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, ExternalLink, FileCheck2, FileClock, Headphones, Menu, Sparkles, X } from "lucide-react";
import { navItems, platformTitle } from "@/lib/navigation";

// شريط تنقّل سفلي للجوال فقط (تجربة الجوال) — يعيد استخدام المسارات الفعلية،
// و«المزيد» يفتح القائمة الجانبية القائمة. الحاسوب لا يتأثر (sm:hidden).
// الاستوديو في الوسط بزر بارز مرتفع (تجربة الجوال)
// بقرار مالكة المنصة: «المزيد» في أول الشريط (أقصى اليمين) و«السجل» في آخره
const bottomTabs = [
  { title: "المراجعة", href: "/content-review", icon: FileCheck2, primary: false, soon: false },
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
  const visibleItems = navItems;

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape") setNavOpen(false);
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
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
          "fixed bottom-0 right-0 top-0 z-30 flex w-[min(20rem,100vw)] max-w-full flex-col border-l border-line bg-white transition-transform duration-200 ease-out md:top-16",
          navOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="border-b border-line bg-paper p-4 sm:p-6 md:hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div>
                <p className="text-base font-normal text-palm">إدارة المحتوى الإعلامي والإعلاني للمحامين</p>
                <p className="mt-1 max-w-48 text-xs leading-6 text-ink/65">
                  تمكين الحضور الإعلامي والإعلاني وفق مراجعة مهنية استرشادية
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setNavOpen(false)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-line text-ink/60 transition hover:border-palm hover:text-palm focus-ring"
              title="إغلاق القائمة"
              aria-label="إغلاق القائمة"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto p-4">
          {/* «الوصول السريع» مدموجة في بطاقة «دليل الاستخدام» أدناه، فتُخفى كبند مكرّر */}
          {visibleItems.filter((item) => item.href !== "/library").map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "mb-1.5 flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition focus-ring",
                  active
                    ? "border-palm bg-mint font-normal text-palm"
                    : "border-transparent text-ink/75 hover:border-line hover:bg-paper hover:text-ink"
                )}
              >
                <Icon size={18} className="shrink-0" />
                <span className="min-w-0 leading-6">{item.title}</span>
              </Link>
            );
          })}
        </nav>
        {/* بوكسا الدليل والدعم أسفل القائمة — الحاسب والجوال (درج واحد) */}
        <div className="border-t border-line p-4">{helpCards}</div>
      </aside>

      <div className="w-full max-w-full overflow-x-hidden">
        <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
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
                <h1 className="max-w-4xl text-sm font-bold leading-6 text-ink sm:text-base">{platformTitle}</h1>
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
          className="fixed inset-x-0 bottom-0 z-40 flex items-end justify-around border-t border-line bg-white/95 px-1 pb-1.5 pt-1 backdrop-blur sm:hidden"
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
