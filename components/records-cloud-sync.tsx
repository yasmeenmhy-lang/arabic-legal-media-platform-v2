"use client";

import { useEffect } from "react";
import { pullAndMergeFromCloud, scheduleCloudPush } from "@/lib/records-cloud-sync";

// مُشغّل المزامنة السحابية — يعمل في خلفية كل الصفحات: سحب ودمج عند الفتح،
// ورفع تلقائي مع كل تغيير محلي. صامت تماماً ولا يعطل شيئاً عند تعذر الشبكة.
export function RecordsCloudSync() {
  useEffect(() => {
    void pullAndMergeFromCloud();
    const onChange = () => scheduleCloudPush();
    window.addEventListener("lm-records-changed", onChange);
    return () => window.removeEventListener("lm-records-changed", onChange);
  }, []);
  return null;
}
