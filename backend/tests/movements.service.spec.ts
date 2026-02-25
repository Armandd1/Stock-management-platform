import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MovementsService } from '../src/movements/movements.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('MovementsService', () => {
  let service: MovementsService;

  const mockTx = {
    stock: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
    stockMovement: {
      create: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  const mockPrisma = {
    product: { findUnique: jest.fn() },
    warehouse: { findUnique: jest.fn() },
    stock: { upsert: jest.fn(), update: jest.fn() },
    stockMovement: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((fn) => (typeof fn === 'function' ? fn(mockTx) : fn)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MovementsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<MovementsService>(MovementsService);
    jest.clearAllMocks();
    mockPrisma.product.findUnique.mockResolvedValue({ id: 1 }); // product exists by default
    mockPrisma.warehouse.findUnique.mockResolvedValue({ id: 1 }); // warehouse exists by default
  });

  describe('create - IN', () => {
    it('should throw if toWarehouseId is missing for IN', async () => {
      await expect(
        service.create({ type: 'IN' as any, quantity: 10, productId: 1 }, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create an IN movement', async () => {
      const movement = { id: 1, type: 'IN', quantity: 10 };
      mockTx.stock.upsert.mockResolvedValue({});
      mockTx.stockMovement.create.mockResolvedValue(movement);

      const result = await service.create(
        { type: 'IN' as any, quantity: 10, productId: 1, toWarehouseId: 1 },
        1,
      );

      expect(result).toEqual(movement);
      expect(mockTx.stock.upsert).toHaveBeenCalled();
    });
  });

  describe('create - OUT', () => {
    it('should throw if fromWarehouseId is missing for OUT', async () => {
      await expect(
        service.create({ type: 'OUT' as any, quantity: 5, productId: 1 }, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if insufficient stock for OUT', async () => {
      mockTx.$queryRaw.mockResolvedValue([{ id: 1, quantity: 3 }]);

      await expect(
        service.create(
          { type: 'OUT' as any, quantity: 5, productId: 1, fromWarehouseId: 1 },
          1,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create an OUT movement with sufficient stock', async () => {
      const movement = { id: 1, type: 'OUT', quantity: 5 };
      mockTx.$queryRaw.mockResolvedValue([{ id: 1, quantity: 10 }]);
      mockTx.stock.update.mockResolvedValue({});
      mockTx.stockMovement.create.mockResolvedValue(movement);

      const result = await service.create(
        { type: 'OUT' as any, quantity: 5, productId: 1, fromWarehouseId: 1 },
        1,
      );

      expect(result).toEqual(movement);
    });
  });

  describe('create - TRANSFER', () => {
    it('should throw if warehouses are missing', async () => {
      await expect(
        service.create(
          {
            type: 'TRANSFER' as any,
            quantity: 5,
            productId: 1,
            fromWarehouseId: 1,
          },
          1,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw if same warehouse', async () => {
      await expect(
        service.create(
          {
            type: 'TRANSFER' as any,
            quantity: 5,
            productId: 1,
            fromWarehouseId: 1,
            toWarehouseId: 1,
          },
          1,
        ),
      ).rejects.toThrow('Cannot transfer to the same warehouse');
    });

    it('should throw if insufficient stock', async () => {
      mockTx.$queryRaw.mockResolvedValue([{ id: 1, quantity: 2 }]);

      await expect(
        service.create(
          {
            type: 'TRANSFER' as any,
            quantity: 5,
            productId: 1,
            fromWarehouseId: 1,
            toWarehouseId: 2,
          },
          1,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create a TRANSFER with sufficient stock', async () => {
      const movement = { id: 1, type: 'TRANSFER', quantity: 5 };
      mockTx.$queryRaw.mockResolvedValue([{ id: 1, quantity: 10 }]);
      mockTx.stock.update.mockResolvedValue({});
      mockTx.stock.upsert.mockResolvedValue({});
      mockTx.stockMovement.create.mockResolvedValue(movement);

      const result = await service.create(
        {
          type: 'TRANSFER' as any,
          quantity: 5,
          productId: 1,
          fromWarehouseId: 1,
          toWarehouseId: 2,
        },
        1,
      );

      expect(result).toEqual(movement);
    });
  });

  describe('create - product not found', () => {
    it('should throw NotFoundException if product does not exist', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          { type: 'IN' as any, quantity: 10, productId: 999, toWarehouseId: 1 },
          1,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return movements', async () => {
      mockPrisma.stockMovement.findMany.mockResolvedValue([]);
      expect(await service.findAll()).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException', async () => {
      mockPrisma.stockMovement.findUnique.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });
});
