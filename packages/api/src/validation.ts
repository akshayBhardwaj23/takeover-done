import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

export function sanitizePlainText(input: string | undefined | null): string {
  if (!input) return '';
  // Remove any HTML, keep plain text only
  const cleaned = DOMPurify.sanitize(String(input), {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
  return cleaned.trim();
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
