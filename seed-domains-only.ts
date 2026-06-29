import { PrismaClient, DomainType } from '@prisma/client'

const prisma = new PrismaClient()

const DOMAINS = [
  { code: DomainType.FITNESS_CENTER, name: 'Fitness Center', description: 'Gym and fitness center management with memberships, trainers, and workout tracking', theme: 'fitness-pro' },
  { code: DomainType.SALON_AND_SPA, name: 'Salon & Spa', description: 'Beauty salon and wellness services with appointments and customer loyalty', theme: 'beauty-salon' },
  { code: DomainType.SCHOOL_AND_EDUCATION, name: 'School & Education', description: 'Educational institution management with students, classes, exams, and fees', theme: 'edu-smart' },
  { code: DomainType.COACHING_INSTITUTE, name: 'Coaching Institute', description: 'Educational coaching centers with batch management and online classes', theme: 'coach-academy' },
  { code: DomainType.RESTAURANT_AND_CAFE, name: 'Restaurant & Cafe', description: 'Food service management with POS, kitchen, and reservations', theme: 'foodie-hub' },
  { code: DomainType.HOTEL_AND_HOSPITALITY, name: 'Hotel & Hospitality', description: 'Hotel and accommodation management with bookings and housekeeping', theme: 'stay-hotel' },
  { code: DomainType.HEALTHCARE_CLINIC, name: 'Healthcare Clinic', description: 'Medical clinic management with patients, doctors, and prescriptions', theme: 'medic-health' },
  { code: DomainType.ECOMMERCE, name: 'Ecommerce', description: 'Online store management with products, orders, and shipping', theme: 'shop-commerce' },
  { code: DomainType.LOGISTICS_AND_DELIVERY, name: 'Logistics & Delivery', description: 'Shipping and delivery management with tracking and fleet management', theme: 'logi-track' },
  { code: DomainType.TAILOR_SHOP, name: 'Tailor Shop', description: 'Custom tailoring business with measurements, fabrics, and order tracking', theme: 'style-tailor' },
  { code: DomainType.NGO, name: 'NGO', description: 'Non-profit organization management with donors, programs, and beneficiaries', theme: 'care-nonprofit' },
  { code: DomainType.SME_CORPORATE, name: 'SME Corporate', description: 'Corporate and SME management with HR, finance, and projects', theme: 'biz-corporate' },
]

