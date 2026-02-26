import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CaslAbilityFactory, AppAbility } from '../casl/casl-ability.factory';
import { CHECK_POLICIES_KEY } from '../decorators/check-policies.decorator';
import { Role } from '@prisma/client';

@Injectable()
export class PoliciesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policyHandlers =
      this.reflector.get<((ability: AppAbility) => boolean)[]>(
        CHECK_POLICIES_KEY,
        context.getHandler(),
      ) || [];

    const req = context
      .switchToHttp()
      .getRequest<{ user?: { id: number; role: Role } }>();
    const user = req.user;

    if (!user) {
      return false;
    }

    const ability = this.caslAbilityFactory.createForUser(user);

    const isAllowed = policyHandlers.every((handler) => handler(ability));
    if (!isAllowed) {
      throw new ForbiddenException(
        'You are not allowed to perform this action based on CASL policies',
      );
    }
    return true;
  }
}
