"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, ShieldCheck } from "lucide-react";
import { navItems, platformTitle } from "@/lib/navigation";
import { can, demoSession } from "@/lib/rbac";
import { clsx } from "clsx";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const role = demoSession.user.role;

  return (
    <div className="min-h-screen bg-paper">
      <aside className="fixed bottom-0 right-0 top-0 z-20 hidden w-72 border-l border-line bg-white lg:block">
        <div className="border-b border-line p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded bg-palm text-white">
              <ShieldCheck size={22} />
            </div>
            <div>
              <p className="text-sm font-bold text-palm">منصة المحامين</p>
              <p className="mt-1 text-xs leading-5 text-ink/65">إدارة وتمكين الحضور الإعلامي والإعلاني</p>
            </div>
          </div>
        </div>
        <nav className="h-[calc(100vh-92px)] overflow-y-auto p-3">
          {navItems
            .filter((item) => !item.permission || can(role, item.permission))
            .map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "mb-1 flex items-center gap-3 rounded px-3 py-2.5 text-sm transition focus-ring",
                    active ? "bg-mint font-bold text-palm" : "text-ink/75 hover:bg-paper hover:text-ink"
                  )}
                >
                  <Icon size={18} />
                  {item.title}
                </Link>
              );
            })}
        </nav>
      </aside>

      <div className="lg:mr-72">
        <header className="sticky top-0 z-10 border-b border-line bg-white/95 backdrop-blur">
          <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex items-center gap-3">
              <button className="grid h-10 w-10 place-items-center rounded border border-line lg:hidden" title="القائمة">
                <Menu size={20} />
              </button>
              <h1 className="max-w-4xl text-sm font-extrabold leading-6 text-ink sm:text-base">{platformTitle}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button className="grid h-10 w-10 place-items-center rounded border border-line bg-white text-ink" title="التنبيهات">
                <Bell size={18} />
              </button>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-bold">{demoSession.user.name}</p>
                <p className="text-xs text-ink/60">محام</p>
              </div>
            </div>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