const MODULES_BY_DOMAIN: Record<string, Array<{ code: string; name: string; description: string; category: string; route: string; isCore: boolean; sortOrder: number }>> = {
  FITNESS_CENTER: [
    { code: 'fitness_members', name: 'Members', description: 'Manage gym members and profiles', category: 'MEMBERS', route: '/members', isCore: true, sortOrder: 1 },
    { code: 'trainer_management', name: 'Trainers', description: 'Manage trainer schedules and assignments', category: 'OPERATIONS', route: '/trainers', isCore: true, sortOrder: 2 },
    { code: 'attendance', name: 'Attendance', description: 'Track member and trainer attendance', category: 'OPERATIONS', route: '/attendance', isCore: true, sortOrder: 3 },
    { code: 'workout_programs', name: 'Workout Programs', description: 'Design and assign workout programs', category: 'MEMBERS', route: '/workouts', isCore: true, sortOrder: 4 },
    { code: 'nutrition_plans', name: 'Nutrition Plans', description: 'Create and assign nutrition plans', category: 'MEMBERS', route: '/nutrition', isCore: false, sortOrder: 5 },
    { code: 'membership_billing', name: 'Membership Billing', description: 'Handle membership subscriptions and renewals', category: 'FINANCE', route: '/membership-billing', isCore: true, sortOrder: 6 },
  ],
  SALON_AND_SPA: [
    { code: 'appointments', name: 'Appointments', description: 'Manage salon appointments and bookings', category: 'OPERATIONS', route: '/appointments', isCore: true, sortOrder: 1 },
    { code: 'service_catalog', name: 'Services', description: 'Manage service catalog and pricing', category: 'CATALOG', route: '/services', isCore: true, sortOrder: 2 },
    { code: 'stylists', name: 'Stylists', description: 'Manage stylist profiles and schedules', category: 'OPERATIONS', route: '/stylists', isCore: true, sortOrder: 3 },
    { code: 'customers', name: 'Customers', description: 'Customer relationship management', category: 'CRM', route: '/customers', isCore: true, sortOrder: 4 },
    { code: 'loyalty', name: 'Loyalty Program', description: 'Loyalty points and rewards', category: 'CRM', route: '/loyalty', isCore: false, sortOrder: 5 },
    { code: 'pos', name: 'POS', description: 'Point of sale system', category: 'FINANCE', route: '/pos', isCore: true, sortOrder: 6 },
  ],
  SCHOOL_AND_EDUCATION: [
    { code: 'students', name: 'Students', description: 'Student enrollment and profiles', category: 'MEMBERS', route: '/students', isCore: true, sortOrder: 1 },
    { code: 'teachers', name: 'Teachers', description: 'Teacher management', category: 'OPERATIONS', route: '/teachers', isCore: true, sortOrder: 2 },
    { code: 'classes', name: 'Classes', description: 'Class and section management', category: 'OPERATIONS', route: '/classes', isCore: true, sortOrder: 3 },
    { code: 'exams', name: 'Exams', description: 'Exam scheduling and grading', category: 'OPERATIONS', route: '/exams', isCore: true, sortOrder: 4 },
    { code: 'fees', name: 'Fee Management', description: 'Fee collection and receipts', category: 'FINANCE', route: '/fees', isCore: true, sortOrder: 5 },
  ],
  RESTAURANT_AND_CAFE: [
    { code: 'menu', name: 'Menu', description: 'Menu items and categories', category: 'CATALOG', route: '/menu', isCore: true, sortOrder: 1 },
    { code: 'orders', name: 'Orders', description: 'Order management', category: 'OPERATIONS', route: '/orders', isCore: true, sortOrder: 2 },
    { code: 'tables', name: 'Tables', description: 'Table management and reservations', category: 'OPERATIONS', route: '/tables', isCore: true, sortOrder: 3 },
    { code: 'kitchen', name: 'Kitchen Display', description: 'Kitchen order tickets', category: 'OPERATIONS', route: '/kitchen', isCore: true, sortOrder: 4 },
    { code: 'inventory', name: 'Inventory', description: 'Stock and ingredient management', category: 'OPERATIONS', route: '/inventory', isCore: false, sortOrder: 5 },
    { code: 'pos', name: 'POS', description: 'Point of sale', category: 'FINANCE', route: '/pos', isCore: true, sortOrder: 6 },
  ],
  ECOMMERCE: [
    { code: 'products', name: 'Products', description: 'Product catalog', category: 'CATALOG', route: '/products', isCore: true, sortOrder: 1 },
    { code: 'orders', name: 'Orders', description: 'Order management', category: 'OPERATIONS', route: '/orders', isCore: true, sortOrder: 2 },
    { code: 'inventory', name: 'Inventory', description: 'Stock management', category: 'OPERATIONS', route: '/inventory', isCore: true, sortOrder: 3 },
    { code: 'shipping', name: 'Shipping', description: 'Shipping and delivery', category: 'OPERATIONS', route: '/shipping', isCore: true, sortOrder: 4 },
    { code: 'reviews', name: 'Reviews', description: 'Customer reviews', category: 'CRM', route: '/reviews', isCore: false, sortOrder: 5 },
  ],
  TAILOR_SHOP: [
    { code: 'measurements', name: 'Measurements', description: 'Customer measurement profiles', category: 'MEMBERS', route: '/measurements', isCore: true, sortOrder: 1 },
    { code: 'fabrics', name: 'Fabrics', description: 'Fabric inventory', category: 'CATALOG', route: '/fabrics', isCore: true, sortOrder: 2 },
    { code: 'orders', name: 'Orders', description: 'Custom order management', category: 'OPERATIONS', route: '/orders', isCore: true, sortOrder: 3 },
    { code: 'production', name: 'Production Tracking', description: 'Track order production', category: 'OPERATIONS', route: '/production', isCore: true, sortOrder: 4 },
  ],
}

const DEFAULT_ROLES = [
  { code: 'OWNER', name: 'Owner', description: 'Full system access', sortOrder: 1, isDefault: true },
  { code: 'MANAGER', name: 'Manager', description: 'Manage daily operations', sortOrder: 2, isDefault: false },
  { code: 'STAFF', name: 'Staff', description: 'Staff member access', sortOrder: 3, isDefault: false },
  { code: 'CUSTOMER', name: 'Customer', description: 'Customer portal access', sortOrder: 4, isDefault: false },
]

async function main() {
  console.log('🌱 Seeding 12 industry domains with modules & roles...\n')

  for (const d of DOMAINS) {
    const domain = await prisma.domain.upsert({
      where: { code: d.code },
      update: { name: d.name, description: d.description, theme: d.theme, isActive: true },
      create: {
        code: d.code,
        name: d.name,
        description: d.description,
        theme: d.theme,
        isActive: true,
        modulesEnabled: [],
      },
    })
    console.log(`✅ ${domain.name} (${domain.code})`)

    // Seed modules
    const modules = MODULES_BY_DOMAIN[d.code] || []
    for (const m of modules) {
      await prisma.domainModule.upsert({
        where: { code: m.code },
        update: { name: m.name, description: m.description, category: m.category, route: m.route, isCore: m.isCore, sortOrder: m.sortOrder, domainId: domain.id },
        create: { ...m, domainId: domain.id },
      })
    }
    console.log(`   📦 ${modules.length} modules`)

    // Seed roles
    for (const r of DEFAULT_ROLES) {
      await prisma.domainRole.upsert({
        where: { domainId_code: { domainId: domain.id, code: r.code } },
        update: { name: r.name, description: r.description, sortOrder: r.sortOrder, isDefault: r.isDefault },
        create: { ...r, domainId: domain.id },
      })
    }
    console.log(`   👥 ${DEFAULT_ROLES.length} roles`)
  }

  console.log('\n✅ Domain seeding complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
