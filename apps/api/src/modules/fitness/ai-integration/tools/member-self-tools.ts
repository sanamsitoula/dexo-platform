import { Injectable, NotFoundException } from '@nestjs/common';
import { z } from 'zod';
import type { AiTool } from '@dexo/ai-platform';
import { MembersService } from '../../members/members.service';
import { MembershipsService } from '../../members/memberships.service';
import { WorkoutPlansService } from '../../workouts/workout-plans.service';
import { DietPlansService } from '../../diet/diet-plans.service';
import { CheckinService } from '../../checkin/checkin.service';

/**
 * Member-SELF tools — registered under a SEPARATE moduleKey ("fitness-self",
 * not "fitness") so the customer-facing agent structurally cannot reach the
 * staff tools in tools/index.ts (which accept an arbitrary memberId and are
 * only safe behind tenant-admin, where every logged-in user is staff).
 *
 * None of these tools accept a memberId argument — every one resolves the
 * caller's OWN member record from `ctx.userId`. A member asking "show my
 * workout plan" cannot be redirected to look up someone else's data no
 * matter what the model is prompted to do, because the id never comes from
 * the model in the first place.
 */
@Injectable()
export class FitnessMemberSelfTools {
  constructor(
    private members: MembersService,
    private memberships: MembershipsService,
    private workoutPlans: WorkoutPlansService,
    private dietPlans: DietPlansService,
    private checkin: CheckinService,
  ) {}

  private async myMemberId(ctx: { tenantId: string; userId: string }): Promise<string> {
    const member = await this.members.findByUserId(ctx.tenantId, ctx.userId);
    if (!member) throw new NotFoundException('No member record for the current user');
    return member.id;
  }

  build(): AiTool[] {
    return [
      {
        name: 'myProfile',
        description: 'The current member\'s own profile: memberships, recent body assessments, active workout/diet plans, badges.',
        argsSchema: z.object({}),
        execute: async (_args, ctx) => this.members.findOne(ctx.tenantId, await this.myMemberId(ctx)),
      },
      {
        name: 'myMembershipStatus',
        description: 'The current member\'s membership history and status (active/expired, plan, dates).',
        argsSchema: z.object({}),
        execute: async (_args, ctx) => this.memberships.findAll(ctx.tenantId, { memberId: await this.myMemberId(ctx) }),
      },
      {
        name: 'myPaymentHistory',
        description: "The current member's own payment/activation history.",
        argsSchema: z.object({}),
        execute: async (_args, ctx) => this.memberships.getPaymentHistory(ctx.tenantId, await this.myMemberId(ctx)),
      },
      {
        name: 'myWorkoutPlans',
        description: "The current member's own workout plans (active and past).",
        argsSchema: z.object({}),
        execute: async (_args, ctx) => this.workoutPlans.findAll(ctx.tenantId, { memberId: await this.myMemberId(ctx) }),
      },
      {
        name: 'myDietPlans',
        description: "The current member's own diet plans (active and past), with meals and macros.",
        argsSchema: z.object({}),
        execute: async (_args, ctx) => this.dietPlans.findAll(ctx.tenantId, { memberId: await this.myMemberId(ctx) }),
      },
      {
        name: 'myAttendanceHistory',
        description: "The current member's own check-in history over the last N days (default 30).",
        argsSchema: z.object({ days: z.number().optional() }),
        execute: async (args, ctx) => this.checkin.getMemberHistory(ctx.tenantId, await this.myMemberId(ctx), args.days ?? 30),
      },
    ];
  }
}
