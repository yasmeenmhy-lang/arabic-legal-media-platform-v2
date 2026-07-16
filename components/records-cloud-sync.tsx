"use client";

import { useEffect } from "react";
import { pullAndMergeFromCloud, pushAllToCloud, scheduleCloudPush } from "@/lib/records-cloud-sync";
import { pullKv, pushKv, scheduleKvPush } from "@/lib/kv-cloud-sync";

// مُشغّل المزامنة السحابية الشاملة — يعمل في خلفية كل الصفحات: يزامن سجل المحتوى وكل
// بيانات العمل الأخرى (الخطة الذكية، تواريخ النشر) عند الفتح وعند كل عودة للصفحة وكل
// دقيقتين، ويرفع أي تغيير محلي. صامت ولا يعطل شيئاً عند تعذر الشبكة أو غياب الحساب.
// بمجرد فتح أي جهاز يوصل عمله كاملاً للحساب فيراه بقية الأجهزة — فلا يضيع أي عمل.
export function RecordsCloudSync() {
  useEffect(() => {
    const syncNow = () => {
      void pullAndMergeFromCloud();
      void pushAllToCloud();
      void pullKv();
      void pushKv();
    };
    syncNow();
    const onRecordsChange = () => scheduleCloudPush();
    const onWorkChange = () => scheduleKvPush();
    const onFocus = () => syncNow();
    const onVisible = () => {
      if (document.visibilityState === "visible") syncNow();
      else { void pushAllToCloud(); void pushKv(); } // ارفع قبل مغادرة الصفحة
    };
    window.addEventListener("lm-records-changed", onRecordsChange);
    window.addEventListener("lm-work-changed", onWorkChange);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);
    const interval = window.setInterval(syncNow, 120_000);
    return () => {
      window.removeEventListener("lm-records-changed", onRecordsChange);
      window.removeEventListener("lm-work-changed", onWorkChange);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearInterval(interval);
    };
  }, []);
  return null;
}
