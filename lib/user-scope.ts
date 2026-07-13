"use client";

// عزل تخزين المتصفح لكل حساب — بقرار مالكة المنصة: «لا تداخل سجلات بين الحسابات، كل حساب له خصوصيته»
// اسم الحساب الداخل يُحفظ محلياً لحظة الدخول، وكل مفاتيح بيانات المستخدم تُشتق منه،
// فيرى كل حساب سجلاته وخططه ومواعيده فقط — حتى على جهاز مشترك.

const SESSION_USER_KEY = "lawyer-media:session-user";

export function setSessionUser(username: string | null) {
  try {
    if (username) window.localStorage.setItem(SESSION_USER_KEY, username);
    else window.localStorage.removeItem(SESSION_USER_KEY);
  } catch {
    /* بيئة بلا تخزين */
  }
}

export function getSessionUser(): string {
  try {
    return window.localStorage.getItem(SESSION_USER_KEY) ?? "";
  } catch {
    return "";
  }
}

// المفتاح المعزول للحساب الحالي؛ وقبل تفعيل نظام الدخول يبقى المفتاح العام (السلوك القائم كما هو)
export function scopedKey(baseKey: string): string {
  const user = getSessionUser();
  return user ? `${baseKey}::u:${encodeURIComponent(user)}` : baseKey;
}

// تبنٍّ لمرة واحدة: بيانات المتصفح السابقة للعزل تُنسخ لأول حساب يدخل عليه —
// نسخ لا نقل: النسخة العامة القديمة تبقى كما هي احتياطاً (نضيف ولا نحذف)
export function adoptLegacyKey(baseKey: string) {
  try {
    const user = getSessionUser();
    if (!user) return;
    const scoped = `${baseKey}::u:${encodeURIComponent(user)}`;
    if (window.localStorage.getItem(scoped) === null) {
      const legacy = window.localStorage.getItem(baseKey);
      if (legacy !== null) window.localStorage.setItem(scoped, legacy);
    }
  } catch {
    /* تجاهل */
  }
}
