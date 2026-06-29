const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
(async () => {
  const t = await p.tenant.findFirst({ where: { subdomain: 'fitnessapp' } });
  if (!t) { console.log('no tenant'); return; }
  const c = {
    members: await p.member.count({ where: { tenantId: t.id } }),
    plans: await p.membershipPlan.count({ where: { tenantId: t.id } }),
    memberships: await p.membership.count({ where: { tenantId: t.id } }),
    trainers: await p.trainer.count({ where: { tenantId: t.id } }),
    badges: await p.badge.count({ where: { tenantId: t.id } }),
    classes: await p.groupClass.count({ where: { tenantId: t.id } }),
    nepaliFoods: await p.nepaliFoodItem.count(),
    domainModules: await p.domainModule.count({ where: { domain: { code: 'FITNESS_CENTER' } } }),
    domainMenus: await p.domainMenu.count({ where: { domain: { code: 'FITNESS_CENTER' } } }),
    customerBadges: await p.customerBadge.count(),
    workoutPlans: await p.workoutPlan.count(),
    dietPlans: await p.dietPlan.count(),
  };
  console.log(JSON.stringify(c, null, 2));
  await p.$disconnect();
})();
