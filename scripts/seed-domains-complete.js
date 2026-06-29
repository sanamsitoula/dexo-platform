import { PrismaClient } from '@prisma/client';
import domainsData from '../seed-domains.js';

const prisma = new PrismaClient();

async function seedDomains() {
  console.log('Seeding domains (fresh)...');

  console.log('🧹 Clearing old domain data...');
  const deletedTenantDomains = await prisma.tenantDomain.deleteMany({});
  const deletedDomainMenus = await prisma.domainMenu.deleteMany({});
  const deletedDomainWidgets = await prisma.domainWidget.deleteMany({});
  const deletedDomainThemes = await prisma.domainTheme.deleteMany({});
  const deletedDomainPermissions = await prisma.domainPermission.deleteMany({});
  const deletedDomainRoles = await prisma.domainRole.deleteMany({});
  const deletedDomainModules = await prisma.domainModule.deleteMany({});
  const deletedDomains = await prisma.domain.deleteMany({});
  console.log(`  ✓ Removed ${deletedDomains.count} domains, ${deletedDomainModules.count} modules, ${deletedDomainRoles.count} roles, ${deletedDomainMenus.count} menus, ${deletedDomainWidgets.count} widgets, ${deletedDomainThemes.count} themes, ${deletedDomainPermissions.count} permissions`);

  // Create all domains
  const domains = await Promise.all(
    domainsData.domains.map(async (domain) => {
      return prisma.domain.create({
        data: {
          name: domain.name,
          code: domain.code,
          description: `Domain for ${domain.name}`, // Add actual descriptions
          modulesEnabled: domain.modulesEnabled,
          theme: domain.theme,
          isActive: true,
        },
      });
    })
  );

  console.log(`✅ Created ${domains.length} domains`);

  // For each domain, create modules
  const domainModules = [];
  for (const domain of domains) {
    const modules = await createDomainModules(domain);
    domainModules.push(...modules);
  }

  // For each domain, create roles
  const domainRoles = [];
  for (const domain of domains) {
    const roles = await createDomainRoles(domain);
    domainRoles.push(...roles);
  }

  // For each domain, create permissions
  for (const domain of domains) {
    const domainRoles = await createDomainPermissions(domain);
  }

  // For each domain, create menus
  for (const domain of domains) {
    await createDomainMenus(domain);
  }

  // For each domain, create widgets
  for (const domain of domains) {
    await createDomainWidgets(domain);
  }

  // For each domain, create theme
  for (const domain of domains) {
    await createDomainTheme(domain);
  }

  console.log('✅ Domain seeding complete!');
}

async function createDomainModules(domain) {
  const moduleConfigs = getDomainModuleConfig(domain.code);
  const modules = [];

  for (const config of moduleConfigs) {
    try {
      const module = await prisma.domainModule.create({
        data: {
          domain: { connect: { id: domain.id } },
          code: config.code,
          name: config.name,
          description: config.description,
          category: config.category,
          icon: config.icon,
          route: config.route,
          isCore: config.isCore,
          sortOrder: config.sortOrder,
        },
      });
      modules.push(module);
    } catch (e) {
      if (e.code === 'P2002') {
        const existing = await prisma.domainModule.findUnique({ where: { code: config.code } });
        if (existing) modules.push(existing);
      } else throw e;
    }
  }

  return modules;
}

