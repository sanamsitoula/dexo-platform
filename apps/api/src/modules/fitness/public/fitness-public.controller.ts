import { Controller, Get, Param } from '@nestjs/common';
import { FitnessPublicService } from './fitness-public.service';

/**
 * Public (no-auth) fitness endpoints consumed by the tenant marketing website.
 * Resolved entirely by subdomain.
 */
@Controller('fitness/public')
export class FitnessPublicController {
  constructor(private service: FitnessPublicService) {}

  @Get(':subdomain/info')
  getInfo(@Param('subdomain') subdomain: string) {
    return this.service.getInfo(subdomain);
  }

  @Get(':subdomain/plans')
  getPlans(@Param('subdomain') subdomain: string) {
    return this.service.getPlans(subdomain);
  }
}
