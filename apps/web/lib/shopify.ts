type WebhookTopic =
  | 'orders/create'
  | 'refunds/create'
  | 'orders/fulfilled'
  | 'app/uninstalled'
  | 'shop/update'
  | 'products/create';

export async function registerWebhooks(shop: string, accessToken: string) {
  const appUrl = process.env.SHOPIFY_APP_URL ?? 'http://localhost:3000';
  const address = `${appUrl}/api/webhooks/shopify`;
  // Always register orders/create and other essential webhooks
  // The PROTECTED_WEBHOOKS flag controls additional webhooks
  const essentialTopics: WebhookTopic[] = [
    'orders/create',
    'orders/fulfilled',
    'refunds/create',
    'app/uninstalled',
  ];
  const additionalTopics: WebhookTopic[] = [
    'shop/update',
    'products/create',
  ];
  const topics: WebhookTopic[] =
    process.env.PROTECTED_WEBHOOKS === 'true'
      ? [...essentialTopics, ...additionalTopics]
      : essentialTopics;
  for (const topic of topics) {
    try {
      const resp = await fetch(
        `https://${shop}/admin/api/2024-07/webhooks.json`,
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
          continue;
        }
        console.warn('shopify webhook register failed', {
          topic,
          status: resp.status,
          text,
        });
      }
    } catch (err) {
      // swallow errors; webhook may already exist or merchant lacks perms
    }
  }
}

export async function listWebhooks(shop: string, accessToken: string) {
  const resp = await fetch(`https://${shop}/admin/api/2024-07/webhooks.json`, {
    headers: { 'X-Shopify-Access-Token': accessToken },
  });
  const json = await resp.json().catch(() => ({}));
  return { status: resp.status, json };
}
