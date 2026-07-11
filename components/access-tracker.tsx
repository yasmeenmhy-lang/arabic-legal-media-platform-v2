"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// متتبع الجلسة — يرسل نبضاً عند كل تنقل وكل ثلاث دقائق: مسار الصفحة فقط، بلا أي محتوى
// (الخصوصية بقرار مالكة المنصة). وعندما تُنهى الجلسة أو يُعطَّل الحساب يُعاد للدخول فوراً.
// لا يعرض شيئاً على الإطلاق — لا أثر إدارياً في واجهة المستخدم العادي.
export function AccessTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/login")) return;

    let cancelled = false;
    async function ping() {
      try {
        const response = await fetch("/api/auth/ping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page: pathname }),
        });
        if (!cancelled && response.status === 401) window.location.href = "/login";
      } catch {
        /* تعطل الشبكة لا يطرد المستخدم */
      }
    }

    void ping();
    const interval = setInterval(() => void ping(), 3 * 60_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [pathname]);

  return null;
}
