import type { ApiClient } from '../client';

export interface BusinessTypeTemplate {
  id: string;
  domainType: string;
  name: string;
  description: string;
  tagline: string;
  heroImage?: string;
  colorPrimary: string;
  colorAccent: string;
  colorBg: string;
  fontHeading: string;
  fontBody: string;
  websiteSections: Record<string, unknown>;
  onboardingSteps: Array<{ step: number; title: string; fields: string[] }>;
  dashboardLayout: { widgets: Array<{ id: string; col: number; row: number; w: number; h: number }> };
  features: Record<string, boolean>;
}

export const businessTemplatesApi = (c: ApiClient) => ({
  list: () => c.get<BusinessTypeTemplate[]>('/api/business-templates'),
  get: (domainType: string) =>
    c.get<BusinessTypeTemplate>(`/api/business-templates/${encodeURIComponent(domainType)}`),
});
