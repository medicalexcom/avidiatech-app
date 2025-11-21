/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@clerk/nextjs', '@clerk/backend'],
  
  // Turbopack-specific configuration to help resolve Clerk modules
  turbopack: {
    resolveAlias: {
      // Help Turbopack find Clerk modules
      '@clerk/nextjs/server': '@clerk/nextjs/dist/esm/server',
    },
  },
};

module.exports = nextConfig;
