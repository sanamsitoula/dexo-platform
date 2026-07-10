export interface TenantInfo {
  id: string
  name: string
  subdomain: string
  domain?: string
  status: string
  settings?: any
  domainCode?: string
}

export interface TenantUser {
  id: string
  email: string
  firstName?: string
  lastName?: string
  tenantId: string
  roles?: string[]
}

export interface DomainMenu {
  name: string
  href: string
  icon: string
  module?: string
}

export const DOMAIN_MENUS: Record<string, DomainMenu[]> = {
  FITNESS_CENTER: [
    { name: 'Dashboard', href: '/dashboard', icon: 'chart', module: 'DASHBOARD' },
    { name: 'Members', href: '/members', icon: 'users', module: 'MEMBERS' },
    { name: 'Trainers', href: '/trainers', icon: 'user', module: 'TRAINERS' },
    { name: 'Classes', href: '/classes', icon: 'calendar', module: 'CLASSES' },
    { name: 'Check-in', href: '/attendance', icon: 'clipboard', module: 'CHECKIN' },
    { name: 'Workouts', href: '/workouts', icon: 'document', module: 'WORKOUTS' },
    { name: 'Diet Plans', href: '/diet', icon: 'document', module: 'DIET' },
    { name: 'Assessments', href: '/assessments', icon: 'clipboard', module: 'ASSESSMENTS' },
    { name: 'Equipment', href: '/equipment', icon: 'building', module: 'EQUIPMENT' },
    { name: 'Badges', href: '/badges', icon: 'document', module: 'BADGES' },
    { name: 'Referrals', href: '/referrals', icon: 'inbox', module: 'REFERRALS' },
    { name: 'Food DB', href: '/food-db', icon: 'clipboard', module: 'FOOD_DB' },
    { name: 'CRM', href: '/crm', icon: 'inbox', module: 'CRM' },
    { name: 'Finance', href: '/finance', icon: 'dollar', module: 'FINANCE' },
    { name: 'Users', href: '/users', icon: 'users', module: 'USERS' },
    { name: 'Settings', href: '/settings', icon: 'settings', module: 'SETTINGS' },
  ],
  SALON_AND_SPA: [
    { name: 'Dashboard', href: '/dashboard', icon: 'chart', module: 'DASHBOARD' },
    { name: 'Appointments', href: '/appointments', icon: 'calendar', module: 'APPOINTMENTS' },
    { name: 'Stylists', href: '/stylists', icon: 'users', module: 'STYLISTS' },
    { name: 'Services', href: '/services', icon: 'scissors', module: 'SERVICES' },
    { name: 'CRM', href: '/crm', icon: 'inbox', module: 'CRM' },
    { name: 'Finance', href: '/finance', icon: 'dollar', module: 'FINANCE' },
    { name: 'Users', href: '/users', icon: 'users', module: 'USERS' },
    { name: 'Settings', href: '/settings', icon: 'settings', module: 'SETTINGS' },
  ],
  SCHOOL_AND_EDUCATION: [
    { name: 'Dashboard', href: '/dashboard', icon: 'chart', module: 'DASHBOARD' },
    { name: 'Students', href: '/students', icon: 'users', module: 'STUDENTS' },
    { name: 'Teachers', href: '/teachers', icon: 'user', module: 'TEACHERS' },
    { name: 'Classes', href: '/classes', icon: 'calendar', module: 'CLASSES' },
    { name: 'Exams', href: '/exams', icon: 'document', module: 'EXAMS' },
    { name: 'CRM', href: '/crm', icon: 'inbox', module: 'CRM' },
    { name: 'Finance', href: '/finance', icon: 'dollar', module: 'FINANCE' },
    { name: 'Users', href: '/users', icon: 'users', module: 'USERS' },
    { name: 'Settings', href: '/settings', icon: 'settings', module: 'SETTINGS' },
  ],
  COACHING_INSTITUTE: [
    { name: 'Dashboard', href: '/dashboard', icon: 'chart', module: 'DASHBOARD' },
    { name: 'Students', href: '/students', icon: 'users', module: 'STUDENTS' },
    { name: 'Batches', href: '/batches', icon: 'calendar', module: 'BATCHES' },
    { name: 'Courses', href: '/courses', icon: 'document', module: 'COURSES' },
    { name: 'CRM', href: '/crm', icon: 'inbox', module: 'CRM' },
    { name: 'Finance', href: '/finance', icon: 'dollar', module: 'FINANCE' },
    { name: 'Settings', href: '/settings', icon: 'settings', module: 'SETTINGS' },
  ],
  RESTAURANT_AND_CAFE: [
    { name: 'Dashboard', href: '/dashboard', icon: 'chart', module: 'DASHBOARD' },
    { name: 'Orders', href: '/orders', icon: 'inbox', module: 'ORDERS' },
    { name: 'Tables', href: '/tables', icon: 'calendar', module: 'TABLES' },
    { name: 'Menu', href: '/menu', icon: 'document', module: 'MENU' },
    { name: 'Reservations', href: '/reservations', icon: 'calendar', module: 'RESERVATIONS' },
    { name: 'Finance', href: '/finance', icon: 'dollar', module: 'FINANCE' },
    { name: 'Settings', href: '/settings', icon: 'settings', module: 'SETTINGS' },
  ],
  HOTEL_AND_HOSPITALITY: [
    { name: 'Dashboard', href: '/dashboard', icon: 'chart', module: 'DASHBOARD' },
    { name: 'Rooms', href: '/rooms', icon: 'building', module: 'ROOMS' },
    { name: 'Reservations', href: '/reservations', icon: 'calendar', module: 'RESERVATIONS' },
    { name: 'Guests', href: '/guests', icon: 'users', module: 'GUESTS' },
    { name: 'Housekeeping', href: '/housekeeping', icon: 'settings', module: 'HOUSEKEEPING' },
    { name: 'Finance', href: '/finance', icon: 'dollar', module: 'FINANCE' },
    { name: 'Settings', href: '/settings', icon: 'settings', module: 'SETTINGS' },
  ],
  HEALTHCARE_CLINIC: [
    { name: 'Dashboard', href: '/dashboard', icon: 'chart', module: 'DASHBOARD' },
    { name: 'Patients', href: '/patients', icon: 'users', module: 'PATIENTS' },
    { name: 'Doctors', href: '/doctors', icon: 'user', module: 'DOCTORS' },
    { name: 'Appointments', href: '/appointments', icon: 'calendar', module: 'APPOINTMENTS' },
    { name: 'Prescriptions', href: '/prescriptions', icon: 'document', module: 'PRESCRIPTIONS' },
    { name: 'Finance', href: '/finance', icon: 'dollar', module: 'FINANCE' },
    { name: 'Settings', href: '/settings', icon: 'settings', module: 'SETTINGS' },
  ],
  ECOMMERCE: [
    { name: 'Dashboard', href: '/dashboard', icon: 'chart', module: 'DASHBOARD' },
    { name: 'Products', href: '/products', icon: 'building', module: 'PRODUCTS' },
    { name: 'Orders', href: '/orders', icon: 'inbox', module: 'ORDERS' },
    { name: 'Inventory', href: '/inventory', icon: 'clipboard', module: 'INVENTORY' },
    { name: 'Customers', href: '/crm', icon: 'users', module: 'CRM' },
    { name: 'Finance', href: '/finance', icon: 'dollar', module: 'FINANCE' },
    { name: 'Settings', href: '/settings', icon: 'settings', module: 'SETTINGS' },
  ],
  DEFAULT: [
    { name: 'Dashboard', href: '/dashboard', icon: 'chart', module: 'DASHBOARD' },
    { name: 'CRM', href: '/crm', icon: 'inbox', module: 'CRM' },
    { name: 'Finance', href: '/finance', icon: 'dollar', module: 'FINANCE' },
    { name: 'Users', href: '/users', icon: 'users', module: 'USERS' },
    { name: 'Settings', href: '/settings', icon: 'settings', module: 'SETTINGS' },
  ],
}

