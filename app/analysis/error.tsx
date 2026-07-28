"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui";

export default function ContentReviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[content-review] client error:", error?.message ?? error);
  }, [error]);

  return (
    <div dir="rtl" className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
        <AlertTriangle size={32} className="text-amber-600" />
      </div>
      <div>
        <h1 className="text-xl font-semibold text-slate-800">تعذّر تحميل صفحة مراجعة المحتوى</h1>
        <p className="mt-2 text-sm leading-7 text-slate-500">
          حدث خطأ أثناء تحميل الصفحة. يمكنك إعادة المحاولة أو العودة للرئيسية.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={reset} leadingIcon={<RefreshCw size={16} />}>إعادة المحاولة</Button>
        <ButtonLink href="/content-center" variant="secondary-gray">الرئيسية</ButtonLink>
      </div>
    </div>
  );
}
