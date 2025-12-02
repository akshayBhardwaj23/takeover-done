import { TRPCError } from '@trpc/server';

// ============================================================================
// Shopify API Types
// ============================================================================

interface ShopifyLineItem {
  id: number;
  title: string;
  quantity: number;
  price: string;
  variant_id?: number;
  product_id?: number;
  sku?: string;
}

interface ShopifyOrder {
  id: number;
  name: string;
  email: string;
  contact_email?: string;
  created_at: string;
  total_price: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  processed_at: string;
  updated_at: string;
  cancelled_at?: string | null;
  cancel_reason?: string | null;
  refunds?: ShopifyRefund[];
  customer?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    default_address?: {
      first_name?: string;
      last_name?: string;
      name?: string;
      company?: string;
      country?: string;
    };
  };
  billing_address?: {
    first_name: string;
    last_name: string;
    name: string;
    country?: string;
  };
  shipping_address?: {
    first_name: string;
    last_name: string;
    name: string;
    country?: string;
  };
  line_items: ShopifyLineItem[];
}

interface ShopifyRefundLineItem {
  line_item_id: number;
  quantity: number;
  restock_type?: 'no_restock' | 'cancel' | 'return' | 'legacy_restock';
}

interface ShopifyRefund {
  id: number;
  order_id: number;
  created_at: string;
  note?: string;
  refund_line_items: Array<{
    id: number;
    line_item_id: number;
    quantity: number;
    subtotal: string;
    total_tax: string;
  }>;
  transactions: Array<{
    id: number;
    amount: string;
    kind: string;
    gateway: string;
    status: string;
  }>;
}

interface ShopifyTransaction {
  id: number;
  order_id: number;
  kind: 'authorization' | 'capture' | 'sale' | 'void' | 'refund';
  gateway: string;
  status: 'pending' | 'success' | 'failure' | 'error';
  amount: string;
  currency: string;
  parent_id?: number;
}

interface ShopifyCustomer {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  orders_count: number;
  total_spent: string;
  created_at: string;
}

// ============================================================================
// Refund/Cancel Types
// ============================================================================

export interface RefundInput {
  orderId: string;
  amount?: number; // Amount in cents - if not provided, calculates from line items
  reason?: string;
  notify?: boolean; // Whether to send refund notification to customer
  lineItems?: Array<{
    lineItemId: string;
    quantity: number;
    restockType?: 'no_restock' | 'cancel' | 'return';
  }>;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  amount?: number; // Amount refunded in cents
  error?: string;
}

export interface CancelOrderInput {
  orderId: string;
  reason?: 'customer' | 'fraud' | 'inventory' | 'declined' | 'other';
  email?: boolean; // Whether to send cancellation email
  restock?: boolean; // Whether to restock items
}

export interface CancelOrderResult {
  success: boolean;
  cancelledAt?: string;
  error?: string;
}

export class ShopifyClient {
  private shopUrl: string;
  private accessToken: string;
  private apiVersion = '2024-10';

  constructor(shopDomain: string, accessToken: string) {
    // Ensure protocol
    this.shopUrl = shopDomain.startsWith('http')
      ? shopDomain
      : `https://${shopDomain}`;
    this.accessToken = accessToken;
  }

  /**
   * GET request to Shopify Admin API
   */
  private async request<T>(
    path: string,
    params: Record<string, any> = {},
  ): Promise<T> {
    const url = new URL(`${this.shopUrl}/admin/api/${this.apiVersion}/${path}`);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': this.accessToken,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Shopify API Error: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    return response.json();
  }

