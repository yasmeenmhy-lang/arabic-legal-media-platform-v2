/** @type {import('next').NextConfig} */
// تحويلات دائمة للعناوين القديمة — بقرار مالكة المنصة عند توحيد أسماء المسارات
// مع مسمياتها المعروضة: أي رابط محفوظ أو تبويب مفتوح يظل يعمل ولا يعطي صفحة مفقودة.
const nextConfig = {
  async redirects() {
    return [
      { source: "/content-studio", destination: "/content-center", permanent: true },
      { source: "/content-review", destination: "/analysis", permanent: true },
      { source: "/content-review/:path*", destination: "/analysis/:path*", permanent: true },
      { source: "/content-management", destination: "/records", permanent: true },
      { source: "/calendar-v2", destination: "/planning", permanent: true },
      { source: "/calendar", destination: "/planning", permanent: true },
    ];
  },
};

export default nextConfig;
