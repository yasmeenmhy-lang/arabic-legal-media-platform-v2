// أيقونة الموقع: قلم يكتب داخل دائرة بلون الخزامى (#80519F من هوية المنصّة)
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="30" fill="#80519F"/>
  <path d="M42 17 L27 32" stroke="#fff" stroke-width="5.4" stroke-linecap="round"/>
  <path d="M26.2 32.8 l-4 8.4 l8.4 -4 z" fill="#fff"/>
  <path d="M19 45 q5 -4.5 10 0 t10 0" stroke="#fff" stroke-width="2.8" fill="none" stroke-linecap="round"/>
</svg>`;

export function GET() {
  return new Response(favicon, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // كاش قصير مع إعادة تحقق: يمنع بقاء الأيقونة القديمة عالقة عند أي تحديث
      "Cache-Control": "public, max-age=3600, must-revalidate"
    }
  });
}
