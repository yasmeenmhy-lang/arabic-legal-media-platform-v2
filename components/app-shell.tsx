"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, ExternalLink, FileCheck2, FileClock, Headphones, Menu, ShieldCheck, Sparkles, X } from "lucide-react";
import { navItems, platformTitle } from "@/lib/navigation";

// شريط تنقّل سفلي للجوال فقط (تجربة الجوال) — يعيد استخدام المسارات الفعلية،
// و«المزيد» يفتح القائمة الجانبية القائمة. الحاسوب لا يتأثر (sm:hidden).
// الاستوديو في الوسط بزر بارز مرتفع (تجربة الجوال)
const bottomTabs = [
  { title: "السجل", href: "/content-management", icon: FileClock, primary: false },
  { title: "المراجعة", href: "/content-review", icon: FileCheck2, primary: false },
  { title: "الاستوديو", href: "/content-studio", icon: Sparkles, primary: true },
  { title: "التخطيط", href: "/calendar-v2", icon: CalendarDays, primary: false },
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

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-paper">
      {navOpen ? (
        <div
          aria-hidden="true"
          onClick={() => setNavOpen(false)}
          className="fixed inset-0 z-20 bg-ink/30 lg:hidden"
        />
      ) : null}

      {/* الدرج الجانبي للجوال واللوحي فقط — الحاسب له قائمة ثابتة (lg:hidden) */}
      <aside
        className={clsx(
          "fixed bottom-0 right-0 top-0 z-30 flex w-[min(20rem,100vw)] max-w-full flex-col border-l border-line bg-white transition-transform duration-200 ease-out md:top-16 lg:hidden",
          navOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="border-b border-line bg-paper p-4 sm:p-6 md:hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-lg bg-palm text-white shadow-sm">
                <ShieldCheck size={24} />
              </div>
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
          {visibleItems.map((item) => {
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
      </aside>

      {/* القائمة الجانبية الثابتة — الحاسب فقط (lg+). بنفس ألوان الجوال تمامًا:
          خلفية بيضاء وحدود line، والنشط mint/palm — لا لون داكن ولا جديد.
          الجوال يبقى على الدرج الأبيض والزر والشريط السفلي بلا تغيير. */}
      <aside
        className={clsx(
          "fixed inset-y-0 right-0 z-40 hidden w-64 flex-col overflow-y-auto border-l border-line bg-white p-3",
          pathname !== "/login" && "lg:flex"
        )}
      >
        <div className="mb-2 flex items-center gap-3 rounded-xl bg-paper p-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-palm text-white shadow-sm">
            <ShieldCheck size={20} />
          </div>
          <p className="text-xs font-bold leading-5 text-palm">{platformTitle}</p>
        </div>
        <nav className="flex flex-col">
          {/* «الوصول السريع» يُخفى من القائمة الثابتة للحاسب لأنه مكرّر مع بطاقة
              «دليل الاستخدام» أدناه؛ ويبقى في درج الجوال كما هو (لا بطاقة دليل هناك). */}
          {visibleItems
            .filter((item) => item.href !== "/library")
            .map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "mb-1 flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition focus-ring",
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
        <div className="mt-auto flex flex-col gap-3 pt-3">
          <div className="rounded-xl border border-line p-3">
            <div className="flex items-center gap-2 text-ink">
              <BookOpen size={15} className="text-palm" />
              <p className="text-sm font-semibold">دليل الاستخدام</p>
            </div>
            <p className="mt-1 text-xs leading-5 text-ink/55">تعرّف على كيفية استخدام النظام</p>
            <Link
              href="/library"
              className="mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-palm/30 px-3 py-2 text-xs font-medium text-palm transition hover:bg-mint focus-ring"
            >
              عرض الدليل <ExternalLink size={13} />
            </Link>
          </div>
          <div className="rounded-xl border border-line p-3">
            <div className="flex items-center gap-2 text-ink">
              <Headphones size={15} className="text-palm" />
              <p className="text-sm font-semibold">دعم المحامين</p>
            </div>
            <p className="mt-1 text-xs leading-5 text-ink/55">للاستفسارات والدعم الفني</p>
            <Link
              href="/library"
              className="mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-palm/30 px-3 py-2 text-xs font-medium text-palm transition hover:bg-mint focus-ring"
            >
              تواصل معنا
            </Link>
          </div>
        </div>
      </aside>

      <div className={clsx("w-full max-w-full overflow-x-hidden", pathname !== "/login" && "lg:pr-64")}>
        <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur">
          <div className="flex min-h-16 max-w-full items-center justify-between gap-3 px-4 sm:gap-4 sm:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setNavOpen((open) => !open)}
                className="grid h-10 w-10 place-items-center rounded-md border border-line transition hover:border-palm hover:text-palm focus-ring lg:hidden"
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
          {bottomTabs.map((tab) => {
            const Icon = tab.icon;
            const active = pathname === tab.href;
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
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            className="flex flex-1 flex-col items-center gap-1 py-2 text-[11px] text-ink/55 transition focus-ring"
          >
            <Menu size={20} aria-hidden="true" />
            <span>المزيد</span>
          </button>
        </nav>
      ) : null}
    </div>
  );
}
