import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('stock-on-hand')
  @ApiOperation({
    summary: 'Get stock on hand report (current stock per warehouse/product)',
  })
  @ApiQuery({ name: 'warehouseId', required: false, type: Number })
  @ApiQuery({ name: 'productId', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Returns stock levels grouped by warehouse.',
  })
  async getStockOnHand(
    @Query('warehouseId') warehouseId?: string,
    @Query('productId') productId?: string,
  ) {
    return this.reportsService.getStockOnHand(
      warehouseId ? parseInt(warehouseId, 10) : undefined,
      productId ? parseInt(productId, 10) : undefined,
    );
  }
}
