/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: true,
  },
  transpilePackages: ['@ai-ecom/api', '@ai-ecom/db'],
  // Allow dev assets to be requested from the tunnel origin
  allowedDevOrigins: [
    process.env.SHOPIFY_APP_URL || 'http://localhost:3000',
    'https://dev.zyyp.ai',
  ],
};

export default nextConfig;
