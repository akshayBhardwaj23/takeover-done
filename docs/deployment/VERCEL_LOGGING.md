# Vercel Logging - Why console.log Doesn't Show

## The Problem

**`console.log()` is often filtered or buffered in Vercel logs**, making it hard to see important debug information.

## Why This Happens

1. **Vercel filters logs by severity** - `console.log` is often treated as low-priority and may be filtered out
2. **Log buffering** - `console.log` may be buffered and not immediately visible
3. **Log level prioritization** - Vercel prioritizes `console.error` and `console.warn` over `console.log`

## The Solution

**Use `console.error()` for important logs** - even for success messages!

### Why `console.error()` Works Better

- ✅ Always visible in Vercel logs
- ✅ Not filtered or buffered
- ✅ Shows up immediately in Vercel dashboard
- ✅ Can still contain success/info messages (the "error" is just for visibility)

### Example

```typescript
// ❌ BAD - May not show in Vercel logs
console.log('[Webhook] Request received');

// ✅ GOOD - Always visible
console.error('[Webhook] 📧 Request received:', { ... });
```

## What We Changed

All `console.log()` statements in the email webhook handler have been changed to `console.error()` for visibility:

- `[Email Webhook] 📧 Received request`
- `[Email Webhook] 🔐 Authentication check`
- `[Email Webhook] 📦 Request parsed successfully`
- `[Email Webhook] ✅ Authentication PASSED`
- `[Email Webhook] ✅✅✅ SUCCESSFULLY PROCESSED EMAIL`

## Log Levels in Vercel

- **`console.error()`** - Always visible, highest priority
- **`console.warn()`** - Usually visible, high priority
- **`console.log()`** - May be filtered/buffered, lower priority
- **`console.info()`** - Similar to `console.log`, may be filtered

## Best Practices for Vercel Logging

1. **Use `console.error()` for important logs** - even success messages
2. **Include emojis/prefixes** - Makes logs easier to search/filter (e.g., `📧`, `✅`, `❌`)
3. **Include timestamps** - Helps with debugging timing issues
4. **Use structured logging** - Log objects instead of strings for better searchability

## Searching Logs in Vercel

After deploying, you can search for:
- `📧` - All webhook requests
- `🔐` - Authentication checks
- `✅` - Success messages
- `❌` - Errors/failures
- `🚀` - Inngest events

## Alternative: Use a Logging Service

For production, consider using:
- **Vercel Log Drains** - Send logs to external services
- **Datadog, LogRocket, Sentry** - Dedicated logging services
- **Structured logging** - Use libraries like `pino` or `winston`

But for now, `console.error()` is the simplest solution that works!

