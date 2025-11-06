export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/integrations/:path*', '/inbox/:path*', '/playbooks/:path*', '/analytics/:path*', '/shopify-analytics/:path*'],
};


