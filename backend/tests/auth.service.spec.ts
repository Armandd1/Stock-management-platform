import { Test, TestingModule } from '@nestjs/testing';
import {
  UnauthorizedException,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../src/auth/auth.service';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

// Mock bcrypt
jest.mock('bcryptjs');

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-jwt-token'),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // --- validateUser ---

  describe('validateUser', () => {
    const mockUser = {
      id: 1,
      email: 'admin@example.com',
      password: '$2a$10$hashedpassword',
      provider: 'local',
      role: 'ADMIN',
      name: 'Admin',
    };

    it('should return user if credentials are valid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser(
        'admin@example.com',
        'Admin123!',
      );
      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'admin@example.com' },
      });
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.validateUser('nonexistent@example.com', 'Admin123!'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user has no password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        password: null,
      });

      await expect(
        service.validateUser('admin@example.com', 'Admin123!'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is a GitHub user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        provider: 'github',
      });

      await expect(
        service.validateUser('admin@example.com', 'Admin123!'),
      ).rejects.toThrow('This account uses GitHub login');
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.validateUser('admin@example.com', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // --- login ---

  describe('login', () => {
    it('should return access_token and user on successful login', async () => {
      const mockUser = {
        id: 1,
        email: 'admin@example.com',
        password: '$2a$10$hashedpassword',
        provider: 'local',
        role: 'ADMIN',
        name: 'Admin',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login('admin@example.com', 'Admin123!');

      expect(result).toEqual({
        access_token: 'mock-jwt-token',
        user: { id: 1, email: 'admin@example.com', role: 'ADMIN' },
      });
      expect(jwtService.sign).toHaveBeenCalledWith({
        sub: 1,
        email: 'admin@example.com',
        role: 'ADMIN',
      });
    });
  });

  // --- getGithubAuthUrl ---

  describe('getGithubAuthUrl', () => {
    it('should return url and state when GITHUB_CLIENT_ID is configured', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'GITHUB_CLIENT_ID') return 'test-client-id';
        if (key === 'GITHUB_CALLBACK_URL')
          return 'http://localhost:3000/api/v1/auth/github/callback';
        return undefined;
      });

      const result = service.getGithubAuthUrl();

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('state');
      expect(result.url).toContain('client_id=test-client-id');
      expect(result.url).toContain('state=');
      expect(result.state).toMatch(/^[0-9a-f]{32}$/);
    });

    it('should throw InternalServerErrorException when GITHUB_CLIENT_ID is missing', () => {
      mockConfigService.get.mockReturnValue(undefined);

      expect(() => service.getGithubAuthUrl()).toThrow(
        InternalServerErrorException,
      );
      expect(() => service.getGithubAuthUrl()).toThrow(
        'Missing GITHUB_CLIENT_ID',
      );
    });
  });

  // --- getProfile ---

  describe('getProfile', () => {
    it('should return user profile if user exists', async () => {
      const mockProfile = {
        id: 1,
        email: 'admin@example.com',
        name: 'Admin',
        role: 'ADMIN',
        provider: 'local',
        createdAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockProfile);

      const result = await service.getProfile(1);
      expect(result).toEqual(mockProfile);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile(999)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  // --- register ---

  describe('register', () => {
    const newUser = {
      id: 10,
      email: 'newuser@example.com',
      password: '$2a$10$hashedpassword',
      name: 'New User',
      provider: 'local',
      role: 'VIEWER',
    };

    it('should create a new user and return access_token', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('$2a$10$hashedpassword');
      mockPrismaService.user.create.mockResolvedValue(newUser);

      const result = await service.register(
        'newuser@example.com',
        'Password123!',
        'New User',
      );

      expect(result).toEqual({
        access_token: 'mock-jwt-token',
        user: { id: 10, email: 'newuser@example.com', role: 'VIEWER' },
      });
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          email: 'newuser@example.com',
          password: '$2a$10$hashedpassword',
          name: 'New User',
          provider: 'local',
          role: 'VIEWER',
        },
      });
    });

    it('should throw ConflictException if email already exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(newUser);

      await expect(
        service.register('newuser@example.com', 'Password123!', 'New User'),
      ).rejects.toThrow(ConflictException);
    });
  });
});
