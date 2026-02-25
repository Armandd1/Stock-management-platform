import { IsEnum, IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MovementTypeEnum {
  IN = 'IN',
  OUT = 'OUT',
  TRANSFER = 'TRANSFER',
}

export class CreateMovementDto {
  @ApiProperty({ enum: MovementTypeEnum, example: 'IN' })
  @IsNotEmpty()
  @IsEnum(MovementTypeEnum)
  type: MovementTypeEnum;

  @ApiProperty({
    example: 10,
    description: 'Quantity to move (must be positive)',
  })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 1, description: 'Product ID' })
  @IsNotEmpty()
  @IsInt()
  productId: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Source warehouse ID (required for OUT and TRANSFER)',
  })
  @IsOptional()
  @IsInt()
  fromWarehouseId?: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'Destination warehouse ID (required for IN and TRANSFER)',
  })
  @IsOptional()
  @IsInt()
  toWarehouseId?: number;
}
