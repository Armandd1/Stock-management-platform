import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from '../src/reports/reports.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('ReportsService', () => {
  let service: ReportsService;

  const mockPrisma = {
    stock: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    jest.clearAllMocks();
  });

  describe('getStockOnHand', () => {
    it('should return grouped stock data', async () => {
      mockPrisma.stock.findMany.mockResolvedValue([
        {
          Warehouse: { id: 1, name: 'WH1', location: 'Budapest' },
          Product: { id: 1, sku: 'SKU-1', name: 'Widget', price: 10 },
          quantity: 50,
        },
        {
          Warehouse: { id: 1, name: 'WH1', location: 'Budapest' },
          Product: { id: 2, sku: 'SKU-2', name: 'Gadget', price: 20 },
          quantity: 30,
        },
      ]);

      const result = await service.getStockOnHand();

      expect(result).toHaveLength(1);
      expect(result[0].warehouse.name).toBe('WH1');
      expect(result[0].items).toHaveLength(2);
      expect(result[0].totalItems).toBe(80);
    });

    it('should return empty for no stock', async () => {
      mockPrisma.stock.findMany.mockResolvedValue([]);
      const result = await service.getStockOnHand();
      expect(result).toEqual([]);
    });

    it('should filter by warehouseId', async () => {
      mockPrisma.stock.findMany.mockResolvedValue([]);
      await service.getStockOnHand(1);
      expect(mockPrisma.stock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { warehouseId: 1 },
        }),
      );
    });

    it('should filter by productId', async () => {
      mockPrisma.stock.findMany.mockResolvedValue([]);
      await service.getStockOnHand(undefined, 5);
      expect(mockPrisma.stock.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { productId: 5 },
        }),
      );
    });
  });
});
