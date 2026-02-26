import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PoliciesGuard } from '../../src/auth/guards/policies.guard';
import { CaslAbilityFactory, Action } from '../../src/auth/casl/casl-ability.factory';
import { Role } from '@prisma/client';

describe('PoliciesGuard', () => {
  let guard: PoliciesGuard;
  let reflector: Reflector;
  let caslAbilityFactory: CaslAbilityFactory;

  beforeEach(() => {
    reflector = new Reflector();
    caslAbilityFactory = new CaslAbilityFactory();
    guard = new PoliciesGuard(reflector, caslAbilityFactory);
  });

  const createMockContext = (
    user?: { id: number; role: Role },
    handlers?: any[],
  ): ExecutionContext => {
    const mockHandler = jest.fn();
    
    jest.spyOn(reflector, 'get').mockReturnValue(handlers ?? []);

    return {
      getHandler: () => mockHandler,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  it('should allow access if no handlers are defined', async () => {
    const context = createMockContext({ id: 1, role: Role.ADMIN }, []);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('should allow access if policy handler returns true', async () => {
    const handler = (ability: any) => ability.can(Action.Read, 'Product');
    const context = createMockContext({ id: 1, role: Role.VIEWER }, [handler]);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('should throw ForbiddenException if policy handler returns false', async () => {
    const handler = (ability: any) => ability.can(Action.Delete, 'Product');
    // VIEWER cannot delete products
    const context = createMockContext({ id: 1, role: Role.VIEWER }, [handler]);
    
    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(context)).rejects.toThrow(
      'You are not allowed to perform this action based on CASL policies',
    );
  });

  it('should allow access for admin managing everything', async () => {
    const handler = (ability: any) => ability.can(Action.Manage, 'all');
    const context = createMockContext({ id: 1, role: Role.ADMIN }, [handler]);
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('should return false if user is missing', async () => {
    const context = createMockContext(undefined, []);
    await expect(guard.canActivate(context)).resolves.toBe(false);
  });
});
