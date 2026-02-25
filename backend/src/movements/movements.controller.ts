import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { MovementsService } from './movements.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('movements')
@Controller('movements')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MovementsController {
  constructor(private readonly movementsService: MovementsService) {}

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a stock movement (Admin/Manager)' })
  @ApiResponse({ status: 201, description: 'Movement created successfully.' })
  @ApiResponse({
    status: 400,
    description: 'Invalid movement (missing fields or insufficient stock).',
  })
  @ApiResponse({ status: 404, description: 'Product or warehouse not found.' })
  async create(
    @Body() dto: CreateMovementDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.movementsService.create(dto, user.userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all stock movements (filterable)' })
  @ApiQuery({ name: 'productId', required: false, type: Number })
  @ApiQuery({ name: 'warehouseId', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: ['IN', 'OUT', 'TRANSFER'] })
  @ApiResponse({ status: 200, description: 'Returns all matching movements.' })
  async findAll(
    @Query('productId') productId?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('type') type?: string,
  ) {
    return this.movementsService.findAll({
      productId: productId ? parseInt(productId, 10) : undefined,
      warehouseId: warehouseId ? parseInt(warehouseId, 10) : undefined,
      type,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a stock movement by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the movement with full details.',
  })
  @ApiResponse({ status: 404, description: 'Movement not found.' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.movementsService.findOne(id);
  }
}
