import { prisma } from './index';

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'founder@example.com' },
    create: { email: 'founder@example.com', name: 'Founder' },
    update: {},
  });

  await prisma.order.upsert({
    where: { shopifyId: 'test-order-1' },
    create: {
      shopifyId: 'test-order-1',
      status: 'UNFULFILLED',
      email: 'customer@example.com',
      totalAmount: 1999,
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


