import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ProductsService } from '../../src/products/products.service';
import { PrismaService } from '../../src/prisma/prisma.service';
import { AuditService } from '../../src/audit/audit.service';

describe('ProductsService', () => {
  let service: ProductsService;

  const mockPrisma = {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockAuditService = {
    logAction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AuditService, useValue: mockAuditService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all products without search', async () => {
      const products = [{ id: 1, sku: 'SKU-1', name: 'Widget' }];
      mockPrisma.product.findMany.mockResolvedValue(products);
      expect(await service.findAll()).toEqual(products);
    });

    it('should filter products by search term', async () => {
      mockPrisma.product.findMany.mockResolvedValue([]);
      await service.findAll('widget');
      expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { sku: { contains: 'widget', mode: 'insensitive' } },
              { name: { contains: 'widget', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return a product', async () => {
      const product = { id: 1, sku: 'SKU-1', Stocks: [] };
      mockPrisma.product.findUnique.mockResolvedValue(product);
      expect(await service.findOne(1)).toEqual(product);
    });

    it('should throw NotFoundException', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a product', async () => {
      const dto = { sku: 'SKU-1', name: 'Widget', price: 10 };
      mockPrisma.product.create.mockResolvedValue({ id: 1, ...dto });
      expect(await service.create(dto)).toEqual({ id: 1, ...dto });
    });

    it('should throw ConflictException for duplicate SKU', async () => {
      const { Prisma } = jest.requireActual('@prisma/client');
      const error = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint',
        {
          code: 'P2002',
          clientVersion: '5.0.0',
        },
      );
      mockPrisma.product.create.mockRejectedValue(error);

      await expect(
        service.create({ sku: 'SKU-1', name: 'Widget', price: 10 }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('should delete a product', async () => {
      mockPrisma.product.findUnique.mockResolvedValue({ id: 1 });
      mockPrisma.product.delete.mockResolvedValue({ id: 1 });
      expect(await service.remove(1)).toEqual({ id: 1 });
    });
  });
});
