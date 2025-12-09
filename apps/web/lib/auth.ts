import type { NextAuthOptions } from 'next-auth';
import Google from 'next-auth/providers/google';

export const authOptions: NextAuthOptions = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // If there's a callbackUrl in the query, use it
      if (url.startsWith(baseUrl)) return url;
      // Otherwise, redirect to integrations page after login
      return `${baseUrl}/integrations`;
    },
  },
};
