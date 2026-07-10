import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '@dexo/auth';
import { WorkoutPlansService } from './workout-plans.service';
import { AiPlanService } from '../ai/ai-plan.service';

@Controller('fitness/workout-plans')
@UseGuards(JwtAuthGuard)
export class WorkoutPlansController {
  constructor(private service: WorkoutPlansService, private aiPlans: AiPlanService) {}

  @Post('generate')
  generate(@Req() req: any, @Body() dto: any) {
    return this.aiPlans.generateWorkoutPlan(req.user.tenantId, dto);
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

  @Post(':id/days')
  addDay(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    return this.service.addDay(req.user.tenantId, id, dto);
  }

  @Post('days/:dayId/exercises')
  addExercise(@Req() req: any, @Param('dayId') dayId: string, @Body() dto: any) {
    return this.service.addExercise(req.user.tenantId, dayId, dto);
  }

  @Delete('days/:dayId')
  removeDay(@Req() req: any, @Param('dayId') dayId: string) {
    return this.service.removeDay(req.user.tenantId, dayId);
  }

  @Delete('exercises/:exerciseId')
  removeExercise(@Req() req: any, @Param('exerciseId') exerciseId: string) {
    return this.service.removeExercise(req.user.tenantId, exerciseId);
  }
}
