import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UpdateRoleDto } from './dto/update-role.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('ADMIN')
  @ApiOperation({ summary: 'List all users (Admin only)' })
  async findAll() {
    return this.usersService.findAll();
  }

  @Patch(':id/role')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Update user role (Admin only)' })
  async updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRoleDto: UpdateRoleDto,
  ) {
    return this.usersService.updateRole(id, updateRoleDto.role);
  }
}
