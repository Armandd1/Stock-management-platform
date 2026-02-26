import { JwtStrategy } from '../../src/auth/strategies/jwt.strategy';
import { ConfigService } from '@nestjs/config';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(() => {
    const mockConfigService = {
      get: jest.fn().mockReturnValue('test-jwt-secret'),
    } as unknown as ConfigService;

    strategy = new JwtStrategy(mockConfigService);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user payload from JWT token', async () => {
      const payload = { sub: 1, email: 'admin@example.com', role: 'ADMIN' };

      const result = await strategy.validate(payload);

      expect(result).toEqual({
        userId: 1,
        email: 'admin@example.com',
        role: 'ADMIN',
      });
    });

    it('should correctly map sub to userId', async () => {
      const payload = { sub: 42, email: 'user@example.com', role: 'VIEWER' };

      const result = await strategy.validate(payload);

      expect(result.userId).toBe(42);
    });
  });

  describe('constructor', () => {
    it('should throw an error if JWT_SECRET is not configured', () => {
      const missingSecretConfig = {
        get: jest.fn().mockReturnValue(undefined),
      } as unknown as ConfigService;

      expect(() => new JwtStrategy(missingSecretConfig)).toThrow(
        'JWT_SECRET is not configured',
      );
    });
  });
});
