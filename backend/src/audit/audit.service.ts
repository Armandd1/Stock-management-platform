import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logAction(
    userId: number,
    action: string,
    entity: string,
    entityId?: number,
    changes?: unknown,
  ) {
    this.logger.debug(
      `Recording audit log: ${action} on ${entity} (ID: ${entityId}) by User ${userId}`,
    );
    return this.prisma.auditLog.create({
      data: {
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
