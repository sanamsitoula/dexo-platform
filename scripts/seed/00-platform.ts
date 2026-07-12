/**
 * Dexo v5 - 00: Platform admin, plans, global settings, and global
 * reference data (languages, currencies, system permissions/roles,
 * system notification templates).
 *
 * The reference-data block below is the single canonical version of what
 * used to be duplicated (with conflicting values) across prisma/seed.ts,
 * prisma/seeds/seed.ts, and seed-plans.ts / seed-platform-admin.ts before
 * those were retired — see CREDENTIALS.md.
 */
import { PrismaClient, NotificationType, Permission } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', isRtl: false },
  { code: 'ne', name: 'Nepali', nativeName: 'नेपाली', isRtl: false },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', isRtl: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', isRtl: false },
  { code: 'fr', name: 'French', nativeName: 'Français', isRtl: false },
  { code: 'de', name: 'German', nativeName: 'Deutsch', isRtl: false },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', isRtl: true },
  { code: 'zh', name: 'Chinese', nativeName: '中文', isRtl: false },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', isRtl: false },
  { code: 'ko', name: 'Korean', nativeName: '한국어', isRtl: false },
];

const CURRENCIES = [
  { code: 'NPR', name: 'Nepalese Rupee', symbol: 'रू', decimalPlaces: 2 },
  { code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2 },
  { code: 'GBP', name: 'British Pound', symbol: '£', decimalPlaces: 2 },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimalPlaces: 2 },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimalPlaces: 2 },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimalPlaces: 2 },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', decimalPlaces: 2 },
  { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimalPlaces: 0 },
  { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimalPlaces: 2 },
];

const SYSTEM_PERMISSIONS: Array<{ resource: string; action: string; description: string }> = [
  { resource: 'users', action: 'create', description: 'Create new users' },
  { resource: 'users', action: 'read', description: 'View users' },
  { resource: 'users', action: 'update', description: 'Update users' },
  { resource: 'users', action: 'delete', description: 'Delete users' },
  { resource: 'users', action: 'impersonate', description: 'Impersonate users' },
  { resource: 'roles', action: 'create', description: 'Create roles' },
  { resource: 'roles', action: 'read', description: 'View roles' },
  { resource: 'roles', action: 'update', description: 'Update roles' },
  { resource: 'roles', action: 'delete', description: 'Delete roles' },
  { resource: 'roles', action: 'assign', description: 'Assign roles to users' },
  { resource: 'permissions', action: 'create', description: 'Create permissions' },
  { resource: 'permissions', action: 'read', description: 'View permissions' },
  { resource: 'permissions', action: 'update', description: 'Update permissions' },
  { resource: 'permissions', action: 'delete', description: 'Delete permissions' },
  { resource: 'tenant', action: 'read', description: 'View tenant info' },
  { resource: 'tenant', action: 'update', description: 'Update tenant settings' },
  { resource: 'tenant', action: 'manage', description: 'Full tenant management' },
  { resource: 'settings', action: 'read', description: 'View settings' },
  { resource: 'settings', action: 'update', description: 'Update settings' },
  { resource: 'subscriptions', action: 'read', description: 'View subscriptions' },
  { resource: 'subscriptions', action: 'update', description: 'Update subscriptions' },
  { resource: 'subscriptions', action: 'cancel', description: 'Cancel subscriptions' },
  { resource: 'billing', action: 'read', description: 'View billing info' },
  { resource: 'billing', action: 'update', description: 'Update billing' },
  { resource: 'billing', action: 'refund', description: 'Process refunds' },
  { resource: 'notifications', action: 'read', description: 'View notifications' },
  { resource: 'notifications', action: 'send', description: 'Send notifications' },
  { resource: 'notifications', action: 'manage', description: 'Manage notification templates' },
  { resource: 'files', action: 'upload', description: 'Upload files' },
  { resource: 'files', action: 'download', description: 'Download files' },
  { resource: 'files', action: 'delete', description: 'Delete files' },
  { resource: 'dashboard', action: 'read', description: 'View dashboard' },
  { resource: 'dashboard', action: 'customize', description: 'Customize dashboard' },
  { resource: 'reports', action: 'read', description: 'View reports' },
  { resource: 'reports', action: 'generate', description: 'Generate reports' },
  { resource: 'reports', action: 'export', description: 'Export reports' },
  { resource: 'auditlogs', action: 'read', description: 'View audit logs' },
  { resource: 'profile', action: 'read', description: 'View own profile' },
  { resource: 'profile', action: 'update', description: 'Update own profile' },
];

