"use client";

import { useEffect } from "react";
import { pullAndMergeFromCloud, pushAllToCloud, scheduleCloudPush } from "@/lib/records-cloud-sync";

// مُشغّل المزامنة السحابية — يعمل في خلفية كل الصفحات: سحب ودمج ورفع عند الفتح وعند
// كل عودة للصفحة (تبديل تبويب/جهاز)، ورفع تلقائي مع كل تغيير محلي. صامت ولا يعطل
// شيئاً عند تعذر الشبكة أو غياب الحساب. الرفع عند الفتح يضمن أن كل جهاز يوصل سجله
// للسحابة بمجرد فتحه فيراه بقية الأجهزة بالحساب نفسه.
export function RecordsCloudSync() {
  useEffect(() => {
    const syncNow = () => {
      void pullAndMergeFromCloud();
      void pushAllToCloud();
    };
    syncNow();
    const onChange = () => scheduleCloudPush();
    const onFocus = () => syncNow();
    const onVisible = () => { if (document.visibilityState === "visible") syncNow(); };
    window.addEventListener("lm-records-changed", onChange);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    // إعادة مزامنة دورية خفيفة كل دقيقتين لالتقاط تغييرات الأجهزة الأخرى دون تدخل
    const interval = window.setInterval(syncNow, 120_000);
    return () => {
      window.removeEventListener("lm-records-changed", onChange);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(interval);
    };
  }, []);
  return null;
}
