import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class ProductsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(search?: string) {
    const where: Prisma.ProductWhereInput = search
      ? {
          OR: [
            { sku: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {};

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
        throw new ConflictException(
          `Product with SKU "${dto.sku}" already exists`,
        );
      }
      throw error;
    }
  }

  async createBulk(dtos: CreateProductDto[], userId?: number) {
    const result = await this.prisma.product.createMany({
      data: dtos,
      skipDuplicates: true, // Will just ignore duplicates instead of crashing
    });
    if (userId && result.count > 0) {
      await this.auditService.logAction(
        userId,
        'CREATE_BULK',
        'Product',
        undefined,
        { count: result.count },
      );
    }
    return { count: result.count };
  }

  async update(id: number, dto: UpdateProductDto, userId?: number) {
    await this.findOne(id);
    try {
      const product = await this.prisma.product.update({
        where: { id },
        data: dto,
      });
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
        throw new ConflictException(
          `Product with SKU "${dto.sku}" already exists`,
        );
      }
      throw error;
    }
  }

  async remove(id: number, userId?: number) {
    await this.findOne(id);
    const product = await this.prisma.product.delete({ where: { id } });
    if (userId) {
      await this.auditService.logAction(
        userId,
        'DELETE',
        'Product',
        product.id,
        product,
      );
    }
    return product;
  }
}