export const DOMAIN_THEMES: Record<string, { primary: string; secondary: string; name: string }> = {
  FITNESS_CENTER: { primary: '#dc2626', secondary: '#1f2937', name: 'Fitness Pro' },
  SALON_AND_SPA: { primary: '#ec4899', secondary: '#f9fafb', name: 'Beauty Salon' },
  SCHOOL_AND_EDUCATION: { primary: '#2563eb', secondary: '#1e40af', name: 'Edu Smart' },
  COACHING_INSTITUTE: { primary: '#7c3aed', secondary: '#5b21b6', name: 'Coaching' },
  RESTAURANT_AND_CAFE: { primary: '#ea580c', secondary: '#1f2937', name: 'Restaurant' },
  HOTEL_AND_HOSPITALITY: { primary: '#0d9488', secondary: '#134e4a', name: 'Hotel Premium' },
  HEALTHCARE_CLINIC: { primary: '#0284c7', secondary: '#f0f9ff', name: 'Healthcare' },
  ECOMMERCE: { primary: '#4f46e5', secondary: '#1e1b4b', name: 'Ecommerce' },
  LOGISTICS_AND_DELIVERY: { primary: '#0369a1', secondary: '#0c4a6e', name: 'Logistics' },
  TAILOR_SHOP: { primary: '#a855f7', secondary: '#581c87', name: 'Tailor' },
  NGO: { primary: '#16a34a', secondary: '#14532d', name: 'NGO' },
  SME_CORPORATE: { primary: '#475569', secondary: '#1e293b', name: 'Corporate' },
}

// Cross-vertical modules — available to EVERY business type / tenant:
// biometric attendance (ZKTeco devices, logs, reports) and tenant SMTP email.
const COMMON_MENUS: DomainMenu[] = [
  { name: 'Devices', href: '/devices', icon: 'settings', module: 'ATTENDANCE_DEVICES' },
  { name: 'Attendance Logs', href: '/attendance-logs', icon: 'clipboard', module: 'ATTENDANCE_LOGS' },
  { name: 'Attendance Reports', href: '/attendance-reports', icon: 'chart', module: 'ATTENDANCE_REPORTS' },
  { name: 'Email (SMTP)', href: '/email', icon: 'inbox', module: 'EMAIL' },
]

export function getDomainMenus(domainCode?: string): DomainMenu[] {
  const base = (domainCode && DOMAIN_MENUS[domainCode]) || DOMAIN_MENUS.DEFAULT
  // Insert the common modules just before Settings (last item by convention).
  const settingsIdx = base.findIndex((m) => m.href === '/settings')
  const extra = COMMON_MENUS.filter((c) => !base.some((m) => m.href === c.href))
  if (settingsIdx === -1) return [...base, ...extra]
  return [...base.slice(0, settingsIdx), ...extra, ...base.slice(settingsIdx)]
}

export function getDomainTheme(domainCode?: string) {
  if (!domainCode) return DOMAIN_THEMES.SME_CORPORATE
  return DOMAIN_THEMES[domainCode] || DOMAIN_THEMES.SME_CORPORATE
}
