import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsEnum, IsDateString, IsOptional } from 'class-validator';

export enum SubscriptionStatus {
  ACTIVE = 'active',
  TRIAL = 'trial',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
}

export class CreateSubscriptionDto {
  @ApiProperty({ example: 'tenant-uuid' })
  @IsUUID()
  tenantId: string;

  @ApiProperty({ example: 'plan-uuid' })
  @IsUUID()
  planId: string;

  @ApiPropertyOptional({ enum: SubscriptionStatus, default: SubscriptionStatus.TRIAL })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  status?: SubscriptionStatus;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  trialStart?: string;

  @ApiPropertyOptional({ example: '2024-01-31T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  trialEnd?: string;
}
