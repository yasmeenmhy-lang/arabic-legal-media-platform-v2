"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShieldCheck, X } from "lucide-react";
import { navItems, platformTitle } from "@/lib/navigation";
import { demoSession } from "@/lib/rbac";
import { clsx } from "clsx";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const visibleItems = navItems;

  useEffect(() => {
    if (window.innerWidth >= 960) setNavOpen(true);
  }, []);

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
          className="fixed inset-0 z-20 bg-ink/30 md:hidden"
        />
      ) : null}

      <aside
        className={clsx(
          "fixed bottom-0 right-0 top-0 z-30 flex w-[min(20rem,100vw)] max-w-full flex-col border-l border-line bg-white transition-transform duration-200 ease-out md:top-16",
          navOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="border-b border-line bg-paper p-4 sm:p-6">
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

      <div className={clsx("w-full max-w-full overflow-x-hidden transition-[padding] duration-200", navOpen && "md:pr-80")}>
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
            <div className="hidden rounded-lg border border-line bg-paper px-3 py-2 text-left sm:block">
              <p className="text-sm font-normal">{demoSession.user.name}</p>
              <p className="text-xs text-ink/60">محام</p>
            </div>
          </div>
        </header>
        <main className="min-w-0 max-w-full overflow-x-hidden px-4 py-5 sm:px-8 sm:py-6">{children}</main>
      </div>
    </div>
  );
}
