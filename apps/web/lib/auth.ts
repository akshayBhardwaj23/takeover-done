import type { NextAuthOptions } from 'next-auth';
import Google from 'next-auth/providers/google';
import EmailProvider from 'next-auth/providers/email';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { prisma } from '@ai-ecom/db';


export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      allowDangerousEmailAccountLinking: true,
    }),
    EmailProvider({
      from: process.env.MAILGUN_FROM_EMAIL || `support@${process.env.MAILGUN_DOMAIN || 'mail.zyyp.ai'}`,
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        const urlObj = new URL(url);
        const host = urlObj.host;
        
        // Sanitize inputs - strip quotes if present
        const apiKey = (process.env.MAILGUN_API_KEY || '').trim().replace(/^["']|["']$/g, '');
        const rawDomain = (process.env.MAILGUN_DOMAIN || '').trim().replace(/^["']|["']$/g, '');
        const region = (process.env.MAILGUN_REGION || '').trim().replace(/^["']|["']$/g, '');
        
        // Remove protocol if present in domain
        const domain = rawDomain.replace(/^https?:\/\//, '').replace(/\/$/, '');

        if (!apiKey || !domain) {
          throw new Error("MAILGUN_API_KEY or MAILGUN_DOMAIN is missing");
        }
        
        // Helper to try sending - matching packages/api logic exactly
        const sendToMailgun = async (r: string) => {
           const baseUrl = r === 'eu' ? 'https://api.eu.mailgun.net/v3' : 'https://api.mailgun.net/v3';
           const endpoint = `${baseUrl}/${domain}/messages`;
           
           const formData = new FormData();
           formData.append('from', provider.from);
           formData.append('to', identifier);
           formData.append('subject', `Sign in to ${host}`);
           formData.append('html', html({ url, host, theme: (provider as any).theme }));
           formData.append('text', text({ url, host }));

           return fetch(endpoint, {
             method: 'POST',
             headers: { 
               Authorization: `Basic ${Buffer.from(`api:${apiKey}`).toString('base64')}` 
             },
             body: formData,
           });
        };

        // Determine initial region
        const initialRegion = region || (apiKey.includes('-') && !apiKey.startsWith('key-') ? 'eu' : 'us');
        
        let response = await sendToMailgun(initialRegion);

        // If 401, retry with other region
        if (response.status === 401) {
          const otherRegion = initialRegion === 'us' ? 'eu' : 'us';
          console.warn(`[NextAuth] Mailgun 401 with ${initialRegion}, retrying ${otherRegion}...`);
          response = await sendToMailgun(otherRegion);
        }

        if (!response.ok) {
            const errorText = await response.text().catch(() => 'No error body');
            console.error('[NextAuth] Mailgun Final Failure:', {
                status: response.status,
                domain,
                region: initialRegion,
                error: errorText
            });
            throw new Error(`Mailgun API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
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
    async signIn({ user, account, profile }) {
      if (account?.provider === 'google' && profile && user.id) {
        // Sync profile data (image, name) to database for existing users
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              name: profile.name || user.name,
              image: (profile as any).picture || (profile as any).image || user.image,
            },
          });
        } catch (error) {
          console.error('[NextAuth] Error syncing profile data:', error);
        }
      }
      return true;
    },
    async session({ session, user, token }) {
      if (session.user) {
        // user is available when using 'database' strategy (adapter)
        // token is available when using 'jwt' strategy
        const userId = user?.id || (token?.sub as string);
        (session.user as any).id = userId;
      }
      return session;
    },
  },
};

/**
 * Email HTML body
 * Insert invisible space into domains from being turned into a hyperlink by email
 * clients like Outlook and Apple mail, as this is confusing because it seems
 * like they are supposed to click on it to sign in.
 *
 * @note We don't add the email address to avoid needing to escape it, if you do, remember to sanitize it!
 */
function html(params: { url: string; host: string; theme: any }) {
  const { url, host, theme } = params
  const brandColor = theme?.brandColor || "#346df1"
  const color = {
    background: "#f9f9f9",
    text: "#444",
    mainBackground: "#fff",
    buttonBackground: brandColor,
    buttonBorder: brandColor,
    buttonText: "#fff",
  }

  return `
<body style="background: ${color.background};">
  <table width="100%" border="0" cellspacing="20" cellpadding="0"
    style="background: ${color.background}; max-width: 600px; margin: auto; border-radius: 10px;">
    <tr>
      <td align="center"
        style="padding: 10px 0px; font-size: 22px; font-family: Helvetica, Arial, sans-serif; color: ${color.text};">
        Sign in to <strong>${host}</strong>
      </td>
    </tr>
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center" style="border-radius: 5px;" bgcolor="${color.buttonBackground}"><a href="${url}"
                target="_blank"
                style="font-size: 18px; font-family: Helvetica, Arial, sans-serif; color: ${color.buttonText}; text-decoration: none; border-radius: 5px; padding: 10px 20px; border: 1px solid ${color.buttonBorder}; display: inline-block; font-weight: bold;">Sign
                in</a></td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td align="center"
        style="padding: 0px 0px 10px 0px; font-size: 16px; line-height: 22px; font-family: Helvetica, Arial, sans-serif; color: ${color.text};">
        If you did not request this email, you can safely ignore it.
      </td>
    </tr>
  </table>
</body>
`
}

/** Email Text body (fallback for email clients that don't render HTML) */
function text({ url, host }: { url: string; host: string }) {
  return `Sign in to ${host}\n${url}\n\n`
}
