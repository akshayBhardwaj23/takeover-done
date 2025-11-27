import { TRPCError } from '@trpc/server';

interface ShopifyOrder {
  id: number;
  name: string;
  email: string;
  created_at: string;
  total_price: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  customer?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  line_items: Array<{
    id: number;
    title: string;
    quantity: number;
    price: string;
  }>;
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

export class ShopifyClient {
  private shopUrl: string;
  private accessToken: string;

  constructor(shopDomain: string, accessToken: string) {
    // Ensure protocol
    this.shopUrl = shopDomain.startsWith('http') 
      ? shopDomain 
      : `https://${shopDomain}`;
    this.accessToken = accessToken;
  }

  private async request<T>(path: string, params: Record<string, any> = {}): Promise<T> {
    const url = new URL(`${this.shopUrl}/admin/api/2024-10/${path}`);
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
      throw new Error(`Shopify API Error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response.json();
  }

  async getOrders(limit = 50, options?: { sinceId?: number; includeHistorical?: boolean }): Promise<ShopifyOrder[]> {
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

    const data = await this.request<{ orders: ShopifyOrder[] }>('orders.json', params);
    return data.orders;
  }

  async getCustomers(limit = 50, sinceId?: number): Promise<ShopifyCustomer[]> {
    const params: Record<string, any> = {
      limit,
    };
    if (sinceId) {
      params.since_id = sinceId;
    }

    const data = await this.request<{ customers: ShopifyCustomer[] }>('customers.json', params);
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
}
