import { useTenantInfo } from '../../lib/tenant-info';

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const FITNESS_ITEMS: NavItem[] = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/workouts', label: 'Workouts', icon: '🏋️' },
  { href: '/diet', label: 'Diet', icon: '🥗' },
  { href: '/membership', label: 'My Plan', icon: '💳' },
  { href: '/account', label: 'Profile', icon: '👤' },
];

/** Shared nav-item resolution for BottomNav (mobile) and TopNav (desktop) —
 * one source of truth so the two surfaces never drift out of sync. */
export function useNavItems(): NavItem[] {
  const { vertical } = useTenantInfo();
  if (vertical.key === 'fitness') return FITNESS_ITEMS;
  return [
    { href: '/', label: 'Home', icon: '🏠' },
    ...vertical.quickActions
      .filter((a) => a.href !== '/account')
      .slice(0, 3)
      .map((a) => ({ href: a.href, label: a.label.split(' ')[0], icon: a.icon })),
    { href: '/account', label: 'Profile', icon: '👤' },
  ];
}
