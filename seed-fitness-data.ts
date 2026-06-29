import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';

const prisma = new PrismaClient();

const NEPALI_FOODS = [
  { name: 'Dal Bhat', nameNepali: 'दाल भात', category: 'STAPLE', servingSize: '1 plate', calories: 650, protein: 18, carbs: 110, fats: 12, fiber: 8, isVegetarian: true, isVegan: true, isTraditional: true, region: 'GENERAL' },
  { name: 'Dal Bhat with Chicken', nameNepali: 'दाल भात कुखुरा', category: 'STAPLE', servingSize: '1 plate', calories: 850, protein: 38, carbs: 110, fats: 22, fiber: 8, isVegetarian: false, isTraditional: true, region: 'GENERAL' },
  { name: 'Momo (Steamed)', nameNepali: 'मम', category: 'SNACK', servingSize: '10 pieces', calories: 320, protein: 16, carbs: 38, fats: 12, isVegetarian: false, isTraditional: true, region: 'GENERAL' },
  { name: 'Veg Momo', nameNepali: 'साग मम', category: 'SNACK', servingSize: '10 pieces', calories: 250, protein: 8, carbs: 38, fats: 7, isVegetarian: true, isVegan: true, isTraditional: true, region: 'GENERAL' },
  { name: 'Roti (Wheat)', nameNepali: 'रोटी', category: 'STAPLE', servingSize: '1 piece', calories: 120, protein: 3, carbs: 22, fats: 2.5, fiber: 3, isVegetarian: true, isVegan: true, isTraditional: true, region: 'GENERAL' },
  { name: 'Naan', nameNepali: 'नान', category: 'STAPLE', servingSize: '1 piece', calories: 260, protein: 9, carbs: 45, fats: 5, isVegetarian: true, isVegan: false, isTraditional: true, region: 'HILL' },
  { name: 'Sel Roti', nameNepali: 'सेल रोटी', category: 'SNACK', servingSize: '1 piece', calories: 180, protein: 2, carbs: 28, fats: 7, isVegetarian: true, isVegan: true, isTraditional: true, region: 'HILL' },
  { name: 'Dhindo', nameNepali: 'ढिँडो', category: 'STAPLE', servingSize: '1 cup', calories: 220, protein: 4, carbs: 48, fats: 1, fiber: 4, isVegetarian: true, isVegan: true, isTraditional: true, region: 'HILL' },
  { name: 'Gundruk Soup', nameNepali: 'गुन्द्रुक', category: 'VEGETABLE', servingSize: '1 cup', calories: 60, protein: 4, carbs: 8, fats: 1, fiber: 5, isVegetarian: true, isVegan: true, isTraditional: true, region: 'HILL' },
  { name: 'Sag (Spinach)', nameNepali: 'साग', category: 'VEGETABLE', servingSize: '1 cup', calories: 40, protein: 5, carbs: 7, fats: 0.5, fiber: 4, isVegetarian: true, isVegan: true, isTraditional: true, region: 'HILL' },
  { name: 'Aloo Tama', nameNepali: 'आलु तामा', category: 'VEGETABLE', servingSize: '1 cup', calories: 150, protein: 3, carbs: 25, fats: 5, fiber: 4, isVegetarian: true, isVegan: true, isTraditional: true, region: 'HILL' },
  { name: 'Chicken Curry', nameNepali: 'कुखुराको मासु', category: 'PROTEIN', servingSize: '100g', calories: 250, protein: 25, carbs: 6, fats: 14, isVegetarian: false, isTraditional: true, region: 'GENERAL' },
  { name: 'Buff (Mutton) Curry', nameNepali: 'भैँसीको मासु', category: 'PROTEIN', servingSize: '100g', calories: 290, protein: 26, carbs: 4, fats: 18, isVegetarian: false, isTraditional: true, region: 'GENERAL' },
  { name: 'Fish Curry', nameNepali: 'माछाको मासु', category: 'PROTEIN', servingSize: '100g', calories: 220, protein: 22, carbs: 5, fats: 12, isVegetarian: false, isTraditional: true, region: 'TERAI' },
  { name: 'Egg Boiled', nameNepali: 'अण्डा', category: 'PROTEIN', servingSize: '1 large', calories: 78, protein: 6, carbs: 0.6, fats: 5, isVegetarian: false, isVegan: false, isTraditional: false },
  { name: 'Paneer', nameNepali: 'पनीर', category: 'PROTEIN', servingSize: '50g', calories: 130, protein: 9, carbs: 2, fats: 10, isVegetarian: true, isVegan: false, isTraditional: false, allergens: 'dairy' },
  { name: 'Tofu', nameNepali: 'टोफु', category: 'PROTEIN', servingSize: '100g', calories: 76, protein: 8, carbs: 1.9, fats: 4.8, isVegetarian: true, isVegan: true },
  { name: 'Chana (Chickpeas)', nameNepali: 'चना', category: 'PROTEIN', servingSize: '1 cup', calories: 270, protein: 15, carbs: 45, fats: 4, fiber: 12, isVegetarian: true, isVegan: true },
  { name: 'Lentils (Dal)', nameNepali: 'दाल', category: 'PROTEIN', servingSize: '1 cup', calories: 230, protein: 18, carbs: 40, fats: 0.8, fiber: 16, isVegetarian: true, isVegan: true },
  { name: 'Yogurt (Dahi)', nameNepali: 'दही', category: 'PROTEIN', servingSize: '1 cup', calories: 150, protein: 8, carbs: 12, fats: 8, isVegetarian: true, isVegan: false, isTraditional: true, allergens: 'dairy' },
  { name: 'Banana', nameNepali: 'केरा', category: 'FRUIT', servingSize: '1 medium', calories: 105, protein: 1.3, carbs: 27, fats: 0.4, fiber: 3, isVegetarian: true, isVegan: true, isTraditional: true },
  { name: 'Apple', nameNepali: 'स्याउ', category: 'FRUIT', servingSize: '1 medium', calories: 95, protein: 0.5, carbs: 25, fats: 0.3, fiber: 4, isVegetarian: true, isVegan: true },
  { name: 'Mango', nameNepali: 'आँप', category: 'FRUIT', servingSize: '1 cup', calories: 100, protein: 1.4, carbs: 25, fats: 0.6, fiber: 3, isVegetarian: true, isVegan: true, isTraditional: true },
  { name: 'Papaya', nameNepali: 'मेवा', category: 'FRUIT', servingSize: '1 cup', calories: 62, protein: 0.7, carbs: 16, fats: 0.4, fiber: 2.5, isVegetarian: true, isVegan: true, isTraditional: true },
  { name: 'Orange', nameNepali: 'सुन्तला', category: 'FRUIT', servingSize: '1 medium', calories: 62, protein: 1.2, carbs: 15, fats: 0.2, fiber: 3, isVegetarian: true, isVegan: true },
  { name: 'Tea (Milk)', nameNepali: 'चिया', category: 'BEVERAGE', servingSize: '1 cup', calories: 50, protein: 1.5, carbs: 6, fats: 2, isVegetarian: true, isVegan: false, isTraditional: true },
  { name: 'Black Coffee', nameNepali: 'कफी', category: 'BEVERAGE', servingSize: '1 cup', calories: 2, protein: 0.3, carbs: 0, fats: 0, isVegetarian: true, isVegan: true },
  { name: 'Lassi (Sweet)', nameNepali: 'लस्सी', category: 'BEVERAGE', servingSize: '1 cup', calories: 260, protein: 7, carbs: 38, fats: 9, isVegetarian: true, isVegan: false, isTraditional: true, allergens: 'dairy' },
  { name: 'Sattu Drink', nameNepali: 'सत्तु', category: 'BEVERAGE', servingSize: '1 glass', calories: 180, protein: 8, carbs: 30, fats: 3, fiber: 6, isVegetarian: true, isVegan: true, isTraditional: true },
  { name: 'Jalebi', nameNepali: 'जेरी', category: 'SNACK', servingSize: '2 pieces', calories: 175, protein: 1, carbs: 30, fats: 6, isVegetarian: true, isVegan: true, isTraditional: true },
  { name: 'Samosa', nameNepali: 'समोसा', category: 'SNACK', servingSize: '1 piece', calories: 260, protein: 4, carbs: 24, fats: 16, isVegetarian: true, isVegan: true, isTraditional: true },
  { name: 'Pakora', nameNepali: 'पकौडा', category: 'SNACK', servingSize: '4 pieces', calories: 220, protein: 6, carbs: 20, fats: 13, isVegetarian: true, isVegan: true, isTraditional: true },
  { name: 'Chowmein', nameNepali: 'चाउमिन', category: 'STAPLE', servingSize: '1 plate', calories: 480, protein: 12, carbs: 70, fats: 16, isVegetarian: true, isVegan: true },
  { name: 'Fried Rice (Veg)', nameNepali: 'भुजा', category: 'STAPLE', servingSize: '1 plate', calories: 420, protein: 8, carbs: 65, fats: 14, isVegetarian: true, isVegan: true },
  { name: 'Thukpa', nameNepali: 'थुक्पा', category: 'STAPLE', servingSize: '1 bowl', calories: 380, protein: 14, carbs: 52, fats: 11, isVegetarian: true, isVegan: true, isTraditional: true, region: 'HILL' },
];

