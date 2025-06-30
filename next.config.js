/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed output: 'export' to allow API routes to function properly
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
};

module.exports = nextConfig;