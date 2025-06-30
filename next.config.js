/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed output: 'export' to allow API routes to function properly
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  webpack(config) {
    config.cache = false;     // ← turns off the PackFileCacheStrategy
    return config;
  },
};

module.exports = nextConfig;