"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function AdminLogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleLogout() {
    setLoading(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={loading}
      className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2.5 text-sm font-normal text-ink shadow-sm transition hover:border-palm focus-ring disabled:cursor-not-allowed disabled:opacity-60"
    >
      <LogOut size={16} />
      تسجيل الخروج
    </button>
  );
}
