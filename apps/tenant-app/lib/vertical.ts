/**
 * Business-vertical registry for the customer portal.
 *
 * Everything type-specific (copy, onboarding preferences, dashboard quick
 * actions) is DATA here — pages switch on the resolved vertical instead of
 * hardcoding one business type. Fitness keeps its full custom flow; the other
 * verticals get a tailored generic experience that can be deepened later.
 */

export type VerticalKey = 'fitness' | 'salon' | 'school' | 'restaurant' | 'generic';

export interface QuickAction {
  href: string;
  label: string;
  icon: string;
  desc: string;
}

export interface VerticalConfig {
  key: VerticalKey;
  noun: string;            // what the customer is: member / client / student / guest
  loginTagline: string;
  registerTitle: string;
  registerTagline: string;
  onboardingWelcome: string;
  /** Preference options shown during onboarding (multi-select). */
  preferences: Array<{ key: string; label: string; icon: string }>;
  preferencesTitle: string;
  /** Dashboard quick actions (routes that exist in the portal). */
  quickActions: QuickAction[];
}

const FITNESS: VerticalConfig = {
  key: 'fitness',
  noun: 'member',
  loginTagline: 'Sign in to your membership',
  registerTitle: 'Create your membership',
  registerTagline: 'Join in under a minute',
  onboardingWelcome: 'Let’s set up your fitness journey',
  preferencesTitle: 'What are your goals?',
  preferences: [], // fitness has its own full onboarding flow
  quickActions: [
    { href: '/workouts', label: 'Workouts', icon: '🏋️', desc: 'Your training plan' },
    { href: '/diet', label: 'Diet', icon: '🥗', desc: 'Meals & calories' },
    { href: '/checkin', label: 'Check-in', icon: '📲', desc: 'QR gym entry' },
    { href: '/membership', label: 'My Plan', icon: '💳', desc: 'Membership & dues' },
  ],
};

const SALON: VerticalConfig = {
  key: 'salon',
  noun: 'client',
  loginTagline: 'Sign in to book & manage appointments',
  registerTitle: 'Create your client account',
  registerTagline: 'Book appointments in seconds',
  onboardingWelcome: 'Tell us what you love',
  preferencesTitle: 'Which services interest you?',
  preferences: [
    { key: 'HAIR', label: 'Hair', icon: '💇' },
    { key: 'NAILS', label: 'Nails', icon: '💅' },
    { key: 'SKIN', label: 'Skin & Facial', icon: '✨' },
    { key: 'SPA', label: 'Spa & Massage', icon: '💆' },
    { key: 'MAKEUP', label: 'Makeup', icon: '💄' },
    { key: 'BRIDAL', label: 'Bridal', icon: '👰' },
  ],
  quickActions: [
    { href: '/bookings', label: 'Book Appointment', icon: '📅', desc: 'Pick a service & time' },
    { href: '/explore', label: 'Services', icon: '💇', desc: 'Browse our menu' },
    { href: '/payment', label: 'Payments', icon: '💳', desc: 'Bills & history' },
    { href: '/account', label: 'Profile', icon: '👤', desc: 'Your details' },
  ],
};

const SCHOOL: VerticalConfig = {
  key: 'school',
  noun: 'student',
  loginTagline: 'Sign in to your student portal',
  registerTitle: 'Create your student account',
  registerTagline: 'Access classes, results and more',
  onboardingWelcome: 'Set up your student profile',
  preferencesTitle: 'Which areas interest you?',
  preferences: [
    { key: 'SCIENCE', label: 'Science', icon: '🔬' },
    { key: 'MATH', label: 'Mathematics', icon: '➗' },
    { key: 'LANGUAGE', label: 'Languages', icon: '🗣️' },
    { key: 'ARTS', label: 'Arts', icon: '🎨' },
    { key: 'SPORTS', label: 'Sports', icon: '⚽' },
    { key: 'TECH', label: 'Computers', icon: '💻' },
  ],
  quickActions: [
    { href: '/bookings', label: 'Classes', icon: '📚', desc: 'Schedule & enrolment' },
    { href: '/progress', label: 'Results', icon: '📈', desc: 'Exams & progress' },
    { href: '/payment', label: 'Fees', icon: '💳', desc: 'Pay & view invoices' },
    { href: '/account', label: 'Profile', icon: '👤', desc: 'Student details' },
  ],
};

const RESTAURANT: VerticalConfig = {
  key: 'restaurant',
  noun: 'guest',
  loginTagline: 'Sign in to order & reserve',
  registerTitle: 'Create your account',
  registerTagline: 'Reservations, offers and loyalty',
  onboardingWelcome: 'Tell us your taste',
  preferencesTitle: 'What do you enjoy?',
  preferences: [
    { key: 'VEG', label: 'Vegetarian', icon: '🥦' },
    { key: 'NONVEG', label: 'Non-veg', icon: '🍗' },
    { key: 'SPICY', label: 'Spicy', icon: '🌶️' },
    { key: 'DESSERT', label: 'Desserts', icon: '🍰' },
    { key: 'COFFEE', label: 'Coffee & drinks', icon: '☕' },
    { key: 'FAMILY', label: 'Family dining', icon: '👨‍👩‍👧' },
  ],
  quickActions: [
    { href: '/bookings', label: 'Reserve a Table', icon: '🍽️', desc: 'Book your visit' },
    { href: '/explore', label: 'Menu & Offers', icon: '📖', desc: 'What’s cooking' },
    { href: '/payment', label: 'Payments', icon: '💳', desc: 'Bills & history' },
    { href: '/account', label: 'Profile', icon: '👤', desc: 'Your details' },
  ],
};

const GENERIC: VerticalConfig = {
  key: 'generic',
  noun: 'customer',
  loginTagline: 'Sign in to your account',
  registerTitle: 'Create your account',
  registerTagline: 'Join in under a minute',
  onboardingWelcome: 'Welcome! Let’s finish your profile',
  preferencesTitle: 'What are you interested in?',
  preferences: [
    { key: 'BOOKINGS', label: 'Bookings', icon: '📅' },
    { key: 'OFFERS', label: 'Offers & deals', icon: '🏷️' },
    { key: 'NEWS', label: 'News & updates', icon: '📰' },
    { key: 'SUPPORT', label: 'Support', icon: '💬' },
  ],
  quickActions: [
    { href: '/bookings', label: 'Bookings', icon: '📅', desc: 'Book a service' },
    { href: '/explore', label: 'Explore', icon: '🧭', desc: 'Services & offers' },
    { href: '/payment', label: 'Payments', icon: '💳', desc: 'Bills & history' },
    { href: '/account', label: 'Profile', icon: '👤', desc: 'Your details' },
  ],
};

/** Map a tenant domainType (FITNESS_CENTER, SALON_AND_SPA, …) to a vertical. */
export function resolveVertical(domainType?: string | null): VerticalConfig {
  const d = (domainType || '').toLowerCase();
  if (d.includes('fitness') || d.includes('gym')) return FITNESS;
  if (d.includes('salon') || d.includes('spa') || d.includes('beauty')) return SALON;
  if (d.includes('school') || d.includes('education') || d.includes('coaching')) return SCHOOL;
  if (d.includes('restaurant') || d.includes('cafe') || d.includes('food')) return RESTAURANT;
  return GENERIC;
}
