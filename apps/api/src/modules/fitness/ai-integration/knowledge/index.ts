import type { AiKnowledgeChunk } from '@dexo/ai-platform';

/**
 * Structured entity-relationship knowledge for the fitness domain — static
 * for now (not vector-indexed yet, see docs/ai/08_RAG_ENGINE.md roadmap),
 * but registered through the same `registerModule({ knowledge })` path so
 * swapping in real RAG later needs no change to how modules register.
 */
export const fitnessKnowledge: AiKnowledgeChunk[] = [
  {
    id: 'fitness.entity-graph',
    moduleKey: 'fitness',
    title: 'Fitness domain entity relationships',
    content: `Tenant -> Branch -> Member -> Membership (has a MembershipPlan) -> Trainer (assigned to Member)
Member -> WorkoutPlan -> WorkoutDay -> WorkoutExercise
Member -> DietPlan -> DietMeal
Member -> Attendance (check-in/out events)
Member -> BodyAssessment (weight/measurements over time, used for progress tracking)
Membership -> payment history is tracked via Membership activation records, not a separate Invoice per-membership.
GroupClass -> ClassBooking (Member books into a class).`,
  },
  {
    id: 'fitness.glossary',
    moduleKey: 'fitness',
    title: 'Fitness domain glossary',
    content: `"Active member" = Member.status === ACTIVE. "Expiring membership" = Membership.endDate within the lookahead window and status ACTIVE. "Churn risk" is not a stored field — infer it by combining expiringMemberships with memberAttendanceHistory showing no recent visits.`,
  },
];
