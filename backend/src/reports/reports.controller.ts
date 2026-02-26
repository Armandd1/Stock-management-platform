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
import { PoliciesGuard } from '../auth/guards/policies.guard';
import { CheckPolicies } from '../auth/decorators/check-policies.decorator';
import { Action } from '../auth/casl/casl-ability.factory';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard, PoliciesGuard)
@ApiBearerAuth()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('stock-on-hand')
  @CheckPolicies((ability) => ability.can(Action.Read, 'Warehouse'))
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

  @Get('movement-summary')
  @CheckPolicies((ability) => ability.can(Action.Read, 'StockMovement'))
  @ApiOperation({ summary: 'Get summary of all stock movements in a period' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Returns quantities per movement type.',
  })
  async getMovementSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getMovementSummary(startDate, endDate);
  }

  @Get('top-moved')
  @CheckPolicies((ability) => ability.can(Action.Read, 'StockMovement'))
  @ApiOperation({ summary: 'Get products with highest total movement volume' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Returns top products by volume.' })
  async getTopMovedProducts(
    @Query('limit') limit?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportsService.getTopMovedProducts(
      limit ? parseInt(limit, 10) : 10,
      startDate,
      endDate,
    );
  }
}
