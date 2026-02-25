import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStockOnHand(warehouseId?: number, productId?: number) {
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
}
