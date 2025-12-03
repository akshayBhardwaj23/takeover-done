type WebhookTopic =
  | 'orders/create'
  | 'orders/updated' // Added for real-time status updates + PII refresh
  | 'refunds/create'
  | 'orders/fulfilled'
  | 'app/uninstalled'
  | 'shop/update'
  | 'products/create';

export async function registerWebhooks(shop: string, accessToken: string) {
  const appUrl = process.env.SHOPIFY_APP_URL ?? 'http://localhost:3000';
  const address = `${appUrl}/api/webhooks/shopify`;
  // Always register orders/create and other essential webhooks
  // orders/updated is critical for:
  //   1. Real-time status changes (payment, fulfillment)
  //   2. Customer PII updates (webhooks contain unredacted data)
  // The PROTECTED_WEBHOOKS flag controls additional webhooks
  const essentialTopics: WebhookTopic[] = [
    'orders/create',
    'orders/updated', // Essential for real-time updates + PII from webhooks
    'orders/fulfilled',
    'refunds/create',
    'app/uninstalled',
  ];
  const additionalTopics: WebhookTopic[] = ['shop/update', 'products/create'];
  const topics: WebhookTopic[] =
    process.env.PROTECTED_WEBHOOKS === 'true'
      ? [...essentialTopics, ...additionalTopics]
      : essentialTopics;
  const results: Array<{ topic: string; success: boolean; error?: string }> =
    [];

  for (const topic of topics) {
    try {
      const resp = await fetch(
        `https://${shop}/admin/api/2025-10/webhooks.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Shopify-Access-Token': accessToken,
          },
          body: JSON.stringify({ webhook: { topic, address, format: 'json' } }),
        },
      );
      if (!resp.ok) {
        const text = await resp.text().catch(() => '');
        // Treat duplicate address (already registered) as success
        if (resp.status === 422 && /address\".*already been taken/.test(text)) {
          console.log(`[Webhook Registration] ✅ ${topic} already registered`);
          results.push({ topic, success: true });
          continue;
        }
        const errorMsg = `Status ${resp.status}: ${text}`;
        console.error(
          `[Webhook Registration] ❌ Failed to register ${topic}:`,
          errorMsg,
        );
        results.push({ topic, success: false, error: errorMsg });
      } else {
        console.log(
          `[Webhook Registration] ✅ Successfully registered ${topic}`,
        );
        results.push({ topic, success: true });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(
        `[Webhook Registration] ❌ Exception registering ${topic}:`,
        errorMsg,
      );
      results.push({ topic, success: false, error: errorMsg });
    }
  }

  return results;
}

export async function listWebhooks(shop: string, accessToken: string) {
  const resp = await fetch(`https://${shop}/admin/api/2025-10/webhooks.json`, {
    headers: { 'X-Shopify-Access-Token': accessToken },
  });
  const json = await resp.json().catch(() => ({}));
  return { status: resp.status, json };
}
