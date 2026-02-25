import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logAction(
    userId: number,
    action: string,
    entity: string,
    entityId?: number,

    changes?: unknown,
  ) {
    return this.prisma.auditLog.create({
      data: {
        // userId could be undefined for system actions, but we'll try to use it if available
        userId,
        action,
        entity,
        entityId,
        changes: changes
          ? (JSON.parse(JSON.stringify(changes)) as Prisma.InputJsonValue)
          : undefined,
      },
    });
  }

  async getLogs() {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        User: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }
}
