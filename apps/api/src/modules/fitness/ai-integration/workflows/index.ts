import { Injectable, Logger } from '@nestjs/common';
import { MembershipsService } from '../../members/memberships.service';
import { NotificationService } from '@dexo/notification';

/**
 * Workflow automations — data-driven actions triggered by a condition
 * (expiring membership, etc.), not by a chat message. Only ONE is wired to
 * an executable method in this pass (membership-expiry reminders); the
 * other two from the spec are documented but NOT implemented, so nothing
 * silently emails real members without an explicit, reviewed trigger.
 *
 * Wired: `runMembershipExpiryCheck` — call it manually via
 * POST /api/fitness/ai/workflows/membership-expiry (see ai-integration
 * controller), or schedule it with @nestjs/schedule once a tenant opts in.
 *
 * NOT implemented (roadmap — see docs/ai/00_AI_MASTER_ARCHITECTURE.md):
 *   - "Member absent 30 days" retention workflow (needs a per-member
 *     last-visit query across ALL members, not just one at a time — a
 *     genuine new aggregate query, not a wrapper around an existing method).
 *   - "New member onboarding" workflow (assign trainer + generate initial
 *     workout/diet plan) — plan *generation* by the LLM, not just plan
 *     *retrieval*, is a different capability than any tool built here and
 *     needs its own design pass (what happens if the LLM's first plan is
 *     wrong? who reviews it before the member sees it?).
 */
@Injectable()
export class FitnessAiWorkflows {
  private readonly logger = new Logger(FitnessAiWorkflows.name);

  constructor(
    private memberships: MembershipsService,
    private notifications: NotificationService,
  ) {}

  async runMembershipExpiryCheck(tenantId: string, days = 7) {
    const expiring = await this.memberships.getExpiring(tenantId, days);
    const results: Array<{ membershipId: string; memberId: string; sent: boolean; reason?: string }> = [];

    for (const m of expiring as any[]) {
      const memberId = m.member?.id;
      const email = m.member?.user?.email;
      if (!memberId) continue;
      if (!email) {
        results.push({ membershipId: m.id, memberId, sent: false, reason: 'no email on file' });
        continue;
      }
      try {
        await this.notifications.sendDirect(tenantId, {
          to: email,
          title: 'Your membership is expiring soon',
          message: `Hi ${m.member.user.firstName || ''}, your membership expires on ${new Date(m.endDate).toLocaleDateString()}. Renew now to keep your access uninterrupted.`,
        });
        results.push({ membershipId: m.id, memberId, sent: true });
      } catch (e) {
        results.push({ membershipId: m.id, memberId, sent: false, reason: (e as Error).message });
        this.logger.warn(`Expiry reminder failed for member ${memberId}: ${(e as Error).message}`);
      }
    }
    return { checked: expiring.length, sent: results.filter((r) => r.sent).length, results };
  }
}
