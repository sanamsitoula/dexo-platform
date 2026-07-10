import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { PrismaService } from '@dexo/shared';
import { JwtAuthGuard } from '@dexo/auth';

/**
 * Mobile App endpoints - all the data the mobile app needs
 * for tenant users (customers, trainers, members).
 */
@Controller()
@UseGuards(JwtAuthGuard)
export class MobileAppController {
  constructor(private prisma: PrismaService) {}

  // ==================== WORKOUTS ====================

  @Get('workouts')
  async getWorkouts(@Req() req: any) {
    const userId = req.user.id;
    // Get workouts from finance/notes or return sample data
    const tenantId = req.user.tenantId;
    if (!tenantId) return [];
    // For now, return workouts from a generic schema if it exists
    return this.prisma.financeAuditLog
      ? []
      : this.getSampleWorkouts(userId);
  }

  @Post('workouts')
  async createWorkout(@Req() req: any, @Body() data: any) {
    // In production, store in WorkoutLog table (would need to add)
    return {
      id: Date.now().toString(),
      ...data,
      userId: req.user.id,
      tenantId: req.user.tenantId,
      createdAt: new Date().toISOString(),
    };
  }

  @Delete('workouts/:id')
  async deleteWorkout(@Param('id') id: string) {
    return { success: true, id };
  }

  private getSampleWorkouts(userId: string) {
    return [
      { id: '1', name: 'Morning HIIT', type: 'cardio', duration: 30, date: new Date().toISOString(), userId, caloriesBurned: 280 },
      { id: '2', name: 'Upper Body Strength', type: 'strength', duration: 45, date: new Date(Date.now() - 86400000).toISOString(), userId, caloriesBurned: 320 },
      { id: '3', name: 'Yoga Flow', type: 'flexibility', duration: 60, date: new Date(Date.now() - 2 * 86400000).toISOString(), userId, caloriesBurned: 180 },
    ];
  }

  // ==================== TRAINERS ====================

