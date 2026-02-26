import { Injectable } from '@nestjs/common';
import {
  AbilityBuilder,
  ExtractSubjectType,
  MongoAbility,
  createMongoAbility,
} from '@casl/ability';
import { Role } from '@prisma/client';

export enum Action {
  Manage = 'manage',
  Create = 'create',
  Read = 'read',
  Update = 'update',
  Delete = 'delete',
}

// We define subjects as string literals or 'all' to avoid needing class instances.
export type Subjects =
  | 'Product'
  | 'Warehouse'
  | 'StockMovement'
  | 'User'
  | 'AuditLog'
  | 'all';

export type AppAbility = MongoAbility<[Action, Subjects]>;

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: { id: number; role: Role }) {
    const { can, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

    if (user.role === Role.ADMIN) {
      can(Action.Manage, 'all'); // Admin can do everything
    } else if (user.role === Role.MANAGER) {
      can(Action.Manage, 'Product');
      can(Action.Manage, 'Warehouse');
      can(Action.Manage, 'StockMovement');
      can(Action.Read, 'User');
    } else if (user.role === Role.VIEWER) {
      can(Action.Read, 'Product');
      can(Action.Read, 'Warehouse');
      can(Action.Read, 'StockMovement');
      // Cannot read Users or AuditLogs
    }

    return build({
      // We pass string as subject type
      detectSubjectType: (item) =>
        item as unknown as ExtractSubjectType<Subjects>,
    });
  }
}
