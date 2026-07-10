const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const MIN = 10;
(async () => {
  const t = await p.tenant.findFirst({ where: { subdomain: 'vrfitness' } });
  if (!t) { console.log('no vrfitness tenant'); process.exit(1); }
  const w = { where: { tenantId: t.id } };
  const c = {
    members: await p.member.count(w),
    membershipPlans: await p.membershipPlan.count(w),
    memberships: await p.membership.count(w),
    trainers: await p.trainer.count(w),
    badges: await p.badge.count(w),
    customerBadges: await p.customerBadge.count(w),
    groupClasses: await p.groupClass.count(w),
    classBookings: await p.classBooking.count(w),
    workoutPlans: await p.workoutPlan.count(w),
    workoutDays: await p.workoutDay.count(w),
    workoutExercises: await p.workoutExercise.count(w),
    workoutLogs: await p.workoutLog.count(w),
    exerciseLogs: await p.exerciseLog.count(w),
    dietPlans: await p.dietPlan.count(w),
    dietMeals: await p.dietMeal.count(w),
    foodLogs: await p.foodLog.count(w),
    bodyAssessments: await p.bodyAssessment.count(w),
    trainerMessages: await p.trainerMessage.count(w),
    referrals: await p.referral.count(w),
    equipment: await p.equipment.count(w),
    equipmentMaintenance: await p.equipmentMaintenance.count(w),
    attendance: await p.attendance.count(w),
    legacyWorkouts: await p.workout.count(w),
    trainingSessions: await p.trainingSession.count(w),
    invoices: await p.invoice.count(w),
    nepaliFoods: await p.nepaliFoodItem.count(),
    domainModules: await p.domainModule.count({ where: { domain: { code: 'FITNESS_CENTER' } } }),
    domainMenus: await p.domainMenu.count({ where: { domain: { code: 'FITNESS_CENTER' } } }),
  };
  console.log(JSON.stringify(c, null, 2));
  const skip = new Set(['domainModules', 'domainMenus']);
  const failures = Object.entries(c).filter(([k, v]) => !skip.has(k) && v < MIN);
  if (failures.length) {
    console.error(`FAIL: tables below ${MIN} rows: ${failures.map(([k, v]) => `${k}=${v}`).join(', ')}`);
    process.exit(1);
  }
  console.log(`OK: all fitness tables have >= ${MIN} rows`);
  await p.$disconnect();
})();