function getDomainModuleConfig(domainCode) {
  const domainConfigs = {
    FITNESS_CENTER: [
      { code: "fitness_members", name: "Members", description: "Manage fitness center members and profiles", category: "MEMBERS", icon: "users", route: "/members", isCore: true, sortOrder: 1 },
      { code: "fitness_trainers", name: "Trainers", description: "Manage fitness trainers and their schedules", category: "MEMBERS", icon: "user-check", route: "/trainers", isCore: true, sortOrder: 2 },
      { code: "workout_programs", name: "Workout Programs", description: "Create and manage workout programs", category: "PROGRAMS", icon: "dumbbell", route: "/programs", isCore: true, sortOrder: 3 },
      { code: "nutrition_plans", name: "Nutrition Plans", description: "Manage nutrition and meal plans", category: "NUTRITION", icon: "apple", route: "/nutrition", isCore: true, sortOrder: 4 },
      { code: "attendance", name: "Attendance", description: "Track attendance and check-ins", category: "OPERATIONS", icon: "calendar", route: "/attendance", isCore: true, sortOrder: 5 },
      { code: "progress_tracking", name: "Progress Tracking", description: "Monitor member progress and milestones", category: "TRACKING", icon: "trending-up", route: "/progress", isCore: true, sortOrder: 6 },
      { code: "measurements", name: "Measurements", description: "Track body measurements and composition", category: "TRACKING", icon: "activity", route: "/measurements", isCore: true, sortOrder: 7 },
      { code: "class_scheduling", name: "Class Scheduling", description: "Schedule group classes and sessions", category: "OPERATIONS", icon: "clock", route: "/classes", isCore: true, sortOrder: 8 },
      { code: "membership_packages", name: "Membership Packages", description: "Manage membership plans and pricing", category: "FINANCE", icon: "credit-card", route: "/packages", isCore: true, sortOrder: 9 },
      { code: "pos_fitness", name: "POS Fitness", description: "Point of sale for fitness center", category: "FINANCE", icon: "store", route: "/pos", isCore: true, sortOrder: 10 },
      { code: "fitness_crm", name: "Fitness CRM", description: "Customer relationship management", category: "CRM", icon: "users", route: "/crm", isCore: true, sortOrder: 11 },
      { code: "supplements", name: "Supplements", description: "Manage supplement inventory", category: "INVENTORY", icon: "package", route: "/supplements", isCore: false, sortOrder: 12 },
      { code: "fitness_assessments", name: "Body Assessments", description: "Track BMI, body fat, and health metrics", category: "TRACKING", icon: "heart", route: "/assessments", isCore: true, sortOrder: 13 },
      { code: "fitness_workout_logs", name: "Workout Logs", description: "Daily exercise logging with sets, reps, weights", category: "TRACKING", icon: "clipboard", route: "/workout-logs", isCore: true, sortOrder: 14 },
      { code: "fitness_diet_logs", name: "Diet & Food Logs", description: "Daily food intake with Nepali food database", category: "NUTRITION", icon: "utensils", route: "/diet-logs", isCore: true, sortOrder: 15 },
      { code: "fitness_nepali_food", name: "Nepali Food Database", description: "Local food items with calorie data (dal-bhat, momo, roti)", category: "NUTRITION", icon: "book-open", route: "/nepali-foods", isCore: false, sortOrder: 16 },
      { code: "fitness_classes", name: "Group Classes", description: "Yoga, Zumba, CrossFit, HIIT class booking", category: "OPERATIONS", icon: "users", route: "/fitness-classes", isCore: true, sortOrder: 17 },
      { code: "fitness_badges", name: "Badges & Achievements", description: "Streak, milestone and achievement gamification", category: "GAMIFICATION", icon: "award", route: "/badges", isCore: false, sortOrder: 18 },
      { code: "fitness_referrals", name: "Referral Program", description: "Member referral codes with NPR discount rewards", category: "GROWTH", icon: "share", route: "/referrals", isCore: false, sortOrder: 19 },
      { code: "fitness_equipment", name: "Equipment Inventory", description: "Gym equipment tracking and maintenance", category: "INVENTORY", icon: "tool", route: "/equipment", isCore: false, sortOrder: 20 },
      { code: "fitness_checkin", name: "QR Check-in", description: "Member QR code check-in for attendance", category: "OPERATIONS", icon: "qr-code", route: "/checkin", isCore: true, sortOrder: 21 },
      { code: "fitness_freeze", name: "Membership Freeze", description: "Pause membership during Dashain/Tihar/travel", category: "MEMBERSHIP", icon: "pause", route: "/memberships/freeze", isCore: false, sortOrder: 22 },
    ],

    SALON_AND_SPA: [
      { code: "salon_appointments", name: "Appointments", description: "Manage salon appointments and bookings", category: "APPOINTMENTS", icon: "calendar", route: "/appointments", isCore: true, sortOrder: 1 },
      { code: "service_catalog", name: "Service Catalog", description: "Define and manage services offered", category: "CATALOG", icon: "scissors", route: "/services", isCore: true, sortOrder: 2 },
      { code: "packages", name: "Packages", description: "Create service packages and bundles", category: "PACKAGES", icon: "gift", route: "/packages", isCore: true, sortOrder: 3 },
      { code: "customer_history", name: "Customer History", description: "View customer history and preferences", category: "CRM", icon: "user", route: "/customers/history", isCore: true, sortOrder: 4 },
      { code: "membership", name: "Membership", description: "Manage loyalty and membership programs", category: "MEMBERSHIP", icon: "star", route: "/membership", isCore: true, sortOrder: 5 },
      { code: "gift_cards", name: "Gift Cards", description: "Manage and track gift cards", category: "SALES", icon: "gift", route: "/gift-cards", isCore: true, sortOrder: 6 },
      { code: "beauty_crm", name: "Beauty CRM", description: "Customer relationship management", category: "CRM", icon: "users", route: "/crm", isCore: true, sortOrder: 7 },
      { code: "inventory", name: "Inventory", description: "Manage products and inventory", category: "INVENTORY", icon: "package", route: "/inventory", isCore: true, sortOrder: 8 },
      { code: "loyalty_program", name: "Loyalty Program", description: "Manage customer loyalty points", category: "MEMBERSHIP", icon: "heart", route: "/loyalty", isCore: false, sortOrder: 9 },
    ],

    SCHOOL_AND_EDUCATION: [
      { code: "students", name: "Students", description: "Manage student records and profiles", category: "STUDENTS", icon: "graduation-cap", route: "/students", isCore: true, sortOrder: 1 },
      { code: "teachers", name: "Teachers", description: "Manage teaching staff and schedules", category: "STAFF", icon: "user-minus", route: "/teachers", isCore: true, sortOrder: 2 },
      { code: "classes", name: "Classes", description: "Manage classes and sections", category: "ACADEMICS", icon: "book-open", route: "/classes", isCore: true, sortOrder: 3 },
      { code: "attendance", name: "Attendance", description: "Track student and teacher attendance", category: "OPERATIONS", icon: "check-circle", route: "/attendance", isCore: true, sortOrder: 4 },
      { code: "examinations", name: "Examinations", description: "Manage exams and results", category: "ACADEMICS", icon: "file-text", route: "/exams", isCore: true, sortOrder: 5 },
      { code: "grading", name: "Grading", description: "Grade assignments and exams", category: "ACADEMICS", icon: "edit", route: "/grading", isCore: true, sortOrder: 6 },
      { code: "timetable", name: "Timetable", description: "Manage class timetables", category: "OPERATIONS", icon: "clock", route: "/timetable", isCore: true, sortOrder: 7 },
      { code: "parent_portal", name: "Parent Portal", description: "Parent access to student information", category: "COMMUNICATION", icon: "message-square", route: "/parent-portal", isCore: true, sortOrder: 8 },
      { code: "library", name: "Library", description: "Manage library books and loans", category: "LIBRARY", icon: "book", route: "/library", isCore: true, sortOrder: 9 },
      { code: "assignments", name: "Assignments", description: "Create and manage assignments", category: "ACADEMICS", icon: "clipboard", route: "/assignments", isCore: true, sortOrder: 10 },
      { code: "finance_school", name: "Finance", description: "Manage school finances and fees", category: "FINANCE", icon: "dollar-sign", route: "/finance", isCore: true, sortOrder: 11 },
      { code: "transport", name: "Transport", description: "Manage school transportation", category: "OPERATIONS", icon: "truck", route: "/transport", isCore: false, sortOrder: 12 },
    ],

    COACHING_INSTITUTE: [
      { code: "students", name: "Students", description: "Manage coaching institute students", category: "STUDENTS", icon: "graduation-cap", route: "/students", isCore: true, sortOrder: 1 },
      { code: "batches", name: "Batches", description: "Manage student batches and groups", category: "BATCHES", icon: "users", route: "/batches", isCore: true, sortOrder: 2 },
      { code: "courses", name: "Courses", description: "Define and manage courses", category: "COURSES", icon: "book", route: "/courses", isCore: true, sortOrder: 3 },
      { code: "attendance", name: "Attendance", description: "Track batch attendance", category: "OPERATIONS", icon: "check-circle", route: "/attendance", isCore: true, sortOrder: 4 },
      { code: "mock_tests", name: "Mock Tests", description: "Create and manage mock tests", category: "EXAMS", icon: "file", route: "/mock-tests", isCore: true, sortOrder: 5 },
      { code: "results", name: "Results", description: "View and publish results", category: "ACADEMICS", icon: "award", route: "/results", isCore: true, sortOrder: 6 },
      { code: "faculty", name: "Faculty", description: "Manage faculty members", category: "STAFF", icon: "user-plus", route: "/faculty", isCore: true, sortOrder: 7 },
      { code: "fee_management", name: "Fee Management", description: "Manage fees and payments", category: "FINANCE", icon: "credit-card", route: "/fees", isCore: true, sortOrder: 8 },
      { code: "scholarship", name: "Scholarship", description: "Manage scholarships and discounts", category: "FINANCE", icon: "award", route: "/scholarships", isCore: false, sortOrder: 9 },
    ],

    RESTAURANT_AND_CAFE: [
      { code: "pos_restaurant", name: "POS Restaurant", description: "Point of sale system for restaurant", category: "POS", icon: "credit-card", route: "/pos", isCore: true, sortOrder: 1 },
      { code: "orders", name: "Orders", description: "Manage customer orders and requests", category: "ORDERS", icon: "shopping-cart", route: "/orders", isCore: true, sortOrder: 2 },
      { code: "kitchen", name: "Kitchen", description: "Kitchen order management", category: "KITCHEN", icon: "chef-hat", route: "/kitchen", isCore: true, sortOrder: 3 },
      { code: "tables", name: "Tables", description: "Manage restaurant tables", category: "OPERATIONS", icon: "table", route: "/tables", isCore: true, sortOrder: 4 },
      { code: "menu", name: "Menu", description: "Manage food and drink menu", category: "MENU", icon: "book", route: "/menu", isCore: true, sortOrder: 5 },
      { code: "reservations", name: "Reservations", description: "Manage table reservations", category: "RESERVATIONS", icon: "calendar", route: "/reservations", isCore: true, sortOrder: 6 },
      { code: "inventory", name: "Inventory", description: "Manage food and drink inventory", category: "INVENTORY", icon: "package", route: "/inventory", isCore: true, sortOrder: 7 },
      { code: "delivery", name: "Delivery", description: "Manage delivery orders", category: "DELIVERY", icon: "truck", route: "/delivery", isCore: true, sortOrder: 8 },
      { code: "crm_restaurant", name: "CRM", description: "Customer relationship management", category: "CRM", icon: "users", route: "/crm", isCore: true, sortOrder: 9 },
      { code: "loyalty", name: "Loyalty", description: "Customer loyalty program", category: "LOYALTY", icon: "heart", route: "/loyalty", isCore: true, sortOrder: 10 },
    ],

    HOTEL_AND_HOSPITALITY: [
      { code: "room_management", name: "Room Management", description: "Manage hotel rooms and room types", category: "ROOMS", icon: "home", route: "/rooms", isCore: true, sortOrder: 1 },
      { code: "reservations", name: "Reservations", description: "Manage booking reservations", category: "RESERVATIONS", icon: "calendar", route: "/reservations", isCore: true, sortOrder: 2 },
      { code: "housekeeping", name: "Housekeeping", description: "Manage housekeeping services", category: "OPERATIONS", icon: "cleaning", route: "/housekeeping", isCore: true, sortOrder: 3 },
      { code: "guests", name: "Guests", description: "Manage guest profiles and records", category: "GUESTS", icon: "user", route: "/guests", isCore: true, sortOrder: 4 },
      { code: "billing", name: "Billing", description: "Manage hotel billing and invoicing", category: "FINANCE", icon: "file-text", route: "/billing", isCore: true, sortOrder: 5 },
      { code: "crm_hospitality", name: "CRM", description: "Hotel customer relationship management", category: "CRM", icon: "users", route: "/crm", isCore: true, sortOrder: 6 },
      { code: "amenities", name: "Amenities", description: "Manage hotel amenities and services", category: "SERVICES", icon: "star", route: "/amenities", isCore: false, sortOrder: 7 },
      { code: "facilities", name: "Facilities", description: "Manage hotel facilities", category: "FACILITIES", icon: "building", route: "/facilities", isCore: false, sortOrder: 8 },
    ],

    HEALTHCARE_CLINIC: [
      { code: "patients", name: "Patients", description: "Manage patient records and profiles", category: "PATIENTS", icon: "user-plus", route: "/patients", isCore: true, sortOrder: 1 },
      { code: "doctors", name: "Doctors", description: "Manage doctor profiles and schedules", category: "STAFF", icon: "user-minus", route: "/doctors", isCore: true, sortOrder: 2 },
      { code: "appointments", name: "Appointments", description: "Manage patient appointments", category: "APPOINTMENTS", icon: "calendar", route: "/appointments", isCore: true, sortOrder: 3 },
      { code: "medical_records", name: "Medical Records", description: "Manage medical history and records", category: "MEDICAL", icon: "file-text", route: "/medical-records", isCore: true, sortOrder: 4 },
      { code: "prescriptions", name: "Prescriptions", description: "Manage prescriptions and medications", category: "MEDICAL", icon: "prescription", route: "/prescriptions", isCore: true, sortOrder: 5 },
      { code: "billing", name: "Billing", description: "Manage clinic billing", category: "FINANCE", icon: "dollar-sign", route: "/billing", isCore: true, sortOrder: 6 },
      { code: "lab_reports", name: "Lab Reports", description: "Manage laboratory test reports", category: "LAB", icon: "test-tube", route: "/lab-reports", isCore: true, sortOrder: 7 },
      { code: "telemedicine", name: "Telemedicine", description: "Manage video consultations", category: "TELEMEDICINE", icon: "video", route: "/telemedicine", isCore: false, sortOrder: 8 },
      { code: "health_insurance", name: "Health Insurance", description: "Manage insurance billing", category: "FINANCE", icon: "shield", route: "/insurance", isCore: false, sortOrder: 9 },
    ],

    ECOMMERCE: [
      { code: "products", name: "Products", description: "Manage products and inventory", category: "CATALOG", icon: "package", route: "/products", isCore: true, sortOrder: 1 },
      { code: "categories", name: "Categories", description: "Organize products into categories", category: "CATALOG", icon: "folder", route: "/categories", isCore: true, sortOrder: 2 },
      { code: "orders", name: "Orders", description: "Manage customer orders", category: "ORDERS", icon: "shopping-cart", route: "/orders", isCore: true, sortOrder: 3 },
      { code: "inventory", name: "Inventory", description: "Track product inventory", category: "INVENTORY", icon: "box", route: "/inventory", isCore: true, sortOrder: 4 },
      { code: "shipping", name: "Shipping", description: "Manage shipping and delivery", category: "SHIPPING", icon: "truck", route: "/shipping", isCore: true, sortOrder: 5 },
      { code: "coupons", name: "Coupons", description: "Manage discount coupons", category: "MARKETING", icon: "percent", route: "/coupons", isCore: true, sortOrder: 6 },
      { code: "crm_ecommerce", name: "CRM", description: "Customer relationship management", category: "CRM", icon: "users", route: "/crm", isCore: true, sortOrder: 7 },
      { code: "reviews", name: "Reviews", description: "Manage product reviews", category: "MARKETING", icon: "star", route: "/reviews", isCore: true, sortOrder: 8 },
      { code: "marketing", name: "Marketing", description: "Manage marketing campaigns", category: "MARKETING", icon: "megaphone", route: "/marketing", isCore: true, sortOrder: 9 },
      { code: "returns", name: "Returns", description: "Manage product returns", category: "ORDERS", icon: "arrow-left", route: "/returns", isCore: false, sortOrder: 10 },
      { code: "analytics_ecommerce", name: "Analytics", description: "Ecommerce analytics and reports", category: "ANALYTICS", icon: "bar-chart", route: "/analytics", isCore: false, sortOrder: 11 },
    ],

    LOGISTICS_AND_DELIVERY: [
      { code: "shipments", name: "Shipments", description: "Manage shipment tracking and documentation", category: "SHIPMENTS", icon: "package", route: "/shipments", isCore: true, sortOrder: 1 },
      { code: "fleet", name: "Fleet", description: "Manage vehicle fleet and assignments", category: "FLEET", icon: "truck", route: "/fleet", isCore: true, sortOrder: 2 },
      { code: "drivers", name: "Drivers", description: "Manage delivery drivers", category: "DRIVERS", icon: "user-check", route: "/drivers", isCore: true, sortOrder: 3 },
      { code: "routes", name: "Routes", description: "Plan and optimize delivery routes", category: "OPERATIONS", icon: "map", route: "/routes", isCore: true, sortOrder: 4 },
      { code: "tracking", name: "Tracking", description: "Customer shipment tracking portal", category: "TRACKING", icon: "track", route: "/tracking", isCore: true, sortOrder: 5 },
      { code: "warehouses", name: "Warehouses", description: "Manage warehouse facilities", category: "WAREHOUSES", icon: "warehouse", route: "/warehouses", isCore: true, sortOrder: 6 },
      { code: "crm_logistics", name: "CRM", description: "Customer relationship management", category: "CRM", icon: "users", route: "/crm", isCore: true, sortOrder: 7 },
      { code: "fuel_management", name: "Fuel Management", description: "Track fuel consumption and costs", category: "OPERATIONS", icon: "gas-pump", route: "/fuel", isCore: false, sortOrder: 8 },
      { code: "maintenance", name: "Maintenance", description: "Manage vehicle maintenance", category: "FLEET", icon: "tool", route: "/maintenance", isCore: false, sortOrder: 9 },
    ],

    TAILOR_SHOP: [
      { code: "customers", name: "Customers", description: "Manage customer profiles and orders", category: "CUSTOMERS", icon: "users", route: "/customers", isCore: true, sortOrder: 1 },
      { code: "measurements", name: "Measurements", description: "Store and manage customer measurements", category: "MEASUREMENTS", icon: "ruler", route: "/measurements", isCore: true, sortOrder: 2 },
      { code: "orders", name: "Orders", description: "Manage custom tailoring orders", category: "ORDERS", icon: "shopping-cart", route: "/orders", isCore: true, sortOrder: 3 },
      { code: "fabrics", name: "Fabrics", description: "Manage fabric inventory and catalog", category: "MATERIALS", icon: "package", route: "/fabrics", isCore: true, sortOrder: 4 },
      { code: "production_workflow", name: "Production Workflow", description: "Manage tailoring production process", category: "WORKFLOW", icon: "settings", route: "/production", isCore: true, sortOrder: 5 },
      { code: "patterns", name: "Patterns", description: "Manage dress patterns and templates", category: "DESIGN", icon: "edit", route: "/patterns", isCore: true, sortOrder: 6 },
      { code: "inventory_tails", name: "Inventory", description: "Manage completed garments inventory", category: "INVENTORY", icon: "box", route: "/inventory", isCore: true, sortOrder: 7 },
    ],

    NGO: [
      { code: "donors", name: "Donors", description: "Manage donor profiles and contributions", category: "DONORS", icon: "heart", route: "/donors", isCore: true, sortOrder: 1 },
      { code: "campaigns", name: "Campaigns", description: "Create and manage fundraising campaigns", category: "CAMPAIGNS", icon: "megaphone", route: "/campaigns", isCore: true, sortOrder: 2 },
      { code: "projects", name: "Projects", description: "Manage NGO projects and initiatives", category: "PROJECTS", icon: "target", route: "/projects", isCore: true, sortOrder: 3 },
      { code: "volunteers", name: "Volunteers", description: "Manage volunteer recruitment and assignments", category: "VOLUNTEERS", icon: "user-plus", route: "/volunteers", isCore: true, sortOrder: 4 },
      { code: "events", name: "Events", description: "Organize and manage events", category: "EVENTS", icon: "calendar", route: "/events", isCore: true, sortOrder: 5 },
      { code: "grants", name: "Grants", description: "Manage grant applications and tracking", category: "FINANCE", icon: "file-text", route: "/grants", isCore: true, sortOrder: 6 },
      { code: "reporting", name: "Reporting", description: "Generate NGO impact reports", category: "REPORTING", icon: "bar-chart", route: "/reports", isCore: true, sortOrder: 7 },
      { code: "fundraising", name: "Fundraising", description: "Manage fundraising activities", category: "FUNDRAISING", icon: "piggy-bank", route: "/fundraising", isCore: false, sortOrder: 8 },
    ],

    SME_CORPORATE: [
      { code: "crm_sme", name: "CRM", description: "Customer relationship management", category: "CRM", icon: "users", route: "/crm", isCore: true, sortOrder: 1 },
      { code: "hr", name: "HR", description: "Human resource management", category: "HR", icon: "users", route: "/hr", isCore: true, sortOrder: 2 },
      { code: "projects", name: "Projects", description: "Project management and tracking", category: "PROJECTS", icon: "briefcase", route: "/projects", isCore: true, sortOrder: 3 },
      { code: "finance_corporate", name: "Finance", description: "Corporate financial management", category: "FINANCE", icon: "dollar-sign", route: "/finance", isCore: true, sortOrder: 4 },
      { code: "payroll", name: "Payroll", description: "Employee payroll management", category: "HR", icon: "credit-card", route: "/payroll", isCore: true, sortOrder: 5 },
      { code: "procurement", name: "Procurement", description: "Vendor and purchase management", category: "PROCUREMENT", icon: "shopping-cart", route: "/procurement", isCore: true, sortOrder: 6 },
      { code: "assets", name: "Assets", description: "Asset management and tracking", category: "ASSETS", icon: "box", route: "/assets", isCore: true, sortOrder: 7 },
      { code: "documents", name: "Documents", description: "Document management and storage", category: "DOCUMENTS", icon: "file-text", route: "/documents", isCore: true, sortOrder: 8 },
      { code: "workflow", name: "Workflow", description: "Business process automation", category: "WORKFLOW", icon: "settings", route: "/workflow", isCore: true, sortOrder: 9 },
      { code: "analytics_corporate", name: "Analytics", description: "Business analytics and reporting", category: "ANALYTICS", icon: "bar-chart", route: "/analytics", isCore: false, sortOrder: 10 },
      { code: "bp_automation", name: "Business Process Automation", description: "Automate business processes", category: "AUTOMATION", icon: "cpu", route: "/automation", isCore: false, sortOrder: 11 },
    ],

    COACHING_INSTITUTE: [
      { code: "students", name: "Students", description: "Manage coaching institute students", category: "STUDENTS", icon: "graduation-cap", route: "/students", isCore: true, sortOrder: 1 },
      { code: "batches", name: "Batches", description: "Manage student batches and groups", category: "BATCHES", icon: "users", route: "/batches", isCore: true, sortOrder: 2 },
      { code: "courses", name: "Courses", description: "Define and manage courses", category: "COURSES", icon: "book", route: "/courses", isCore: true, sortOrder: 3 },
      { code: "attendance", name: "Attendance", description: "Track batch attendance", category: "OPERATIONS", icon: "check-circle", route: "/attendance", isCore: true, sortOrder: 4 },
      { code: "mock_tests", name: "Mock Tests", description: "Create and manage mock tests", category: "EXAMS", icon: "file", route: "/mock-tests", isCore: true, sortOrder: 5 },
      { code: "results", name: "Results", description: "View and publish results", category: "ACADEMICS", icon: "award", route: "/results", isCore: true, sortOrder: 6 },
      { code: "faculty", name: "Faculty", description: "Manage faculty members", category: "STAFF", icon: "user-plus", route: "/faculty", isCore: true, sortOrder: 7 },
      { code: "fee_management", name: "Fee Management", description: "Manage fees and payments", category: "FINANCE", icon: "credit-card", route: "/fees", isCore: true, sortOrder: 8 },
      { code: "scholarship", name: "Scholarship", description: "Manage scholarships and discounts", category: "FINANCE", icon: "award", route: "/scholarships", isCore: false, sortOrder: 9 },
    ],

    // Additional domains if needed
  };

  return domainConfigs[domainCode];
}

