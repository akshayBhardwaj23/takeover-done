# Sentry Error Monitoring Setup

Sentry is integrated into the application for production error tracking and monitoring.

## Configuration

The Sentry integration is minimal and production-ready:

- **Client-side**: Captures browser errors and exceptions
- **Server-side**: Captures API route errors and exceptions  
- **Error Boundaries**: Automatic React error boundary handling
- **Session Replay**: Records user sessions on errors (masked for privacy)

## Environment Setup

Add the following to your `apps/web/.env.local` file for production:

```bash
NEXT_PUBLIC_SENTRY_DSN="https://your-dsn@sentry.io/project-id"
```

### Getting Your Sentry DSN

1. Go to [sentry.io](https://sentry.io) and sign up/login
2. Create a new project (or select existing)
3. Choose "Next.js" as the platform
4. Copy the DSN from project settings
5. Add it to your `.env.local` file

## How It Works

### Development

- Sentry is **disabled** in development mode (no errors sent)
- You'll see console warnings if instrumentation is missing

### Production

- All errors and exceptions are automatically captured
- Session replay records what users were doing when errors occurred
- Errors are masked for privacy (text/media content hidden in recordings)

## Configuration Files

- `sentry.client.config.ts` - Client-side browser monitoring
- `sentry.server.config.ts` - Server-side API monitoring  
- `sentry.edge.config.ts` - Edge runtime monitoring
- `instrumentation.ts` - Next.js instrumentation hook
- `next.config.mjs` - Sentry webpack plugin configuration

## Error Handling

The app includes two error boundaries:

- `app/error.tsx` - Handles page-level errors
- `app/global-error.tsx` - Handles global app errors

Both automatically send errors to Sentry.

## Features

✅ Automatic error capture  
✅ Session replay on errors  
✅ Server & client monitoring  
✅ Privacy-first (masked recordings)  
✅ Production-only (disabled in dev)  
✅ Source map upload for better debugging  
✅ Ad-blocker bypass via tunnel route  

## Security

- All Sentry domains are allowed in CSP headers
- Session replay masks sensitive data
- DSN is public-safe (can be exposed in client code)
- Only sends data in production builds

## Deployment Notes

When deploying to production:

1. Set `NEXT_PUBLIC_SENTRY_DSN` in your hosting platform's environment variables
2. Build the app (source maps will be uploaded automatically)
3. Verify errors appear in your Sentry dashboard

The Sentry org and project are configured as:
- **Org**: `zyyp-ai`
- **Project**: `ai-ecom-tool`

These can be updated in `next.config.mjs` if needed.

## Troubleshooting

### Errors Not Appearing

- Verify `NEXT_PUBLIC_SENTRY_DSN` is set correctly
- Check that you're running in production mode (`NODE_ENV=production`)
- Look for Sentry-related errors in the build logs

### Build Warnings

If you see warnings about missing configuration files during build, you can safely ignore them as they're handled automatically.

## Resources

- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Dashboard](https://sentry.io/organizations/zyyp-ai/projects/)

