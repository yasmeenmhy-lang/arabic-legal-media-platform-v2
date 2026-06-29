"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export function DirectorLoginForm() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function login() {
    const response = await fetch("/api/director/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });
    const payload = await response.json();
    if (!response.ok) {
      setMessage(payload.error ?? "تعذر تسجيل الدخول");
      return;
    }
    window.location.reload();
  }

  return (
    <div className="space-y-3">
      <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="كلمة مرور مدير الإدارة" className="w-full rounded-md border border-line px-3 py-2.5 focus-ring" />
      <Button type="button" onClick={login} className="w-full justify-center">دخول مدير الإدارة</Button>
      {message ? <p className="text-sm text-gold">{message}</p> : null}
    </div>
  );
}