const BADGES = [
  { name: '7-Day Streak', description: 'Work out 7 days in a row', icon: '🔥', category: 'STREAK', criteria: { type: 'streak', days: 7 }, points: 50 },
  { name: '30-Day Streak', description: 'Work out 30 days in a row', icon: '⚡', category: 'STREAK', criteria: { type: 'streak', days: 30 }, points: 200 },
  { name: '100-Day Streak', description: 'Work out 100 days in a row', icon: '💪', category: 'STREAK', criteria: { type: 'streak', days: 100 }, points: 1000 },
  { name: '10 Workouts', description: 'Complete 10 workouts', icon: '🏃', category: 'MILESTONE', criteria: { type: 'workouts', count: 10 }, points: 100 },
  { name: '50 Workouts', description: 'Complete 50 workouts', icon: '🏋️', category: 'MILESTONE', criteria: { type: 'workouts', count: 50 }, points: 500 },
  { name: '100 Workouts', description: 'Complete 100 workouts', icon: '🏆', category: 'MILESTONE', criteria: { type: 'workouts', count: 100 }, points: 1500 },
  { name: '500 Workouts', description: 'Complete 500 workouts', icon: '👑', category: 'MILESTONE', criteria: { type: 'workouts', count: 500 }, points: 10000 },
  { name: 'First Class', description: 'Attend your first group class', icon: '🎯', category: 'ACHIEVEMENT', criteria: { type: 'classes', count: 1 }, points: 50 },
  { name: '10 Classes', description: 'Attend 10 group classes', icon: '⭐', category: 'ACHIEVEMENT', criteria: { type: 'classes', count: 10 }, points: 200 },
  { name: 'First Referral', description: 'Refer your first friend', icon: '🤝', category: 'SOCIAL', criteria: { type: 'referrals', count: 1 }, points: 100 },
  { name: '5kg Lost', description: 'Lose 5kg from initial weight', icon: '📉', category: 'CHALLENGE', criteria: { type: 'weight_loss', kg: 5 }, points: 500 },
  { name: '10kg Lost', description: 'Lose 10kg from initial weight', icon: '🎉', category: 'CHALLENGE', criteria: { type: 'weight_loss', kg: 10 }, points: 1500 },
  { name: 'Early Bird', description: 'Check in before 7 AM', icon: '🌅', category: 'ACHIEVEMENT', criteria: { type: 'early_checkin' }, points: 50 },
  { name: 'Hydration Hero', description: 'Log 2L+ water for 7 days', icon: '💧', category: 'CHALLENGE', criteria: { type: 'water_streak', days: 7 }, points: 100 },
];

