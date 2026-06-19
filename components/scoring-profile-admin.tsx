"use client";

import { useState } from "react";
import { CopyPlus, Save, ShieldCheck } from "lucide-react";
import { Panel, SectionTitle, StatusBadge } from "@/components/ui";
import type { ScoringProfile } from "@/lib/scoring-profiles";

export function ScoringProfileAdmin({ initialProfiles }: { initialProfiles: ScoringProfile[] }) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [selectedKey, setSelectedKey] = useState(`${initialProfiles[0]?.id}:${initialProfiles[0]?.version}`);
  const [reason, setReason] = useState("تحديث معتمد لقواعد التقييم");
  const [message, setMessage] = useState("");
  const selected = profiles.find((item) => `${item.id}:${item.version}` === selectedKey);

  function updateReadiness(key: keyof ScoringProfile["readinessWeights"], value: number) {
    if (!selected || selected.status !== "DRAFT") return;
    setProfiles((current) => current.map((item) =>
      item.id === selected.id && item.version === selected.version
        ? { ...item, readinessWeights: { ...item.readinessWeights, [key]: value } }
        : item
    ));
  }

  async function post(body: Record<string, unknown>) {
    const response = await fetch("/api/admin/scoring-profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.details?.join(" ") ?? "تعذر حفظ الإجراء.");
      return;
    }
    setProfiles(payload.data.profiles);
    setMessage("تم حفظ الإجراء وتسجيله في سجل التغييرات.");
  }

  if (!selected) return null;
  const total = Object.values(selected.readinessWeights).reduce((sum, value) => sum + value, 0);

  return (
    <Panel>
      <SectionTitle title="ملفات التقييم المحكومة" subtitle="إنشاء الإصدارات وضبط الأوزان وتفعيلها متاح للإدارة فقط. الإصدارات المفعلة غير قابلة للتعديل." />
      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-2">
          {profiles.map((profile) => (
            <button key={`${profile.id}-${profile.version}`} type="button" onClick={() => setSelectedKey(`${profile.id}:${profile.version}`)} className={`w-full rounded-lg border p-3 text-right ${selectedKey === `${profile.id}:${profile.version}` ? "border-palm bg-mint" : "border-line"}`}>
              <div className="flex items-center justify-between gap-2"><span className="font-semibold">{profile.name}</span><StatusBadge tone={profile.status === "ACTIVE" ? "good" : "neutral"}>{profile.status === "ACTIVE" ? "مفعل" : profile.status === "DRAFT" ? "مسودة" : "متقاعد"}</StatusBadge></div>
              <p className="mt-1 text-xs text-ink/55">الإصدار {profile.version} — {profile.contentKinds.join("، ") || "الملف الافتراضي"}</p>
            </button>
          ))}
        </div>
        <div className="rounded-xl border border-line p-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-semibold">{selected.name} — الإصدار {selected.version}</h3><StatusBadge tone={total === 100 ? "good" : "gold"}>مجموع الجاهزية {total}%</StatusBadge></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {Object.entries(selected.readinessWeights).map(([key, value]) => (
              <label key={key} className="text-sm">{({ compliance: "الامتثال", risk: "المخاطر", language: "جودة اللغة", approval: "الاعتماد" } as Record<string, string>)[key]}
                <input type="number" min={0} max={100} disabled={selected.status !== "DRAFT"} value={value} onChange={(event) => updateReadiness(key as keyof ScoringProfile["readinessWeights"], Number(event.target.value))} className="mt-2 w-full rounded-md border border-line px-3 py-2.5 disabled:bg-paper" />
              </label>
            ))}
          </div>
          <label className="mt-4 block text-sm">سبب التغيير<input value={reason} onChange={(event) => setReason(event.target.value)} className="mt-2 w-full rounded-md border border-line px-3 py-2.5" /></label>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={() => post({ action: "newVersion", id: selected.id, version: selected.version, reason })} className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5"><CopyPlus size={16} />إنشاء إصدار جديد</button>
            <button type="button" disabled={selected.status !== "DRAFT" || total !== 100} onClick={() => post({ action: "save", profile: selected, reason })} className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2.5 disabled:opacity-40"><Save size={16} />حفظ المسودة</button>
            <button type="button" disabled={selected.status !== "DRAFT" || total !== 100} onClick={() => post({ action: "activate", id: selected.id, version: selected.version, reason })} className="inline-flex items-center gap-2 rounded-md bg-palm px-4 py-2.5 text-white disabled:opacity-40"><ShieldCheck size={16} />تفعيل الإصدار</button>
          </div>
          {message ? <p className="mt-3 text-sm text-palm">{message}</p> : null}
        </div>
      </div>
    </Panel>
  );
}
