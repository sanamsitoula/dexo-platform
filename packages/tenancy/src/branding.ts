export interface BrandingTemplate {
  colorPrimary: string;
  colorAccent: string;
  colorBg: string;
  fontHeading: string;
  fontBody: string;
  logoUrl?: string;
}

export interface TenantBranding {
  name: string;
  colorPrimary: string;
  colorAccent: string;
  colorBg: string;
  logoUrl?: string;
  fontHeading?: string;
  fontBody?: string;
}

/**
 * Merge template defaults with tenant overrides.
 * Tenant takes precedence; missing fields fall back to template.
 */
export function mergeBranding(
  template: BrandingTemplate,
  tenant: TenantBranding,
): Required<BrandingTemplate> {
  return {
    colorPrimary: tenant.colorPrimary || template.colorPrimary,
    colorAccent: tenant.colorAccent || template.colorAccent,
    colorBg: tenant.colorBg || template.colorBg,
    fontHeading: tenant.fontHeading || template.fontHeading,
    fontBody: tenant.fontBody || template.fontBody,
    logoUrl: tenant.logoUrl || template.logoUrl || '',
  };
}

export function brandingCssVars(b: Required<BrandingTemplate>): string {
  return [
    `--color-primary: ${b.colorPrimary};`,
    `--color-accent: ${b.colorAccent};`,
    `--color-bg: ${b.colorBg};`,
    `--font-heading: ${b.fontHeading};`,
    `--font-body: ${b.fontBody};`,
  ].join(' ');
}