async function createDomainRoles(domain) {
  const domainRoles = getDomainRoleConfig(domain.code);
  const roles = [];

  for (const config of domainRoles) {
    const role = await prisma.domainRole.create({
      data: {
        domain: { connect: { id: domain.id } },
        name: config.name,
        code: config.code,
        description: config.description,
        isDefault: config.isDefault,
        sortOrder: config.sortOrder,
      },
    });

    roles.push(role);
  }

  return roles;
}

function getDomainRoleConfig(domainCode) {
  const roleConfigs = {
    FITNESS_CENTER: [
      { name: "Owner", code: "owner", description: "Full platform access for fitness center owner", isDefault: false, sortOrder: 1 },
      { name: "Manager", code: "manager", description: "Manage all aspects of fitness center", isDefault: false, sortOrder: 2 },
      { name: "Trainer", code: "trainer", description: "Manage clients, workouts, and attendance", isDefault: false, sortOrder: 3 },
      { name: "Nutritionist", code: "nutritionist", description: "Manage nutrition plans and meal planning", isDefault: false, sortOrder: 4 },
      { name: "Receptionist", code: "receptionist", description: "Handle member check-in/check-out and basic operations", isDefault: false, sortOrder: 5 },
      { name: "Member", code: "member", description: "Access to personal workout and nutrition plans", isDefault: true, sortOrder: 6 },
    ],

    SALON_AND_SPA: [
      { name: "Owner", code: "owner", description: "Full platform access for salon owner", isDefault: false, sortOrder: 1 },
      { name: "Manager", code: "manager", description: "Manage all salon operations and staff", isDefault: false, sortOrder: 2 },
      { name: "Stylist", code: "stylist", description: "Manage appointments and client services", isDefault: false, sortOrder: 3 },
      { name: "Receptionist", code: "receptionist", description: "Handle appointments and customer check-in", isDefault: false, sortOrder: 4 },
      { name: "Customer", code: "customer", description: "Book appointments and manage profile", isDefault: true, sortOrder: 5 },
    ],

    SCHOOL_AND_EDUCATION: [
      { name: "Principal", code: "principal", description: "Full administrative access", isDefault: false, sortOrder: 1 },
      { name: "Admin", code: "admin", description: "Administrative staff with broad access", isDefault: false, sortOrder: 2 },
      { name: "Teacher", code: "teacher", description: "Manage classes, students, and assignments", isDefault: true, sortOrder: 3 },
      { name: "Student", code: "student", description: "Access to classes and assignments", isDefault: true, sortOrder: 4 },
      { name: "Parent", code: "parent", description: "Access to child's academic performance", isDefault: false, sortOrder: 5 },
      { name: "Accountant", code: "accountant", description: "Manage financial records and fees", isDefault: false, sortOrder: 6 },
    ],

    COACHING_INSTITUTE: [
      { name: "Director", code: "director", description: "Full operational control", isDefault: false, sortOrder: 1 },
      { name: "Faculty", code: "faculty", description: "Teach students and manage classes", isDefault: false, sortOrder: 2 },
      { name: "Counselor", code: "counselor", description: "Guide students and provide support", isDefault: false, sortOrder: 3 },
      { name: "Student", code: "student", description: "Access classes and results", isDefault: true, sortOrder: 4 },
    ],

    RESTAURANT_AND_CAFE: [
      { name: "Owner", code: "owner", description: "Full restaurant operation control", isDefault: false, sortOrder: 1 },
      { name: "Manager", code: "manager", description: "Manage daily operations", isDefault: false, sortOrder: 2 },
      { name: "Chef", code: "chef", description: "Manage kitchen operations and recipes", isDefault: false, sortOrder: 3 },
      { name: "Cashier", code: "cashier", description: "Handle payments and orders", isDefault: false, sortOrder: 4 },
      { name: "Waiter", code: "waiter", description: "Take orders and serve customers", isDefault: false, sortOrder: 5 },
      { name: "Customer", code: "customer", description: "Place orders and make reservations", isDefault: true, sortOrder: 6 },
    ],

    HOTEL_AND_HOSPITALITY: [
      { name: "Owner", code: "owner", description: "Full hotel operation control", isDefault: false, sortOrder: 1 },
      { name: "Manager", code: "manager", description: "Manage hotel operations", isDefault: false, sortOrder: 2 },
      { name: "Receptionist", code: "receptionist", description: "Handle check-in and check-out", isDefault: false, sortOrder: 3 },
      { name: "Housekeeping", code: "housekeeping", description: "Manage housekeeping services", isDefault: false, sortOrder: 4 },
      { name: "Guest", code: "guest", description: "Make reservations and access services", isDefault: true, sortOrder: 5 },
    ],

    HEALTHCARE_CLINIC: [
      { name: "Admin", code: "admin", description: "Administrative control", isDefault: false, sortOrder: 1 },
      { name: "Doctor", code: "doctor", description: "Manage patient care and medical records", isDefault: true, sortOrder: 2 },
      { name: "Nurse", code: "nurse", description: "Assist in patient care", isDefault: false, sortOrder: 3 },
      { name: "Receptionist", code: "receptionist", description: "Handle appointments and check-in", isDefault: false, sortOrder: 4 },
      { name: "Patient", code: "patient", description: "Access medical records and book appointments", isDefault: true, sortOrder: 5 },
    ],

    ECOMMERCE: [
      { name: "Owner", code: "owner", description: "Full e-commerce operation control", isDefault: false, sortOrder: 1 },
      { name: "Manager", code: "manager", description: "Manage operations and staff", isDefault: false, sortOrder: 2 },
      { name: "Warehouse", code: "warehouse", description: "Manage inventory and shipping", isDefault: false, sortOrder: 3 },
      { name: "Customer Support", code: "customer_support", description: "Handle customer inquiries and support", isDefault: false, sortOrder: 4 },
      { name: "Customer", code: "customer", description: "Browse and purchase products", isDefault: true, sortOrder: 5 },
    ],

    LOGISTICS_AND_DELIVERY: [
      { name: "Owner", code: "owner", description: "Full logistics control", isDefault: false, sortOrder: 1 },
      { name: "Dispatcher", code: "dispatcher", description: "Manage routes and shipments", isDefault: false, sortOrder: 2 },
      { name: "Driver", code: "driver", description: "Handle deliveries and tracking", isDefault: false, sortOrder: 3 },
      { name: "Warehouse Staff", code: "warehouse_staff", description: "Manage warehouse operations", isDefault: false, sortOrder: 4 },
    ],

    TAILOR_SHOP: [
      { name: "Owner", code: "owner", description: "Full tailoring shop control", isDefault: false, sortOrder: 1 },
      { name: "Tailor", code: "tailor", description: "Create and manage custom garments", isDefault: false, sortOrder: 2 },
      { name: "Designer", code: "designer", description: "Create designs and patterns", isDefault: false, sortOrder: 3 },
      { name: "Receptionist", code: "receptionist", description: "Handle customer orders and measurements", isDefault: false, sortOrder: 4 },
    ],

    NGO: [
      { name: "Director", code: "director", description: "Full organizational control", isDefault: false, sortOrder: 1 },
      { name: "Coordinator", code: "coordinator", description: "Manage programs and volunteers", isDefault: false, sortOrder: 2 },
      { name: "Volunteer", code: "volunteer", description: "Participate in activities and events", isDefault: false, sortOrder: 3 },
      { name: "Donor", code: "donor", description: "Contribute and track donations", isDefault: true, sortOrder: 4 },
    ],

    SME_CORPORATE: [
      { name: "CEO", code: "ceo", description: "Executive leadership and control", isDefault: false, sortOrder: 1 },
      { name: "Manager", code: "manager", description: "Department and team management", isDefault: false, sortOrder: 2 },
      { name: "HR", code: "hr", description: "Human resource management", isDefault: false, sortOrder: 3 },
      { name: "Employee", code: "employee", description: "Employee access to company systems", isDefault: true, sortOrder: 4 },
    ],

    SCHOOL_AND_EDUCATION: [
      { name: "Principal", code: "principal", description: "Full administrative control", isDefault: false, sortOrder: 1 },
      { name: "Admin", code: "admin", description: "Administrative staff", isDefault: false, sortOrder: 2 },
      { name: "Teacher", code: "teacher", description: "Manage classes and assignments", isDefault: true, sortOrder: 3 },
      { name: "Student", code: "student", description: "Access academic materials", isDefault: true, sortOrder: 4 },
      { name: "Parent", code: "parent", description: "Access child's academic information", isDefault: false, sortOrder: 5 },
      { name: "Accountant", code: "accountant", description: "Handle financial records", isDefault: false, sortOrder: 6 },
    ],
  };

  return roleConfigs[domainCode] || [];
}

async function createDomainPermissions(domain) {
  const domainRoles = await prisma.domainRole.findMany({
    where: { domainId: domain.id },
  });

  const domainModules = await prisma.domainModule.findMany({
    where: { domainId: domain.id },
  });

  const permissions = [];

  for (const role of domainRoles) {
    for (const module of domainModules) {
      const actions = role.code === "admin" || role.code === "owner" || role.code === "principal" || role.code === "director" || role.code === "ceo" || role.code === "manager" || role.code === "dispatcher" || role.code === "driver" ? 
        ["view", "create", "edit", "delete", "manage"] : 
        ["view"];

      for (const action of actions) {
        const permission = await prisma.domainPermission.create({
          data: {
            domain: { connect: { id: domain.id } },
            module: { connect: { id: module.id } },
            role: { connect: { id: role.id } },
            action: action,
          },
        });

        permissions.push(permission);
      }
    }
  }

  return permissions;
}

async function createDomainMenus(domain) {
  const domainRoles = await prisma.domainRole.findMany({
    where: { domainId: domain.id },
  });

  const domainModules = await prisma.domainModule.findMany({
    where: { domainId: domain.id },
  });

  for (const role of domainRoles) {
    const menuConfigs = getDomainMenuConfig(domain.code, role.code);

    for (const config of menuConfigs) {
      const module = await prisma.domainModule.findFirst({
        where: { domainId: domain.id, code: config.moduleCode },
      });

      if (!module) continue;

      const parent = config.parentCode ? 
        await prisma.domainMenu.findFirst({
          where: {
            domainId: domain.id,
            code: config.parentCode,
          },
        }) : null;

      try {
        await prisma.domainMenu.create({
          data: {
            domain: { connect: { id: domain.id } },
            parent: parent ? { connect: { id: parent.id } } : undefined,
            code: config.code,
            label: config.label,
            icon: config.icon,
            route: config.route,
            module: { connect: { id: module.id } },
            role: role ? { connect: { id: role.id } } : undefined,
            sortOrder: config.sortOrder,
            isPublic: config.isPublic || false,
            isVisible: config.isVisible || true,
            requiredPlan: config.requiredPlan,
          },
        });
      } catch (e) {
        if (e.code !== 'P2002') throw e;
      }
    }
  }
}

