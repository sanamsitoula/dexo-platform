import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '@dexo/auth';
import { SubscriptionService } from './subscription.service';
import { CreateSubscriptionDto, UpdateSubscriptionDto, CreatePlanDto } from './dto';

@ApiTags('subscriptions')
@Controller('subscriptions')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  // ========== Plan Endpoints ==========

  @Post('plans')
  @ApiOperation({ summary: 'Create a new plan' })
  @ApiResponse({ status: 201, description: 'Plan created successfully' })
  async createPlan(@Body() createPlanDto: CreatePlanDto) {
    return this.subscriptionService.createPlan(createPlanDto);
  }

  @Get('plans')
  @ApiOperation({ summary: 'Get all plans' })
  @ApiResponse({ status: 200, description: 'Plans retrieved successfully' })
  async findAllPlans() {
    return this.subscriptionService.findAllPlans();
  }

  @Get('plans/:id')
  @ApiOperation({ summary: 'Get plan by ID' })
  @ApiResponse({ status: 200, description: 'Plan retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async findPlan(@Param('id') id: string) {
    return this.subscriptionService.findPlan(id);
  }

  @Get('plans/slug/:slug')
  @ApiOperation({ summary: 'Get plan by slug' })
  @ApiResponse({ status: 200, description: 'Plan retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async findPlanBySlug(@Param('slug') slug: string) {
    return this.subscriptionService.findPlanBySlug(slug);
  }

  @Put('plans/:id')
  @ApiOperation({ summary: 'Update plan' })
  @ApiResponse({ status: 200, description: 'Plan updated successfully' })
  @ApiResponse({ status: 404, description: 'Plan not found' })
  async updatePlan(@Param('id') id: string, @Body() updatePlanDto: Partial<CreatePlanDto>) {
    return this.subscriptionService.updatePlan(id, updatePlanDto);
  }

  @Delete('plans/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete plan' })
  @ApiResponse({ status: 204, description: 'Plan deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete plan with active subscriptions' })
  async deletePlan(@Param('id') id: string) {
    return this.subscriptionService.deletePlan(id);
  }

  // ========== Subscription Endpoints ==========

  @Post()
  @ApiOperation({ summary: 'Create a new subscription' })
  @ApiResponse({ status: 201, description: 'Subscription created successfully' })
  @ApiResponse({ status: 409, description: 'Tenant already has active subscription' })
  async create(@Body() createSubscriptionDto: CreateSubscriptionDto) {
    return this.subscriptionService.createSubscription(createSubscriptionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all subscriptions' })
  @ApiResponse({ status: 200, description: 'Subscriptions retrieved successfully' })
  async findAll(@Query('tenantId') tenantId?: string) {
    return this.subscriptionService.findAllSubscriptions(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get subscription by ID' })
  @ApiResponse({ status: 200, description: 'Subscription retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async findOne(@Param('id') id: string) {
    return this.subscriptionService.findSubscription(id);
  }

  @Get('tenant/:tenantId')
  @ApiOperation({ summary: 'Get active subscription for tenant' })
  @ApiResponse({ status: 200, description: 'Subscription retrieved successfully' })
  @ApiResponse({ status: 404, description: 'No active subscription found' })
  async getTenantSubscription(@Param('tenantId') tenantId: string) {
    return this.subscriptionService.getTenantSubscription(tenantId);
  }

  @Get('tenant/:tenantId/modules')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get modules enabled by the tenant's plan (features.modules)" })
  @ApiResponse({ status: 200, description: 'Enabled modules map retrieved successfully' })
  async getTenantModules(@Param('tenantId') tenantId: string) {
    return this.subscriptionService.getTenantModules(tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update subscription' })
  @ApiResponse({ status: 200, description: 'Subscription updated successfully' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async update(@Param('id') id: string, @Body() updateSubscriptionDto: UpdateSubscriptionDto) {
    return this.subscriptionService.updateSubscription(id, updateSubscriptionDto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel subscription' })
  @ApiResponse({ status: 200, description: 'Subscription canceled successfully' })
  async cancel(@Param('id') id: string) {
    return this.subscriptionService.cancelSubscription(id);
  }

  @Post(':id/renew')
  @ApiOperation({ summary: 'Renew subscription' })
  @ApiResponse({ status: 200, description: 'Subscription renewed successfully' })
  async renew(@Param('id') id: string) {
    return this.subscriptionService.renewSubscription(id);
  }

  @Post(':id/change-plan')
  @ApiOperation({ summary: 'Change subscription plan' })
  @ApiResponse({ status: 200, description: 'Plan changed successfully' })
  async changePlan(@Param('id') id: string, @Body('newPlanId') newPlanId: string) {
    return this.subscriptionService.changePlan(id, newPlanId);
  }

  @Post('check-trial-expiry')
  @ApiOperation({ summary: 'Check and expire trial subscriptions' })
  @ApiResponse({ status: 200, description: 'Trial expiry check completed' })
  async checkTrialExpiry() {
    return this.subscriptionService.checkTrialExpiry();
  }
}
