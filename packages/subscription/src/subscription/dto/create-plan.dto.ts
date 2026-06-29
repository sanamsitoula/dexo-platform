import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsInt, IsEnum, IsOptional, IsObject } from 'class-validator';

export enum BillingInterval {
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

export class CreatePlanDto {
  @ApiProperty({ example: 'Pro Plan' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'pro-plan' })
  @IsString()
  slug: string;

  @ApiPropertyOptional({ example: 'Professional plan for growing businesses' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 4900 })
  @IsInt()
  priceCents: number;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ enum: BillingInterval, default: BillingInterval.MONTHLY })
  @IsOptional()
  @IsEnum(BillingInterval)
  billingInterval?: BillingInterval;

  @ApiPropertyOptional({
    example: { customDomain: true, apiAccess: true, prioritySupport: true },
  })
  @IsOptional()
  @IsObject()
  features?: Record<string, any>;

  @ApiPropertyOptional({
    example: { users: 100, storage: 10737418240, apiCalls: 10000 },
  })
  @IsOptional()
  @IsObject()
  limits?: Record<string, any>;
}
