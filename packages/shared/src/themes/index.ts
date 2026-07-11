export interface IndustryTheme {
  id: string;
  name: string;
  industry: string;
  description: string;
  premium: boolean;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    success: string;
    warning: string;
    error: string;
  };
  logo: string;
  menuItems: MenuItem[];
  features: string[];
  landingHero: {
    title: string;
    subtitle: string;
    cta: string;
  };
}

export interface MenuItem {
  label: string;
  path: string;
  icon: string;
  show: boolean;
}

export const industryThemes: IndustryTheme[] = [
  {
    id: 'fitness-pro',
    name: 'Fitness Pro',
    industry: 'Fitness Centers',
    description: 'Member management, workout tracking, trainer scheduling, progress analytics',
    premium: true,
    colors: {
      primary: '#FF6B35',
      secondary: '#1A1A2E',
      accent: '#E94560',
      background: '#0F0F23',
      surface: '#1A1A2E',
      text: '#FFFFFF',
      textSecondary: '#A0A0B0',
      success: '#00C853',
      warning: '#FFB300',
      error: '#FF5252',
    },
    logo: '💪',
    menuItems: [
      { label: 'Dashboard', path: '/dashboard', icon: 'home', show: true },
      { label: 'Workouts', path: '/workouts', icon: 'barbell', show: true },
      { label: 'Progress', path: '/progress', icon: 'stats-chart', show: true },
      { label: 'Trainers', path: '/trainers', icon: 'people', show: true },
      { label: 'Members', path: '/members', icon: 'person', show: true },
      { label: 'Schedule', path: '/schedule', icon: 'calendar', show: true },
      { label: 'Billing', path: '/billing', icon: 'card', show: true },
      { label: 'Notifications', path: '/notifications', icon: 'notifications', show: true },
    ],
    features: ['Workout Tracking', 'Progress Analytics', 'Trainer Scheduling', 'Member Management', 'Payment Processing'],
    landingHero: {
      title: 'Transform Your Fitness Journey',
      subtitle: 'All-in-one platform for gyms, trainers, and fitness enthusiasts',
      cta: 'Start Free Trial',
    },
  },
  {
    id: 'edu-smart',
    name: 'EduSmart',
    industry: 'Schools & Education',
    description: 'Student enrollment, attendance, grades, parent portals, course management',
    premium: true,
    colors: {
      primary: '#2563EB',
      secondary: '#1E3A5F',
      accent: '#3B82F6',
      background: '#F0F4FF',
      surface: '#FFFFFF',
      text: '#1E293B',
      textSecondary: '#64748B',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    },
    logo: '📚',
    menuItems: [
      { label: 'Dashboard', path: '/dashboard', icon: 'home', show: true },
      { label: 'Students', path: '/students', icon: 'people', show: true },
      { label: 'Courses', path: '/courses', icon: 'book', show: true },
      { label: 'Attendance', path: '/attendance', icon: 'checkmark-circle', show: true },
      { label: 'Grades', path: '/grades', icon: 'school', show: true },
      { label: 'Schedule', path: '/schedule', icon: 'calendar', show: true },
      { label: 'Parents', path: '/parents', icon: 'people', show: true },
      { label: 'Fees', path: '/fees', icon: 'card', show: true },
    ],
    features: ['Student Enrollment', 'Attendance Tracking', 'Grade Management', 'Parent Portal', 'Course Scheduling'],
    landingHero: {
      title: 'Empower Education Excellence',
      subtitle: 'Complete school management system for modern educational institutions',
      cta: 'Get Started Free',
    },
  },
  {
    id: 'foodie-hub',
    name: 'FoodieHub',
    industry: 'Restaurants & Cafes',
    description: 'Order management, table reservations, menu management, delivery tracking',
    premium: true,
    colors: {
      primary: '#DC2626',
      secondary: '#7C2D12',
      accent: '#F97316',
      background: '#FFFBEB',
      surface: '#FFFFFF',
      text: '#1C1917',
      textSecondary: '#78716C',
      success: '#16A34A',
      warning: '#EAB308',
      error: '#DC2626',
    },
    logo: '🍕',
    menuItems: [
      { label: 'Dashboard', path: '/dashboard', icon: 'home', show: true },
      { label: 'Orders', path: '/orders', icon: 'receipt', show: true },
      { label: 'Menu', path: '/menu', icon: 'restaurant', show: true },
      { label: 'Tables', path: '/tables', icon: 'grid', show: true },
      { label: 'Reservations', path: '/reservations', icon: 'calendar', show: true },
      { label: 'Delivery', path: '/delivery', icon: 'car', show: true },
      { label: 'Staff', path: '/staff', icon: 'people', show: true },
      { label: 'Billing', path: '/billing', icon: 'card', show: true },
    ],
    features: ['Order Management', 'Table Reservations', 'Menu Management', 'Delivery Tracking', 'Staff Scheduling'],
    landingHero: {
      title: 'Streamline Your Restaurant',
      subtitle: 'From kitchen to customer — manage orders, reservations, and deliveries',
      cta: 'Order Now',
    },
  },
  {
    id: 'shop-commerce',
    name: 'ShopCommerce',
    industry: 'Ecommerce',
    description: 'Product catalogs, inventory, orders, customer management, shipping',
    premium: true,
    colors: {
      primary: '#7C3AED',
      secondary: '#4C1D95',
      accent: '#A78BFA',
      background: '#FAF5FF',
      surface: '#FFFFFF',
      text: '#1E1B4B',
      textSecondary: '#6B7280',
      success: '#059669',
      warning: '#D97706',
      error: '#DC2626',
    },
    logo: '🛒',
    menuItems: [
      { label: 'Dashboard', path: '/dashboard', icon: 'home', show: true },
      { label: 'Products', path: '/products', icon: 'cube', show: true },
      { label: 'Orders', path: '/orders', icon: 'cart', show: true },
      { label: 'Customers', path: '/customers', icon: 'people', show: true },
      { label: 'Inventory', path: '/inventory', icon: 'layers', show: true },
      { label: 'Shipping', path: '/shipping', icon: 'car', show: true },
      { label: 'Analytics', path: '/analytics', icon: 'stats-chart', show: true },
      { label: 'Settings', path: '/settings', icon: 'settings', show: true },
    ],
    features: ['Product Catalog', 'Order Management', 'Inventory Tracking', 'Customer CRM', 'Shipping Integration'],
    landingHero: {
      title: 'Launch Your Online Store',
      subtitle: 'Everything you need to sell online — products, orders, and payments',
      cta: 'Start Selling',
    },
  },
  {
    id: 'logi-track',
    name: 'LogiTrack',
    industry: 'Logistics & Delivery',
    description: 'Fleet tracking, route optimization, shipment management, driver apps',
    premium: true,
    colors: {
      primary: '#0891B2',
      secondary: '#164E63',
      accent: '#22D3EE',
      background: '#ECFEFF',
      surface: '#FFFFFF',
      text: '#0C4A6E',
      textSecondary: '#6B7280',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    },
    logo: '🚚',
    menuItems: [
      { label: 'Dashboard', path: '/dashboard', icon: 'home', show: true },
      { label: 'Fleet', path: '/fleet', icon: 'car', show: true },
      { label: 'Shipments', path: '/shipments', icon: 'cube', show: true },
      { label: 'Routes', path: '/routes', icon: 'map', show: true },
      { label: 'Drivers', path: '/drivers', icon: 'people', show: true },
      { label: 'Tracking', path: '/tracking', icon: 'location', show: true },
      { label: 'Billing', path: '/billing', icon: 'card', show: true },
      { label: 'Reports', path: '/reports', icon: 'stats-chart', show: true },
    ],
    features: ['Fleet Management', 'Route Optimization', 'Real-time Tracking', 'Driver Management', 'Delivery Analytics'],
    landingHero: {
      title: 'Optimize Your Delivery Network',
      subtitle: 'Real-time fleet tracking, route planning, and shipment management',
      cta: 'Track Now',
    },
  },
  {
    id: 'style-tailor',
    name: 'StyleTailor',
    industry: 'Tailor Shops',
    description: 'Order tracking, measurements, fabric inventory, customer management',
    premium: false,
    colors: {
      primary: '#DB2777',
      secondary: '#831843',
      accent: '#F472B6',
      background: '#FDF2F8',
      surface: '#FFFFFF',
      text: '#1F2937',
      textSecondary: '#6B7280',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    },
    logo: '✂️',
    menuItems: [
      { label: 'Dashboard', path: '/dashboard', icon: 'home', show: true },
      { label: 'Orders', path: '/orders', icon: 'receipt', show: true },
      { label: 'Measurements', path: '/measurements', icon: 'resize', show: true },
      { label: 'Fabrics', path: '/fabrics', icon: 'layers', show: true },
      { label: 'Customers', path: '/customers', icon: 'people', show: true },
      { label: 'Billing', path: '/billing', icon: 'card', show: true },
    ],
    features: ['Order Tracking', 'Measurement Management', 'Fabric Inventory', 'Customer Profiles', 'Alteration Tracking'],
    landingHero: {
      title: 'Perfect Every Stitch',
      subtitle: 'Manage orders, measurements, and customers with ease',
      cta: 'Get Started',
    },
  },
  {
    id: 'coach-academy',
    name: 'CoachAcademy',
    industry: 'Coaching Institutes',
    description: 'Batch scheduling, student progress, fee management, parent communication',
    premium: false,
    colors: {
      primary: '#059669',
      secondary: '#064E3B',
      accent: '#34D399',
      background: '#ECFDF5',
      surface: '#FFFFFF',
      text: '#065F46',
      textSecondary: '#6B7280',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    },
    logo: '🎓',
    menuItems: [
      { label: 'Dashboard', path: '/dashboard', icon: 'home', show: true },
      { label: 'Batches', path: '/batches', icon: 'grid', show: true },
      { label: 'Students', path: '/students', icon: 'people', show: true },
      { label: 'Progress', path: '/progress', icon: 'trending-up', show: true },
      { label: 'Fees', path: '/fees', icon: 'card', show: true },
      { label: 'Schedule', path: '/schedule', icon: 'calendar', show: true },
      { label: 'Parents', path: '/parents', icon: 'people', show: true },
      { label: 'Results', path: '/results', icon: 'school', show: true },
    ],
    features: ['Batch Management', 'Student Progress', 'Fee Collection', 'Parent Communication', 'Exam Results'],
    landingHero: {
      title: 'Elevate Learning Outcomes',
      subtitle: 'Complete coaching institute management — batches, fees, and results',
      cta: 'Join Now',
    },
  },
  {
    id: 'beauty-salon',
    name: 'BeautySalon',
    industry: 'Salons & Spas',
    description: 'Appointment booking, stylist management, service catalogs, loyalty programs',
    premium: true,
    colors: {
      primary: '#A855F7',
      secondary: '#581C87',
      accent: '#C084FC',
      background: '#FAF5FF',
      surface: '#FFFFFF',
      text: '#1E1B4B',
      textSecondary: '#6B7280',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    },
    logo: '💇',
    menuItems: [
      { label: 'Dashboard', path: '/dashboard', icon: 'home', show: true },
      { label: 'Appointments', path: '/appointments', icon: 'calendar', show: true },
      { label: 'Services', path: '/services', icon: 'star', show: true },
      { label: 'Stylists', path: '/stylists', icon: 'people', show: true },
      { label: 'Clients', path: '/clients', icon: 'person', show: true },
      { label: 'Loyalty', path: '/loyalty', icon: 'heart', show: true },
      { label: 'Products', path: '/products', icon: 'cube', show: true },
      { label: 'Billing', path: '/billing', icon: 'card', show: true },
    ],
    features: ['Appointment Booking', 'Stylist Scheduling', 'Service Catalog', 'Loyalty Programs', 'Product Sales'],
    landingHero: {
      title: 'Elevate the Beauty Experience',
      subtitle: 'Premium salon management — appointments, stylists, and loyalty rewards',
      cta: 'Book Now',
    },
  },
  {
    id: 'stay-hotel',
    name: 'StayHotel',
    industry: 'Hotels & Hospitality',
    description: 'Room booking, guest management, housekeeping, billing',
    premium: true,
    colors: {
      primary: '#B45309',
      secondary: '#78350F',
      accent: '#F59E0B',
      background: '#FFFBEB',
      surface: '#FFFFFF',
      text: '#1C1917',
      textSecondary: '#78716C',
      success: '#16A34A',
      warning: '#EAB308',
      error: '#DC2626',
    },
    logo: '🏨',
    menuItems: [
      { label: 'Dashboard', path: '/dashboard', icon: 'home', show: true },
      { label: 'Bookings', path: '/bookings', icon: 'calendar', show: true },
      { label: 'Rooms', path: '/rooms', icon: 'bed', show: true },
      { label: 'Guests', path: '/guests', icon: 'people', show: true },
      { label: 'Housekeeping', path: '/housekeeping', icon: 'sparkles', show: true },
      { label: 'Restaurant', path: '/restaurant', icon: 'restaurant', show: true },
      { label: 'Billing', path: '/billing', icon: 'card', show: true },
      { label: 'Reports', path: '/reports', icon: 'stats-chart', show: true },
    ],
    features: ['Room Booking', 'Guest Management', 'Housekeeping', 'Restaurant POS', 'Revenue Management'],
    landingHero: {
      title: 'Deliver Exceptional Stays',
      subtitle: 'Complete hotel management — bookings, guests, and operations',
      cta: 'Book Now',
    },
  },
  {
    id: 'medic-health',
    name: 'MedicHealth',
    industry: 'Healthcare',
    description: 'Patient records, appointment scheduling, clinic management',
    premium: true,
    colors: {
      primary: '#0284C7',
      secondary: '#0C4A6E',
      accent: '#38BDF8',
      background: '#F0F9FF',
      surface: '#FFFFFF',
      text: '#0C4A6E',
      textSecondary: '#64748B',
      success: '#10B981',
      warning: '#F59E0B',
      error: '#EF4444',
    },
    logo: '🏥',
    menuItems: [
      { label: 'Dashboard', path: '/dashboard', icon: 'home', show: true },
      { label: 'Patients', path: '/patients', icon: 'people', show: true },
      { label: 'Appointments', path: '/appointments', icon: 'calendar', show: true },
      { label: 'Records', path: '/records', icon: 'document', show: true },
      { label: 'Prescriptions', path: '/prescriptions', icon: 'medical', show: true },
      { label: 'Lab Results', path: '/lab', icon: 'flask', show: true },
      { label: 'Billing', path: '/billing', icon: 'card', show: true },
      { label: 'Staff', path: '/staff', icon: 'people', show: true },
    ],
    features: ['Patient Records', 'Appointment Scheduling', 'Prescription Management', 'Lab Integration', 'Insurance Billing'],
    landingHero: {
      title: 'Modernize Healthcare Delivery',
      subtitle: 'Secure patient management, scheduling, and clinical workflows',
      cta: 'Get Started',
    },
  },
];

export function getThemeById(id: string): IndustryTheme | undefined {
  return industryThemes.find((t) => t.id === id);
}

export function getThemesByPremium(premium: boolean): IndustryTheme[] {
  return industryThemes.filter((t) => t.premium === premium);
}

export function getThemeForIndustry(industry: string): IndustryTheme | undefined {
  return industryThemes.find((t) => t.industry.toLowerCase().includes(industry.toLowerCase()));
}

export * from './templates';
