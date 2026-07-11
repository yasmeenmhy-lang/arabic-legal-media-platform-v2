"use client";

import { useEffect, useRef, useState } from "react";
import { Landmark } from "lucide-react";

// شعار الجهة الرسمية: البديل المؤسسي المرسوم بالكود يظهر افتراضياً، والشعار الحقيقي
// لا يحل محله إلا بعد نجاح تحميله فعلاً — لا أيقونة مكسورة أبداً حتى لو فشل التحميل
// قبل تفعيل React (نفحص حالة الصورة الفعلية بعد التركيب لتغطية هذه الحالة)
export function EntityLogo({ domain, size = 32 }: { domain: string; size?: number }) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
  }, []);

  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      {!loaded ? (
        <span
          aria-hidden="true"
          className="absolute inset-0 grid place-items-center rounded-lg border border-palm/25 bg-mint text-palm"
        >
          <Landmark size={Math.round(size * 0.55)} />
        </span>
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(false)}
        className={`rounded-lg border border-line bg-white object-contain p-0.5 ${loaded ? "" : "invisible"}`}
        style={{ width: size, height: size }}
      />
    </span>
  );
}
