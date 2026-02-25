import { IsNotEmpty, IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'SKU-001' })
  @IsNotEmpty()
  @IsString()
  sku: string;

  @ApiProperty({ example: 'Widget A' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'A high-quality widget' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 29.99 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  price: number;
}
