import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  ParseArrayPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@ApiTags('products')
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List all products (searchable by SKU or name)' })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by SKU or name',
  })
  @ApiResponse({ status: 200, description: 'Returns all matching products.' })
  async findAll(@Query('search') search?: string) {
    return this.productsService.findAll(search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the product with stock details.',
  })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a new product (Admin/Manager)' })
  @ApiResponse({ status: 201, description: 'Product created.' })
  @ApiResponse({ status: 409, description: 'SKU already exists.' })
  async create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.productsService.create(dto, user.userId);
  }

  @Post('bulk')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create multiple products from a CSV import' })
  @ApiBody({ type: [CreateProductDto] })
  @ApiResponse({ status: 201, description: 'Products imported successfully.' })
  async createBulk(
    @Body(new ParseArrayPipe({ items: CreateProductDto }))
    dtos: CreateProductDto[],
    @CurrentUser() user: { userId: number },
  ) {
    return this.productsService.createBulk(dtos, user.userId);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update a product (Admin/Manager)' })
  @ApiResponse({ status: 200, description: 'Product updated.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: { userId: number },
  ) {
    return this.productsService.update(id, dto, user.userId);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Delete a product (Admin only)' })
  @ApiResponse({ status: 200, description: 'Product deleted.' })
  @ApiResponse({ status: 404, description: 'Product not found.' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: { userId: number },
  ) {
    return this.productsService.remove(id, user.userId);
  }
}
