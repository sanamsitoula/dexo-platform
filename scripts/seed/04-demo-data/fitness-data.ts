/**
 * Dexo v5 - 04: FITNESS demo data
 * Members, classes, invoices, attendance (sample).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seed04FitnessData() {
  console.log('  → 04-demo-data/fitness-data');
  const tenant = await prisma.tenant.findUnique({ where: { subdomain: 'vrfitness' } });
  if (!tenant) return;
  const fy = await prisma.fiscalYear.findFirst({ where: { tenantId: tenant.id } });
  if (!fy) { console.log('    no fiscal year for tenant, skipping'); return; }

  // ---- Nepali food database (global) for the calorie tracker ----
  const foods: Array<{ name: string; nameNepali: string; category: string; servingSize: string; calories: number; protein: number; carbs: number; fats: number; isVegetarian?: boolean; isTraditional?: boolean; region?: string }> = [
    { name: 'Dal Bhat', nameNepali: 'दाल भात', category: 'STAPLE', servingSize: '1 plate', calories: 550, protein: 18, carbs: 95, fats: 8, isTraditional: true, region: 'GENERAL' },
    { name: 'Plain Rice', nameNepali: 'भात', category: 'STAPLE', servingSize: '1 cup', calories: 205, protein: 4, carbs: 45, fats: 0.4 },
    { name: 'Roti', nameNepali: 'रोटी', category: 'STAPLE', servingSize: '1 piece', calories: 120, protein: 3, carbs: 20, fats: 3 },
    { name: 'Dhido', nameNepali: 'ढिँडो', category: 'STAPLE', servingSize: '1 serving', calories: 180, protein: 4, carbs: 38, fats: 1, isTraditional: true, region: 'HILL' },
    { name: 'Momo (Veg)', nameNepali: 'तरकारी मम', category: 'SNACK', servingSize: '10 pieces', calories: 350, protein: 10, carbs: 45, fats: 12, isTraditional: true },
    { name: 'Momo (Chicken)', nameNepali: 'कुखुरा मम', category: 'PROTEIN', servingSize: '10 pieces', calories: 420, protein: 24, carbs: 42, fats: 16, isVegetarian: false, isTraditional: true },
    { name: 'Chicken Curry', nameNepali: 'कुखुराको मासु', category: 'PROTEIN', servingSize: '1 bowl', calories: 300, protein: 27, carbs: 8, fats: 18, isVegetarian: false },
    { name: 'Sel Roti', nameNepali: 'सेल रोटी', category: 'SNACK', servingSize: '1 piece', calories: 200, protein: 3, carbs: 32, fats: 7, isTraditional: true },
    { name: 'Gundruk', nameNepali: 'गुन्द्रुक', category: 'VEGETABLE', servingSize: '1 bowl', calories: 60, protein: 4, carbs: 9, fats: 1, isTraditional: true },
    { name: 'Aloo Tama', nameNepali: 'आलु तामा', category: 'VEGETABLE', servingSize: '1 bowl', calories: 150, protein: 5, carbs: 24, fats: 4, isTraditional: true },
    { name: 'Saag', nameNepali: 'साग', category: 'VEGETABLE', servingSize: '1 bowl', calories: 80, protein: 4, carbs: 8, fats: 4 },
    { name: 'Chana (Chickpeas)', nameNepali: 'चना', category: 'PROTEIN', servingSize: '1 cup', calories: 269, protein: 15, carbs: 45, fats: 4 },
    { name: 'Boiled Egg', nameNepali: 'उमालेको अण्डा', category: 'PROTEIN', servingSize: '1 egg', calories: 78, protein: 6, carbs: 0.6, fats: 5, isVegetarian: false },
    { name: 'Chiura (Beaten Rice)', nameNepali: 'चिउरा', category: 'STAPLE', servingSize: '1 cup', calories: 110, protein: 2, carbs: 25, fats: 0.5 },
    { name: 'Milk Tea', nameNepali: 'दूध चिया', category: 'BEVERAGE', servingSize: '1 cup', calories: 90, protein: 3, carbs: 12, fats: 3 },
    { name: 'Lassi', nameNepali: 'लस्सी', category: 'BEVERAGE', servingSize: '1 glass', calories: 180, protein: 6, carbs: 28, fats: 5 },
    { name: 'Banana', nameNepali: 'केरा', category: 'FRUIT', servingSize: '1 medium', calories: 105, protein: 1, carbs: 27, fats: 0.4, isVegan: true } as any,
    { name: 'Apple', nameNepali: 'स्याउ', category: 'FRUIT', servingSize: '1 medium', calories: 95, protein: 0.5, carbs: 25, fats: 0.3 },
    { name: 'Buff Sekuwa', nameNepali: 'सेकुवा', category: 'PROTEIN', servingSize: '1 plate', calories: 380, protein: 30, carbs: 4, fats: 26, isVegetarian: false, isTraditional: true },
    { name: 'Yomari', nameNepali: 'यःमरि', category: 'SNACK', servingSize: '1 piece', calories: 160, protein: 3, carbs: 30, fats: 3, isTraditional: true, region: 'NEWARI' },
  ];
  const foodCount = await prisma.nepaliFoodItem.count();
  if (foodCount === 0) {
    for (const f of foods) {
      await prisma.nepaliFoodItem.create({
        data: {
          name: f.name, nameNepali: f.nameNepali, category: f.category, servingSize: f.servingSize,
          calories: f.calories, protein: f.protein, carbs: f.carbs, fats: f.fats,
          isVegetarian: f.isVegetarian ?? true, isTraditional: f.isTraditional ?? false, region: f.region,
        },
      });
    }
    console.log(`    seeded ${foods.length} Nepali food items`);
  }

  const memberTemplate = (i: number) => ({
    tenantId: tenant.id,
    email: `member${i}@vrfitness.com`,
    firstName: `Member${i}`,
    lastName: 'Demo',
    passwordHash: '$2a$10$placeholderplaceholderplaceholderplaceholderplaceholder',
    emailVerified: true,
  });

  for (let i = 3; i <= 10; i++) {
    await prisma.user.upsert({
      where: { email: `member${i}@vrfitness.com` },
      update: {},
      create: memberTemplate(i),
    });
  }

  // ---- Membership plans (needed by the public landing page, onboarding & app) ----
  const planDefs = [
    { name: 'Basic Monthly', type: 'MONTHLY' as const, durationDays: 30, priceNpr: 2000, includesTrainer: false, includesClasses: false, includesDietPlan: false, accessHours: '6AM-10PM', sortOrder: 1, description: 'Gym floor access during staffed hours.' },
    { name: 'Standard Quarterly', type: 'QUARTERLY' as const, durationDays: 90, priceNpr: 5500, includesTrainer: false, includesClasses: true, includesDietPlan: false, accessHours: '6AM-10PM', sortOrder: 2, description: 'Gym + all group classes. Best value for regulars.' },
    { name: 'Premium Yearly', type: 'YEARLY' as const, durationDays: 365, priceNpr: 18000, includesTrainer: true, includesClasses: true, includesDietPlan: true, includesLocker: true, accessHours: '24/7', branchAccess: 'all', sortOrder: 3, description: 'Everything: personal trainer, classes, diet plan, locker, all branches.' },
  ];
  const vat = 13;
  const withVat = (p: number) => Math.round(p * (1 + vat / 100) * 100) / 100;
  for (const d of planDefs) {
    const exists = await prisma.membershipPlan.findFirst({ where: { tenantId: tenant.id, name: d.name } });
    if (!exists) {
      await prisma.membershipPlan.create({
        data: {
          tenantId: tenant.id,
          name: d.name,
          description: d.description,
          type: d.type,
          durationDays: d.durationDays,
          priceNpr: d.priceNpr,
          vatPercent: vat,
          totalWithVat: withVat(d.priceNpr),
          includesTrainer: d.includesTrainer,
          includesClasses: d.includesClasses,
          includesDietPlan: d.includesDietPlan,
          includesLocker: (d as any).includesLocker ?? false,
          accessHours: d.accessHours,
          branchAccess: (d as any).branchAccess ?? 'single',
          sortOrder: d.sortOrder,
        },
      });
    }
  }
  const plans = await prisma.membershipPlan.findMany({ where: { tenantId: tenant.id }, orderBy: { sortOrder: 'asc' } });

  // ---- Member profiles + active memberships for the demo member users ----
  const hqBranch = await prisma.branch.findFirst({ where: { tenantId: tenant.id }, orderBy: { isHeadquarters: 'desc' } });
  const memberUsers = await prisma.user.findMany({ where: { tenantId: tenant.id, email: { contains: '@vrfitness.com' } } });
  let mIdx = 0;
  for (const u of memberUsers) {
    const plan = plans[mIdx % Math.max(1, plans.length)];
    mIdx++;
    let member = await prisma.member.findFirst({ where: { tenantId: tenant.id, userId: u.id } });
    if (!member) {
      member = await prisma.member.create({
        data: {
          tenantId: tenant.id,
          userId: u.id,
          branchId: hqBranch?.id,
          membershipType: 'MONTHLY',
          startDate: new Date(),
          status: 'ACTIVE',
          isVerified: true,
          height: 165 + (mIdx % 20),
          weight: 60 + (mIdx % 25),
          goals: ['WEIGHT_LOSS', 'MUSCLE_GAIN', 'GENERAL_FITNESS'][mIdx % 3],
        },
      });
    }
    if (plan) {
      const hasMembership = await prisma.membership.findFirst({ where: { tenantId: tenant.id, memberId: member.id } });
      if (!hasMembership) {
        const start = new Date();
        const end = new Date(start.getTime() + plan.durationDays * 86400000);
        await prisma.membership.create({
          data: {
            tenantId: tenant.id,
            memberId: member.id,
            planId: plan.id,
            startDate: start,
            endDate: end,
            amountPaid: plan.totalWithVat,
            paymentMethod: 'Cash',
            status: 'ACTIVE',
            qrCode: `FITNEPAL-DEMO-${member.id.slice(0, 8).toUpperCase()}`,
          },
        });
      }
    }
  }

  // Ensure customer records exist for invoices
  for (let i = 1; i <= 10; i++) {
    const email = `member${i}@vrfitness.com`;
    const existing = await prisma.customer.findFirst({ where: { tenantId: tenant.id, email } });
    if (!existing) {
      await prisma.customer.create({
        data: {
          tenant: { connect: { id: tenant.id } },
          name: `Member${i} Demo`,
          email,
        } as any,
      });
    }
  }
  const memberCustomers = await prisma.customer.findMany({ where: { tenantId: tenant.id, email: { contains: '@vrfitness.com' } } });

  for (let i = 0; i < 15; i++) {
    const amount = 2500 + (i % 5) * 1000;
    const status = i % 3 === 0 ? 'PAID' : i % 3 === 1 ? 'PENDING' : 'OVERDUE';
    const memberIdx = i % Math.max(1, memberCustomers.length);
    const cust = memberCustomers[memberIdx];
    await prisma.invoice.create({
      data: {
        tenant: { connect: { id: tenant.id } },
        invoiceNumber: `INV-${Date.now()}-${i}`,
        invoiceType: 'STANDARD',
        invoiceDate: new Date(Date.now() - i * 86400000 * 7),
        subtotal: amount,
        taxableAmount: amount,
        vatAmount: amount * 0.13,
        totalAmount: amount * 1.13,
        paymentStatus: status as any,
        dueDate: new Date(Date.now() + (15 - i) * 86400000),
        createdBy: 'system',
        fiscalYear: { connect: { id: fy!.id } },
        customer: cust ? { connect: { id: cust.id } } : { create: { tenant: { connect: { id: tenant.id } }, name: `Member${(i % 8) + 1} Demo`, email: `member${(i % 8) + 1}@vrfitness.com` } as any },
      } as any,
    });
  }
  console.log('    done');
}

if (require.main === module) {
  seed04FitnessData()
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); process.exit(1); });
}
