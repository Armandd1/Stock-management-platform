import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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
import { PoliciesGuard } from '../auth/guards/policies.guard';
import { CheckPolicies } from '../auth/decorators/check-policies.decorator';
import { Action } from '../auth/casl/casl-ability.factory';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('movements')
@Controller('movements')
@UseGuards(JwtAuthGuard, PoliciesGuard)
@ApiBearerAuth()
export class MovementsController {
  constructor(private readonly movementsService: MovementsService) {}

  @Post()
  @CheckPolicies((ability) => ability.can(Action.Create, 'StockMovement'))
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

  @Sse('live')
  @ApiOperation({ summary: 'Server-Sent Events for live layout updates' })
  /**
   * SSE endpoint for live updates.
   * Note: EventSource in browsers does not support custom headers (Authorization).
   * Authentication is handled via the 'auth_token' cookie.
   * Client must use { withCredentials: true } when connecting.
   */
  liveUpdates(): Observable<MessageEvent> {
    return this.movementsService.movementEvents$.pipe(
      map(
        (movement) =>
          ({
            data: { type: 'NEW_MOVEMENT', payload: movement },
          }) as MessageEvent,
      ),
    );
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
