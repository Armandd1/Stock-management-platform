import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(search?: string) {
    const where: Prisma.ProductWhereInput = {
      isActive: true,
      ...(search
        ? {
            OR: [
              { sku: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return this.prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        Stocks: {
          include: {
            Warehouse: { select: { id: true, name: true, location: true } },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }

    return product;
  }

  async create(dto: CreateProductDto, userId?: number) {
    try {
      const product = await this.prisma.product.create({ data: dto });
      this.logger.log(`Product created: ${product.sku} (${product.name})`);
      if (userId) {
        await this.auditService.logAction(
          userId,
          'CREATE',
          'Product',
          product.id,
          dto,
        );
      }
      return product;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        this.logger.warn(
          `Failed to create product - SKU already exists: ${dto.sku}`,
        );
        throw new ConflictException(
          `Product with SKU "${dto.sku}" already exists`,
        );
      }
      throw error;
    }
  }

  async createBulk(dtos: CreateProductDto[], userId?: number) {
    // Determine which SKUs will be skipped because they already exist
    const skus = dtos.map((dto) => dto.sku);
    const uniqueSkus = Array.from(new Set(skus));
    const existingProducts = await this.prisma.product.findMany({
      where: { sku: { in: uniqueSkus } },
      select: { sku: true },
    });
    const existingSkusSet = new Set(existingProducts.map((p) => p.sku));
    const skippedSkus = uniqueSkus.filter((sku) => existingSkusSet.has(sku));

    const result = await this.prisma.product.createMany({
      data: dtos,
      skipDuplicates: true, // Will just ignore duplicates instead of crashing
    });

    this.logger.log(
      `Bulk product creation finished. Created ${result.count} products, skipped ${skippedSkus.length}.`,
    );

    if (userId && (result.count > 0 || skippedSkus.length > 0)) {
      await this.auditService.logAction(
        userId,
        'CREATE_BULK',
        'Product',
        undefined,
        { count: result.count, skippedSkus },
      );
    }
    return { count: result.count, skippedSkus };
  }

  async update(id: number, dto: UpdateProductDto, userId?: number) {
    await this.findOne(id);
    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: dto,
      });
      this.logger.log(`Product updated: ${product.sku}`);
      if (userId) {
        await this.auditService.logAction(
          userId,
          'UPDATE',
          'Product',
          product.id,
          dto,
        );
      }
      return product;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        this.logger.warn(
          `Failed to update product - new SKU already exists: ${dto.sku}`,
        );
        throw new ConflictException(
          `Product with SKU "${dto.sku}" already exists`,
        );
      }
      throw error;
    }
  }

  async remove(id: number, userId?: number) {
    await this.findOne(id);
    const product = await this.prisma.product.update({
      where: { id },
      data: { isActive: false },
    });
    this.logger.log(`Product soft-removed: ${product.sku}`);
    if (userId) {
      await this.auditService.logAction(
        userId,
        'DELETE',
        'Product',
        product.id,
        { action: 'soft_delete' },
      );
    }
    return product;
  }
}
