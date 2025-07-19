/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed output: 'export' to allow API routes to function properly
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
  optimizeFonts: false,
  fontLoaders: [], // Completely disable font loaders to prevent AbortError
  webpack(config) {
    config.cache = false;     // ← uncommented to fix WebAssembly memory allocation error
    
    // Add fallback for encoding module to resolve node-fetch compatibility issues
    config.resolve.fallback = {
      ...config.resolve.fallback,
      encoding: false,
    };
    
    return config;
  },
};

module.exports = nextConfig;