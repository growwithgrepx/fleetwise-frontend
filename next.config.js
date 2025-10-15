/** @type {import('next').NextConfig} */
const backendPort = process.env.BACKEND_PORT || 5000;
// Ensure we always have a valid absolute URL for API rewrites in dev
const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || `http://localhost:${backendPort}`;

const nextConfig = {
  // Allow builds to complete even with ESLint warnings
  eslint: {
    ignoreDuringBuilds: true,
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${apiBaseUrl}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;