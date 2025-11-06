/** @type {import('next').NextConfig} */

// Ensure we always have a valid absolute URL for API rewrites in dev
const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || `http://localhost:5000`;

const nextConfig = {
  // Allow builds to complete even with ESLint warnings
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Measure and display build duration + enable verbose webpack logs
  webpack(config, { buildId, dev, isServer, webpack }) {
    const startTime = Date.now();

    // Verbose logging for Webpack internal progress
    config.infrastructureLogging = { level: 'verbose' };
    config.stats = 'verbose';

    // Print build phase info
    console.log('--- NEXT.JS BUILD CONFIG ---');
    console.log(`Build ID: ${buildId}`);
    console.log(`Server build: ${isServer}`);
    console.log(`Dev mode: ${dev}`);
    console.log('----------------------------');

    // Hook to log build duration
    config.plugins.push({
      apply: (compiler) => {
        compiler.hooks.done.tap('BuildTimerPlugin', (stats) => {
          const duration = ((Date.now() - startTime) / 1000).toFixed(2);
          console.log(`✅ Build completed in ${duration} seconds`);
        });
      },
    });

    return config;
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

