export * from './fitness';
export * from './restaurant';
export * from './salon';
export * from './hotel';
export * from './healthcare';
export * from './school';
export * from './coaching';
export * from './ecommerce';
export * from './logistics';
export * from './tailor';
export * from './ngo';
export * from './sme';

export const DOMAIN_TYPES = [
  'FITNESS_CENTER',
  'SALON_AND_SPA',
  'RESTAURANT_AND_CAFE',
  'HOTEL_AND_HOSPITALITY',
  'HEALTHCARE_CLINIC',
  'SCHOOL_AND_EDUCATION',
  'COACHING_INSTITUTE',
  'ECOMMERCE',
  'LOGISTICS_AND_DELIVERY',
  'TAILOR_SHOP',
  'NGO',
  'SME_CORPORATE',
] as const;

export type DomainType = (typeof DOMAIN_TYPES)[number];
