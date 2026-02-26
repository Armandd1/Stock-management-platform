import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });
  }

  async updateRole(userId: number, role: Role, currentUserId: number) {
    if (userId === currentUserId) {
      this.logger.warn(
        `User ${currentUserId} attempted to change their own role`,
      );
      throw new ForbiddenException('You cannot change your own role');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      this.logger.warn(
        `Attempted to update role for non-existent user: ${userId}`,
      );
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    this.logger.log(
      `User ${userId} role updated to ${role} by Admin ${currentUserId}`,
    );

    await this.auditService.logAction(
      currentUserId,
      'UPDATE_ROLE',
      'User',
      userId,
      { oldRole: user.role, newRole: role },
    );

    return updatedUser;
  }
}
