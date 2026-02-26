import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getStockOnHand(warehouseId?: number, productId?: number) {
    this.logger.debug(
      `Generating Stock on Hand report. Filter warehouse: ${warehouseId}, product: ${productId}`,
    );
    const where: Record<string, unknown> = {};

    if (warehouseId) {
      where.warehouseId = warehouseId;
    }
    if (productId) {
      where.productId = productId;
    }

    const stocks = await this.prisma.stock.findMany({
      where,
      include: {
        Product: {
          select: { id: true, sku: true, name: true, price: true },
        },
        Warehouse: {
          select: { id: true, name: true, location: true },
        },
      },
      orderBy: [{ Warehouse: { name: 'asc' } }, { Product: { name: 'asc' } }],
    });

    // Group by warehouse for a cleaner report structure
    const grouped: Record<
      number,
      {
        warehouse: { id: number; name: string; location: string | null };
        items: {
          product: { id: number; sku: string; name: string; price: number };
          quantity: number;
        }[];
        totalItems: number;
      }
    > = {};

    for (const stock of stocks) {
      const whId = stock.Warehouse.id;
      if (!grouped[whId]) {
        grouped[whId] = {
          warehouse: stock.Warehouse,
          items: [],
          totalItems: 0,
        };
      }
      grouped[whId].items.push({
        product: stock.Product,
        quantity: stock.quantity,
      });
      grouped[whId].totalItems += stock.quantity;
    }

    return Object.values(grouped);
  }

  async getMovementSummary(startDate?: string, endDate?: string) {
    this.logger.debug(
      `Generating Movement Summary report. Start: ${startDate}, End: ${endDate}`,
    );
    const where: Prisma.StockMovementWhereInput = {};
    if (startDate || endDate) {
      const date: Prisma.DateTimeFilter = {};
      if (startDate) date.gte = new Date(startDate);
      if (endDate) date.lte = new Date(endDate);
      where.date = date;
    }

    const movements = await this.prisma.stockMovement.groupBy({
      by: ['type'],
      where,
      _sum: {
        quantity: true,
      },
      _count: {
        id: true,
      },
    });

    return movements.map((m) => ({
      type: m.type,
      totalQuantity: m._sum.quantity || 0,
      count: m._count.id,
    }));
  }

  async getTopMovedProducts(limit = 10, startDate?: string, endDate?: string) {
    this.logger.debug(`Generating Top Moved Products report. Limit: ${limit}`);
    const where: Prisma.StockMovementWhereInput = {};
    if (startDate || endDate) {
      const date: Prisma.DateTimeFilter = {};
      if (startDate) date.gte = new Date(startDate);
      if (endDate) date.lte = new Date(endDate);
      where.date = date;
    }

    const movements = await this.prisma.stockMovement.groupBy({
      by: ['productId', 'type'],
      where,
      _sum: {
        quantity: true,
      },
      orderBy: {
        _sum: {
          quantity: 'desc',
        },
      },
      take: 100, // Get more to handle the limit after sorting by total
    });

    // Sum across all types for each product
    const productTotals: Record<number, number> = {};
    movements.forEach((m) => {
      productTotals[m.productId] =
        (productTotals[m.productId] || 0) + (m._sum.quantity || 0);
    });

    const sortedIds = Object.keys(productTotals)
      .map(Number)
      .sort((a, b) => productTotals[b] - productTotals[a])
      .slice(0, limit);

    if (sortedIds.length === 0) return [];

    const products = await this.prisma.product.findMany({
      where: { id: { in: sortedIds } },
      select: { id: true, name: true, sku: true },
    });

    return sortedIds
      .map((id) => {
        const product = products.find((p) => p.id === id);
        return product
          ? {
              ...product,
              totalMoved: productTotals[id],
            }
          : null;
      })
      .filter((p) => p !== null);
  }
}
