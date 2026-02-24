import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum RoleEnum {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  VIEWER = 'VIEWER',
}

export class UpdateRoleDto {
  @ApiProperty({ enum: RoleEnum, example: 'MANAGER' })
  @IsNotEmpty()
  @IsEnum(RoleEnum)
  role: RoleEnum;
}
