/** @type {import('next').NextConfig} */
import { withSentryConfig } from '@sentry/nextjs';

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value:
      "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.openai.com https://api.mailgun.net https://ingest.sentry.io https://sentry.io;",
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'origin-when-cross-origin' },
];

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
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: 'zyyp-ai',
  project: 'ai-ecom-tool',
  
  silent: !process.env.CI,
  
  // Hides source maps from generated client bundles
  hideSourceMaps: true,
  
  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,
  
  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers
  tunnelRoute: '/monitoring',
  
  // Enables automatic instrumentation of Vercel Cron Monitors
  automaticVercelMonitors: true,
});
