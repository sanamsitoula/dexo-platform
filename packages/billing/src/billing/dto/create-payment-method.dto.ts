import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreatePaymentMethodDto {
  @ApiProperty({ example: 'pm_card_visa' })
  @IsString()
  paymentMethodId!: string;

  @ApiPropertyOptional({ example: 'user-uuid' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  isDefault?: boolean;
}

export class CreateInvoiceDto {
  @ApiProperty({ example: 'subscription-uuid' })
  @IsString()
  subscriptionId!: string;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  dueDate?: string;
}

export class ProcessPaymentDto {
  @ApiProperty({ example: 4900 })
  amountInCents!: number;

  @ApiProperty({ example: 'usd' })
  currency!: string;

  @ApiProperty({ example: 'pm_card_visa' })
  paymentMethodId!: string;

  @ApiPropertyOptional({ example: 'Invoice #12345' })
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'order-uuid' })
  @IsOptional()
  metadata?: Record<string, string>;
}
