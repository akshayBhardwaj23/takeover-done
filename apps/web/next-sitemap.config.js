/** @type {import('next-sitemap').IConfig} */
const isBlocked = process.env.BLOCK_INDEXING === 'true';
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://www.zyyp.ai',
  generateRobotsTxt: true,
  sourceDir: '.next',
  outDir: 'public',
  exclude: [
    '/inbox',
    '/integrations',
    '/analytics',
    '/shopify-analytics',
    '/usage',
    '/playbooks',
    '/pinterest-demo',
    '/api/*',
    '/auth/*',
  ],
  robotsTxtOptions: {
    policies: isBlocked
      ? [{ userAgent: '*', disallow: '/' }]
      : [
          { userAgent: '*', allow: '/' },
          {
            userAgent: '*',
            disallow: [
              '/inbox',
              '/integrations',
              '/analytics',
              '/shopify-analytics',
              '/usage',
              '/playbooks',
              '/pinterest-demo',
              '/api',
              '/auth',
            ],
          },
        ],
  },
};
