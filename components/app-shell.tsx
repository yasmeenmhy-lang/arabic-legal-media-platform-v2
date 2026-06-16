"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, ShieldCheck } from "lucide-react";
import { navItems, platformTitle } from "@/lib/navigation";
import { demoSession } from "@/lib/rbac";
import { clsx } from "clsx";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const visibleItems = navItems;
  const groups = Array.from(new Set(visibleItems.map((item) => item.group)));

  return (
    <div className="min-h-screen overflow-x-hidden bg-paper">
      <aside className="fixed bottom-0 right-0 top-0 z-20 hidden w-80 border-l border-line bg-white lg:block">
        <div className="border-b border-line bg-paper p-6">
          <div className="flex items-start gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-palm text-white shadow-sm">
              <ShieldCheck size={24} />
            </div>
            <div>
              <p className="text-base font-normal text-palm">منصة المحامين</p>
              <p className="mt-1 max-w-48 text-xs leading-6 text-ink/65">
                تمكين الحضور الإعلامي والإعلاني وفق مراجعة مهنية استرشادية
              </p>
            </div>
          </div>
        </div>
        <nav className="h-[calc(100vh-112px)] overflow-y-auto p-4">
          {groups.map((group) => (
            <div key={group} className="mb-5">
              <div className="mb-2 px-2 text-[11px] font-normal text-ink/45">{group}</div>
              {visibleItems
                .filter((item) => item.group === group)
                .map((item) => {
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
            </div>
          ))}
        </nav>
      </aside>

      <div className="lg:mr-80">
        <header className="sticky top-0 z-10 border-b border-line bg-white/95 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button className="grid h-10 w-10 place-items-center rounded-md border border-line lg:hidden" title="القائمة">
                <Menu size={20} />
              </button>
              <div>
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
        <main className="min-w-0 px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
