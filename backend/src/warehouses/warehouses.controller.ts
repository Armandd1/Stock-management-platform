import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { WarehousesService } from './warehouses.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PoliciesGuard } from '../auth/guards/policies.guard';
import { CheckPolicies } from '../auth/decorators/check-policies.decorator';
import { Action } from '../auth/casl/casl-ability.factory';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('warehouses')
@Controller('warehouses')
@UseGuards(JwtAuthGuard, PoliciesGuard)
@ApiBearerAuth()
export class WarehousesController {
  constructor(private readonly warehousesService: WarehousesService) {}

  @Get()
  @ApiOperation({ summary: 'List all warehouses' })
  @ApiResponse({ status: 200, description: 'Returns all warehouses.' })
  async findAll() {
    return this.warehousesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a warehouse by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the warehouse with stock details.',
  })
  @ApiResponse({ status: 404, description: 'Warehouse not found.' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.warehousesService.findOne(id);
  }

  @Post()
  @CheckPolicies((ability) => ability.can(Action.Create, 'Warehouse'))
  @ApiOperation({ summary: 'Create a new warehouse (Admin/Manager)' })
  @ApiResponse({ status: 201, description: 'Warehouse created.' })
  async create(
    @Body() dto: CreateWarehouseDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.warehousesService.create(dto, user.userId);
  }

  @Patch(':id')
  @CheckPolicies((ability) => ability.can(Action.Update, 'Warehouse'))
  @ApiOperation({ summary: 'Update a warehouse (Admin/Manager)' })
  @ApiResponse({ status: 200, description: 'Warehouse updated.' })
  @ApiResponse({ status: 404, description: 'Warehouse not found.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateWarehouseDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.warehousesService.update(id, dto, user.userId);
  }

  @Delete(':id')
  @CheckPolicies((ability) => ability.can(Action.Delete, 'Warehouse'))
  @ApiOperation({ summary: 'Delete a warehouse (Admin only)' })
  @ApiResponse({ status: 200, description: 'Warehouse deleted.' })
  @ApiResponse({ status: 404, description: 'Warehouse not found.' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
  ) {
    return this.warehousesService.remove(id, user.userId);
  }
}
