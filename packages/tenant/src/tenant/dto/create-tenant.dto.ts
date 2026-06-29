import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, IsOptional, IsEnum, IsUUID, IsObject, ValidateIf } from 'class-validator';

export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  TRIAL = 'trial',
  CANCELLED = 'cancelled',
}

export class CreateTenantDto {
  @ApiProperty({ example: 'Acme Corporation' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'acme' })
  @IsOptional()
  @IsString()
  subdomain?: string;

  @ApiPropertyOptional({ example: 'app.acme.com' })
  @IsOptional()
  @IsString()
  domain?: string;

  @ApiPropertyOptional({ enum: TenantStatus, default: TenantStatus.TRIAL })
  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @ApiPropertyOptional({ example: 'uuid-of-plan' })
  @IsOptional()
  @IsUUID()
  planId?: string;

  @ApiPropertyOptional({
    example: {
      branding: { primaryColor: '#0066FF', logo: 'https://example.com/logo.png' },
      features: { customDomain: true, apiAccess: true },
    },
  })
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @ApiPropertyOptional({ example: 'uuid-of-user' })
  @IsOptional()
  @IsUUID()
  createdBy?: string;
}
