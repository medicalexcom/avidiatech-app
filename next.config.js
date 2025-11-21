/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@clerk/nextjs', '@clerk/backend'],
  experimental: {
    // Disable static page generation to fix ClerkProvider pre-rendering issues
    isrMemoryCacheSize: 0,
  },
  // Force dynamic rendering for all pages
  staticPageGenerationTimeout: 0,
};

module.exports = nextConfig;