const MEMBERSHIP_PLANS = [
  { name: 'Trial Pass', description: '1-day free trial', type: 'TRIAL', durationDays: 1, priceNpr: 0, vatPercent: 13, totalWithVat: 0, includesTrainer: false, includesClasses: false, includesDietPlan: false, freezeAllowed: false, sortOrder: 0, branchAccess: 'single' },
  { name: 'Monthly Basic', description: 'Gym access, no classes', type: 'MONTHLY', durationDays: 30, priceNpr: 2500, vatPercent: 13, totalWithVat: 2825, includesTrainer: false, includesClasses: false, includesDietPlan: false, freezeAllowed: true, maxFreezeDays: 7, sortOrder: 1, branchAccess: 'single' },
  { name: 'Monthly Plus', description: 'Gym + group classes', type: 'MONTHLY', durationDays: 30, priceNpr: 4000, vatPercent: 13, totalWithVat: 4520, includesTrainer: false, includesClasses: true, includesDietPlan: false, freezeAllowed: true, maxFreezeDays: 7, sortOrder: 2, branchAccess: 'single' },
  { name: 'Quarterly Pro', description: 'Gym + classes + 1 PT session/week', type: 'QUARTERLY', durationDays: 90, priceNpr: 12000, vatPercent: 13, totalWithVat: 13560, includesTrainer: true, includesClasses: true, includesDietPlan: true, freezeAllowed: true, maxFreezeDays: 14, sortOrder: 3, branchAccess: 'all' },
  { name: 'Half-Yearly Premium', description: 'All access + 2 PT/week + diet plan', type: 'HALF_YEARLY', durationDays: 180, priceNpr: 22000, vatPercent: 13, totalWithVat: 24860, includesTrainer: true, includesClasses: true, includesDietPlan: true, freezeAllowed: true, maxFreezeDays: 30, sortOrder: 4, branchAccess: 'all' },
  { name: 'Yearly Elite', description: 'Unlimited everything, multi-branch', type: 'YEARLY', durationDays: 365, priceNpr: 40000, vatPercent: 13, totalWithVat: 45200, includesTrainer: true, includesClasses: true, includesDietPlan: true, freezeAllowed: true, maxFreezeDays: 60, sortOrder: 5, branchAccess: 'all' },
];

