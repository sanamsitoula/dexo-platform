import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({ example: 'users' })
  @IsString()
  resource: string;

  @ApiProperty({ example: 'create' })
  @IsString()
  action: string;

  @ApiPropertyOptional({ example: 'Create new users' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class CheckPermissionDto {
  @ApiProperty({ example: 'user-uuid' })
  @IsString()
  userId: string;

  @ApiProperty({ example: 'users' })
  @IsString()
  resource: string;

  @ApiProperty({ example: 'create' })
  @IsString()
  action: string;

  @ApiPropertyOptional({ example: 'resource-uuid' })
  @IsOptional()
  @IsString()
  resourceId?: string;
}