export async function seed00Platform() {
  console.log('  → 00-platform');

  const adminEmail = 'admin@test.com';
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: adminPassword, isPlatformAdmin: true },
    create: {
      email: adminEmail,
      passwordHash: adminPassword,
      firstName: 'Platform',
      lastName: 'Admin',
      isPlatformAdmin: true,
      emailVerified: true,
    },
  });

  const plans = [
    { slug: 'FREE',       name: 'Free',       priceCents: 0,     maxUsers: 5,    maxBranches: 1 },
    { slug: 'STARTER',    name: 'Starter',    priceCents: 2900,  maxUsers: 25,   maxBranches: 3 },
    { slug: 'GROWTH',     name: 'Growth',     priceCents: 9900,  maxUsers: 100,  maxBranches: 10 },
    { slug: 'ENTERPRISE', name: 'Enterprise', priceCents: 49900, maxUsers: 1000, maxBranches: 100 },
  ];
  for (const p of plans) {
    await prisma.plan.upsert({
      where: { slug: p.slug },
      update: p,
      create: p,
    });
  }

  const settings = [
    { key: 'platform.name', value: 'Dexo' },
    { key: 'platform.tagline', value: 'Domain-Driven Multi-Tenant SaaS' },
    { key: 'platform.signup_enabled', value: 'true' },
  ];
  for (const s of settings) {
    const existing = await prisma.setting.findFirst({ where: { key: s.key, tenantId: null } });
    if (existing) {
      await prisma.setting.update({ where: { id: existing.id }, data: { value: s.value } });
    } else {
      await prisma.setting.create({ data: { key: s.key, value: s.value } as any });
    }
  }

  for (const lang of LANGUAGES) {
    await prisma.language.upsert({ where: { code: lang.code }, update: lang, create: lang });
  }

  for (const curr of CURRENCIES) {
    await prisma.currency.upsert({ where: { code: curr.code }, update: curr, create: curr });
  }

  const createdPermissions: Permission[] = [];
  for (const perm of SYSTEM_PERMISSIONS) {
    const existing = await prisma.permission.findFirst({
      where: { resource: perm.resource, action: perm.action, tenantId: null },
    });
    createdPermissions.push(
      existing ??
        (await prisma.permission.create({ data: { ...perm, tenantId: null } })),
    );
  }

  const permIds = (resources: string[], actions?: string[]) =>
    createdPermissions
      .filter((p) => resources.includes(p.resource) && (!actions || actions.includes(p.action)))
      .map((p) => p.id);

  const systemRoles = [
    { id: 'system-super-admin', name: 'SuperAdmin', description: 'Full system access across all tenants', permissions: createdPermissions.map((p) => p.id) },
    { id: 'system-admin', name: 'Admin', description: 'Full tenant administration access', permissions: permIds(['users', 'roles', 'tenant', 'settings', 'subscriptions', 'billing', 'notifications', 'files', 'dashboard', 'reports']) },
    { id: 'system-manager', name: 'Manager', description: 'Limited administrative access', permissions: permIds(['users', 'tenant', 'reports'], ['read', 'update']) },
    { id: 'system-user', name: 'User', description: 'Standard user access', permissions: createdPermissions.filter((p) => p.resource === 'profile' || p.resource === 'notifications').map((p) => p.id) },
    { id: 'system-viewer', name: 'Viewer', description: 'Read-only access', permissions: createdPermissions.filter((p) => p.action === 'read').map((p) => p.id) },
  ];
  for (const role of systemRoles) {
    await prisma.role.upsert({
      where: { id: role.id },
      update: { name: role.name, description: role.description, permissions: role.permissions },
      create: { ...role, isSystem: true, tenantId: null },
    });
  }

  const systemTemplates: Array<{ id: string; name: string; subject: string; body: string; variables: string[] }> = [
    { id: 'system-welcome-email', name: 'welcome-email', subject: 'Welcome to {{platformName}}!', body: 'Hi {{firstName}},\n\nWelcome to {{platformName}}! We\'re excited to have you on board.\n\nGet started by {{cta}}.', variables: ['firstName', 'platformName', 'cta'] },
    { id: 'system-password-reset', name: 'password-reset', subject: 'Reset your password', body: 'Hi {{firstName}},\n\nClick the link below to reset your password:\n{{resetLink}}\n\nThis link expires in 1 hour.', variables: ['firstName', 'resetLink'] },
    { id: 'system-invitation-email', name: 'invitation-email', subject: '{{inviterName}} invited you to {{tenantName}}', body: 'Hi {{firstName}},\n\n{{inviterName}} has invited you to join {{tenantName}}.\n\nClick here to accept: {{invitationLink}}', variables: ['firstName', 'inviterName', 'tenantName', 'invitationLink'] },
    { id: 'system-subscription-expiring', name: 'subscription-expiring', subject: 'Your subscription is expiring soon', body: 'Hi {{firstName}},\n\nYour subscription will expire on {{expiryDate}}.\n\nRenew now to continue enjoying our services.', variables: ['firstName', 'expiryDate'] },
  ];
  for (const t of systemTemplates) {
    await prisma.notificationTemplate.upsert({
      where: { id: t.id },
      update: { subject: t.subject, body: t.body, variables: t.variables },
      create: {
        id: t.id,
        name: t.name,
        type: NotificationType.email,
        subject: t.subject,
        body: t.body,
        variables: t.variables,
        isActive: true,
        tenantId: null,
      },
    });
  }
}

if (require.main === module) {
  seed00Platform()
    .then(() => process.exit(0))
    .catch((e) => { console.error(e); process.exit(1); });
}