const GROUP_CLASSES = [
  { name: 'Morning Yoga Flow', description: 'Start your day with gentle yoga and breathing', classType: 'YOGA', dayOfWeek: 1, startTime: '06:00', endTime: '07:00', duration: 60, maxCapacity: 20, isFree: true },
  { name: 'Power Yoga', description: 'Intense yoga for strength and flexibility', classType: 'YOGA', dayOfWeek: 3, startTime: '18:00', endTime: '19:00', duration: 60, maxCapacity: 15, isFree: true },
  { name: 'Zumba Party', description: 'Dance your way fit with high-energy Zumba', classType: 'ZUMBA', dayOfWeek: 2, startTime: '19:00', endTime: '20:00', duration: 60, maxCapacity: 25, isFree: true },
  { name: 'Zumba Saturday', description: 'Weekend Zumba celebration', classType: 'ZUMBA', dayOfWeek: 6, startTime: '10:00', endTime: '11:00', duration: 60, maxCapacity: 30, isFree: true },
  { name: 'CrossFit WOD', description: 'Workout of the Day - intense functional fitness', classType: 'CROSSFIT', dayOfWeek: 1, startTime: '18:00', endTime: '19:00', duration: 60, maxCapacity: 12, isFree: true },
  { name: 'CrossFit Open', description: 'Advanced CrossFit training', classType: 'CROSSFIT', dayOfWeek: 4, startTime: '18:00', endTime: '19:30', duration: 90, maxCapacity: 12, isFree: false, priceNpr: 500 },
  { name: 'HIIT Burn', description: 'High-Intensity Interval Training for fat burn', classType: 'HIIT', dayOfWeek: 2, startTime: '07:00', endTime: '07:45', duration: 45, maxCapacity: 18, isFree: true },
  { name: 'HIIT Evening', description: 'After-work HIIT session', classType: 'HIIT', dayOfWeek: 5, startTime: '19:00', endTime: '19:45', duration: 45, maxCapacity: 18, isFree: true },
  { name: 'Spinning', description: 'Indoor cycling for cardio endurance', classType: 'SPINNING', dayOfWeek: 3, startTime: '07:00', endTime: '07:45', duration: 45, maxCapacity: 20, isFree: true },
  { name: 'Boxing Fundamentals', description: 'Learn boxing basics and get fit', classType: 'BOXING', dayOfWeek: 5, startTime: '18:00', endTime: '19:00', duration: 60, maxCapacity: 15, isFree: true },
  { name: 'Pilates Core', description: 'Core strength and stability', classType: 'PILATES', dayOfWeek: 4, startTime: '07:00', endTime: '07:45', duration: 45, maxCapacity: 15, isFree: true },
  { name: 'Aerobics Fun', description: 'Classic aerobics for all levels', classType: 'AEROBICS', dayOfWeek: 0, startTime: '09:00', endTime: '10:00', duration: 60, maxCapacity: 25, isFree: true },
];