function getDomainMenuConfig(domainCode, roleCode) {
  const menuConfigs = {
    FITNESS_CENTER: {
      owner: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "fitness_members", sortOrder: 1, isPublic: false },
        { code: "members", label: "Members", icon: "users", route: "/members", moduleCode: "fitness_members", sortOrder: 2, isPublic: false },
        { code: "trainers", label: "Trainers", icon: "user-check", route: "/trainers", moduleCode: "fitness_trainers", sortOrder: 3, isPublic: false },
        { code: "programs", label: "Programs", icon: "dumbbell", route: "/programs", moduleCode: "workout_programs", sortOrder: 4, isPublic: false },
        { code: "nutrition", label: "Nutrition", icon: "apple", route: "/nutrition", moduleCode: "nutrition_plans", sortOrder: 5, isPublic: false },
        { code: "attendance", label: "Attendance", icon: "calendar", route: "/attendance", moduleCode: "attendance", sortOrder: 6, isPublic: false },
        { code: "progress", label: "Progress", icon: "trending-up", route: "/progress", moduleCode: "progress_tracking", sortOrder: 7, isPublic: false },
        { code: "measurements", label: "Measurements", icon: "activity", route: "/measurements", moduleCode: "measurements", sortOrder: 8, isPublic: false },
        { code: "classes", label: "Classes", icon: "clock", route: "/classes", moduleCode: "class_scheduling", sortOrder: 9, isPublic: false },
        { code: "packages", label: "Packages", icon: "credit-card", route: "/packages", moduleCode: "membership_packages", sortOrder: 10, isPublic: false },
        { code: "pos", label: "POS", icon: "store", route: "/pos", moduleCode: "pos_fitness", sortOrder: 11, isPublic: false },
        { code: "supplements", label: "Supplements", icon: "package", route: "/supplements", moduleCode: "supplements", sortOrder: 12, isPublic: false },
        { code: "assessments", label: "Body Assessments", icon: "heart", route: "/assessments", moduleCode: "fitness_assessments", sortOrder: 13, isPublic: false },
        { code: "workout-logs", label: "Workout Logs", icon: "clipboard", route: "/workout-logs", moduleCode: "fitness_workout_logs", sortOrder: 14, isPublic: false },
        { code: "diet-logs", label: "Diet Logs", icon: "utensils", route: "/diet-logs", moduleCode: "fitness_diet_logs", sortOrder: 15, isPublic: false },
        { code: "fitness-classes", label: "Group Classes", icon: "users", route: "/fitness-classes", moduleCode: "fitness_classes", sortOrder: 16, isPublic: false },
        { code: "badges", label: "Badges", icon: "award", route: "/badges", moduleCode: "fitness_badges", sortOrder: 17, isPublic: false },
        { code: "referrals", label: "Referrals", icon: "share", route: "/referrals", moduleCode: "fitness_referrals", sortOrder: 18, isPublic: false },
        { code: "equipment", label: "Equipment", icon: "tool", route: "/equipment", moduleCode: "fitness_equipment", sortOrder: 19, isPublic: false },
        { code: "checkin", label: "QR Check-in", icon: "qr-code", route: "/checkin", moduleCode: "fitness_checkin", sortOrder: 20, isPublic: false },
      ],
      trainer: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "fitness_members", sortOrder: 1, isPublic: false },
        { code: "members", label: "Members", icon: "users", route: "/members", moduleCode: "fitness_members", sortOrder: 2, isPublic: false },
        { code: "attendance", label: "Attendance", icon: "calendar", route: "/attendance", moduleCode: "attendance", sortOrder: 3, isPublic: false },
        { code: "programs", label: "Programs", icon: "dumbbell", route: "/programs", moduleCode: "workout_programs", sortOrder: 4, isPublic: false },
        { code: "assessments", label: "Assessments", icon: "heart", route: "/assessments", moduleCode: "fitness_assessments", sortOrder: 5, isPublic: false },
        { code: "progress", label: "Progress", icon: "trending-up", route: "/progress", moduleCode: "progress_tracking", sortOrder: 6, isPublic: false },
        { code: "messages", label: "Messages", icon: "message-circle", route: "/messages", moduleCode: "fitness_members", sortOrder: 7, isPublic: false },
      ],
      member: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "fitness_members", sortOrder: 1, isPublic: false },
        { code: "workout", label: "Workout", icon: "dumbbell", route: "/workout", moduleCode: "workout_programs", sortOrder: 2, isPublic: false },
        { code: "workout-log", label: "Log Workout", icon: "clipboard", route: "/workout-log", moduleCode: "fitness_workout_logs", sortOrder: 3, isPublic: false },
        { code: "nutrition", label: "Nutrition", icon: "apple", route: "/nutrition", moduleCode: "nutrition_plans", sortOrder: 4, isPublic: false },
        { code: "diet-log", label: "Log Food", icon: "utensils", route: "/diet-log", moduleCode: "fitness_diet_logs", sortOrder: 5, isPublic: false },
        { code: "classes", label: "My Classes", icon: "calendar", route: "/my-classes", moduleCode: "fitness_classes", sortOrder: 6, isPublic: false },
        { code: "assessments", label: "My Measurements", icon: "heart", route: "/my-assessments", moduleCode: "fitness_assessments", sortOrder: 7, isPublic: false },
        { code: "progress", label: "Progress", icon: "trending-up", route: "/progress", moduleCode: "progress_tracking", sortOrder: 8, isPublic: false },
        { code: "badges", label: "My Badges", icon: "award", route: "/my-badges", moduleCode: "fitness_badges", sortOrder: 9, isPublic: false },
        { code: "referrals", label: "Refer Friends", icon: "share", route: "/referrals", moduleCode: "fitness_referrals", sortOrder: 10, isPublic: false },
        { code: "checkin", label: "Check-in", icon: "qr-code", route: "/checkin", moduleCode: "fitness_checkin", sortOrder: 11, isPublic: false },
        { code: "membership", label: "My Membership", icon: "credit-card", route: "/my-membership", moduleCode: "membership_packages", sortOrder: 12, isPublic: false },
      ],
    },

    SALON_AND_SPA: {
      owner: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "salon_appointments", sortOrder: 1 },
        { code: "appointments", label: "Appointments", icon: "calendar", route: "/appointments", moduleCode: "salon_appointments", sortOrder: 2 },
        { code: "services", label: "Services", icon: "scissors", route: "/services", moduleCode: "service_catalog", sortOrder: 3 },
        { code: "packages", label: "Packages", icon: "gift", route: "/packages", moduleCode: "packages", sortOrder: 4 },
        { code: "customers", label: "Customers", icon: "user", route: "/customers", moduleCode: "customer_history", sortOrder: 5 },
        { code: "membership", label: "Membership", icon: "star", route: "/membership", moduleCode: "membership", sortOrder: 6 },
        { code: "gift-cards", label: "Gift Cards", icon: "gift", route: "/gift-cards", moduleCode: "gift_cards", sortOrder: 7 },
        { code: "inventory", label: "Inventory", icon: "package", route: "/inventory", moduleCode: "inventory", sortOrder: 8 },
        { code: "loyalty", label: "Loyalty", icon: "heart", route: "/loyalty", moduleCode: "loyalty_program", sortOrder: 9 },
      ],
      stylist: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "salon_appointments", sortOrder: 1 },
        { code: "appointments", label: "Appointments", icon: "calendar", route: "/appointments", moduleCode: "salon_appointments", sortOrder: 2 },
        { code: "services", label: "Services", icon: "scissors", route: "/services", moduleCode: "service_catalog", sortOrder: 3 },
        { code: "customers", label: "Customers", icon: "user", route: "/customers", moduleCode: "customer_history", sortOrder: 4 },
      ],
      customer: [
        { code: "dashboard", label: "My Dashboard", icon: "home", route: "/dashboard", moduleCode: "salon_appointments", sortOrder: 1 },
        { code: "appointments", label: "My Appointments", icon: "calendar", route: "/appointments", moduleCode: "salon_appointments", sortOrder: 2 },
        { code: "services", label: "Services", icon: "scissors", route: "/services", moduleCode: "service_catalog", sortOrder: 3 },
        { code: "bookings", label: "My Bookings", icon: "shopping-cart", route: "/bookings", moduleCode: "salon_appointments", sortOrder: 4 },
      ],
    },

    SCHOOL_AND_EDUCATION: {
      principal: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "students", sortOrder: 1 },
        { code: "students", label: "Students", icon: "graduation-cap", route: "/students", moduleCode: "students", sortOrder: 2 },
        { code: "teachers", label: "Teachers", icon: "user-minus", route: "/teachers", moduleCode: "teachers", sortOrder: 3 },
        { code: "classes", label: "Classes", icon: "book-open", route: "/classes", moduleCode: "classes", sortOrder: 4 },
        { code: "attendance", label: "Attendance", icon: "check-circle", route: "/attendance", moduleCode: "attendance", sortOrder: 5 },
        { code: "exams", label: "Exams", icon: "file-text", route: "/exams", moduleCode: "examinations", sortOrder: 6 },
        { code: "grading", label: "Grading", icon: "edit", route: "/grading", moduleCode: "grading", sortOrder: 7 },
        { code: "timetable", label: "Timetable", icon: "clock", route: "/timetable", moduleCode: "timetable", sortOrder: 8 },
        { code: "parent-portal", label: "Parent Portal", icon: "message-square", route: "/parent-portal", moduleCode: "parent_portal", sortOrder: 9 },
        { code: "library", label: "Library", icon: "book", route: "/library", moduleCode: "library", sortOrder: 10 },
        { code: "finance", label: "Finance", icon: "dollar-sign", route: "/finance", moduleCode: "finance_school", sortOrder: 11 },
      ],
      teacher: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "classes", sortOrder: 1 },
        { code: "students", label: "My Students", icon: "graduation-cap", route: "/my-students", moduleCode: "students", sortOrder: 2 },
        { code: "attendance", label: "Attendance", icon: "check-circle", route: "/attendance", moduleCode: "attendance", sortOrder: 3 },
        { code: "assignments", label: "Assignments", icon: "clipboard", route: "/assignments", moduleCode: "assignments", sortOrder: 4 },
        { code: "grading", label: "Grading", icon: "edit", route: "/grading", moduleCode: "grading", sortOrder: 5 },
        { code: "timetable", label: "Timetable", icon: "clock", route: "/timetable", moduleCode: "timetable", sortOrder: 6 },
      ],
      student: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "students", sortOrder: 1 },
        { code: "subjects", label: "Subjects", icon: "book", route: "/subjects", moduleCode: "classes", sortOrder: 2 },
        { code: "attendance", label: "Attendance", icon: "check-circle", route: "/attendance", moduleCode: "attendance", sortOrder: 3 },
        { code: "assignments", label: "Assignments", icon: "clipboard", route: "/assignments", moduleCode: "assignments", sortOrder: 4 },
        { code: "exams", label: "Exams", icon: "file-text", route: "/exams", moduleCode: "examinations", sortOrder: 5 },
        { code: "grades", label: "Grades", icon: "award", route: "/grades", moduleCode: "grading", sortOrder: 6 },
        { code: "parent-portal", label: "Report Card", icon: "file-text", route: "/report-card", moduleCode: "parent_portal", sortOrder: 7 },
      ],
    },

    COACHING_INSTITUTE: {
      director: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "students", sortOrder: 1 },
        { code: "students", label: "Students", icon: "graduation-cap", route: "/students", moduleCode: "students", sortOrder: 2 },
        { code: "batches", label: "Batches", icon: "users", route: "/batches", moduleCode: "batches", sortOrder: 3 },
        { code: "courses", label: "Courses", icon: "book", route: "/courses", moduleCode: "courses", sortOrder: 4 },
        { code: "faculty", label: "Faculty", icon: "user-plus", route: "/faculty", moduleCode: "faculty", sortOrder: 5 },
        { code: "attendance", label: "Attendance", icon: "check-circle", route: "/attendance", moduleCode: "attendance", sortOrder: 6 },
        { code: "exams", label: "Mock Tests", icon: "file", route: "/mock-tests", moduleCode: "mock_tests", sortOrder: 7 },
        { code: "results", label: "Results", icon: "award", route: "/results", moduleCode: "results", sortOrder: 8 },
        { code: "fees", label: "Fees", icon: "credit-card", route: "/fees", moduleCode: "fee_management", sortOrder: 9 },
        { code: "scholarships", label: "Scholarships", icon: "award", route: "/scholarships", moduleCode: "scholarship", sortOrder: 10 },
      ],
      faculty: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "batches", sortOrder: 1 },
        { code: "batches", label: "My Batches", icon: "users", route: "/my-batches", moduleCode: "batches", sortOrder: 2 },
        { code: "students", label: "Students", icon: "graduation-cap", route: "/my-students", moduleCode: "students", sortOrder: 3 },
        { code: "attendance", label: "Attendance", icon: "check-circle", route: "/attendance", moduleCode: "attendance", sortOrder: 4 },
        { code: "exams", label: "Mock Tests", icon: "file", route: "/mock-tests", moduleCode: "mock_tests", sortOrder: 5 },
        { code: "results", label: "Results", icon: "award", route: "/results", moduleCode: "results", sortOrder: 6 },
      ],
      student: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "batches", sortOrder: 1 },
        { code: "batches", label: "My Batches", icon: "users", route: "/my-batches", moduleCode: "batches", sortOrder: 2 },
        { code: "courses", label: "Courses", icon: "book", route: "/courses", moduleCode: "courses", sortOrder: 3 },
        { code: "attendance", label: "Attendance", icon: "check-circle", route: "/attendance", moduleCode: "attendance", sortOrder: 4 },
        { code: "exams", label: "Mock Tests", icon: "file", route: "/mock-tests", moduleCode: "mock_tests", sortOrder: 5 },
        { code: "results", label: "Results", icon: "award", route: "/results", moduleCode: "results", sortOrder: 6 },
        { code: "fees", label: "Fees", icon: "credit-card", route: "/fees", moduleCode: "fee_management", sortOrder: 7 },
      ],
    },

    RESTAURANT_AND_CAFE: {
      owner: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "orders", sortOrder: 1 },
        { code: "orders", label: "Orders", icon: "shopping-cart", route: "/orders", moduleCode: "orders", sortOrder: 2 },
        { code: "kitchen", label: "Kitchen", icon: "chef-hat", route: "/kitchen", moduleCode: "kitchen", sortOrder: 3 },
        { code: "menu", label: "Menu", icon: "book", route: "/menu", moduleCode: "menu", sortOrder: 4 },
        { code: "tables", label: "Tables", icon: "table", route: "/tables", moduleCode: "tables", sortOrder: 5 },
        { code: "reservations", label: "Reservations", icon: "calendar", route: "/reservations", moduleCode: "reservations", sortOrder: 6 },
        { code: "inventory", label: "Inventory", icon: "package", route: "/inventory", moduleCode: "inventory", sortOrder: 7 },
        { code: "delivery", label: "Delivery", icon: "truck", route: "/delivery", moduleCode: "delivery", sortOrder: 8 },
        { code: "crm", label: "CRM", icon: "users", route: "/crm", moduleCode: "crm_restaurant", sortOrder: 9 },
        { code: "loyalty", label: "Loyalty", icon: "heart", route: "/loyalty", moduleCode: "loyalty", sortOrder: 10 },
      ],
      manager: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "orders", sortOrder: 1 },
        { code: "orders", label: "Orders", icon: "shopping-cart", route: "/orders", moduleCode: "orders", sortOrder: 2 },
        { code: "menu", label: "Menu", icon: "book", route: "/menu", moduleCode: "menu", sortOrder: 3 },
        { code: "inventory", label: "Inventory", icon: "package", route: "/inventory", moduleCode: "inventory", sortOrder: 4 },
        { code: "reservations", label: "Reservations", icon: "calendar", route: "/reservations", moduleCode: "reservations", sortOrder: 5 },
        { code: "crm", label: "CRM", icon: "users", route: "/crm", moduleCode: "crm_restaurant", sortOrder: 6 },
      ],
      chef: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "kitchen", sortOrder: 1 },
        { code: "kitchen", label: "Kitchen", icon: "chef-hat", route: "/kitchen", moduleCode: "kitchen", sortOrder: 2 },
        { code: "menu", label: "Menu", icon: "book", route: "/menu", moduleCode: "menu", sortOrder: 3 },
        { code: "inventory", label: "Inventory", icon: "package", route: "/inventory", moduleCode: "inventory", sortOrder: 4 },
      ],
      waiter: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "orders", sortOrder: 1 },
        { code: "orders", label: "Orders", icon: "shopping-cart", route: "/orders", moduleCode: "orders", sortOrder: 2 },
        { code: "menu", label: "Menu", icon: "book", route: "/menu", moduleCode: "menu", sortOrder: 3 },
      ],
      customer: [
        { code: "dashboard", label: "My Account", icon: "home", route: "/dashboard", moduleCode: "orders", sortOrder: 1 },
        { code: "order", label: "Place Order", icon: "shopping-cart", route: "/order", moduleCode: "orders", sortOrder: 2 },
        { code: "menu", label: "Menu", icon: "book", route: "/menu", moduleCode: "menu", sortOrder: 3 },
        { code: "reservation", label: "Book Table", icon: "calendar", route: "/reservation", moduleCode: "reservations", sortOrder: 4 },
      ],
    },

    HOTEL_AND_HOSPITALITY: {
      owner: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "reservations", sortOrder: 1 },
        { code: "rooms", label: "Rooms", icon: "home", route: "/rooms", moduleCode: "room_management", sortOrder: 2 },
        { code: "reservations", label: "Reservations", icon: "calendar", route: "/reservations", moduleCode: "reservations", sortOrder: 3 },
        { code: "housekeeping", label: "Housekeeping", icon: "cleaning", route: "/housekeeping", moduleCode: "housekeeping", sortOrder: 4 },
        { code: "guests", label: "Guests", icon: "user", route: "/guests", moduleCode: "guests", sortOrder: 5 },
        { code: "billing", label: "Billing", icon: "file-text", route: "/billing", moduleCode: "billing", sortOrder: 6 },
        { code: "crm", label: "CRM", icon: "users", route: "/crm", moduleCode: "crm_hospitality", sortOrder: 7 },
        { code: "amenities", label: "Amenities", icon: "star", route: "/amenities", moduleCode: "amenities", sortOrder: 8 },
      ],
      manager: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "reservations", sortOrder: 1 },
        { code: "rooms", label: "Rooms", icon: "home", route: "/rooms", moduleCode: "room_management", sortOrder: 2 },
        { code: "housekeeping", label: "Housekeeping", icon: "cleaning", route: "/housekeeping", moduleCode: "housekeeping", sortOrder: 3 },
        { code: "billing", label: "Billing", icon: "file-text", route: "/billing", moduleCode: "billing", sortOrder: 4 },
        { code: "crm", label: "CRM", icon: "users", route: "/crm", moduleCode: "crm_hospitality", sortOrder: 5 },
      ],
      receptionist: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "reservations", sortOrder: 1 },
        { code: "reservations", label: "Reservations", icon: "calendar", route: "/reservations", moduleCode: "reservations", sortOrder: 2 },
        { code: "checkin", label: "Check-in", icon: "log-in", route: "/checkin", moduleCode: "guests", sortOrder: 3 },
        { code: "checkout", label: "Check-out", icon: "log-out", route: "/checkout", moduleCode: "guests", sortOrder: 4 },
        { code: "billing", label: "Billing", icon: "file-text", route: "/billing", moduleCode: "billing", sortOrder: 5 },
      ],
      housekeeping: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "housekeeping", sortOrder: 1 },
        { code: "rooms", label: "Room Services", icon: "home", route: "/rooms", moduleCode: "room_management", sortOrder: 2 },
        { code: "housekeeping", label: "Housekeeping", icon: "cleaning", route: "/housekeeping", moduleCode: "housekeeping", sortOrder: 3 },
      ],
      guest: [
        { code: "dashboard", label: "My Dashboard", icon: "home", route: "/dashboard", moduleCode: "reservations", sortOrder: 1 },
        { code: "bookings", label: "My Bookings", icon: "calendar", route: "/bookings", moduleCode: "reservations", sortOrder: 2 },
        { code: "services", label: "Services", icon: "star", route: "/services", moduleCode: "amenities", sortOrder: 3 },
        { code: "billing", label: "Invoices", icon: "file-text", route: "/billing", moduleCode: "billing", sortOrder: 4 },
      ],
    },

    HEALTHCARE_CLINIC: {
      admin: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "patients", sortOrder: 1 },
        { code: "patients", label: "Patients", icon: "user-plus", route: "/patients", moduleCode: "patients", sortOrder: 2 },
        { code: "doctors", label: "Doctors", icon: "user-minus", route: "/doctors", moduleCode: "doctors", sortOrder: 3 },
        { code: "appointments", label: "Appointments", icon: "calendar", route: "/appointments", moduleCode: "appointments", sortOrder: 4 },
        { code: "billing", label: "Billing", icon: "dollar-sign", route: "/billing", moduleCode: "billing", sortOrder: 5 },
        { code: "medical-records", label: "Medical Records", icon: "file-text", route: "/medical-records", moduleCode: "medical_records", sortOrder: 6 },
        { code: "lab-reports", label: "Lab Reports", icon: "test-tube", route: "/lab-reports", moduleCode: "lab_reports", sortOrder: 7 },
      ],
      doctor: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "patients", sortOrder: 1 },
        { code: "patients", label: "My Patients", icon: "user-plus", route: "/my-patients", moduleCode: "patients", sortOrder: 2 },
        { code: "appointments", label: "Appointments", icon: "calendar", route: "/appointments", moduleCode: "appointments", sortOrder: 3 },
        { code: "prescriptions", label: "Prescriptions", icon: "prescription", route: "/prescriptions", moduleCode: "prescriptions", sortOrder: 4 },
        { code: "medical-records", label: "Medical Records", icon: "file-text", route: "/medical-records", moduleCode: "medical_records", sortOrder: 5 },
      ],
      nurse: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "appointments", sortOrder: 1 },
        { code: "appointments", label: "Appointments", icon: "calendar", route: "/appointments", moduleCode: "appointments", sortOrder: 2 },
        { code: "patients", label: "Vitals", icon: "activity", route: "/vitals", moduleCode: "patients", sortOrder: 3 },
        { code: "prescriptions", label: "Medications", icon: "pill", route: "/medications", moduleCode: "prescriptions", sortOrder: 4 },
      ],
      receptionist: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "appointments", sortOrder: 1 },
        { code: "appointments", label: "Appointments", icon: "calendar", route: "/appointments", moduleCode: "appointments", sortOrder: 2 },
        { code: "patients", label: "Register Patient", icon: "user-plus", route: "/register", moduleCode: "patients", sortOrder: 3 },
        { code: "billing", label: "Billing", icon: "dollar-sign", route: "/billing", moduleCode: "billing", sortOrder: 4 },
      ],
      patient: [
        { code: "dashboard", label: "My Dashboard", icon: "home", route: "/dashboard", moduleCode: "appointments", sortOrder: 1 },
        { code: "appointments", label: "Book Appointment", icon: "calendar", route: "/appointments", moduleCode: "appointments", sortOrder: 2 },
        { code: "records", label: "Medical Records", icon: "file-text", route: "/records", moduleCode: "medical_records", sortOrder: 3 },
        { code: "billing", label: "My Billing", icon: "dollar-sign", route: "/billing", moduleCode: "billing", sortOrder: 4 },
      ],
    },

    ECOMMERCE: {
      owner: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "orders", sortOrder: 1 },
        { code: "products", label: "Products", icon: "package", route: "/products", moduleCode: "products", sortOrder: 2 },
        { code: "categories", label: "Categories", icon: "folder", route: "/categories", moduleCode: "categories", sortOrder: 3 },
        { code: "orders", label: "Orders", icon: "shopping-cart", route: "/orders", moduleCode: "orders", sortOrder: 4 },
        { code: "inventory", label: "Inventory", icon: "box", route: "/inventory", moduleCode: "inventory", sortOrder: 5 },
        { code: "crm", label: "CRM", icon: "users", route: "/crm", moduleCode: "crm_ecommerce", sortOrder: 6 },
        { code: "reviews", label: "Reviews", icon: "star", route: "/reviews", moduleCode: "reviews", sortOrder: 7 },
        { code: "marketing", label: "Marketing", icon: "megaphone", route: "/marketing", moduleCode: "marketing", sortOrder: 8 },
        { code: "returns", label: "Returns", icon: "arrow-left", route: "/returns", moduleCode: "returns", sortOrder: 9 },
      ],
      manager: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "orders", sortOrder: 1 },
        { code: "products", label: "Products", icon: "package", route: "/products", moduleCode: "products", sortOrder: 2 },
        { code: "categories", label: "Categories", icon: "folder", route: "/categories", moduleCode: "categories", sortOrder: 3 },
        { code: "inventory", label: "Inventory", icon: "box", route: "/inventory", moduleCode: "inventory", sortOrder: 4 },
        { code: "crm", label: "CRM", icon: "users", route: "/crm", moduleCode: "crm_ecommerce", sortOrder: 5 },
        { code: "reviews", label: "Reviews", icon: "star", route: "/reviews", moduleCode: "reviews", sortOrder: 6 },
      ],
      warehouse: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "inventory", sortOrder: 1 },
        { code: "inventory", label: "Inventory", icon: "box", route: "/inventory", moduleCode: "inventory", sortOrder: 2 },
        { code: "shipments", label: "Shipments", icon: "truck", route: "/shipments", moduleCode: "shipments", sortOrder: 3 },
      ],
      customer_support: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "orders", sortOrder: 1 },
        { code: "orders", label: "Orders", icon: "shopping-cart", route: "/orders", moduleCode: "orders", sortOrder: 2 },
        { code: "customers", label: "Customers", icon: "users", route: "/customers", moduleCode: "crm_ecommerce", sortOrder: 3 },
        { code: "returns", label: "Returns", icon: "arrow-left", route: "/returns", moduleCode: "returns", sortOrder: 4 },
      ],
      customer: [
        { code: "dashboard", label: "My Account", icon: "home", route: "/dashboard", moduleCode: "orders", sortOrder: 1 },
        { code: "products", label: "Browse Products", icon: "package", route: "/products", moduleCode: "products", sortOrder: 2 },
        { code: "orders", label: "My Orders", icon: "shopping-cart", route: "/orders", moduleCode: "orders", sortOrder: 3 },
        { code: "cart", label: "Shopping Cart", icon: "shopping-cart", route: "/cart", moduleCode: "orders", sortOrder: 4 },
        { code: "wishlist", label: "Wishlist", icon: "heart", route: "/wishlist", moduleCode: "products", sortOrder: 5 },
      ],
    },

    LOGISTICS_AND_DELIVERY: {
      owner: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "shipments", sortOrder: 1 },
        { code: "fleet", label: "Fleet", icon: "truck", route: "/fleet", moduleCode: "fleet", sortOrder: 2 },
        { code: "drivers", label: "Drivers", icon: "user-check", route: "/drivers", moduleCode: "drivers", sortOrder: 3 },
        { code: "routes", label: "Routes", icon: "map", route: "/routes", moduleCode: "routes", sortOrder: 4 },
        { code: "tracking", label: "Tracking", icon: "track", route: "/tracking", moduleCode: "tracking", sortOrder: 5 },
        { code: "warehouses", label: "Warehouses", icon: "warehouse", route: "/warehouses", moduleCode: "warehouses", sortOrder: 6 },
        { code: "crm", label: "CRM", icon: "users", route: "/crm", moduleCode: "crm_logistics", sortOrder: 7 },
        { code: "fuel", label: "Fuel", icon: "gas-pump", route: "/fuel", moduleCode: "fuel_management", sortOrder: 8 },
      ],
      dispatcher: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "shipments", sortOrder: 1 },
        { code: "routes", label: "Routes", icon: "map", route: "/routes", moduleCode: "routes", sortOrder: 2 },
        { code: "drivers", label: "Drivers", icon: "user-check", route: "/drivers", moduleCode: "drivers", sortOrder: 3 },
        { code: "shipments", label: "Shipments", icon: "package", route: "/shipments", moduleCode: "shipments", sortOrder: 4 },
        { code: "tracking", label: "Tracking", icon: "track", route: "/tracking", moduleCode: "tracking", sortOrder: 5 },
      ],
      driver: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "shipments", sortOrder: 1 },
        { code: "shipments", label: "My Shipments", icon: "package", route: "/shipments", moduleCode: "shipments", sortOrder: 2 },
        { code: "routes", label: "My Routes", icon: "map", route: "/routes", moduleCode: "routes", sortOrder: 3 },
        { code: "tracking", label: "Live Tracking", icon: "track", route: "/tracking", moduleCode: "tracking", sortOrder: 4 },
      ],
      warehouse_staff: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "warehouses", sortOrder: 1 },
        { code: "warehouses", label: "Warehouses", icon: "warehouse", route: "/warehouses", moduleCode: "warehouses", sortOrder: 2 },
        { code: "inventory", label: "Inventory", icon: "package", route: "/inventory", moduleCode: "inventory", sortOrder: 3 },
        { code: "shipments", label: "Shipments", icon: "package", route: "/shipments", moduleCode: "shipments", sortOrder: 4 },
      ],
    },

    TAILOR_SHOP: {
      owner: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "orders", sortOrder: 1 },
        { code: "customers", label: "Customers", icon: "users", route: "/customers", moduleCode: "customers", sortOrder: 2 },
        { code: "measurements", label: "Measurements", icon: "ruler", route: "/measurements", moduleCode: "measurements", sortOrder: 3 },
        { code: "orders", label: "Orders", icon: "shopping-cart", route: "/orders", moduleCode: "orders", sortOrder: 4 },
        { code: "fabrics", label: "Fabrics", icon: "package", route: "/fabrics", moduleCode: "fabrics", sortOrder: 5 },
        { code: "production", label: "Production", icon: "settings", route: "/production", moduleCode: "production_workflow", sortOrder: 6 },
        { code: "patterns", label: "Patterns", icon: "edit", route: "/patterns", moduleCode: "patterns", sortOrder: 7 },
        { code: "inventory", label: "Inventory", icon: "box", route: "/inventory", moduleCode: "inventory_tails", sortOrder: 8 },
      ],
      tailor: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "orders", sortOrder: 1 },
        { code: "orders", label: "My Orders", icon: "shopping-cart", route: "/my-orders", moduleCode: "orders", sortOrder: 2 },
        { code: "measurements", label: "Measurements", icon: "ruler", route: "/measurements", moduleCode: "measurements", sortOrder: 3 },
        { code: "patterns", label: "Patterns", icon: "edit", route: "/patterns", moduleCode: "patterns", sortOrder: 4 },
        { code: "production", label: "Production", icon: "settings", route: "/production", moduleCode: "production_workflow", sortOrder: 5 },
      ],
      designer: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "patterns", sortOrder: 1 },
        { code: "patterns", label: "Design Patterns", icon: "edit", route: "/patterns", moduleCode: "patterns", sortOrder: 2 },
        { code: "designs", label: "My Designs", icon: "pen-tool", route: "/designs", moduleCode: "patterns", sortOrder: 3 },
      ],
      receptionist: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "orders", sortOrder: 1 },
        { code: "customers", label: "Customers", icon: "user-plus", route: "/register", moduleCode: "customers", sortOrder: 2 },
        { code: "orders", label: "Orders", icon: "shopping-cart", route: "/orders", moduleCode: "orders", sortOrder: 3 },
        { code: "measurements", label: "Measurements", icon: "ruler", route: "/measure", moduleCode: "measurements", sortOrder: 4 },
      ],
    },

    NGO: {
      director: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "campaigns", sortOrder: 1 },
        { code: "donors", label: "Donors", icon: "heart", route: "/donors", moduleCode: "donors", sortOrder: 2 },
        { code: "campaigns", label: "Campaigns", icon: "megaphone", route: "/campaigns", moduleCode: "campaigns", sortOrder: 3 },
        { code: "volunteers", label: "Volunteers", icon: "user-plus", route: "/volunteers", moduleCode: "volunteers", sortOrder: 4 },
        { code: "projects", label: "Projects", icon: "target", route: "/projects", moduleCode: "projects", sortOrder: 5 },
        { code: "events", label: "Events", icon: "calendar", route: "/events", moduleCode: "events", sortOrder: 6 },
        { code: "grants", label: "Grants", icon: "file-text", route: "/grants", moduleCode: "grants", sortOrder: 7 },
        { code: "fundraising", label: "Fundraising", icon: "piggy-bank", route: "/fundraising", moduleCode: "fundraising", sortOrder: 8 },
      ],
      coordinator: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "campaigns", sortOrder: 1 },
        { code: "campaigns", label: "Campaigns", icon: "megaphone", route: "/campaigns", moduleCode: "campaigns", sortOrder: 2 },
        { code: "volunteers", label: "Volunteers", icon: "user-plus", route: "/volunteers", moduleCode: "volunteers", sortOrder: 3 },
        { code: "events", label: "Events", icon: "calendar", route: "/events", moduleCode: "events", sortOrder: 4 },
        { code: "projects", label: "Projects", icon: "target", route: "/projects", moduleCode: "projects", sortOrder: 5 },
      ],
      volunteer: [
        { code: "dashboard", label: "My Activities", icon: "home", route: "/dashboard", moduleCode: "events", sortOrder: 1 },
        { code: "events", label: "Events", icon: "calendar", route: "/events", moduleCode: "events", sortOrder: 2 },
        { code: "campaigns", label: "Campaigns", icon: "megaphone", route: "/campaigns", moduleCode: "campaigns", sortOrder: 3 },
      ],
      donor: [
        { code: "dashboard", label: "My Donations", icon: "home", route: "/dashboard", moduleCode: "campaigns", sortOrder: 1 },
        { code: "donate", label: "Donate Now", icon: "heart", route: "/donate", moduleCode: "campaigns", sortOrder: 2 },
        { code: "campaigns", label: "Campaigns", icon: "megaphone", route: "/campaigns", moduleCode: "campaigns", sortOrder: 3 },
        { code: "projects", label: "My Projects", icon: "target", route: "/projects", moduleCode: "projects", sortOrder: 4 },
      ],
    },

    SME_CORPORATE: {
      ceo: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "projects", sortOrder: 1 },
        { code: "hr", label: "HR", icon: "users", route: "/hr", moduleCode: "hr", sortOrder: 2 },
        { code: "projects", label: "Projects", icon: "briefcase", route: "/projects", moduleCode: "projects", sortOrder: 3 },
        { code: "finance", label: "Finance", icon: "dollar-sign", route: "/finance", moduleCode: "finance_corporate", sortOrder: 4 },
        { code: "payroll", label: "Payroll", icon: "credit-card", route: "/payroll", moduleCode: "payroll", sortOrder: 5 },
        { code: "procurement", label: "Procurement", icon: "shopping-cart", route: "/procurement", moduleCode: "procurement", sortOrder: 6 },
        { code: "assets", label: "Assets", icon: "box", route: "/assets", moduleCode: "assets", sortOrder: 7 },
        { code: "documents", label: "Documents", icon: "file-text", route: "/documents", moduleCode: "documents", sortOrder: 8 },
        { code: "automation", label: "Automation", icon: "cpu", route: "/automation", moduleCode: "workflow", sortOrder: 9 },
        { code: "analytics", label: "Analytics", icon: "bar-chart", route: "/analytics", moduleCode: "analytics_corporate", sortOrder: 10 },
      ],
      manager: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "projects", sortOrder: 1 },
        { code: "hr", label: "HR", icon: "users", route: "/hr", moduleCode: "hr", sortOrder: 2 },
        { code: "projects", label: "Projects", icon: "briefcase", route: "/projects", moduleCode: "projects", sortOrder: 3 },
        { code: "finance", label: "Finance", icon: "dollar-sign", route: "/finance", moduleCode: "finance_corporate", sortOrder: 4 },
        { code: "procurement", label: "Procurement", icon: "shopping-cart", route: "/procurement", moduleCode: "procurement", sortOrder: 5 },
        { code: "automation", label: "Automation", icon: "cpu", route: "/automation", moduleCode: "workflow", sortOrder: 6 },
      ],
      hr: [
        { code: "dashboard", label: "HR Dashboard", icon: "home", route: "/dashboard", moduleCode: "hr", sortOrder: 1 },
        { code: "employees", label: "Employees", icon: "users", route: "/employees", moduleCode: "hr", sortOrder: 2 },
        { code: "payroll", label: "Payroll", icon: "credit-card", route: "/payroll", moduleCode: "payroll", sortOrder: 3 },
        { code: "applications", label: "Applications", icon: "file-text", route: "/applications", moduleCode: "hr", sortOrder: 4 },
      ],
      employee: [
        { code: "dashboard", label: "My Dashboard", icon: "home", route: "/dashboard", moduleCode: "hr", sortOrder: 1 },
        { code: "profile", label: "My Profile", icon: "user", route: "/profile", moduleCode: "hr", sortOrder: 2 },
        { code: "payroll", label: "Pay Stubs", icon: "credit-card", route: "/payroll", moduleCode: "payroll", sortOrder: 3 },
        { code: "time-off", label: "Time Off", icon: "calendar", route: "/time-off", moduleCode: "hr", sortOrder: 4 },
        { code: "documents", label: "My Documents", icon: "file-text", route: "/documents", moduleCode: "documents", sortOrder: 5 },
      ],
    },

    SCHOOL_AND_EDUCATION: {
      principal: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "students", sortOrder: 1 },
        { code: "students", label: "Students", icon: "graduation-cap", route: "/students", moduleCode: "students", sortOrder: 2 },
        { code: "teachers", label: "Teachers", icon: "user-minus", route: "/teachers", moduleCode: "teachers", sortOrder: 3 },
        { code: "classes", label: "Classes", icon: "book-open", route: "/classes", moduleCode: "classes", sortOrder: 4 },
        { code: "attendance", label: "Attendance", icon: "check-circle", route: "/attendance", moduleCode: "attendance", sortOrder: 5 },
        { code: "exams", label: "Exams", icon: "file-text", route: "/exams", moduleCode: "examinations", sortOrder: 6 },
        { code: "grading", label: "Grading", icon: "edit", route: "/grading", moduleCode: "grading", sortOrder: 7 },
        { code: "timetable", label: "Timetable", icon: "clock", route: "/timetable", moduleCode: "timetable", sortOrder: 8 },
        { code: "parent-portal", label: "Parent Portal", icon: "message-square", route: "/parent-portal", moduleCode: "parent_portal", sortOrder: 9 },
        { code: "library", label: "Library", icon: "book", route: "/library", moduleCode: "library", sortOrder: 10 },
        { code: "finance", label: "Finance", icon: "dollar-sign", route: "/finance", moduleCode: "finance_school", sortOrder: 11 },
        { code: "transport", label: "Transport", icon: "truck", route: "/transport", moduleCode: "transport", sortOrder: 12 },
      ],
      admin: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "students", sortOrder: 1 },
        { code: "students", label: "Students", icon: "graduation-cap", route: "/students", moduleCode: "students", sortOrder: 2 },
        { code: "teachers", label: "Teachers", icon: "user-minus", route: "/teachers", moduleCode: "teachers", sortOrder: 3 },
        { code: "attendance", label: "Attendance", icon: "check-circle", route: "/attendance", moduleCode: "attendance", sortOrder: 4 },
        { code: "timetable", label: "Timetable", icon: "clock", route: "/timetable", moduleCode: "timetable", sortOrder: 5 },
        { code: "finance", label: "Finance", icon: "dollar-sign", route: "/finance", moduleCode: "finance_school", sortOrder: 6 },
      ],
      teacher: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "classes", sortOrder: 1 },
        { code: "students", label: "My Students", icon: "graduation-cap", route: "/my-students", moduleCode: "students", sortOrder: 2 },
        { code: "attendance", label: "Attendance", icon: "check-circle", route: "/attendance", moduleCode: "attendance", sortOrder: 3 },
        { code: "assignments", label: "Assignments", icon: "clipboard", route: "/assignments", moduleCode: "assignments", sortOrder: 4 },
        { code: "grading", label: "Grading", icon: "edit", route: "/grading", moduleCode: "grading", sortOrder: 5 },
        { code: "timetable", label: "Timetable", icon: "clock", route: "/timetable", moduleCode: "timetable", sortOrder: 6 },
        { code: "exams", label: "Exams", icon: "file-text", route: "/exams", moduleCode: "examinations", sortOrder: 7 },
      ],
      student: [
        { code: "dashboard", label: "Dashboard", icon: "home", route: "/dashboard", moduleCode: "students", sortOrder: 1 },
        { code: "subjects", label: "My Subjects", icon: "book", route: "/subjects", moduleCode: "classes", sortOrder: 2 },
        { code: "attendance", label: "Attendance", icon: "check-circle", route: "/attendance", moduleCode: "attendance", sortOrder: 3 },
        { code: "assignments", label: "Assignments", icon: "clipboard", route: "/assignments", moduleCode: "assignments", sortOrder: 4 },
        { code: "exams", label: "Exams", icon: "file-text", route: "/exams", moduleCode: "examinations", sortOrder: 5 },
        { code: "grades", label: "My Grades", icon: "award", route: "/grades", moduleCode: "grading", sortOrder: 6 },
        { code: "parent-portal", label: "Report Card", icon: "file-text", route: "/report-card", moduleCode: "parent_portal", sortOrder: 7 },
      ],
      parent: [
        { code: "dashboard", label: "Parent Dashboard", icon: "home", route: "/dashboard", moduleCode: "students", sortOrder: 1 },
        { code: "children", label: "My Children", icon: "users", route: "/children", moduleCode: "students", sortOrder: 2 },
        { code: "grades", label: "Academic Report", icon: "award", route: "/report-card", moduleCode: "grading", sortOrder: 3 },
        { code: "attendance", label: "Attendance Report", icon: "check-circle", route: "/attendance-report", moduleCode: "attendance", sortOrder: 4 },
        { code: "fees", label: "Fee Statement", icon: "dollar-sign", route: "/fees", moduleCode: "finance_school", sortOrder: 5 },
      ],
      accountant: [
        { code: "dashboard", label: "Finance Dashboard", icon: "home", route: "/dashboard", moduleCode: "finance_school", sortOrder: 1 },
        { code: "fees", label: "Fees Collection", icon: "credit-card", route: "/fees", moduleCode: "finance_school", sortOrder: 2 },
        { code: "payroll", label: "Teacher Payroll", icon: "credit-card", route: "/payroll", moduleCode: "finance_school", sortOrder: 3 },
        { code: "reports", label: "Financial Reports", icon: "bar-chart", route: "/reports", moduleCode: "finance_school", sortOrder: 4 },
      ],
    },
  };

  return menuConfigs[domainCode]?.[roleCode] || [];
}

