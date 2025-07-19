/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed output: 'export' to allow API routes to function properly
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  optimizeFonts: false, // Disable font optimization to prevent AbortError during build
  webpack(config) {
    // config.cache = false;     // ← commented out as it causes manifest corruption
    
    // Add fallback for encoding module to resolve node-fetch compatibility issues
    config.resolve.fallback = {
      ...config.resolve.fallback,
      encoding: false,
    };
    
    return config;
  },
};

module.exports = nextConfig;