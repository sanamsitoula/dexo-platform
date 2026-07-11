import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import type { AiTool } from '@dexo/ai-platform';
import { NotificationService } from '@dexo/notification';
import { MembersService } from '../../members/members.service';
import { MembershipsService } from '../../members/memberships.service';
import { TrainersService } from '../../trainers/trainers.service';
import { WorkoutPlansService } from '../../workouts/workout-plans.service';
import { DietPlansService } from '../../diet/diet-plans.service';
import { CheckinService } from '../../checkin/checkin.service';
import { GroupClassesService } from '../../classes/group-classes.service';
import {
  memberIdArgs, trainerIdArgs, searchMembersArgs, memberHistoryArgs,
  expiringMembershipsArgs, branchStatsArgs, classesArgs, searchTrainersArgs, sendReminderArgs,
} from '../validators';

/**
 * Fitness AI Tools — every operation the fitness agents can perform, each
 * wrapping an EXISTING NestJS service method. No tool queries Prisma
 * directly and no tool accepts a tenantId argument from the model — every
 * call is scoped by `ctx.tenantId` from the resolved AiContext, so the
 * agent physically cannot see another tenant's data.
 *
 * This is the reference pattern for every future module's AI integration —
 * see docs/ai/00_AI_MASTER_ARCHITECTURE.md.
 */
@Injectable()
export class FitnessAiTools {
  constructor(
    private members: MembersService,
    private memberships: MembershipsService,
    private trainers: TrainersService,
    private workoutPlans: WorkoutPlansService,
    private dietPlans: DietPlansService,
    private checkin: CheckinService,
    private classes: GroupClassesService,
    private notifications: NotificationService,
  ) {}

  build(): AiTool[] {
    return [
      // ---- Member tools ----
      {
        name: 'searchMembers',
        description: 'Search/list gym members by name, email, phone, status or branch.',
        argsSchema: searchMembersArgs,
        execute: (args, ctx) => this.members.findAll(ctx.tenantId, args),
      },
      {
        name: 'getMember',
        description: 'Full member profile: contact info, active memberships, recent body assessments, active workout/diet plans, badges.',
        argsSchema: memberIdArgs,
        execute: (args, ctx) => this.members.findOne(ctx.tenantId, args.memberId),
      },
      {
        name: 'memberStats',
        description: 'Aggregate member counts (total, active, pending) for the tenant or a branch.',
        argsSchema: z.object({ branchId: z.string().optional() }),
        execute: (args, ctx) => this.members.getStats(ctx.tenantId, args.branchId),
      },

      // ---- Membership tools ----
      {
        name: 'memberMembershipHistory',
        description: 'All membership records (past and current) for a member, with plan details.',
        argsSchema: memberIdArgs,
        execute: (args, ctx) => this.memberships.findAll(ctx.tenantId, { memberId: args.memberId }),
      },
      {
        name: 'membershipPaymentHistory',
        description: 'Payment/activation history for a member across all their memberships.',
        argsSchema: memberIdArgs,
        execute: (args, ctx) => this.memberships.getPaymentHistory(ctx.tenantId, args.memberId),
      },
      {
        name: 'expiringMemberships',
        description: 'Memberships expiring within N days (default 7) — use for renewal outreach.',
        argsSchema: expiringMembershipsArgs,
        execute: (args, ctx) => this.memberships.getExpiring(ctx.tenantId, args.days ?? 7),
      },

      // ---- Trainer tools ----
      {
        name: 'searchTrainers',
        description: 'Search/list trainers by name or branch.',
        argsSchema: searchTrainersArgs,
        execute: (args, ctx) => this.trainers.findAll(ctx.tenantId, args),
      },
      {
        name: 'getTrainer',
        description: 'Trainer profile: specialization, commission rate, assigned members.',
        argsSchema: trainerIdArgs,
        execute: (args, ctx) => this.trainers.findOne(ctx.tenantId, args.trainerId),
      },
      {
        name: 'trainerTrainees',
        description: "A trainer's currently assigned members (their own client list).",
        argsSchema: z.object({ trainerUserId: z.string().describe("The trainer's User.id (not Trainer.id)") }),
        execute: (args, ctx) => this.trainers.findMyTrainees(ctx.tenantId, args.trainerUserId),
        requiredPermission: 'fitness:view',
      },

      // ---- Workout tools ----
      {
        name: 'memberWorkoutPlans',
        description: "A member's workout plans (active and past), with days/exercises.",
        argsSchema: memberIdArgs,
        execute: (args, ctx) => this.workoutPlans.findAll(ctx.tenantId, { memberId: args.memberId }),
      },
      {
        name: 'getWorkoutPlan',
        description: 'Full detail of one workout plan by id.',
        argsSchema: z.object({ planId: z.string() }),
        execute: (args, ctx) => this.workoutPlans.findOne(ctx.tenantId, args.planId),
      },

      // ---- Diet tools ----
      {
        name: 'memberDietPlans',
        description: "A member's diet plans (active and past), with meals.",
        argsSchema: memberIdArgs,
        execute: (args, ctx) => this.dietPlans.findAll(ctx.tenantId, { memberId: args.memberId }),
      },
      {
        name: 'getDietPlan',
        description: 'Full detail of one diet plan by id, including meals and macros.',
        argsSchema: z.object({ planId: z.string() }),
        execute: (args, ctx) => this.dietPlans.findOne(ctx.tenantId, args.planId),
      },

      // ---- Attendance tools ----
      {
        name: 'todayAttendance',
        description: "Who has checked in today (optionally filtered to one branch).",
        argsSchema: z.object({ branchId: z.string().optional() }),
        execute: (args, ctx) => this.checkin.getTodayAttendances(ctx.tenantId, args.branchId),
      },
      {
        name: 'memberAttendanceHistory',
        description: "A member's check-in history over the last N days (default 30).",
        argsSchema: memberHistoryArgs,
        execute: (args, ctx) => this.checkin.getMemberHistory(ctx.tenantId, args.memberId, args.days ?? 30),
      },
      {
        name: 'branchAttendanceStats',
        description: 'Aggregate attendance stats for a branch over N days (default 30) — visits, unique members, peak times.',
        argsSchema: branchStatsArgs,
        execute: (args, ctx) => this.checkin.getBranchStats(ctx.tenantId, args.branchId, args.days ?? 30),
      },

      // ---- Classes ----
      {
        name: 'listClasses',
        description: 'Group class schedule, optionally filtered by branch, class type, or day of week.',
        argsSchema: classesArgs,
        execute: (args, ctx) => this.classes.findAll(ctx.tenantId, args),
      },

      // ---- Notifications (used by workflow automations, not free-form by the agent) ----
      {
        name: 'sendReminder',
        description: "Send a notification to a member's email (e.g. renewal reminder, retention outreach). Requires explicit confirmation from the user before calling — never send without being asked.",
        argsSchema: sendReminderArgs,
        requiredPermission: 'fitness:notify',
        execute: async (args, ctx) => {
          const member = await this.members.findOne(ctx.tenantId, args.memberId);
          const email = (member as any)?.user?.email;
          if (!email) throw new Error('Member has no email on file — cannot send a reminder.');
          return this.notifications.sendDirect(ctx.tenantId, { to: email, title: args.title, message: args.message });
        },
      },
    ];
  }
}
