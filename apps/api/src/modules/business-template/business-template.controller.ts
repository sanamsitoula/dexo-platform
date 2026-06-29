import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '@dexo/auth';
import { BusinessTemplateService } from './business-template.service';

@ApiTags('business-templates')
@Controller('business-templates')
export class BusinessTemplateController {
  constructor(private readonly service: BusinessTemplateService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'List all 12 business type templates (public)' })
  async list() {
    return this.service.listAll();
  }

  @Public()
  @Get(':domainType')
  @ApiOperation({ summary: 'Get one template by domain type' })
  async getOne(@Param('domainType') domainType: string) {
    const t = await this.service.getByDomainType(domainType);
    if (!t) throw new NotFoundException(`Template ${domainType} not found`);
    return t;
  }
}
