import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class MovementsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateMovementDto, userId: number) {
    // Validate product exists
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID ${dto.productId} not found`);
    }

    switch (dto.type) {
      case 'IN':
        return this.handleIn(dto, userId);
      case 'OUT':
        return this.handleOut(dto, userId);
      case 'TRANSFER':
        return this.handleTransfer(dto, userId);
      default:
        throw new BadRequestException(`Unknown movement type: ${dto.type}`);
    }
  }

  // --- IN: Add stock to a warehouse ---
  private async handleIn(dto: CreateMovementDto, userId: number) {
    if (!dto.toWarehouseId) {
      throw new BadRequestException(
        'toWarehouseId is required for IN movements',
      );
    }

    // Validate warehouse exists
    await this.validateWarehouse(dto.toWarehouseId);

    // Upsert stock and create movement in a transaction
    return this.prisma.$transaction(async (tx) => {
      await tx.stock.upsert({
        where: {
          productId_warehouseId: {
            productId: dto.productId,
            warehouseId: dto.toWarehouseId!,
          },
        },
        update: { quantity: { increment: dto.quantity } },
        create: {
          productId: dto.productId,
          warehouseId: dto.toWarehouseId!,
          quantity: dto.quantity,
        },
      });

      return tx.stockMovement.create({
        data: {
          type: dto.type,
          quantity: dto.quantity,
          productId: dto.productId,
          toWarehouseId: dto.toWarehouseId,
          createdById: userId,
        },
        include: {
          Product: { select: { id: true, sku: true, name: true } },
          ToWarehouse: { select: { id: true, name: true } },
          CreatedBy: { select: { id: true, name: true, email: true } },
        },
      });
    });
  }

  // --- OUT: Remove stock from a warehouse ---
  private async handleOut(dto: CreateMovementDto, userId: number) {
    if (!dto.fromWarehouseId) {
      throw new BadRequestException(
        'fromWarehouseId is required for OUT movements',
      );
    }

    await this.validateWarehouse(dto.fromWarehouseId);

    return this.prisma.$transaction(
      async (tx) => {
        // Lock and read current stock
        const stocks = await tx.$queryRaw<
          { id: number; quantity: number }[]
        >`SELECT id, quantity FROM "Stock" WHERE "productId" = ${dto.productId} AND "warehouseId" = ${dto.fromWarehouseId} FOR UPDATE`;

        const stock = stocks[0];

        if (!stock || stock.quantity < dto.quantity) {
          throw new BadRequestException(
            `Insufficient stock. Available: ${stock?.quantity ?? 0}, Requested: ${dto.quantity}`,
          );
        }

        await tx.stock.update({
          where: { id: stock.id },
          data: { quantity: { decrement: dto.quantity } },
        });

        return tx.stockMovement.create({
          data: {
            type: dto.type,
            quantity: dto.quantity,
            productId: dto.productId,
            fromWarehouseId: dto.fromWarehouseId,
            createdById: userId,
          },
          include: {
            Product: { select: { id: true, sku: true, name: true } },
            FromWarehouse: { select: { id: true, name: true } },
            CreatedBy: { select: { id: true, name: true, email: true } },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  // --- TRANSFER: Move stock between warehouses ---
  private async handleTransfer(dto: CreateMovementDto, userId: number) {
    if (!dto.fromWarehouseId || !dto.toWarehouseId) {
      throw new BadRequestException(
        'Both fromWarehouseId and toWarehouseId are required for TRANSFER movements',
      );
    }

    if (dto.fromWarehouseId === dto.toWarehouseId) {
      throw new BadRequestException('Cannot transfer to the same warehouse');
    }

    await this.validateWarehouse(dto.fromWarehouseId);
    await this.validateWarehouse(dto.toWarehouseId);

    return this.prisma.$transaction(
      async (tx) => {
        // Lock source stock row
        const sourceStocks = await tx.$queryRaw<
          { id: number; quantity: number }[]
        >`SELECT id, quantity FROM "Stock" WHERE "productId" = ${dto.productId} AND "warehouseId" = ${dto.fromWarehouseId} FOR UPDATE`;

        const sourceStock = sourceStocks[0];

        if (!sourceStock || sourceStock.quantity < dto.quantity) {
          throw new BadRequestException(
            `Insufficient stock in source warehouse. Available: ${sourceStock?.quantity ?? 0}, Requested: ${dto.quantity}`,
          );
        }

        // Decrement source
        await tx.stock.update({
          where: { id: sourceStock.id },
          data: { quantity: { decrement: dto.quantity } },
        });

        // Upsert destination
        await tx.stock.upsert({
          where: {
            productId_warehouseId: {
              productId: dto.productId,
              warehouseId: dto.toWarehouseId!,
            },
          },
          update: { quantity: { increment: dto.quantity } },
          create: {
            productId: dto.productId,
            warehouseId: dto.toWarehouseId!,
            quantity: dto.quantity,
          },
        });

        return tx.stockMovement.create({
          data: {
            type: dto.type,
            quantity: dto.quantity,
            productId: dto.productId,
            fromWarehouseId: dto.fromWarehouseId,
            toWarehouseId: dto.toWarehouseId,
            createdById: userId,
          },
          include: {
            Product: { select: { id: true, sku: true, name: true } },
            FromWarehouse: { select: { id: true, name: true } },
            ToWarehouse: { select: { id: true, name: true } },
            CreatedBy: { select: { id: true, name: true, email: true } },
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  // --- Read operations ---

  async findAll(filters?: {
    productId?: number;
    warehouseId?: number;
    type?: string;
  }) {
    const where: Prisma.StockMovementWhereInput = {};

    if (filters?.productId) {
      where.productId = filters.productId;
    }
    if (filters?.type) {
      const allowedTypes = ['IN', 'OUT', 'TRANSFER'];
      if (!allowedTypes.includes(filters.type)) {
        throw new BadRequestException(
          `Invalid movement type: ${filters.type}. Allowed values are IN, OUT, TRANSFER.`,
        );
      }
      where.type = filters.type as Prisma.EnumMovementTypeFilter['equals'];
    }
    if (filters?.warehouseId) {
      where.OR = [
        { fromWarehouseId: filters.warehouseId },
        { toWarehouseId: filters.warehouseId },
      ];
    }

    return this.prisma.stockMovement.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        Product: { select: { id: true, sku: true, name: true } },
        FromWarehouse: { select: { id: true, name: true } },
        ToWarehouse: { select: { id: true, name: true } },
        CreatedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async findOne(id: number) {
    const movement = await this.prisma.stockMovement.findUnique({
      where: { id },
      include: {
        Product: true,
        FromWarehouse: true,
        ToWarehouse: true,
        CreatedBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!movement) {
      throw new NotFoundException(`Stock movement with ID ${id} not found`);
    }

    return movement;
  }

  // --- Helpers ---

  private async validateWarehouse(warehouseId: number) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id: warehouseId },
    });
    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${warehouseId} not found`);
    }
  }
}
