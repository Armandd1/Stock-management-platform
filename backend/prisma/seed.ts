import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import pino from 'pino';
import * as fs from 'fs';

const logger = pino({
  transport: {
    target: 'pino-pretty',
    options: { singleLine: true, colorize: true },
  },
});
const prisma = new PrismaClient();

async function main() {
  logger.info('🌱 Seeding database...');

  // --- Users ---
  // WARNING: These default passwords are for local development only.
  // In production, always set strong passwords via environment variables:
  // ADMIN_PASSWORD, MANAGER_PASSWORD, VIEWER_PASSWORD.
  const adminPlainPassword = process.env.ADMIN_PASSWORD ?? 'Admin123!';
  const managerPlainPassword = process.env.MANAGER_PASSWORD ?? 'Manager123!';
  const viewerPlainPassword = process.env.VIEWER_PASSWORD ?? 'Viewer123!';

  const adminPassword = await bcrypt.hash(adminPlainPassword, 10);
  const managerPassword = await bcrypt.hash(managerPlainPassword, 10);
  const viewerPassword = await bcrypt.hash(viewerPlainPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      role: 'ADMIN',
      name: 'System Administrator',
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: 'manager@example.com' },
    update: {},
    create: {
      email: 'manager@example.com',
      password: managerPassword,
      role: 'MANAGER',
      name: 'Inventory Manager',
    },
  });

  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@example.com' },
    update: {},
    create: {
      email: 'viewer@example.com',
      password: viewerPassword,
      role: 'VIEWER',
      name: 'Guest Viewer',
    },
  });

  logger.info(`  Users: ${admin.email}, ${manager.email}, ${viewer.email}`);

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

  logger.info(`  Warehouses: ${warehouse1.name}, ${warehouse2.name}`);

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

  logger.info(`  Products: ${products.length} products with stock in both warehouses`);

  // --- Stock Movements ---
  // Clean up old generated movements first to avoid inflating
  await prisma.stockMovement.deleteMany({});
  
  const allProducts = await prisma.product.findMany();
  
  if (allProducts.length >= 2) {
    const p1 = allProducts[0];
    const p2 = allProducts[1];

    await prisma.stockMovement.create({
      data: {
        type: 'IN',
        quantity: 50,
        productId: p1.id,
        toWarehouseId: warehouse1.id,
        createdById: admin.id,
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      }
    });

    await prisma.stockMovement.create({
      data: {
        type: 'TRANSFER',
        quantity: 10,
        productId: p1.id,
        fromWarehouseId: warehouse1.id,
        toWarehouseId: warehouse2.id,
        createdById: manager.id,
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      }
    });

    await prisma.stockMovement.create({
      data: {
        type: 'OUT',
        quantity: 5,
        productId: p2.id,
        fromWarehouseId: warehouse2.id,
        createdById: admin.id,
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      }
    });

    logger.info(`  Stock Movements: Added 3 sample historical movements`);
  }

  logger.info('✅ Seeding complete!');
}

main()
  .catch((e) => {
    fs.writeFileSync('seed-error.json', JSON.stringify({ message: e.message, name: e.name, code: e.code, meta: e.meta }, null, 2));
    logger.error({ err: e }, 'Seeding error: ');
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
