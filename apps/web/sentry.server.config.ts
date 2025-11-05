// Sentry server-side configuration
import * as Sentry from '@sentry/nextjs';

const isProduction = process.env.NODE_ENV === 'production';
const isStaging = process.env.ENVIRONMENT === 'staging';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: isProduction ? 0.1 : 1.0, // Lower in production to reduce costs

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  // Enable temporarily to debug why events aren't appearing
  debug: process.env.SENTRY_DEBUG === 'true',

  // Enable Sentry in production and staging (not in local development)
  enabled: (isProduction || isStaging) && !!process.env.NEXT_PUBLIC_SENTRY_DSN,

  environment: isStaging
    ? 'staging'
    : isProduction
      ? 'production'
      : 'development',

  // Filter out noisy errors
  beforeSend(event, hint) {
    // Only send in staging/production
    if (!isProduction && !isStaging) {
      return null;
    }
    return event;
  },
});