async function createDomainWidgets(domain) {
  const domainRoles = await prisma.domainRole.findMany({
    where: { domainId: domain.id },
  });

  const widgetConfigs = getDomainWidgetConfig(domain.code);

  for (const widgetConfig of widgetConfigs) {
    const domainModule = await prisma.domainModule.findFirst({
      where: { domainId: domain.id, code: widgetConfig.moduleCode },
    });

    if (!domainModule) continue;

    for (const role of domainRoles) {
      try {
        await prisma.domainWidget.create({
          data: {
            domain: { connect: { id: domain.id } },
            code: widgetConfig.code,
            name: widgetConfig.name,
            description: widgetConfig.description,
            category: widgetConfig.category,
            icon: widgetConfig.icon,
            component: widgetConfig.component,
            config: widgetConfig.config,
            module: { connect: { id: domainModule.id } },
            role: role ? { connect: { id: role.id } } : undefined,
            isVisible: widgetConfig.isVisible !== false,
            refreshInterval: widgetConfig.refreshInterval,
          },
        });
      } catch (e) {
        if (e.code !== 'P2002') throw e;
      }
    }
  }
}

function getDomainWidgetConfig(domainCode) {
  const widgetConfigs = {
    FITNESS_CENTER: [
      { code: "today_attendance", name: "Today's Attendance", description: "View current day's member attendance", category: "DASHBOARD", icon: "calendar", component: "dashboard/today-attendance", config: {}, moduleCode: "attendance", refreshInterval: 300 },
      { code: "active_members", name: "Active Members", description: "Track number of active members", category: "DASHBOARD", icon: "users", component: "dashboard/active-members", config: { filter: "last_30_days" }, moduleCode: "fitness_members" },
      { code: "membership_expiry", name: "Membership Expiry", description: "Upcoming membership expirations", category: "DASHBOARD", icon: "alert-triangle", component: "dashboard/membership-expiry", config: { days: 7 }, moduleCode: "membership_packages" },
      { code: "revenue", name: "Revenue", description: "Today's revenue summary", category: "DASHBOARD", icon: "dollar-sign", component: "dashboard/revenue", config: { currency: "NPR" }, moduleCode: "pos_fitness" },
      { code: "workout_completion", name: "Workout Completion", description: "Today's workout completion rate", category: "DASHBOARD", icon: "dumbbell", component: "dashboard/workout-completion", config: { target: 80 }, moduleCode: "attendance" },
      { code: "trainer_performance", name: "Trainer Performance", description: "Monitor trainer productivity", category: "PERFORMANCE", icon: "user-check", component: "dashboard/trainer-performance", config: { metrics: ["classes", "clients", "revenue"] }, moduleCode: "fitness_trainers" },
      { code: "nutrition_compliance", name: "Nutrition Compliance", description: "Track nutrition plan adherence", category: "COMPLIANCE", icon: "apple", component: "dashboard/nutrition-compliance", config: { target: 90 }, moduleCode: "nutrition_plans" },
      { code: "equipment_usage", name: "Equipment Usage", description: "Monitor gym equipment utilization", category: "ANALYTICS", icon: "activity", component: "dashboard/equipment-usage", config: {}, moduleCode: "fitness_members" },
    ],

    SALON_AND_SPA: [
      { code: "today_appointments", name: "Today's Appointments", description: "View and manage today's appointments", category: "DASHBOARD", icon: "calendar", component: "dashboard/today-appointments", config: {}, moduleCode: "salon_appointments", refreshInterval: 300 },
      { code: "top_services", name: "Top Services", description: "Most popular services today", category: "ANALYTICS", icon: "scissors", component: "dashboard/top-services", config: {}, moduleCode: "service_catalog" },
      { code: "stylist_performance", name: "Stylist Performance", description: "Monitor stylist productivity", category: "PERFORMANCE", icon: "user-check", component: "dashboard/stylist-performance", config: { metrics: ["appointments", "revenue", "customer_rating"] }, moduleCode: "salon_appointments" },
      { code: "revenue", name: "Revenue", description: "Today's and monthly revenue", category: "DASHBOARD", icon: "dollar-sign", component: "dashboard/revenue", config: {}, moduleCode: "pos_restaurant" },
      { code: "customer_retention", name: "Customer Retention", description: "Track returning customer rate", category: "CRM", icon: "users", component: "dashboard/customer-retention", config: { period: 90 }, moduleCode: "customer_history" },
      { code: "membership_status", name: "Membership Status", description: "Active and new memberships", category: "MEMBERSHIP", icon: "star", component: "dashboard/membership-status", config: {}, moduleCode: "membership" },
    ],

    SCHOOL_AND_EDUCATION: [
      { code: "student_attendance", name: "Student Attendance", description: "View today's student attendance", category: "DASHBOARD", icon: "check-circle", component: "dashboard/student-attendance", config: {}, moduleCode: "attendance" },
      { code: "teacher_attendance", name: "Teacher Attendance", description: "View today's teacher attendance", category: "DASHBOARD", icon: "user-minus", component: "dashboard/teacher-attendance", config: {}, moduleCode: "attendance" },
      { code: "exam_results", name: "Exam Results", description: "Recent exam results summary", category: "ACADEMICS", icon: "award", component: "dashboard/exam-results", config: {}, moduleCode: "grading" },
      { code: "fee_collection", name: "Fee Collection", description: "Student fee collection status", category: "FINANCE", icon: "dollar-sign", component: "dashboard/fee-collection", config: { period: "current_month" }, moduleCode: "finance_school" },
      { code: "class_performance", name: "Class Performance", description: "Academic performance by class", category: "ANALYTICS", icon: "bar-chart", component: "dashboard/class-performance", config: {}, moduleCode: "grading" },
      { code: "library_usage", name: "Library Usage", description: "Book borrowing statistics", category: "LIBRARY", icon: "book", component: "dashboard/library-usage", config: {}, moduleCode: "library" },
      { code: "timetable", name: "Today's Schedule", description: "Today's class timetable", category: "OPERATIONS", icon: "clock", component: "dashboard/timetable", config: {}, moduleCode: "timetable" },
    ],

    COACHING_INSTITUTE: [
      { code: "student_attendance", name: "Student Attendance", description: "Batch attendance tracking", category: "DASHBOARD", icon: "check-circle", component: "dashboard/student-attendance", config: {}, moduleCode: "attendance" },
      { code: "class_performance", name: "Class Performance", description: "Batch performance metrics", category: "ANALYTICS", icon: "bar-chart", component: "dashboard/class-performance", config: {}, moduleCode: "results" },
      { code: "revenue", name: "Revenue", description: "Fee collection summary", category: "FINANCE", icon: "dollar-sign", component: "dashboard/revenue", config: {}, moduleCode: "fee_management" },
      { code: "faculty_performance", name: "Faculty Performance", description: "Teacher/instructor performance", category: "PERFORMANCE", icon: "user-check", component: "dashboard/faculty-performance", config: {}, moduleCode: "faculty" },
      { code: "exam_results", name: "Mock Test Results", description: "Recent mock test performance", category: "ACADEMICS", icon: "file-text", component: "dashboard/mock-test-results", config: {}, moduleCode: "mock_tests" },
      { code: "enrollment", name: "New Enrollments", description: "New student registrations", category: "CRM", icon: "user-plus", component: "dashboard/enrollment", config: {}, moduleCode: "students" },
    ],

    RESTAURANT_AND_CAFE: [
      { code: "orders_today", name: "Orders Today", description: "Today's order count and statistics", category: "DASHBOARD", icon: "shopping-cart", component: "dashboard/orders-today", config: {}, moduleCode: "orders", refreshInterval: 300 },
      { code: "kitchen_queue", name: "Kitchen Queue", description: "Pending kitchen orders", category: "KITCHEN", icon: "chef-hat", component: "dashboard/kitchen-queue", config: {}, moduleCode: "kitchen", refreshInterval: 60 },
      { code: "revenue", name: "Revenue", description: "Today's and monthly revenue", category: "DASHBOARD", icon: "dollar-sign", component: "dashboard/revenue", config: {}, moduleCode: "pos_restaurant" },
      { code: "inventory_alerts", name: "Inventory Alerts", description: "Low stock alerts and needs", category: "INVENTORY", icon: "package", component: "dashboard/inventory-alerts", config: {}, moduleCode: "inventory" },
      { code: "customer_orders", name: "Customer Orders", description: "Popular customer orders", category: "ANALYTICS", icon: "users", component: "dashboard/customer-orders", config: {}, moduleCode: "orders" },
      { code: "tables_status", name: "Table Status", description: "Current table occupancy", category: "OPERATIONS", icon: "table", component: "dashboard/tables-status", config: {}, moduleCode: "tables" },
    ],

    HOTEL_AND_HOSPITALITY: [
      { code: "occupancy_rate", name: "Occupancy Rate", description: "Current room occupancy percentage", category: "DASHBOARD", icon: "home", component: "dashboard/occupancy-rate", config: {}, moduleCode: "room_management" },
      { code: "checkins_today", name: "Today's Check-ins", description: "Number of new arrivals", category: "DASHBOARD", icon: "log-in", component: "dashboard/checkins-today", config: {}, moduleCode: "guests" },
      { code: "revenue", name: "Revenue", description: "Today's room revenue", category: "DASHBOARD", icon: "dollar-sign", component: "dashboard/revenue", config: {}, moduleCode: "billing" },
      { code: "housekeeping_status", name: "Housekeeping", description: "Rooms requiring housekeeping", category: "OPERATIONS", icon: "cleaning", component: "dashboard/housekeeping-status", config: {}, moduleCode: "housekeeping", refreshInterval: 300 },
      { code: "guest_satisfaction", name: "Guest Satisfaction", description: "Current guest ratings", category: "CRM", icon: "star", component: "dashboard/guest-satisfaction", config: {}, moduleCode: "crm_hospitality" },
      { code: "available_rooms", name: "Available Rooms", description: "Currently available rooms", category: "OPERATIONS", icon: "bed", component: "dashboard/available-rooms", config: {}, moduleCode: "room_management" },
    ],

    HEALTHCARE_CLINIC: [
      { code: "patients_today", name: "Patients Today", description: "Today's patient visits", category: "DASHBOARD", icon: "user-plus", component: "dashboard/patients-today", config: {}, moduleCode: "appointments", refreshInterval: 300 },
      { code: "appointments_today", name: "Today's Appointments", description: "Scheduled appointments for today", category: "DASHBOARD", icon: "calendar", component: "dashboard/appointments-today", config: {}, moduleCode: "appointments", refreshInterval: 300 },
      { code: "revenue", name: "Revenue", description: "Today's and monthly revenue", category: "DASHBOARD", icon: "dollar-sign", component: "dashboard/revenue", config: {}, moduleCode: "billing" },
      { code: "waiting_patients", name: "Waiting Patients", description: "Patients waiting for consultation", category: "OPERATIONS", icon: "clock", component: "dashboard/waiting-patients", config: {}, moduleCode: "patients", refreshInterval: 60 },
      { code: "doctor_schedule", name: "Doctor Schedule", description: "Today's doctor availability", category: "STAFF", icon: "user-minus", component: "dashboard/doctor-schedule", config: {}, moduleCode: "doctors" },
      { code: "lab_results", name: "Lab Results", description: "Recent laboratory test results", category: "MEDICAL", icon: "test-tube", component: "dashboard/lab-results", config: {}, moduleCode: "lab_reports" },
    ],

    ECOMMERCE: [
      { code: "orders_today", name: "Today's Orders", description: "Number of orders placed today", category: "DASHBOARD", icon: "shopping-cart", component: "dashboard/orders-today", config: {}, moduleCode: "orders", refreshInterval: 300 },
      { code: "revenue", name: "Revenue", description: "Today's and monthly sales", category: "DASHBOARD", icon: "dollar-sign", component: "dashboard/revenue", config: {}, moduleCode: "pos_restaurant" },
      { code: "top_products", name: "Top Products", description: "Best-selling products", category: "ANALYTICS", icon: "package", component: "dashboard/top-products", config: {}, moduleCode: "products" },
      { code: "low_stock", name: "Low Stock Items", description: "Products running low on inventory", category: "INVENTORY", icon: "alert-triangle", component: "dashboard/low-stock", config: {}, moduleCode: "inventory" },
      { code: "new_customers", name: "New Customers", description: "Recently registered customers", category: "CRM", icon: "user-plus", component: "dashboard/new-customers", config: {}, moduleCode: "crm_ecommerce" },
      { code: "conversion_rate", name: "Conversion Rate", description: "Website conversion statistics", category: "ANALYTICS", icon: "trending-up", component: "dashboard/conversion-rate", config: {}, moduleCode: "analytics_ecommerce" },
    ],

    LOGISTICS_AND_DELIVERY: [
      { code: "active_shipments", name: "Active Shipments", description: "In-transit deliveries", category: "DASHBOARD", icon: "package", component: "dashboard/active-shipments", config: {}, moduleCode: "shipments", refreshInterval: 300 },
      { code: "drivers_online", name: "Online Drivers", description: "Available delivery drivers", category: "OPERATIONS", icon: "user-check", component: "dashboard/drivers-online", config: {}, moduleCode: "drivers" },
      { code: "revenue", name: "Revenue", description: "Today's delivery revenue", category: "FINANCE", icon: "dollar-sign", component: "dashboard/revenue", config: {}, moduleCode: "pos_restaurant" },
      { code: "delayed_deliveries", name: "Delayed Deliveries", description: "Orders behind schedule", category: "ALERTS", icon: "alert-triangle", component: "dashboard/delayed-deliveries", config: {}, moduleCode: "tracking" },
      { code: "fuel_consumption", name: "Fuel Consumption", description: "Today's fuel usage", category: "OPERATIONS", icon: "gas-pump", component: "dashboard/fuel-consumption", config: {}, moduleCode: "fuel_management" },
      { code: "maintenance_alerts", name: "Maintenance Alerts", description: "Vehicles requiring maintenance", category: "MAINTENANCE", icon: "tool", component: "dashboard/maintenance-alerts", config: {}, moduleCode: "maintenance" },
    ],

    TAILOR_SHOP: [
      { code: "orders_today", name: "Today's Orders", description: "New custom tailoring orders", category: "DASHBOARD", icon: "shopping-cart", component: "dashboard/orders-today", config: {}, moduleCode: "orders", refreshInterval: 300 },
      { code: "production_queue", name: "Production Queue", description: "Orders in production phase", category: "WORKFLOW", icon: "settings", component: "dashboard/production-queue", config: {}, moduleCode: "production_workflow" },
      { code: "fabric_usage", name: "Fabric Usage", description: "Fabric consumption statistics", category: "INVENTORY", icon: "package", component: "dashboard/fabric-usage", config: {}, moduleCode: "fabrics" },
      { code: "completed_orders", name: "Completed Orders", description: "Today's completed tailoring", category: "PRODUCTION", icon: "check-circle", component: "dashboard/completed-orders", config: {}, moduleCode: "inventory_tails" },
      { code: "customer_satisfaction", name: "Customer Satisfaction", description: "Order completion ratings", category: "CRM", icon: "star", component: "dashboard/customer-satisfaction", config: {}, moduleCode: "customers" },
    ],

    NGO: [
      { code: "donations_today", name: "Today's Donations", description: "Recent donation amount and count", category: "DASHBOARD", icon: "heart", component: "dashboard/donations-today", config: {}, moduleCode: "donors", refreshInterval: 300 },
      { code: "campaigns_active", name: "Active Campaigns", description: "Currently running campaigns", category: "CRM", icon: "megaphone", component: "dashboard/campaigns-active", config: {}, moduleCode: "campaigns" },
      { code: "volunteers_available", name: "Available Volunteers", description: "Registered and active volunteers", category: "HUMAN_RESOURCES", icon: "user-plus", component: "dashboard/volunteers-available", config: {}, moduleCode: "volunteers" },
      { code: "revenue", name: "Total Revenue", description: "Overall fundraising summary", category: "FINANCE", icon: "dollar-sign", component: "dashboard/revenue", config: {}, moduleCode: "fundraising" },
      { code: "impact_metrics", name: "Impact Metrics", description: "Community impact statistics", category: "ANALYTICS", icon: "target", component: "dashboard/impact-metrics", config: {}, moduleCode: "projects" },
    ],

    SME_CORPORATE: [
      { code: "monthly_revenue", name: "Monthly Revenue", description: "Current month business revenue", category: "DASHBOARD", icon: "dollar-sign", component: "dashboard/monthly-revenue", config: {}, moduleCode: "finance_corporate" },
      { code: "project_status", name: "Project Status", description: "Overall project completion status", category: "PROJECTS", icon: "briefcase", component: "dashboard/project-status", config: {}, moduleCode: "projects" },
      { code: "employee_count", name: "Employee Count", description: "Total number of employees", category: "HR", icon: "users", component: "dashboard/employee-count", config: {}, moduleCode: "hr" },
      { code: "hr_alerts", name: "HR Alerts", description: "HR-related notifications and alerts", category: "HR", icon: "alert-triangle", component: "dashboard/hr-alerts", config: {}, moduleCode: "hr" },
      { code: "workflow_tasks", name: "Workflow Tasks", description: "Pending automation workflows", category: "AUTOMATION", icon: "cpu", component: "dashboard/workflow-tasks", config: {}, moduleCode: "workflow" },
      { code: "system_alerts", name: "System Alerts", description: "Platform and application alerts", category: "SYSTEM", icon: "alert-circle", component: "dashboard/system-alerts", config: {}, moduleCode: "hr" },
    ],
  };

  return widgetConfigs[domainCode] || [];
}

