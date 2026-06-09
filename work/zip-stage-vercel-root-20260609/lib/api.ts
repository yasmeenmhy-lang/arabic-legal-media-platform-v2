import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function forbidden(message = "ليست لديك صلاحية لتنفيذ هذا الإجراء") {
  return NextResponse.json({ error: message }, { status: 403 });
}
