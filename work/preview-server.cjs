const http = require("http");

const pages = [
  ["/dashboard", "لوحة التحكم", "ملخص المهام والمسودات والمنشورات المجدولة والتنبيهات والتوصيات."],
  ["/ai-assistant", "مساعد المحتوى الذكي", "إنشاء وإعادة صياغة وتلخيص محتوى مهني وإعلاني مع سجل للطلبات."],
  ["/media-planning", "التخطيط الإعلامي", "خطط أسبوعية وشهرية وتقويم وقائمة ومسار زمني للمحتوى."],
  ["/content-review", "مراجعة المحتوى", "كشف الوعود والمبالغات والمخاطر المهنية قبل النشر."],
  ["/content-management", "إدارة المحتوى", "مسودات وإصدارات واعتمادات وأرشفة وبحث وتصنيف."],
  ["/publishing", "إدارة النشر", "جدولة المحتوى ومتابعة الطابور ومزودي النشر التجريبيين."],
  ["/campaigns", "إدارة الحملات", "حملات توعوية ومهنية وإعلانية مع أهداف وجمهور وقنوات."],
  ["/studio", "استوديو المحتوى", "تحويل النصوص إلى صور وإنفوجرافيك وشرائح ومنشورات."],
  ["/library", "مكتبة المحتوى", "قوالب وأصول قابلة للبحث والتصفية وإعادة الاستخدام."],
  ["/analytics", "التحليلات", "أداء المحتوى والقنوات والحملات مع مؤشرات قابلة للتصدير."],
  ["/recommendations", "التوصيات", "اقتراحات لتحسين المحتوى والقنوات وتوقيت النشر."],
  ["/alerts", "مركز التنبيهات", "تنبيهات المخاطر والمراجعات وفشل النشر والاتجاهات."],
  ["/sector-analytics", "مؤشرات القطاع", "مؤشرات مجمعة فقط دون ترتيب أو درجات سمعة أو تقييم فردي."],
  ["/login", "تسجيل الدخول", "واجهة جلسات تجريبية للمستخدمين والأدوار."]
];

const title = "منصة إدارة وتمكين الحضور الإعلامي والإعلاني للمحامين";

function html(pathname) {
  const page = pages.find(([href]) => href === pathname) || pages[0];
  const cards = pages
    .map(
      ([href, label, body]) =>
        `<a class="${href === page[0] ? "active" : ""}" href="${href}"><strong>${label}</strong><span>${body}</span></a>`
    )
    .join("");

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body{margin:0;background:#f7f8f5;color:#17211d;font-family:Tahoma,Arial,sans-serif}
    header{position:sticky;top:0;background:#fff;border-bottom:1px solid #d9dfd7;padding:18px 28px;z-index:1}
    h1{margin:0;font-size:18px;line-height:1.7}
    main{display:grid;grid-template-columns:320px 1fr;min-height:calc(100vh - 74px)}
    nav{background:#fff;border-left:1px solid #d9dfd7;padding:14px;overflow:auto}
    nav a{display:block;text-decoration:none;color:#17211d;border-radius:6px;padding:12px;margin-bottom:8px;border:1px solid transparent}
    nav a.active{background:#e8f4ef;border-color:#1f6f55;color:#1f6f55}
    nav span{display:block;font-size:12px;line-height:1.7;color:#17211daa;margin-top:4px}
    section{padding:28px}
    .panel{background:#fff;border:1px solid #d9dfd7;border-radius:6px;padding:22px;margin-top:18px}
    .grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
    .kpi{background:#fff;border:1px solid #d9dfd7;border-radius:6px;padding:18px}
    .value{font-size:30px;font-weight:800;color:#1f6f55;margin-top:10px}
    .badge{display:inline-block;background:#e8f4ef;color:#1f6f55;border-radius:4px;padding:5px 8px;font-size:12px;font-weight:700}
    @media(max-width:900px){main{grid-template-columns:1fr}nav{border-left:0;border-bottom:1px solid #d9dfd7}.grid{grid-template-columns:repeat(2,1fr)}}
  </style>
</head>
<body>
  <header><h1>${title}</h1></header>
  <main>
    <nav>${cards}</nav>
    <section>
      <span class="badge">معاينة محلية</span>
      <h2>${page[1]}</h2>
      <p>${page[2]}</p>
      <div class="grid">
        <div class="kpi">مهام بانتظارك<div class="value">8</div></div>
        <div class="kpi">مسودات نشطة<div class="value">24</div></div>
        <div class="kpi">منشورات مجدولة<div class="value">11</div></div>
        <div class="kpi">تنبيهات عالية<div class="value">3</div></div>
      </div>
      <div class="panel">
        <h3>ضوابط مهنية</h3>
        <p>لا توجد ترتيبات للمحامين، ولا درجات سمعة، ولا تقييمات عامة فردية. مؤشرات المشرفين مجمعة فقط.</p>
      </div>
      <div class="panel">
        <h3>حالة التشغيل</h3>
        <p>هذه معاينة محلية بدون اعتماديات خارجية لأن تثبيت حزم Next.js غير متاح في هذه الجلسة.</p>
      </div>
    </section>
  </main>
</body>
</html>`;
}

const server = http.createServer((request, response) => {
  const url = new URL(request.url || "/", "http://localhost:3000");
  const pathname = url.pathname === "/" ? "/dashboard" : url.pathname;
  const known = pages.some(([href]) => href === pathname);
  response.writeHead(known ? 200 : 404, { "content-type": "text/html; charset=utf-8" });
  response.end(html(known ? pathname : "/dashboard"));
});

server.listen(3000, "127.0.0.1", () => {
  console.log("Preview server listening on http://localhost:3000");
});
