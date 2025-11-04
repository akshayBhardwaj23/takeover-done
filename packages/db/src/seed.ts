import { prisma } from './index.js';

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'founder@example.com' },
    create: { email: 'founder@example.com', name: 'Founder' },
    update: {},
  });

  const connection = await prisma.connection.upsert({
    where: {
      id: 'test-connection-1',
    },
    create: {
      id: 'test-connection-1',
      type: 'SHOPIFY',
      accessToken: 'test-token',
      userId: user.id,
      shopDomain: 'test-shop.myshopify.com',
    },
    update: {},
  });

  await prisma.order.upsert({
    where: { shopifyId: 'test-order-1' },
    create: {
      shopifyId: 'test-order-1',
      status: 'UNFULFILLED',
      email: 'customer@example.com',
      totalAmount: 1999,
      connectionId: connection.id,
    },
    update: {},
  });

  console.log('Seeded user', user.email);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
