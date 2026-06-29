import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateSubscriptionDto } from './create-subscription.dto';

export class UpdateSubscriptionDto extends PartialType(OmitType(CreateSubscriptionDto, ['tenantId', 'planId'] as const)) {}
