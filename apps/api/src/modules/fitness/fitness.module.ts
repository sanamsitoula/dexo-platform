import { Module } from '@nestjs/common';
import { PrismaModule } from '@dexo/shared';
import { MembersService } from './members/members.service';
import { MembersController } from './members/members.controller';
import { MembershipPlansService } from './members/membership-plans.service';
import { MembershipPlansController } from './members/membership-plans.controller';
import { MembershipsService } from './members/memberships.service';
import { MembershipsController } from './members/memberships.controller';
import { GymLedgerService } from './members/gym-ledger.service';
import { GymFinanceController } from './members/gym-finance.controller';
import { TrainersService } from './trainers/trainers.service';
import { TrainersController } from './trainers/trainers.controller';
import { TrainerMessagesService } from './trainers/trainer-messages.service';
import { TrainerMessagesController } from './trainers/trainer-messages.controller';
import { AssessmentsService } from './assessments/assessments.service';
import { AssessmentsController } from './assessments/assessments.controller';
import { WorkoutPlansService } from './workouts/workout-plans.service';
import { WorkoutPlansController } from './workouts/workout-plans.controller';
import { WorkoutLogsService } from './workouts/workout-logs.service';
import { WorkoutLogsController } from './workouts/workout-logs.controller';
import { DietPlansService } from './diet/diet-plans.service';
import { DietPlansController } from './diet/diet-plans.controller';
import { FoodLogsService } from './diet/food-logs.service';
import { FoodLogsController } from './diet/food-logs.controller';
import { NepaliFoodService } from './diet/nepali-food.service';
import { NepaliFoodController } from './diet/nepali-food.controller';
import { GroupClassesService } from './classes/group-classes.service';
import { GroupClassesController } from './classes/group-classes.controller';
import { ClassBookingsService } from './classes/class-bookings.service';
import { ClassBookingsController } from './classes/class-bookings.controller';
import { BadgesService } from './gamification/badges.service';
import { BadgesController } from './gamification/badges.controller';
import { CustomerBadgesService } from './gamification/customer-badges.service';
import { CustomerBadgesController } from './gamification/customer-badges.controller';
import { ReferralsService } from './referrals/referrals.service';
import { ReferralsController } from './referrals/referrals.controller';
import { EquipmentService } from './inventory/equipment.service';
import { EquipmentController } from './inventory/equipment.controller';
import { EquipmentMaintenanceService } from './inventory/equipment-maintenance.service';
import { EquipmentMaintenanceController } from './inventory/equipment-maintenance.controller';
import { CheckinService } from './checkin/checkin.service';
import { CheckinController } from './checkin/checkin.controller';
import { FitnessPublicService } from './public/fitness-public.service';
import { AiPlanService } from './ai/ai-plan.service';
import { FitnessPublicController } from './public/fitness-public.controller';
import { FitnessFinanceService } from './fitness-finance.service';

@Module({
  imports: [PrismaModule],
  providers: [
    MembersService,
    MembershipPlansService,
    MembershipsService,
    GymLedgerService,
    TrainersService,
    TrainerMessagesService,
    AssessmentsService,
    WorkoutPlansService,
    WorkoutLogsService,
    DietPlansService,
    FoodLogsService,
    NepaliFoodService,
    GroupClassesService,
    ClassBookingsService,
    BadgesService,
    CustomerBadgesService,
    ReferralsService,
    EquipmentService,
    EquipmentMaintenanceService,
    CheckinService,
    FitnessPublicService,
    AiPlanService,
    FitnessFinanceService,
  ],
  controllers: [
    MembersController,
    MembershipPlansController,
    MembershipsController,
    GymFinanceController,
    TrainersController,
    TrainerMessagesController,
    AssessmentsController,
    WorkoutPlansController,
    WorkoutLogsController,
    DietPlansController,
    FoodLogsController,
    NepaliFoodController,
    GroupClassesController,
    ClassBookingsController,
    BadgesController,
    CustomerBadgesController,
    ReferralsController,
    EquipmentController,
    EquipmentMaintenanceController,
    CheckinController,
    FitnessPublicController,
  ],
  exports: [
    MembersService,
    MembershipsService,
    TrainersService,
    WorkoutPlansService,
    DietPlansService,
    GroupClassesService,
    CheckinService,
  ],
})
export class FitnessModule {}
