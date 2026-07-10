/**
 * Dexo v5 - 06: FITNESS full demo data
 *
 * Tops up EVERY fitness table to at least 10 rows for the vrfitness tenant
 * so every module of the fitness app can be tested with realistic data.
 * Idempotent: counts existing rows and only creates the shortfall.
 *
 * Covers: Trainer, GroupClass, ClassBooking, WorkoutPlan/Day/Exercise,
 * WorkoutLog, ExerciseLog, DietPlan, DietMeal, FoodLog, BodyAssessment,
 * TrainerMessage, CustomerBadge, Referral, Equipment, EquipmentMaintenance,
 * Attendance (check-ins), MembershipPlan, Badge, Membership, Member,
 * legacy Workout + TrainingSession.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const TARGET = 10;
const DAY = 86400000;

const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
const daysAhead = (n: number) => new Date(Date.now() + n * DAY);

export async function seed06FitnessFullDemo() {
  console.log('  → 06-fitness-full-demo');
  const tenant = await prisma.tenant.findUnique({ where: { subdomain: 'vrfitness' } });
  if (!tenant) { console.log('    vrfitness tenant not found, skipping'); return; }
  const tenantId = tenant.id;

  const branch = await prisma.branch.findFirst({ where: { tenantId }, orderBy: { isHeadquarters: 'desc' } });
  const adminUser = await prisma.user.findFirst({ where: { tenantId }, orderBy: { createdAt: 'asc' } });

  const shortfall = async (count: number) => Math.max(0, TARGET - count);

  // ---------- Members & member users (top up to 10) ----------
  {
    const count = await prisma.member.count({ where: { tenantId } });
    for (let i = count + 1; i <= TARGET; i++) {
      const user = await prisma.user.upsert({
        where: { email: `member${i}@vrfitness.com` },
        update: {},
        create: {
          tenantId, email: `member${i}@vrfitness.com`, firstName: `Member${i}`, lastName: 'Demo',
          passwordHash: '$2a$10$placeholderplaceholderplaceholderplaceholderplaceholder', emailVerified: true,
        },
      });
      await prisma.member.create({
        data: {
          tenantId, userId: user.id, branchId: branch?.id, membershipType: 'MONTHLY',
          startDate: daysAgo(30 + i), status: 'ACTIVE', isVerified: true,
          height: 160 + i, weight: 58 + i, goals: ['WEIGHT_LOSS', 'MUSCLE_GAIN', 'GENERAL_FITNESS'][i % 3],
        },
      });
    }
  }
  const members = await prisma.member.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } });
  const pick = <T,>(arr: T[], i: number): T => arr[i % arr.length];

  // ---------- Membership plans (top up to 10) ----------
  {
    const extraPlans = [
      { name: 'Trial Week', type: 'TRIAL', durationDays: 7, priceNpr: 500, sortOrder: 4 },
      { name: 'Student Monthly', type: 'MONTHLY', durationDays: 30, priceNpr: 1500, sortOrder: 5 },
      { name: 'Couple Monthly', type: 'MONTHLY', durationDays: 30, priceNpr: 3500, sortOrder: 6 },
      { name: 'Half-Yearly Standard', type: 'HALF_YEARLY', durationDays: 180, priceNpr: 10000, sortOrder: 7 },
      { name: 'Corporate Quarterly', type: 'QUARTERLY', durationDays: 90, priceNpr: 6000, sortOrder: 8 },
      { name: 'Off-Peak Monthly', type: 'MONTHLY', durationDays: 30, priceNpr: 1200, sortOrder: 9 },
      { name: 'Ladies Only Monthly', type: 'MONTHLY', durationDays: 30, priceNpr: 2200, sortOrder: 10 },
      { name: 'Senior Citizen Monthly', type: 'MONTHLY', durationDays: 30, priceNpr: 1000, sortOrder: 11 },
      { name: 'Weekend Warrior', type: 'CUSTOM', durationDays: 30, priceNpr: 900, sortOrder: 12 },
      { name: 'Day Pass Pack', type: 'CUSTOM', durationDays: 30, priceNpr: 800, sortOrder: 13 },
    ];
    const count = await prisma.membershipPlan.count({ where: { tenantId } });
    const need = await shortfall(count);
    for (let i = 0; i < need && i < extraPlans.length; i++) {
      const d = extraPlans[i];
      const exists = await prisma.membershipPlan.findFirst({ where: { tenantId, name: d.name } });
      if (exists) continue;
      await prisma.membershipPlan.create({
        data: {
          tenantId, name: d.name, type: d.type as any, durationDays: d.durationDays,
          priceNpr: d.priceNpr, vatPercent: 13, totalWithVat: Math.round(d.priceNpr * 1.13 * 100) / 100,
          includesClasses: i % 2 === 0, accessHours: i % 3 === 0 ? '24/7' : '6AM-10PM', sortOrder: d.sortOrder,
          description: `${d.name} plan for vrfitness demo.`,
        },
      });
    }
  }
  const plans = await prisma.membershipPlan.findMany({ where: { tenantId }, orderBy: { sortOrder: 'asc' } });

  // ---------- Memberships (one per member, top up to 10) ----------
  {
    const count = await prisma.membership.count({ where: { tenantId } });
    if (count < TARGET) {
      for (let i = 0; i < members.length; i++) {
        const m = members[i];
        const has = await prisma.membership.findFirst({ where: { tenantId, memberId: m.id } });
        if (has) continue;
        const plan = pick(plans, i);
        await prisma.membership.create({
          data: {
            tenantId, memberId: m.id, planId: plan.id,
            startDate: daysAgo(15), endDate: daysAhead(plan.durationDays - 15),
            amountPaid: plan.totalWithVat, paymentMethod: pick(['Cash', 'eSewa', 'Khalti', 'ConnectIPS'], i),
            status: 'ACTIVE', qrCode: `FITNEPAL-DEMO-${m.id.slice(0, 8).toUpperCase()}`,
          },
        });
      }
    }
  }
  const memberships = await prisma.membership.findMany({ where: { tenantId } });
  const membershipFor = (memberId: string) => memberships.find((ms) => ms.memberId === memberId);

  // ---------- Trainers (10) ----------
  {
    const specs = ['Strength & Conditioning', 'Yoga', 'CrossFit', 'Zumba', 'Boxing', 'Pilates', 'HIIT', 'Bodybuilding', 'Cardio & Endurance', 'Functional Training'];
    const count = await prisma.trainer.count({ where: { tenantId } });
    for (let i = count + 1; i <= TARGET; i++) {
      await prisma.trainer.create({
        data: {
          tenantId, branchId: branch?.id,
          name: `Trainer ${i} ${pick(['Gurung', 'Shrestha', 'Thapa', 'Rai', 'Magar'], i)}`,
          email: `trainer${i}@vrfitness.com`, phone: `+977-98000000${String(i).padStart(2, '0')}`,
          specialization: pick(specs, i - 1),
          certifications: 'NSCA-CPT; First Aid Level 2', bio: `Certified ${pick(specs, i - 1)} coach with ${3 + (i % 8)} years of experience.`,
          hourlyRate: 800 + (i % 5) * 200,
        },
      });
    }
  }
  const trainers = await prisma.trainer.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } });

  // ---------- Group classes (10) ----------
  {
    const defs: Array<[string, string, number]> = [
      ['Morning Yoga Flow', 'YOGA', 6], ['Zumba Blast', 'ZUMBA', 17], ['CrossFit WOD', 'CROSSFIT', 7],
      ['Spin Express', 'SPINNING', 18], ['Pilates Core', 'PILATES', 8], ['Aerobics Basics', 'AEROBICS', 17],
      ['Boxing Fundamentals', 'BOXING', 19], ['HIIT 45', 'HIIT', 6], ['Strength Circuit', 'STRENGTH', 18],
      ['Cardio Burn', 'CARDIO', 7], ['Functional Fit', 'FUNCTIONAL', 17], ['Evening Yoga Stretch', 'YOGA', 19],
    ];
    const count = await prisma.groupClass.count({ where: { tenantId } });
    const need = await shortfall(count);
    for (let i = 0; i < need && i < defs.length; i++) {
      const [name, classType, hour] = defs[i];
      const exists = await prisma.groupClass.findFirst({ where: { tenantId, name } });
      if (exists) continue;
      const start = new Date(); start.setHours(hour, 0, 0, 0);
      const end = new Date(start.getTime() + 60 * 60000);
      await prisma.groupClass.create({
        data: {
          tenantId, name, classType: classType as any, trainerId: pick(trainers, i)?.id, branchId: branch?.id,
          description: `${name} — 60 minute group session.`,
          dayOfWeek: i % 7, startTime: start, endTime: end, duration: 60,
          maxCapacity: 15 + (i % 3) * 5, isFree: i % 4 === 0, priceNpr: i % 4 === 0 ? null : 300 + (i % 3) * 100,
        },
      });
    }
  }
  const classes = await prisma.groupClass.findMany({ where: { tenantId } });

  // ---------- Class bookings (10) ----------
  {
    const count = await prisma.classBooking.count({ where: { tenantId } });
    const need = await shortfall(count);
    for (let i = 0; i < need; i++) {
      const member = pick(members, i);
      const cls = pick(classes, i);
      const bookingDate = daysAhead(i % 7);
      bookingDate.setHours(0, 0, 0, 0);
      const exists = await prisma.classBooking.findFirst({ where: { memberId: member.id, classId: cls.id, bookingDate } });
      if (exists) continue;
      await prisma.classBooking.create({
        data: {
          tenantId, memberId: member.id, classId: cls.id, membershipId: membershipFor(member.id)?.id,
          bookingDate, status: pick(['BOOKED', 'BOOKED', 'ATTENDED', 'CANCELLED'], i),
        },
      });
    }
  }

  // ---------- Workout plans (10) with days + exercises ----------
  {
    const goalTypes = ['WEIGHT_LOSS', 'MUSCLE_GAIN', 'ENDURANCE', 'GENERAL_FITNESS'];
    const levels = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
    const exercisePool = [
      { name: 'Barbell Squat', equipment: 'Barbell', sets: 4, reps: 8 },
      { name: 'Bench Press', equipment: 'Barbell', sets: 4, reps: 8 },
      { name: 'Deadlift', equipment: 'Barbell', sets: 3, reps: 5 },
      { name: 'Lat Pulldown', equipment: 'Machine', sets: 3, reps: 12 },
      { name: 'Dumbbell Shoulder Press', equipment: 'Dumbbell', sets: 3, reps: 10 },
      { name: 'Plank', equipment: 'Bodyweight', sets: 3, reps: 1 },
      { name: 'Treadmill Run', equipment: 'Machine', sets: 1, reps: 1 },
      { name: 'Lunges', equipment: 'Bodyweight', sets: 3, reps: 12 },
    ];
    const count = await prisma.workoutPlan.count({ where: { tenantId } });
    for (let i = count + 1; i <= TARGET; i++) {
      const member = pick(members, i);
      const isAi = i % 3 === 0;
      const plan = await prisma.workoutPlan.create({
        data: {
          tenantId, memberId: member.id, trainerId: pick(trainers, i)?.id,
          name: `${pick(goalTypes, i).replace('_', ' ')} Program ${i}`,
          description: `Demo ${pick(levels, i).toLowerCase()} program #${i}.`,
          goalType: pick(goalTypes, i), fitnessLevel: pick(levels, i),
          durationWeeks: 4 + (i % 4) * 2, daysPerWeek: 3 + (i % 3),
          status: pick(['ACTIVE', 'ACTIVE', 'DRAFT', 'COMPLETED'], i) as any,
          isAiGenerated: isAi,
          aiPrompt: isAi ? `Generate a ${pick(levels, i)} ${pick(goalTypes, i)} plan, ${3 + (i % 3)} days/week` : null,
          startDate: daysAgo(14), endDate: daysAhead(30),
          approvedBy: isAi ? adminUser?.id : null, approvedAt: isAi ? daysAgo(13) : null,
        },
      });
      for (let d = 1; d <= 3; d++) {
        const day = await prisma.workoutDay.create({
          data: {
            tenantId, planId: plan.id, dayNumber: d,
            dayName: ['Push Day', 'Pull Day', 'Leg Day'][d - 1],
            muscleGroup: ['Chest, Shoulders, Triceps', 'Back, Biceps', 'Quads, Hamstrings, Glutes'][d - 1],
          },
        });
        for (let e = 0; e < 3; e++) {
          const ex = pick(exercisePool, i + d + e);
          await prisma.workoutExercise.create({
            data: { tenantId, dayId: day.id, name: ex.name, sets: ex.sets, reps: ex.reps, equipment: ex.equipment, restSeconds: 60 + e * 30, sortOrder: e },
          });
        }
      }
    }
  }
  const workoutPlans = await prisma.workoutPlan.findMany({ where: { tenantId }, include: { workoutDays: { include: { exercises: true } } } });

  // ---------- Workout logs (10) + exercise logs (10+) ----------
  {
    const count = await prisma.workoutLog.count({ where: { tenantId } });
    for (let i = count + 1; i <= TARGET; i++) {
      const plan = pick(workoutPlans, i);
      const log = await prisma.workoutLog.create({
        data: {
          tenantId, memberId: plan.memberId, planId: plan.id,
          workoutDate: daysAgo(i), status: pick(['COMPLETED', 'COMPLETED', 'SKIPPED', 'IN_PROGRESS'], i) as any,
          duration: 40 + (i % 4) * 10, caloriesBurned: 250 + (i % 5) * 50,
          rating: 3 + (i % 3), notes: i % 2 === 0 ? 'Felt strong today.' : null,
        },
      });
      const exercises = plan.workoutDays.flatMap((d) => d.exercises);
      for (let e = 0; e < Math.min(2, exercises.length); e++) {
        const ex = exercises[(i + e) % exercises.length];
        await prisma.exerciseLog.create({
          data: {
            tenantId, workoutLogId: log.id, exerciseId: ex.id,
            setsCompleted: ex.sets ?? 3, repsCompleted: ex.reps ?? 10,
            weightUsed: 20 + (i % 6) * 5,
          },
        });
      }
    }
  }

  // ---------- Diet plans (10) + meals + food logs ----------
  {
    const dietTypes = ['VEGETARIAN', 'NON_VEGETARIAN', 'VEGAN', 'KETO'];
    const count = await prisma.dietPlan.count({ where: { tenantId } });
    for (let i = count + 1; i <= TARGET; i++) {
      const member = pick(members, i + 3);
      const isAi = i % 2 === 0;
      const cal = 1800 + (i % 5) * 200;
      const plan = await prisma.dietPlan.create({
        data: {
          tenantId, memberId: member.id,
          name: `${pick(dietTypes, i)} Plan ${i}`, description: `Demo ${cal} kcal ${pick(dietTypes, i).toLowerCase()} plan.`,
          dailyCalories: cal, proteinGrams: Math.round(cal * 0.3 / 4), carbsGrams: Math.round(cal * 0.45 / 4), fatsGrams: Math.round(cal * 0.25 / 9), fiberGrams: 30,
          dietType: pick(dietTypes, i), status: pick(['ACTIVE', 'ACTIVE', 'DRAFT', 'COMPLETED'], i) as any,
          isAiGenerated: isAi, approvedBy: isAi ? adminUser?.id : null, approvedAt: isAi ? daysAgo(10) : null,
          startDate: daysAgo(10), endDate: daysAhead(20),
        },
      });
      const meals: Array<[string, string, number]> = [
        ['BREAKFAST', 'Oats + milk tea + banana', 420],
        ['LUNCH', 'Dal bhat with saag and chicken curry', 750],
        ['AFTERNOON_SNACK', 'Chiura + chana', 280],
        ['DINNER', 'Roti, vegetables and dal', 550],
      ];
      for (let s = 0; s < meals.length; s++) {
        const [mealType, desc, kcal] = meals[s];
        await prisma.dietMeal.create({
          data: {
            tenantId, planId: plan.id, mealType: mealType as any, name: mealType.replace('_', ' '),
            description: desc,
            foodItems: [{ name: desc, quantity: '1 serving', calories: kcal }],
            totalCalories: kcal, totalProtein: Math.round(kcal * 0.25 / 4), totalCarbs: Math.round(kcal * 0.5 / 4), totalFats: Math.round(kcal * 0.25 / 9),
            sortOrder: s,
          },
        });
      }
    }

    const logCount = await prisma.foodLog.count({ where: { tenantId } });
    const dietPlans = await prisma.dietPlan.findMany({ where: { tenantId } });
    for (let i = logCount + 1; i <= TARGET; i++) {
      const plan = pick(dietPlans, i);
      await prisma.foodLog.create({
        data: {
          tenantId, memberId: plan.memberId, planId: plan.id,
          logDate: daysAgo(i % 7), mealType: pick(['BREAKFAST', 'LUNCH', 'DINNER', 'EVENING_SNACK'], i) as any,
          foodItems: [{ name: pick(['Dal Bhat', 'Momo (Chicken)', 'Roti', 'Chana (Chickpeas)'], i), quantity: '1 serving', calories: 350 + (i % 4) * 100 }],
          totalCalories: 350 + (i % 4) * 100, totalProtein: 15 + (i % 5) * 3, totalCarbs: 45 + (i % 4) * 10, totalFats: 10 + (i % 3) * 4,
          waterIntake: 1500 + (i % 5) * 250,
        },
      });
    }
  }

  // ---------- Body assessments (10) ----------
  {
    const count = await prisma.bodyAssessment.count({ where: { tenantId } });
    for (let i = count + 1; i <= TARGET; i++) {
      const member = pick(members, i);
      const weight = 60 + (i % 20);
      await prisma.bodyAssessment.create({
        data: {
          tenantId, memberId: member.id,
          assessmentType: pick(['INITIAL', 'PERIODIC', 'PERIODIC', 'FINAL'], i) as any,
          assessedAt: daysAgo(i * 7),
          weight, height: 160 + (i % 20), bmi: Math.round((weight / Math.pow((160 + (i % 20)) / 100, 2)) * 100) / 100,
          bodyFatPercent: 15 + (i % 12), muscleMass: 28 + (i % 10),
          waist: 75 + (i % 15), chest: 90 + (i % 12), hips: 92 + (i % 10),
          restingHeartRate: 60 + (i % 20), bloodPressure: '120/80',
          fitnessLevel: pick(['BEGINNER', 'INTERMEDIATE', 'ADVANCED'], i),
          goalType: pick(['WEIGHT_LOSS', 'MUSCLE_GAIN', 'ENDURANCE', 'GENERAL_FITNESS'], i),
          targetWeight: weight - 4, assessedBy: adminUser?.id,
        },
      });
    }
  }

  // ---------- Trainer messages (10) ----------
  {
    const count = await prisma.trainerMessage.count({ where: { tenantId } });
    const need = await shortfall(count);
    const samples = [
      ['MEMBER', 'Hi coach, can we reschedule my session to tomorrow?'],
      ['TRAINER', 'Sure, tomorrow 7 AM works. Bring your logbook.'],
      ['MEMBER', 'My knee felt a bit sore after leg day.'],
      ['TRAINER', 'Skip squats this week; we will do mobility work instead.'],
      ['MEMBER', 'What should I eat before morning cardio?'],
      ['TRAINER', 'A banana and black coffee 30 minutes before is enough.'],
      ['MEMBER', 'Hit a new deadlift PR today! 100kg!'],
      ['TRAINER', 'Excellent! Form video looked clean. Deload next week.'],
      ['MEMBER', 'Can you update my diet plan? I am travelling next week.'],
      ['TRAINER', 'Updated it with hotel-friendly meals. Check the app.'],
    ];
    for (let i = 0; i < need; i++) {
      const member = pick(members, Math.floor(i / 2));
      const [senderType, message] = samples[i % samples.length];
      await prisma.trainerMessage.create({
        data: {
          tenantId, memberId: member.id, trainerId: pick(trainers, Math.floor(i / 2))?.id,
          senderType, message, isRead: i % 3 !== 0, readAt: i % 3 !== 0 ? daysAgo(0) : null,
          createdAt: daysAgo(9 - (i % 10)),
        },
      });
    }
  }

  // ---------- Badges (top up to 10) + customer badges (10) ----------
  {
    const extraBadges = [
      { name: 'Class Regular', description: 'Attended 10 group classes', icon: '🧘', category: 'MILESTONE', points: 75 },
      { name: 'Night Owl', description: 'Checked in after 9 PM', icon: '🦉', category: 'ACHIEVEMENT', points: 25 },
      { name: 'Weight Warrior', description: 'Lost 5kg from initial assessment', icon: '⚖️', category: 'CHALLENGE', points: 250 },
      { name: 'Hydration Hero', description: 'Logged 3L water 7 days straight', icon: '💧', category: 'CHALLENGE', points: 40 },
    ];
    const count = await prisma.badge.count({ where: { tenantId } });
    const need = await shortfall(count);
    for (let i = 0; i < need && i < extraBadges.length; i++) {
      const b = extraBadges[i];
      const exists = await prisma.badge.findFirst({ where: { tenantId, name: b.name } });
      if (!exists) {
        await prisma.badge.create({ data: { tenantId, name: b.name, description: b.description, icon: b.icon, category: b.category as any, criteria: {}, points: b.points } });
      }
    }
    const badges = await prisma.badge.findMany({ where: { tenantId } });
    const cbCount = await prisma.customerBadge.count({ where: { tenantId } });
    let created = cbCount;
    outer: for (const member of members) {
      for (const badge of badges) {
        if (created >= TARGET) break outer;
        const exists = await prisma.customerBadge.findUnique({ where: { memberId_badgeId: { memberId: member.id, badgeId: badge.id } } });
        if (exists) continue;
        await prisma.customerBadge.create({ data: { tenantId, memberId: member.id, badgeId: badge.id, earnedAt: daysAgo(created) } });
        created++;
      }
    }
  }

  // ---------- Referrals (10) ----------
  {
    const count = await prisma.referral.count({ where: { tenantId } });
    for (let i = count + 1; i <= TARGET; i++) {
      const code = `VRFIT-REF-${String(i).padStart(4, '0')}`;
      const exists = await prisma.referral.findUnique({ where: { referralCode: code } });
      if (exists) continue;
      const status = pick(['PENDING', 'ACCEPTED', 'COMPLETED', 'EXPIRED'], i);
      await prisma.referral.create({
        data: {
          tenantId, referrerId: pick(members, i).id,
          refereeId: status === 'COMPLETED' ? pick(members, i + 5).id : null,
          referralCode: code, refereeEmail: `friend${i}@example.com`,
          status: status as any, rewardType: pick(['DISCOUNT', 'FREE_DAYS', 'CASHBACK'], i),
          rewardValue: pick([500, 7, 300], i),
          completedAt: status === 'COMPLETED' ? daysAgo(i) : null, expiresAt: daysAhead(30),
        },
      });
    }
  }

  // ---------- Equipment (10) + maintenance logs (10) ----------
  {
    const defs: Array<[string, string, string]> = [
      ['Treadmill T-2000', 'CARDIO', 'LifeFitness'], ['Spin Bike Pro', 'CARDIO', 'Keiser'],
      ['Rowing Machine', 'CARDIO', 'Concept2'], ['Smith Machine', 'MACHINES', 'Hammer Strength'],
      ['Lat Pulldown Station', 'MACHINES', 'Technogym'], ['Olympic Barbell 20kg', 'FREE_WEIGHTS', 'Rogue'],
      ['Dumbbell Set 5-50kg', 'FREE_WEIGHTS', 'Rogue'], ['Adjustable Bench', 'STRENGTH', 'Rep Fitness'],
      ['Power Rack', 'STRENGTH', 'Rogue'], ['Kettlebell Set', 'FREE_WEIGHTS', 'Onnit'],
      ['Battle Ropes', 'ACCESSORIES', 'Generic'], ['Yoga Mat Pack', 'ACCESSORIES', 'Liforme'],
    ];
    const count = await prisma.equipment.count({ where: { tenantId } });
    const need = await shortfall(count);
    for (let i = 0; i < need && i < defs.length; i++) {
      const [name, category, brand] = defs[i];
      const exists = await prisma.equipment.findFirst({ where: { tenantId, name } });
      if (exists) continue;
      await prisma.equipment.create({
        data: {
          tenantId, branchId: branch?.id, name, category, brand,
          model: `${brand}-${100 + i}`, serialNumber: `SN-VRF-${1000 + i}`,
          quantity: category === 'FREE_WEIGHTS' || category === 'ACCESSORIES' ? 5 : 1,
          condition: pick(['NEW', 'GOOD', 'GOOD', 'FAIR', 'NEEDS_REPAIR'], i),
          purchaseDate: daysAgo(200 + i * 10), purchaseCost: 50000 + i * 15000,
          warrantyUntil: daysAhead(365 - i * 10),
          lastMaintenance: daysAgo(30 + i), nextMaintenance: daysAhead(60 - i),
        },
      });
    }
    const equipment = await prisma.equipment.findMany({ where: { tenantId } });
    const mCount = await prisma.equipmentMaintenance.count({ where: { tenantId } });
    const mNeed = await shortfall(mCount);
    for (let i = 0; i < mNeed; i++) {
      const eq = pick(equipment, i);
      await prisma.equipmentMaintenance.create({
        data: {
          tenantId, equipmentId: eq.id,
          maintenanceType: pick(['ROUTINE', 'REPAIR', 'INSPECTION'], i),
          description: pick(['Belt lubrication and calibration', 'Replaced worn cable', 'Quarterly safety inspection'], i),
          cost: 500 + (i % 5) * 500, performedBy: 'FitService Nepal',
          performedAt: daysAgo(20 + i * 5), nextService: daysAhead(70 + i * 5),
        },
      });
    }
  }

  // ---------- Attendance / check-ins (10) ----------
  if (branch) {
    const count = await prisma.attendance.count({ where: { tenantId } });
    const need = await shortfall(count);
    for (let i = 0; i < need; i++) {
      const member = pick(members, i);
      const checkIn = daysAgo(i % 7);
      checkIn.setHours(6 + (i % 14), 15, 0, 0);
      const out = i % 3 !== 0;
      await prisma.attendance.create({
        data: {
          tenantId, branchId: branch.id,
          userId: member.userId ?? adminUser?.id ?? 'system',
          memberId: member.id, membershipId: membershipFor(member.id)?.id,
          type: 'MEMBER_CHECKIN', method: pick(['QR_CODE', 'QR_CODE', 'MANUAL'], i) as any,
          checkInTime: checkIn,
          checkOutTime: out ? new Date(checkIn.getTime() + (60 + (i % 4) * 15) * 60000) : null,
          duration: out ? 60 + (i % 4) * 15 : null,
        },
      });
    }
  }

  // ---------- Legacy Workout + TrainingSession (10 each) ----------
  {
    const wCount = await prisma.workout.count({ where: { tenantId } });
    for (let i = wCount + 1; i <= TARGET; i++) {
      const member = pick(members, i);
      await prisma.workout.create({
        data: {
          tenantId, memberId: member.id,
          name: `Quick Workout ${i}`, description: 'Legacy demo workout entry.',
          exercises: [{ name: 'Push-ups', sets: 3, reps: 15 }, { name: 'Squats', sets: 3, reps: 20 }],
          scheduledDate: daysAhead(i % 7), completed: i % 2 === 0,
        },
      });
    }
    const sCount = await prisma.trainingSession.count({ where: { tenantId } });
    for (let i = sCount + 1; i <= TARGET; i++) {
      const at = daysAhead(i % 10 - 5);
      at.setHours(7 + (i % 10), 0, 0, 0);
      await prisma.trainingSession.create({
        data: {
          tenantId, memberId: pick(members, i).id, trainerId: pick(trainers, i).id,
          scheduledAt: at, duration: 60,
          status: at < new Date() ? pick(['COMPLETED', 'COMPLETED', 'NO_SHOW'], i) as any : 'SCHEDULED',
          notes: 'Personal training session (demo).',
        },
      });
    }
  }

  // ---------- Payment gateway: eSewa sandbox (public UAT credentials) ----------
  await prisma.paymentProvider.upsert({
    where: { tenantId_type: { tenantId, type: 'ESEWA' } },
    update: {},
    create: {
      tenantId,
      name: 'eSewa (Sandbox)',
      type: 'ESEWA',
      status: 'ACTIVE',
      isDefault: true,
      credentials: { merchantId: 'EPAYTEST', secretKey: '8gBm/:&EnhH.1/q' },
      config: { sandbox: true },
      supportedCurrencies: ['NPR'],
    },
  });

  // ---------- Biometric attendance: a demo ZKTeco device ----------
  const branchForDevice = branch;
  if (branchForDevice) {
    const hasDevice = await prisma.attendanceDevice.findFirst({ where: { tenantId } });
    if (!hasDevice) {
      await prisma.attendanceDevice.create({
        data: {
          tenantId, branchId: branchForDevice.id,
          name: 'Main Door K40', ip: '192.168.1.201', port: 4370,
          model: 'K40', timeoutSec: 10, lastStatus: 'NEVER',
        },
      });
    }
    // Map members to device uids 1..N so mock pulls resolve to real members.
    for (let i = 0; i < members.length; i++) {
      if (!(members[i] as any).deviceUserId) {
        await prisma.member.update({ where: { id: members[i].id }, data: { deviceUserId: String(i + 1) } });
      }
    }
  }

  console.log('    done — all fitness tables topped up to ≥10 rows');
}

if (require.main === module) {
  seed06FitnessFullDemo()
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); process.exit(1); });
}