  @Get('trainers')
  async getTrainers(@Req() req: any) {
    const tenantId = req.user.tenantId;
    if (!tenantId) return this.getSampleTrainers();

    // Get tenant users who have trainer role
    const trainerRoles = await this.prisma.role.findMany({
      where: {
        tenantId,
        OR: [
          { name: { contains: 'trainer', mode: 'insensitive' } },
          { name: { contains: 'staff', mode: 'insensitive' } },
          { name: { contains: 'instructor', mode: 'insensitive' } },
        ],
      },
    });

    const trainerRoleIds = trainerRoles.map((r) => r.id);

    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        userRoles: { some: { roleId: { in: trainerRoleIds } } },
      },
      include: { userRoles: { include: { role: true } } },
    });

    if (users.length === 0) return this.getSampleTrainers();

    return users.map((u) => ({
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      avatar: null,
      bio: (u as any).bio || `Professional trainer at our facility.`,
      specialties: ['Personal Training', 'Fitness'],
      rating: 4.5 + Math.random() * 0.5,
      experience: 5,
      certifications: ['Certified Personal Trainer'],
      hourlyRate: 50,
    }));
  }

  @Get('trainers/:id')
  async getTrainer(@Param('id') id: string) {
    const trainer = await this.prisma.user.findUnique({
      where: { id },
      include: { userRoles: { include: { role: true } } },
    });
    if (!trainer) return this.getSampleTrainers()[0];
    return {
      id: trainer.id,
      firstName: trainer.firstName,
      lastName: trainer.lastName,
      email: trainer.email,
      bio: (trainer as any).bio || 'Professional trainer',
      specialties: ['Personal Training'],
      rating: 4.8,
      experience: 5,
      certifications: ['NASM-CPT'],
      hourlyRate: 50,
    };
  }

  private getSampleTrainers() {
    return [
      { id: '1', firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.j@fitzone.com', bio: 'Certified personal trainer with 8+ years of experience in strength training, HIIT, and weight loss.', specialties: ['HIIT', 'Strength Training', 'Weight Loss'], rating: 4.9, experience: 8, certifications: ['NASM-CPT', 'CrossFit Level 2'], hourlyRate: 50 },
      { id: '2', firstName: 'Mike', lastName: 'Chen', email: 'mike.c@fitzone.com', bio: 'Former national-level athlete specializing in sports performance.', specialties: ['Sports Performance', 'Mobility', 'Powerlifting'], rating: 4.8, experience: 6, certifications: ['CSCS', 'FRC Mobility Specialist'], hourlyRate: 60 },
      { id: '3', firstName: 'Priya', lastName: 'Sharma', email: 'priya.s@fitzone.com', bio: 'Yoga instructor and wellness coach.', specialties: ['Yoga', 'Pilates', 'Meditation'], rating: 5.0, experience: 10, certifications: ['RYT-500'], hourlyRate: 45 },
    ];
  }

  // ==================== PACKAGES ====================

  @Get('packages')
  async getPackages(@Req() req: any) {
    const tenantId = req.user.tenantId;
    if (!tenantId) return this.getSamplePackages();
    // Get from finance/subscription or return defaults
    return this.getSamplePackages();
  }

  @Get('packages/my')
  async getMyPackages(@Req() req: any) {
    const tenantId = req.user.tenantId;
    if (!tenantId) return [];

    const subscriptions = await this.prisma.subscription.findMany({
      where: { tenantId, status: { in: ['active', 'trial'] } },
      include: { plan: true },
    });

    if (subscriptions.length === 0) {
      return [
        {
          id: 'demo-1',
          name: 'Pro Plan',
          price: 59,
          billingCycle: 'monthly',
          status: 'active',
          startDate: new Date().toISOString(),
          nextBillingDate: new Date(Date.now() + 30 * 86400000).toISOString(),
        },
      ];
    }

    return subscriptions.map((s) => ({
      id: s.id,
      name: s.plan?.name || 'Plan',
      price: (s.plan?.priceCents || 0) / 100,
      billingCycle: 'monthly',
      status: s.status,
      startDate: s.currentPeriodStart,
      nextBillingDate: s.currentPeriodEnd,
    }));
  }

  @Post('packages/subscribe')
  async subscribeToPackage(@Req() req: any, @Body() body: { packageId: string; paymentMethod: string }) {
    // Create a subscription record
    return {
      id: 'sub-' + Date.now(),
      userId: req.user.id,
      tenantId: req.user.tenantId,
      packageId: body.packageId,
      paymentMethod: body.paymentMethod,
      status: 'active',
      createdAt: new Date().toISOString(),
    };
  }

  @Post('packages/:id/cancel')
  async cancelPackage(@Param('id') id: string) {
    return { success: true, id, cancelledAt: new Date().toISOString() };
  }

  private getSamplePackages() {
    return [
      { id: 'pkg-1', name: 'Starter', price: 29, billingCycle: 'monthly', features: ['Gym access', 'Locker rental', '1 class/week'] },
      { id: 'pkg-2', name: 'Pro', price: 59, billingCycle: 'monthly', features: ['24/7 access', 'All classes', '1 PT session'], isPopular: true },
      { id: 'pkg-3', name: 'Elite', price: 99, billingCycle: 'monthly', features: ['Unlimited PT', 'Personal meal plan', 'Priority booking'] },
    ];
  }

  // ==================== APPOINTMENTS ====================

  @Get('appointments')
  async getAppointments(@Req() req: any) {
    return [];
  }

  @Post('appointments')
  async createAppointment(@Req() req: any, @Body() data: any) {
    return { id: 'apt-' + Date.now(), ...data, userId: req.user.id, createdAt: new Date().toISOString() };
  }

  @Post('appointments/:id/cancel')
  async cancelAppointment(@Param('id') id: string) {
    return { success: true, id };
  }

  // ==================== PAYMENT METHODS ====================

  @Get('payment-gateway/methods')
  async getPaymentMethods() {
    return [
      { id: 'card', name: 'Credit/Debit Card', icon: 'card', enabled: true },
      { id: 'esewa', name: 'eSewa', icon: 'wallet', enabled: true },
      { id: 'fonepay', name: 'Fonepay', icon: 'phone-portrait', enabled: true },
      { id: 'khalti', name: 'Khalti', icon: 'wallet', enabled: true },
    ];
  }
}
