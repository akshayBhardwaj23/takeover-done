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
      
      // Parse URL to check for query parameters and path
      try {
        const urlObj = new URL(callbackUrl);
        const pathname = urlObj.pathname;
        const explicitCallback = urlObj.searchParams.get('callbackUrl');
        
        // Check if this is a signin or signout page
        const isSignInPage = pathname.includes('/api/auth/signin');
        const isSignOutPage = pathname.includes('/api/auth/signout');
        
        // If this is a signout page, always redirect to home
        if (isSignOutPage) {
          return `${baseUrl}/`;
        }
        
        // If this is a signin page URL, extract the callbackUrl from query params
        if (isSignInPage) {
          // If there's an explicit callbackUrl in the signin URL, use it
          if (explicitCallback) {
            const decodedCallback = decodeURIComponent(explicitCallback);
            const absoluteCallback = decodedCallback.startsWith('/')
              ? `${baseUrl}${decodedCallback}`
              : decodedCallback;
            
            // Always respect the explicit callbackUrl from signin page
            return absoluteCallback;
          }
          
          // If no callbackUrl in signin URL, default to integrations (signIn case)
          return `${baseUrl}/integrations`;
        }
      } catch {
        // If URL parsing fails, continue with original logic
      }
      
      // If callbackUrl is the home page, allow it (for signOut)
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
