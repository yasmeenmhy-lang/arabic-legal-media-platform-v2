// أيقونة الموقع: قلم واضح داخل دائرة بلون المنصة الأساسي (#25935F الأخضر) — بنفس
// شكل أيقونة «تعديل» (Edit3) المستخدمة في كل أزرار التعديل عبر المنصة (لغة تصميم موحدة)
const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <circle cx="32" cy="32" r="30" fill="#25935F"/>
  <g transform="translate(32,32) scale(1.5) translate(-12,-12)" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>
    <path d="m15 5 4 4"/>
  </g>
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
