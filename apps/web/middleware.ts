export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/integrations/:path*', '/inbox/:path*'],
};


