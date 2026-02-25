import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../src/users/users.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;

  const mockPrismaService = {
    user: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // --- findAll ---

  describe('findAll', () => {
    it('should return a list of users', async () => {
      const mockUsers = [
        { id: 1, email: 'admin@example.com', name: 'Admin', role: 'ADMIN' },
        { id: 2, email: 'viewer@example.com', name: 'Viewer', role: 'VIEWER' },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.findAll();
      expect(result).toEqual(mockUsers);
      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        select: { id: true, email: true, name: true, role: true },
      });
    });

    it('should return an empty array if no users exist', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);
      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  // --- updateRole ---

  describe('updateRole', () => {
    const mockUser = {
      id: 2,
      email: 'viewer@example.com',
      name: 'Viewer',
      role: 'VIEWER',
    };
    const updatedUser = {
      id: 2,
      email: 'viewer@example.com',
      name: 'Viewer',
      role: 'MANAGER',
    };

    it('should successfully update the role of a user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateRole(2, 'MANAGER', 1);

      expect(result).toEqual(updatedUser);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { role: 'MANAGER' },
        select: { id: true, email: true, name: true, role: true },
      });
    });

    it('should throw ForbiddenException when trying to change own role', async () => {
      await expect(service.updateRole(1, 'VIEWER', 1)).rejects.toThrow(
        ForbiddenException,
      );

      await expect(service.updateRole(1, 'VIEWER', 1)).rejects.toThrow(
        'You cannot change your own role',
      );
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.updateRole(999, 'ADMIN', 1)).rejects.toThrow(
        NotFoundException,
      );

      await expect(service.updateRole(999, 'ADMIN', 1)).rejects.toThrow(
        'User with ID 999 not found',
      );
    });
  });
});
