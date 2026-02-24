import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // --- Users ---
  const adminPassword = await bcrypt.hash('admin123', 10);
  const managerPassword = await bcrypt.hash('manager123', 10);
  const viewerPassword = await bcrypt.hash('viewer123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      role: 'ADMIN',
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@example.com' },
    update: {},
    create: {
      email: 'manager@example.com',
      password: managerPassword,
      role: 'MANAGER',
    },
  });

  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@example.com' },
    update: {},
    create: {
      email: 'viewer@example.com',
      password: viewerPassword,
      role: 'VIEWER',
    },
  });

  console.log(`  Users: ${admin.email}, ${manager.email}, ${viewer.email}`);

  // --- Warehouses ---
  const warehouse1 = await prisma.warehouse.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'Central Warehouse', location: 'Budapest, HU' },
  });

  const warehouse2 = await prisma.warehouse.upsert({
    where: { id: 2 },
    update: {},
    create: { name: 'West Depot', location: 'Győr, HU' },
  });

  console.log(`  Warehouses: ${warehouse1.name}, ${warehouse2.name}`);

  // --- Products ---
  const products = [
    { sku: 'PROD-001', name: 'Laptop Pro 15',       description: 'High performance laptop',      price: 1299.99 },
    { sku: 'PROD-002', name: 'Wireless Mouse',      description: 'Ergonomic wireless mouse',     price: 49.99 },
    { sku: 'PROD-003', name: 'Mechanical Keyboard',  description: 'Cherry MX Blue switches',      price: 109.99 },
    { sku: 'PROD-004', name: '27" 4K Monitor',      description: 'Ultra HD IPS display',         price: 349.99 },
    { sku: 'PROD-005', name: 'USB-C Docking Station', description: '10-in-1 hub',                 price: 89.99 },
  ];

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: p,
    });

    // Add initial stock to both warehouses
    // Use upsert to be idempotent
    await prisma.stock.upsert({
      where: {
        productId_warehouseId: {
          productId: product.id,
          warehouseId: warehouse1.id,
        },
      },
      update: {},
      create: {
        productId: product.id,
        warehouseId: warehouse1.id,
        quantity: 50,
      },
    });

    await prisma.stock.upsert({
      where: {
        productId_warehouseId: {
          productId: product.id,
          warehouseId: warehouse2.id,
        },
      },
      update: {},
      create: {
        productId: product.id,
        warehouseId: warehouse2.id,
        quantity: 30,
      },
    });
  }

  console.log(`  Products: ${products.length} products with stock in both warehouses`);
  console.log('✅ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
