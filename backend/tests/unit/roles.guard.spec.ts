import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../../src/auth/guards/roles.guard';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const createMockContext = (
    user?: any,
    roles?: string[],
  ): ExecutionContext => {
    const mockHandler = jest.fn();
    const mockClass = jest.fn();

    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(roles ?? null);

    return {
      getHandler: () => mockHandler,
      getClass: () => mockClass,
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  it('should allow access when no @Roles() decorator is set', () => {
    const context = createMockContext({ role: 'VIEWER' }, undefined);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when roles array is empty', () => {
    const context = createMockContext({ role: 'VIEWER' }, []);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when user has the required role', () => {
    const context = createMockContext({ role: 'ADMIN' }, ['ADMIN']);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access when user has one of many required roles', () => {
    const context = createMockContext({ role: 'MANAGER' }, [
      'ADMIN',
      'MANAGER',
    ]);
    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw ForbiddenException when user is missing from request', () => {
    const context = createMockContext(undefined, ['ADMIN']);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(
      'User information is missing',
    );
  });

  it('should throw ForbiddenException when user role is not a string', () => {
    const context = createMockContext({ role: 123 }, ['ADMIN']);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(
      'User role is missing or invalid',
    );
  });

  it('should throw ForbiddenException when user role is undefined', () => {
    const context = createMockContext({}, ['ADMIN']);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(
      'User role is missing or invalid',
    );
  });

  it('should throw ForbiddenException when user does not have the required role', () => {
    const context = createMockContext({ role: 'VIEWER' }, ['ADMIN']);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    expect(() => guard.canActivate(context)).toThrow(
      'You do not have permission',
    );
  });
});