function generateQrCode() {
  return 'FITNEPAL-' + randomBytes(12).toString('hex').toUpperCase();
}

async function seedFitnessData() {
  console.log('🌱 Seeding FitNepal fitness data (fresh)...');

  const tenant = await prisma.tenant.findFirst({
    where: { OR: [{ subdomain: 'fitnessapp' }, { subdomain: 'fitness' }] },
    orderBy: { createdAt: 'asc' },
  });
  if (!tenant) {
    console.error('❌ Fitness tenant not found. Run `npx prisma db seed` (creates FitnessApp tenant) first.');
    process.exit(1);
  }
  const tenantId = tenant.id;
  console.log(`  ✓ Found tenant: ${tenant.name} (${tenantId})`);

  const branches = await prisma.branch.findMany({ where: { tenantId } });
  console.log(`  ✓ Found ${branches.length} branches`);
  const hqBranch = branches.find((b) => b.isHeadquarters) ?? branches[0];

  console.log('\n🧹 Clearing old FitNepal data for this tenant...');
  const deletedMemberships = await prisma.membership.deleteMany({ where: { tenantId } });
  const deletedClassBookings = await prisma.classBooking.deleteMany({ where: { tenantId } });
  const deletedFoodLogs = await prisma.foodLog.deleteMany({ where: { tenantId } });
  const deletedWorkoutLogs = await prisma.workoutLog.deleteMany({ where: { tenantId } });
  const deletedExerciseLogs = await prisma.exerciseLog.deleteMany({ where: { tenantId } });
  const deletedDietPlans = await prisma.dietPlan.deleteMany({ where: { tenantId } });
  const deletedWorkoutPlans = await prisma.workoutPlan.deleteMany({ where: { tenantId } });
  const deletedBodyAssessments = await prisma.bodyAssessment.deleteMany({ where: { tenantId } });
  const deletedTrainerMessages = await prisma.trainerMessage.deleteMany({ where: { tenantId } });
  const deletedCustomerBadges = await prisma.customerBadge.deleteMany({ where: { tenantId } });
  const deletedReferrals = await prisma.referral.deleteMany({ where: { tenantId } });
  const deletedEquipmentMaintenance = await prisma.equipmentMaintenance.deleteMany({ where: { equipment: { tenantId } } });
  const deletedEquipment = await prisma.equipment.deleteMany({ where: { tenantId } });
  const deletedGroupClasses = await prisma.groupClass.deleteMany({ where: { tenantId } });
  const deletedBadges = await prisma.badge.deleteMany({ where: { tenantId } });
  const deletedPlans = await prisma.membershipPlan.deleteMany({ where: { tenantId } });
  const deletedMembers = await prisma.member.deleteMany({ where: { tenantId } });
  console.log(`  ✓ Removed ${deletedMemberships.count} memberships, ${deletedGroupClasses.count} classes, ${deletedPlans.count} plans, ${deletedBadges.count} badges, ${deletedMembers.count} members`);

  console.log('\n📋 Seeding Nepali food database (global)...');
  const foodIds = NEPALI_FOODS.map((f) => `nepali-${f.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`);
  await prisma.nepaliFoodItem.deleteMany({ where: { id: { in: foodIds } } });
  for (const food of NEPALI_FOODS) {
    await prisma.nepaliFoodItem.create({
      data: { id: `nepali-${food.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`, ...food },
    });
  }
  console.log(`  ✓ Seeded ${NEPALI_FOODS.length} Nepali food items`);

  console.log('\n💳 Seeding membership plans...');
  for (const plan of MEMBERSHIP_PLANS) {
    await prisma.membershipPlan.create({
      data: { id: `plan-${plan.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`, tenantId, ...plan },
    });
  }
  console.log(`  ✓ Seeded ${MEMBERSHIP_PLANS.length} membership plans`);

  console.log('\n🏆 Seeding badges...');
  for (const badge of BADGES) {
    await prisma.badge.create({
      data: { id: `badge-${badge.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`, tenantId, ...badge },
    });
  }
  console.log(`  ✓ Seeded ${BADGES.length} badges`);

  console.log('\n📅 Seeding group classes...');
  for (const cls of GROUP_CLASSES) {
    const startDate = new Date();
    startDate.setHours(parseInt(cls.startTime.split(':')[0]), parseInt(cls.startTime.split(':')[1]), 0, 0);
    const endDate = new Date();
    endDate.setHours(parseInt(cls.endTime.split(':')[0]), parseInt(cls.endTime.split(':')[1]), 0, 0);
    await prisma.groupClass.create({
      data: {
        tenantId,
        name: cls.name,
        description: cls.description,
        classType: cls.classType,
        dayOfWeek: cls.dayOfWeek,
        startTime: startDate,
        endTime: endDate,
        duration: cls.duration,
        maxCapacity: cls.maxCapacity,
        isFree: cls.isFree,
        priceNpr: cls.priceNpr,
        branchId: hqBranch?.id,
        isActive: true,
      },
    });
  }
  console.log(`  ✓ Seeded ${GROUP_CLASSES.length} group classes`);

  console.log('\n🏃 Seeding demo members with memberships...');
  const demoEmails = [
    { email: 'alice@fitnessapp.com', name: 'Alice', lastName: 'Member', height: 168, weight: 62, goals: 'Lose 5kg and run 5K' },
    { email: 'bob@fitnessapp.com', name: 'Bob', lastName: 'Member', height: 178, weight: 82, goals: 'Build muscle mass' },
  ];
  const monthlyPlusPlan = await prisma.membershipPlan.findFirst({ where: { tenantId, name: 'Monthly Plus' } });

  for (const demo of demoEmails) {
    let user = await prisma.user.findUnique({ where: { email: demo.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: demo.email,
          firstName: demo.name,
          lastName: demo.lastName,
          passwordHash: '$2a$10$MockHashedPasswordForDemo',
          tenantId,
          status: 'active',
          emailVerified: true,
        },
      });
    }
    const member = await prisma.member.create({
      data: {
        tenantId,
        userId: user.id,
        branchId: hqBranch?.id,
        membershipType: 'MONTHLY',
        startDate: new Date(),
        status: 'ACTIVE',
        isVerified: true,
        height: demo.height,
        weight: demo.weight,
        goals: demo.goals,
      },
    });
    if (monthlyPlusPlan) {
      await prisma.membership.create({
        data: {
          tenantId,
          memberId: member.id,
          planId: monthlyPlusPlan.id,
          startDate: new Date(),
          endDate: new Date(Date.now() + monthlyPlusPlan.durationDays * 24 * 60 * 60 * 1000),
          amountPaid: monthlyPlusPlan.totalWithVat,
          paymentMethod: 'eSewa',
          status: 'ACTIVE',
          qrCode: generateQrCode(),
        },
      });
    }
    console.log(`  ✓ Created member + membership for ${demo.email}`);
  }

  console.log('\n✅ FitNepal data seed complete (fresh)!');
  console.log('\n📊 Summary:');
  console.log(`   - ${NEPALI_FOODS.length} Nepali food items`);
  console.log(`   - ${MEMBERSHIP_PLANS.length} membership plans`);
  console.log(`   - ${BADGES.length} badges`);
  console.log(`   - ${GROUP_CLASSES.length} group classes`);
  console.log(`   - 2 demo members with active memberships`);
}

seedFitnessData()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
