import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { WarehousesService } from '../src/warehouses/warehouses.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('WarehousesService', () => {
  let service: WarehousesService;

  const mockPrisma = {
    warehouse: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WarehousesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<WarehousesService>(WarehousesService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all warehouses', async () => {
      const warehouses = [{ id: 1, name: 'WH1' }];
      mockPrisma.warehouse.findMany.mockResolvedValue(warehouses);
      expect(await service.findAll()).toEqual(warehouses);
    });
  });

  describe('findOne', () => {
    it('should return a warehouse with stocks', async () => {
      const wh = { id: 1, name: 'WH1', Stocks: [] };
      mockPrisma.warehouse.findUnique.mockResolvedValue(wh);
      expect(await service.findOne(1)).toEqual(wh);
    });

    it('should throw NotFoundException', async () => {
      mockPrisma.warehouse.findUnique.mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a warehouse', async () => {
      const dto = { name: 'New WH', location: 'Budapest' };
      const created = { id: 1, ...dto };
      mockPrisma.warehouse.create.mockResolvedValue(created);
      expect(await service.create(dto)).toEqual(created);
    });
  });

  describe('update', () => {
    it('should update a warehouse', async () => {
      mockPrisma.warehouse.findUnique.mockResolvedValue({ id: 1 });
      mockPrisma.warehouse.update.mockResolvedValue({ id: 1, name: 'Updated' });
      expect(await service.update(1, { name: 'Updated' })).toEqual({
        id: 1,
        name: 'Updated',
      });
    });
  });

  describe('remove', () => {
    it('should delete a warehouse', async () => {
      mockPrisma.warehouse.findUnique.mockResolvedValue({ id: 1 });
      mockPrisma.warehouse.delete.mockResolvedValue({ id: 1 });
      expect(await service.remove(1)).toEqual({ id: 1 });
    });
  });
});