  /**
   * POST request to Shopify Admin API
   */
  private async postRequest<T>(
    path: string,
    body: Record<string, any>,
  ): Promise<T> {
    const url = `${this.shopUrl}/admin/api/${this.apiVersion}/${path}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': this.accessToken,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Shopify API Error: ${response.status} ${response.statusText} - ${errorText}`,
      );
    }

    return response.json();
  }

  async getOrders(
    limit = 50,
    options?: { sinceId?: number; includeHistorical?: boolean },
  ): Promise<ShopifyOrder[]> {
    const params: Record<string, any> = {
      status: 'any',
      limit,
    };

    if (options?.sinceId) {
      params.since_id = options.sinceId;
    }

    // By default, Shopify only returns orders from last 60 days
    // Set created_at_min to fetch historical orders (up to 2 years back)
    if (options?.includeHistorical) {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      params.created_at_min = twoYearsAgo.toISOString();
    }

    const data = await this.request<{ orders: ShopifyOrder[] }>(
      'orders.json',
      params,
    );
    return data.orders;
  }

  async getCustomers(limit = 50, sinceId?: number): Promise<ShopifyCustomer[]> {
    const params: Record<string, any> = {
      limit,
    };
    if (sinceId) {
      params.since_id = sinceId;
    }

    const data = await this.request<{ customers: ShopifyCustomer[] }>(
      'customers.json',
      params,
    );
    return data.customers;
  }

  /**
   * Validates the credentials by fetching the shop info
   */
  async validate(): Promise<boolean> {
    try {
      await this.request('shop.json');
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Get a single order by ID with full details
   */
  async getOrder(orderId: string): Promise<ShopifyOrder | null> {
    try {
      const data = await this.request<{ order: ShopifyOrder }>(
        `orders/${orderId}.json`,
      );
      return data.order;
    } catch (e) {
      console.error(`[ShopifyClient] Failed to get order ${orderId}:`, e);
      return null;
    }
  }

  /**
   * Get transactions for an order (needed for refunds)
   */
  async getOrderTransactions(orderId: string): Promise<ShopifyTransaction[]> {
    try {
      const data = await this.request<{ transactions: ShopifyTransaction[] }>(
        `orders/${orderId}/transactions.json`,
      );
      return data.transactions;
    } catch (e) {
      console.error(`[ShopifyClient] Failed to get transactions for order ${orderId}:`, e);
      return [];
    }
  }

  /**
   * Calculate refund amount for an order
   * Uses Shopify's calculate endpoint to get exact refund amount
   */
  async calculateRefund(
    orderId: string,
    lineItems?: Array<{ lineItemId: string; quantity: number }>,
  ): Promise<{ amount: number; lineItems: any[] } | null> {
    try {
      const refundData: any = {
        refund: {
          shipping: { full_refund: false },
        },
      };

      if (lineItems && lineItems.length > 0) {
        refundData.refund.refund_line_items = lineItems.map((item) => ({
          line_item_id: parseInt(item.lineItemId, 10),
          quantity: item.quantity,
          restock_type: 'return',
        }));
      }

      const data = await this.postRequest<{ refund: any }>(
        `orders/${orderId}/refunds/calculate.json`,
        refundData,
      );

      // Sum up the refund amount from transactions
      const transactions = data.refund.transactions || [];
      const totalAmount = transactions.reduce((sum: number, t: any) => {
        return sum + Math.round(parseFloat(t.amount || '0') * 100);
      }, 0);

      return {
        amount: totalAmount,
        lineItems: data.refund.refund_line_items || [],
      };
    } catch (e) {
      console.error(`[ShopifyClient] Failed to calculate refund for order ${orderId}:`, e);
      return null;
    }
  }

  /**
   * Create a refund for an order
   * @param input - Refund parameters
   * @returns RefundResult with success status and refund details
   */
  async createRefund(input: RefundInput): Promise<RefundResult> {
    const { orderId, amount, reason, notify = true, lineItems } = input;

    try {
      // First, get the order to validate and get transaction info
      const order = await this.getOrder(orderId);
      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      // Check if order can be refunded
      if (order.financial_status === 'refunded') {
        return { success: false, error: 'Order is already fully refunded' };
      }

      // Get transactions to find the parent transaction for refund
      const transactions = await this.getOrderTransactions(orderId);
      const capturedTransaction = transactions.find(
        (t) => (t.kind === 'capture' || t.kind === 'sale') && t.status === 'success',
      );

      if (!capturedTransaction) {
        return { success: false, error: 'No captured payment found for this order' };
      }

      // Build refund request
      const refundData: any = {
        refund: {
          note: reason || 'Refund initiated via AI E-com Tool',
          notify,
          transactions: [
            {
              parent_id: capturedTransaction.id,
              amount: amount 
                ? (amount / 100).toFixed(2) // Convert cents to dollars
                : capturedTransaction.amount, // Full refund if no amount specified
              kind: 'refund',
              gateway: capturedTransaction.gateway,
            },
          ],
        },
      };

      // Add line items if specified (for partial refunds)
      if (lineItems && lineItems.length > 0) {
        refundData.refund.refund_line_items = lineItems.map((item) => ({
          line_item_id: parseInt(item.lineItemId, 10),
          quantity: item.quantity,
          restock_type: item.restockType || 'return',
        }));
      }

      const data = await this.postRequest<{ refund: ShopifyRefund }>(
        `orders/${orderId}/refunds.json`,
        refundData,
      );

      const refund = data.refund;
      const refundedAmount = refund.transactions.reduce((sum, t) => {
        return sum + Math.round(parseFloat(t.amount) * 100);
      }, 0);

      console.log(`[ShopifyClient] Refund created successfully:`, {
        orderId,
        refundId: refund.id,
        amount: refundedAmount,
      });

      return {
        success: true,
        refundId: String(refund.id),
        amount: refundedAmount,
      };
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`[ShopifyClient] Failed to create refund for order ${orderId}:`, e);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Cancel an order
   * @param input - Cancel parameters
   * @returns CancelOrderResult with success status
   */
  async cancelOrder(input: CancelOrderInput): Promise<CancelOrderResult> {
    const { orderId, reason = 'other', email = true, restock = true } = input;

    try {
      // Get order to validate
      const order = await this.getOrder(orderId);
      if (!order) {
        return { success: false, error: 'Order not found' };
      }

      // Check if order can be cancelled
      if (order.cancelled_at) {
        return { success: false, error: 'Order is already cancelled' };
      }

      if (order.fulfillment_status === 'fulfilled') {
        return { success: false, error: 'Cannot cancel a fulfilled order. Consider a refund instead.' };
      }

      // Cancel the order
      const data = await this.postRequest<{ order: ShopifyOrder }>(
        `orders/${orderId}/cancel.json`,
        {
          reason,
          email,
          restock,
        },
      );

      console.log(`[ShopifyClient] Order cancelled successfully:`, {
        orderId,
        cancelledAt: data.order.cancelled_at,
        reason,
      });

      return {
        success: true,
        cancelledAt: data.order.cancelled_at || undefined,
      };
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error(`[ShopifyClient] Failed to cancel order ${orderId}:`, e);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Update order note/tags
   */
  async updateOrder(
    orderId: string,
    updates: { note?: string; tags?: string },
  ): Promise<boolean> {
    try {
      const url = `${this.shopUrl}/admin/api/${this.apiVersion}/orders/${orderId}.json`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': this.accessToken,
        },
        body: JSON.stringify({ order: updates }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[ShopifyClient] Failed to update order ${orderId}:`, errorText);
        return false;
      }

      return true;
    } catch (e) {
      console.error(`[ShopifyClient] Failed to update order ${orderId}:`, e);
      return false;
    }
  }
}
