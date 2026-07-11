'use client';

/**
 * Customer dashboard router - business-type aware. Fitness tenants get the
 * full workout/diet dashboard fed by the fitness API; every other vertical
 * gets its registry-driven dashboard (see lib/vertical.ts and GenericHome).
 */
import { useTenantInfo } from '../lib/tenant-info';
import FitnessHome from './_components/FitnessHome';
import GenericHome from './_components/GenericHome';

export default function Home() {
  const { vertical, loading, primary } = useTenantInfo();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: primary, borderTopColor: 'transparent' }} />
      </div>
    );
  }
  return vertical.key === 'fitness' ? <FitnessHome /> : <GenericHome />;
}
