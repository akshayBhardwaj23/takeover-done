
import { ShopifyClient } from '../packages/api/src/services/shopify';
import * as dotenv from 'dotenv';

dotenv.config();

const SHOP_DOMAIN = process.env.DEBUG_SHOP_DOMAIN;
const ACCESS_TOKEN = process.env.DEBUG_ACCESS_TOKEN;

if (!SHOP_DOMAIN || !ACCESS_TOKEN) {
  console.error('Please provide DEBUG_SHOP_DOMAIN and DEBUG_ACCESS_TOKEN in your .env file or environment variables.');
  process.exit(1);
}

async function main() {
  console.log(`Connecting to ${SHOP_DOMAIN}...`);
  const client = new ShopifyClient(SHOP_DOMAIN, ACCESS_TOKEN);

  try {
    console.log('Fetching last 5 orders...');
    const orders = await client.getOrders(5, { includeHistorical: true });
    
    console.log(`Fetched ${orders.length} orders.`);

    for (const order of orders) {
      console.log('---------------------------------------------------');
      console.log(`Order ID: ${order.id}`);
      console.log(`Name: ${order.name}`);
      console.log(`Email (root): ${order.email}`);
      console.log(`Contact Email: ${order.contact_email}`);
      console.log('Customer Object:', JSON.stringify(order.customer, null, 2));
      console.log('Billing Address:', JSON.stringify(order.billing_address, null, 2));
      console.log('Shipping Address:', JSON.stringify(order.shipping_address, null, 2));
    }

  } catch (error) {
    console.error('Error fetching orders:', error);
  }
}

main();

