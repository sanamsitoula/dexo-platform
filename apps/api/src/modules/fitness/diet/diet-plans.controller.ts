import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { DietPlansService } from './diet-plans.service';
import { AiPlanService } from '../ai/ai-plan.service';

@Controller('fitness/diet-plans')
@UseGuards(JwtAuthGuard)
export class DietPlansController {
  constructor(private service: DietPlansService, private aiPlans: AiPlanService) {}

  @Post('generate')
  generate(@Req() req: any, @Body() dto: any) {
    return this.aiPlans.generateDietPlan(req.user.tenantId, dto);
  }

  @Get()
  findAll(@Req() req: any, @Query() query: any) {
    return this.service.findAll(req.user.tenantId, query);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.service.findOne(req.user.tenantId, id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: any) {
    return this.service.create(req.user.tenantId, dto);
  }

  @Put(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.service.update(req.user.tenantId, id, dto);
  }

  @Post(':id/approve')
  approve(@Req() req: any, @Param('id') id: string) {
    return this.service.approve(req.user.tenantId, id, req.user.id);
  }

  @Delete(':id')
  delete(@Req() req: any, @Param('id') id: string) {
    return this.service.delete(req.user.tenantId, id);
  }

  @Post(':id/meals')
  addMeal(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.service.addMeal(req.user.tenantId, id, dto);
  }

  @Delete('meals/:mealId')
  removeMeal(@Req() req: any, @Param('mealId') mealId: string) {
    return this.service.removeMeal(req.user.tenantId, mealId);
  }
}
