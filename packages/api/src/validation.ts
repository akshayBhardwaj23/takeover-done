import validator from 'validator';

// Simple HTML tag and entity removal (server-safe, no jsdom dependency)
function stripHtmlSimple(input: string): string {
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&[#a-zA-Z0-9]+;/g, '') // Remove HTML entities like &nbsp;, &amp;, etc.
    .replace(/&#\d+;/g, '') // Remove numeric HTML entities like &#123;
    .trim();
}

export function sanitizePlainText(input: string | undefined | null): string {
  if (!input) return '';
  return stripHtmlSimple(String(input));
}

export function sanitizeLimited(
  input: string | undefined | null,
  max = 5000,
): string {
  const v = sanitizePlainText(input);
  return v.length > max ? v.slice(0, max) : v;
}

export function safeEmail(input: string | undefined | null): string | null {
  if (!input) return null;
  const email = String(input).trim().toLowerCase();
  return validator.isEmail(email) ? email : null;
}

export function safeShopDomain(
  input: string | undefined | null,
): string | null {
  if (!input) return null;
  const domain = String(input).trim().toLowerCase();
  // Accept *.myshopify.com
  const ok = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(domain);
  return ok ? domain : null;
}

export function clampNumber(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
