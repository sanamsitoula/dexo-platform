'use client';

/**
 * Onboarding router - picks the flow for the tenant's business type.
 * Fitness gets the full goals/BMI/plan/payment journey; every other vertical
 * gets its registry-driven flow (see lib/vertical.ts). No hardcoded business.
 */
import { useTenantInfo } from '../../lib/tenant-info';
import FitnessOnboarding from './FitnessOnboarding';
import GenericOnboarding from './GenericOnboarding';

export default function OnboardingPage() {
  const { vertical, loading, primary } = useTenantInfo();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: primary, borderTopColor: 'transparent' }} />
      </div>
    );
  }
  return vertical.key === 'fitness' ? <FitnessOnboarding /> : <GenericOnboarding />;
}
