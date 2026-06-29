// Domain seeding data for 12 domain types
// Generated based on the domain-driven architecture requirements

module.exports = {
  domains: [
    {
      name: "Fitness Center",
      code: "FITNESS_CENTER",
      description: "Gym and fitness center management with workout programs, members, trainers, and nutrition plans",
      modulesEnabled: [
        "fitness_members",
        "fitness_trainers", 
        "workout_programs",
        "nutrition_plans",
        "attendance",
        "progress_tracking",
        "measurements",
        "class_scheduling",
        "membership_packages",
        "pos_fitness",
        "fitness_crm"
      ],
      theme: "fitness_theme"
    },
    {
      name: "Salon & Spa",
      code: "SALON_AND_SPA", 
      description: "Beauty salon, spa, and wellness services with appointments and customer management",
      modulesEnabled: [
        "salon_appointments",
        "service_catalog",
        "packages",
        "customer_history",
        "membership",
        "gift_cards",
        "beauty_crm",
        "inventory"
      ],
      theme: "salon_theme"
    },
    {
      name: "School & Education",
      code: "SCHOOL_AND_EDUCATION",
      description: "Educational institution management with students, teachers, classes, and academic records",
      modulesEnabled: [
        "students",
        "teachers",
        "classes",
        "attendance",
        "examinations",
        "grading",
        "timetable",
        "parent_portal",
        "library",
        "assignments",
        "finance_school",
        "transport"
      ],
      theme: "edu_smart_theme"
    },
    {
      name: "Coaching Institute",
      code: "COACHING_INSTITUTE",
      description: "Educational coaching center for competitive exams and skill development",
      modulesEnabled: [
        "students",
        "batches",
        "courses",
        "attendance",
        "mock_tests",
        "results",
        "faculty",
        "fee_management"
      ],
      theme: "coaching_theme"
    },
    {
      name: "Restaurant & Cafe",
      code: "RESTAURANT_AND_CAFE",
      description: "Food service management with POS, orders, inventory, and customer relations",
      modulesEnabled: [
        "pos_restaurant",
        "orders",
        "kitchen",
        "tables",
        "menu",
        "reservations",
        "inventory",
        "delivery",
        "crm_restaurant",
        "loyalty"
      ],
      theme: "restaurant_theme"
    },
    {
      name: "Hotel & Hospitality",
      code: "HOTEL_AND_HOSPITALITY",
      description: "Hotel and accommodation management with rooms, reservations, and guest services",
      modulesEnabled: [
        "room_management",
        "reservations",
        "housekeeping",
        "guests",
        "billing",
        "crm_hospitality"
      ],
      theme: "hotel_theme"
    },
    {
      name: "Healthcare / Clinic",
      code: "HEALTHCARE_CLINIC",
      description: "Medical clinic management with patients, doctors, appointments, and medical records",
      modulesEnabled: [
        "patients",
        "doctors",
        "appointments",
        "medical_records",
        "prescriptions",
        "billing",
        "lab_reports"
      ],
      theme: "healthcare_theme"
    },
    {
      name: "Ecommerce",
      code: "ECOMMERCE",
      description: "Online store with products, categories, orders, and customer management",
      modulesEnabled: [
        "products",
        "categories",
        "orders",
        "inventory",
        "shipping",
        "coupons",
        "crm_ecommerce",
        "reviews",
        "marketing"
      ],
      theme: "ecommerce_theme"
    },
    {
      name: "Logistics & Delivery",
      code: "LOGISTICS_AND_DELIVERY",
      description: "Shipping and delivery management with fleet, drivers, and tracking",
      modulesEnabled: [
        "shipments",
        "fleet",
        "drivers",
        "routes",
        "tracking",
        "warehouses",
        "crm_logistics"
      ],
      theme: "logistics_theme"
    },
    {
      name: "Tailor Shop",
      code: "TAILOR_SHOP",
      description: "Custom tailoring business with measurements, patterns, and production workflow",
      modulesEnabled: [
        "customers",
        "measurements",
        "orders",
        "fabrics",
        "production_workflow"
      ],
      theme: "tailor_theme"
    },
    {
      name: "NGO",
      code: "NGO",
      description: "Non-profit organization management with donors, campaigns, and volunteer coordination",
      modulesEnabled: [
        "donors",
        "campaigns",
        "projects",
        "volunteers",
        "events",
        "grants",
        "reporting"
      ],
      theme: "ngo_theme"
    },
    {
      name: "SME / Corporate",
      code: "SME_CORPORATE",
      description: "Business management with CRM, HR, projects, and corporate operations",
      modulesEnabled: [
        "crm_sme",
        "hr",
        "projects",
        "finance_corporate",
        "payroll",
        "procurement",
        "assets",
        "documents"
      ],
      theme: "corporate_theme"
    }
  ]
};