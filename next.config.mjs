/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: "/calendar", destination: "/calendar-v2", permanent: true },
    ];
  },
};

export default nextConfig;
