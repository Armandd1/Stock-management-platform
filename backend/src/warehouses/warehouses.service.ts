import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';

@Injectable()
export class WarehousesService {
  private readonly logger = new Logger(WarehousesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll() {
    return this.prisma.warehouse.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const warehouse = await this.prisma.warehouse.findUnique({
      where: { id },
      include: {
        Stocks: {
          include: { Product: { select: { id: true, sku: true, name: true } } },
        },
      },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }

    return warehouse;
  }

  async create(dto: CreateWarehouseDto, userId?: number) {
    const warehouse = await this.prisma.warehouse.create({ data: dto });
    this.logger.log(`Warehouse created: ${warehouse.name}`);
    if (userId) {
      await this.auditService.logAction(
        userId,
        'CREATE',
        'Warehouse',
        warehouse.id,
        dto,
      );
    }
    return warehouse;
  }

  async update(id: number, dto: UpdateWarehouseDto, userId?: number) {
    await this.findOne(id); // throws if not found
    const warehouse = await this.prisma.warehouse.update({
      where: { id },
      data: dto,
    });
    this.logger.log(`Warehouse updated: ${warehouse.name}`);
    if (userId) {
      await this.auditService.logAction(
        userId,
        'UPDATE',
        'Warehouse',
        warehouse.id,
        dto,
      );
    }
    return warehouse;
  }

  async remove(id: number, userId?: number) {
    await this.findOne(id); // throws if not found
    const warehouse = await this.prisma.warehouse.delete({ where: { id } });
    this.logger.log(`Warehouse removed: ${warehouse.name}`);
    if (userId) {
      await this.auditService.logAction(
        userId,
        'DELETE',
        'Warehouse',
        warehouse.id,
        warehouse,
      );
    }
    return warehouse;
  }
}