async function createDomainTheme(domain) {
  const themeConfig = getDomainThemeConfig(domain.code);

  if (!themeConfig) return;

  await prisma.domainTheme.create({
    data: {
      domain: { connect: { id: domain.id } },
      name: themeConfig.name,
      code: themeConfig.code,
      primaryColor: themeConfig.primaryColor,
      secondaryColor: themeConfig.secondaryColor,
      backgroundColor: themeConfig.backgroundColor,
      textColor: themeConfig.textColor,
      logoUrl: themeConfig.logoUrl,
      primaryFont: themeConfig.primaryFont,
      dashboardTemplate: themeConfig.dashboardTemplate,
      websiteTemplate: themeConfig.websiteTemplate,
      isActive: true,
      sortOrder: themeConfig.sortOrder,
    },
  });
}

function getDomainThemeConfig(domainCode) {
  const themeConfigs = {
    FITNESS_CENTER: {
      name: "Fitness Pro Theme",
      code: "fitness_theme",
      primaryColor: "#2563eb",
      secondaryColor: "#10b981",
      backgroundColor: "#f9fafb",
      textColor: "#1f2937",
      logoUrl: "/themes/fitness/logo.png",
      primaryFont: "Inter, system-ui, sans-serif",
      dashboardTemplate: {
        layout: "grid",
        widgets: ["today_attendance", "active_members", "revenue", "workout_completion"],
        sidebar: true,
        header: true,
        footer: false,
      },
      websiteTemplate: {
        homepage: "fitness-landing",
        about: "fitness-about",
        membership: "fitness-plans",
        blog: "fitness-blog",
      },
      sortOrder: 1,
    },

    SALON_AND_SPA: {
      name: "Beauty Salon Theme",
      code: "salon_theme",
      primaryColor: "#ec4899",
      secondaryColor: "#8b5cf6",
      backgroundColor: "#fef2f2",
      textColor: "#374151",
      logoUrl: "/themes/salon/logo.png",
      primaryFont: "Poppins, sans-serif",
      dashboardTemplate: {
        layout: "grid",
        widgets: ["today_appointments", "top_services", "revenue", "stylist_performance"],
        sidebar: true,
        header: true,
        footer: false,
      },
      websiteTemplate: {
        homepage: "salon-landing",
        services: "salon-services",
        stylists: "salon-stylists",
        packages: "salon-packages",
        blog: "salon-blog",
      },
      sortOrder: 2,
    },

    SCHOOL_AND_EDUCATION: {
      name: "Edu Smart Theme",
      code: "edu_smart_theme",
      primaryColor: "#059669",
      secondaryColor: "#3b82f6",
      backgroundColor: "#f0fdf4",
      textColor: "#1f2937",
      logoUrl: "/themes/education/logo.png",
      primaryFont: "Roboto, sans-serif",
      dashboardTemplate: {
        layout: "grid",
        widgets: ["student_attendance", "teacher_attendance", "exam_results", "fee_collection"],
        sidebar: true,
        header: true,
        footer: true,
      },
      websiteTemplate: {
        homepage: "edu-landing",
        about: "edu-about",
        admissions: "edu-admissions",
        academics: "edu-academics",
        faculty: "edu-faculty",
        blog: "edu-blog",
      },
      sortOrder: 3,
    },

    COACHING_INSTITUTE: {
      name: "Coaching Theme",
      code: "coaching_theme",
      primaryColor: "#dc2626",
      secondaryColor: "#f59e0b",
      backgroundColor: "#fff7ed",
      textColor: "#374151",
      logoUrl: "/themes/coaching/logo.png",
      primaryFont: "Lato, sans-serif",
      dashboardTemplate: {
        layout: "grid",
        widgets: ["student_attendance", "class_performance", "revenue", "faculty_performance"],
        sidebar: true,
        header: true,
        footer: false,
      },
      websiteTemplate: {
        homepage: "coaching-landing",
        courses: "coaching-courses",
        faculty: "coaching-faculty",
        results: "coaching-results",
        blog: "coaching-blog",
      },
      sortOrder: 4,
    },

    RESTAURANT_AND_CAFE: {
      name: "Restaurant Theme",
      code: "restaurant_theme",
      primaryColor: "#ea580c",
      secondaryColor: "#ca8a04",
      backgroundColor: "#fefcfb",
      textColor: "#1f2937",
      logoUrl: "/themes/restaurant/logo.png",
      primaryFont: "Merriweather, serif",
      dashboardTemplate: {
        layout: "grid",
        widgets: ["orders_today", "kitchen_queue", "revenue", "inventory_alerts"],
        sidebar: true,
        header: true,
        footer: false,
      },
      websiteTemplate: {
        homepage: "restaurant-landing",
        menu: "restaurant-menu",
        reservation: "restaurant-reservation",
        blog: "restaurant-blog",
      },
      sortOrder: 5,
    },

    HOTEL_AND_HOSPITALITY: {
      name: "Hotel Premium Theme",
      code: "hotel_theme",
      primaryColor: "#1e40af",
      secondaryColor: "#3b82f6",
      backgroundColor: "#f8fafc",
      textColor: "#1f2937",
      logoUrl: "/themes/hotel/logo.png",
      primaryFont: "Playfair Display, serif",
      dashboardTemplate: {
        layout: "grid",
        widgets: ["occupancy_rate", "checkins_today", "revenue", "housekeeping_status"],
        sidebar: true,
        header: true,
        footer: false,
      },
      websiteTemplate: {
        homepage: "hotel-landing",
        rooms: "hotel-rooms",
        amenities: "hotel-amenities",
        booking: "hotel-booking",
        gallery: "hotel-gallery",
      },
      sortOrder: 6,
    },

    HEALTHCARE_CLINIC: {
      name: "Healthcare Theme",
      code: "healthcare_theme",
      primaryColor: "#0369a1",
      secondaryColor: "#10b981",
      backgroundColor: "#f0fdf4",
      textColor: "#1f2937",
      logoUrl: "/themes/healthcare/logo.png",
      primaryFont: "Open Sans, sans-serif",
      dashboardTemplate: {
        layout: "grid",
        widgets: ["patients_today", "appointments_today", "revenue", "waiting_patients"],
        sidebar: true,
        header: true,
        footer: false,
      },
      websiteTemplate: {
        homepage: "healthcare-landing",
        doctors: "healthcare-doctors",
        services: "healthcare-services",
        appointments: "healthcare-appointments",
        articles: "healthcare-articles",
      },
      sortOrder: 7,
    },

    ECOMMERCE: {
      name: "Ecommerce Theme",
      code: "ecommerce_theme",
      primaryColor: "#7c3aed",
      secondaryColor: "#ec4899",
      backgroundColor: "#faf5ff",
      textColor: "#1f2937",
      logoUrl: "/themes/ecommerce/logo.png",
      primaryFont: "Montserrat, sans-serif",
      dashboardTemplate: {
        layout: "grid",
        widgets: ["orders_today", "revenue", "top_products", "low_stock"],
        sidebar: true,
        header: true,
        footer: false,
      },
      websiteTemplate: {
        homepage: "ecommerce-landing",
        shop: "ecommerce-shop",
        cart: "ecommerce-cart",
        wishlist: "ecommerce-wishlist",
        blog: "ecommerce-blog",
      },
      sortOrder: 8,
    },

    LOGISTICS_AND_DELIVERY: {
      name: "Logistics Theme",
      code: "logistics_theme",
      primaryColor: "#059669",
      secondaryColor: "#0ea5e9",
      backgroundColor: "#eff6ff",
      textColor: "#1f2937",
      logoUrl: "/themes/logistics/logo.png",
      primaryFont: "Source Sans Pro, sans-serif",
      dashboardTemplate: {
        layout: "grid",
        widgets: ["active_shipments", "drivers_online", "revenue", "delayed_deliveries"],
        sidebar: true,
        header: true,
        footer: false,
      },
      websiteTemplate: {
        homepage: "logistics-landing",
        services: "logistics-services",
        tracking: "logistics-tracking",
        fleet: "logistics-fleet",
      },
      sortOrder: 9,
    },

    TAILOR_SHOP: {
      name: "Tailor Theme",
      code: "tailor_theme",
      primaryColor: "#92400e",
      secondaryColor: "#d97706",
      backgroundColor: "#fffbeb",
      textColor: "#1f2937",
      logoUrl: "/themes/tailor/logo.png",
      primaryFont: "Playfair Display, serif",
      dashboardTemplate: {
        layout: "grid",
        widgets: ["orders_today", "production_queue", "fabric_usage", "completed_orders"],
        sidebar: true,
        header: true,
        footer: false,
      },
      websiteTemplate: {
        homepage: "tailor-landing",
        services: "tailor-services",
        designs: "tailor-designs",
        gallery: "tailor-gallery",
        blog: "tailor-blog",
      },
      sortOrder: 10,
    },

    NGO: {
      name: "NGO Theme",
      code: "ngo_theme",
      primaryColor: "#dc2626",
      secondaryColor: "#ef4444",
      backgroundColor: "#fef2f2",
      textColor: "#1f2937",
      logoUrl: "/themes/ngo/logo.png",
      primaryFont: "Nunito, sans-serif",
      dashboardTemplate: {
        layout: "grid",
        widgets: ["donations_today", "campaigns_active", "revenue", "impact_metrics"],
        sidebar: true,
        header: true,
        footer: true,
      },
      websiteTemplate: {
        homepage: "ngo-landing",
        projects: "ngo-projects",
        impact: "ngo-impact",
        events: "ngo-events",
        volunteer: "ngo-volunteer",
        donate: "ngo-donate",
        gallery: "ngo-gallery",
      },
      sortOrder: 11,
    },

    SME_CORPORATE: {
      name: "Corporate Theme",
      code: "corporate_theme",
      primaryColor: "#1e293b",
      secondaryColor: "#64748b",
      backgroundColor: "#f8fafc",
      textColor: "#0f172a",
      logoUrl: "/themes/corporate/logo.png",
      primaryFont: "Inter, sans-serif",
      dashboardTemplate: {
        layout: "grid",
        widgets: ["monthly_revenue", "project_status", "employee_count", "system_alerts"],
        sidebar: true,
        header: true,
        footer: false,
      },
      websiteTemplate: {
        homepage: "corporate-landing",
        services: "corporate-services",
        projects: "corporate-projects",
        team: "corporate-team",
        blog: "corporate-blog",
        contact: "corporate-contact",
      },
      sortOrder: 12,
    },

    SCHOOL_AND_EDUCATION_SECONDARY: {
      name: "Edu Smart Theme",
      code: "edu_smart_theme",
      primaryColor: "#059669",
      secondaryColor: "#3b82f6",
      backgroundColor: "#f0fdf4",
      textColor: "#1f2937",
      logoUrl: "/themes/education/logo.png",
      primaryFont: "Roboto, sans-serif",
      dashboardTemplate: {
        layout: "grid",
        widgets: ["student_attendance", "teacher_attendance", "exam_results", "fee_collection"],
        sidebar: true,
        header: true,
        footer: true,
      },
      websiteTemplate: {
        homepage: "edu-landing",
        about: "edu-about",
        admissions: "edu-admissions",
        academics: "edu-academics",
        faculty: "edu-faculty",
        blog: "edu-blog",
      },
      sortOrder: 13,
    },
  };

  return themeConfigs[domainCode] || themeConfigs.FITNESS_CENTER;
}

async function main() {
  try {
    await seedDomains();
    console.log("✅ Domain seeding completed successfully!");
  } catch (error) {
    console.error("❌ Error seeding domains:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
