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
      // If url is a relative path or external, make it absolute
      const callbackUrl = url.startsWith('/') ? `${baseUrl}${url}` : url;
      
      // If callbackUrl is the home page, allow it (for signOut)
      // signOut calls with callbackUrl: '/' should redirect to home
      if (callbackUrl === baseUrl || callbackUrl === `${baseUrl}/`) {
        return callbackUrl;
      }
      
      // If there's a valid callbackUrl that's not the home page, use it
      if (callbackUrl.startsWith(baseUrl)) {
        return callbackUrl;
      }
      
      // Default: redirect to integrations page after login (signIn case)
      return `${baseUrl}/integrations`;
    },
  },
};
