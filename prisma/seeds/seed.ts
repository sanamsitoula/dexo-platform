import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Clean existing data (for development)
  await prisma.auditLog.deleteMany();
  await prisma.file.deleteMany();
  await prisma.userRoles.deleteMany();
  await prisma.notificationTemplate.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.tenant.deleteMany();

  console.log('Cleaned existing data');

  // Create Plans
  const freePlan = await prisma.plan.create({
    data: {
      name: 'Free',
      slug: 'free',
      description: 'Perfect for getting started',
      priceCents: 0,
      currency: 'USD',
      billingInterval: 'monthly',
      features: {
        users: 5,
        storage: 1, // GB
        basicFeatures: true,
      },
      limits: {
        users: 5,
        storage: 1,
        apiCalls: 1000,
      },
      isActive: true,
    },
  });

  const starterPlan = await prisma.plan.create({
    data: {
      name: 'Starter',
      slug: 'starter',
      description: 'For small teams',
      priceCents: 2900, // $29
      currency: 'USD',
      billingInterval: 'monthly',
      features: {
        users: 25,
        storage: 10, // GB
        basicFeatures: true,
        advancedFeatures: true,
        prioritySupport: true,
      },
      limits: {
        users: 25,
        storage: 10,
        apiCalls: 10000,
      },
      isActive: true,
    },
  });

  const proPlan = await prisma.plan.create({
    data: {
      name: 'Professional',
      slug: 'professional',
      description: 'For growing businesses',
      priceCents: 9900, // $99
      currency: 'USD',
      billingInterval: 'monthly',
      features: {
        users: 100,
        storage: 100, // GB
        basicFeatures: true,
        advancedFeatures: true,
        prioritySupport: true,
        analytics: true,
        customBranding: true,
      },
      limits: {
        users: 100,
        storage: 100,
        apiCalls: 100000,
      },
      isActive: true,
    },
  });

  const enterprisePlan = await prisma.plan.create({
    data: {
      name: 'Enterprise',
      slug: 'enterprise',
      description: 'For large organizations',
      priceCents: 29900, // $299
      currency: 'USD',
      billingInterval: 'monthly',
      features: {
        users: -1, // Unlimited
        storage: 1000, // GB
        basicFeatures: true,
        advancedFeatures: true,
        prioritySupport: true,
        analytics: true,
        customBranding: true,
        sso: true,
        dedicatedSupport: true,
      },
      limits: {
        users: -1,
        storage: 1000,
        apiCalls: -1,
      },
      isActive: true,
    },
  });

  console.log('Created plans:', freePlan.slug, starterPlan.slug, proPlan.slug, enterprisePlan.slug);

  // Create System Permissions
  const systemPermissions = [
    // User permissions
    { resource: 'users', action: 'create', description: 'Create new users' },
    { resource: 'users', action: 'read', description: 'View users' },
    { resource: 'users', action: 'update', description: 'Update users' },
    { resource: 'users', action: 'delete', description: 'Delete users' },
    { resource: 'users', action: 'impersonate', description: 'Impersonate users' },

    // Role permissions
    { resource: 'roles', action: 'create', description: 'Create roles' },
    { resource: 'roles', action: 'read', description: 'View roles' },
    { resource: 'roles', action: 'update', description: 'Update roles' },
    { resource: 'roles', action: 'delete', description: 'Delete roles' },
    { resource: 'roles', action: 'assign', description: 'Assign roles to users' },

    // Permission permissions
    { resource: 'permissions', action: 'create', description: 'Create permissions' },
    { resource: 'permissions', action: 'read', description: 'View permissions' },
    { resource: 'permissions', action: 'update', description: 'Update permissions' },
    { resource: 'permissions', action: 'delete', description: 'Delete permissions' },

    // Tenant permissions
    { resource: 'tenant', action: 'read', description: 'View tenant info' },
    { resource: 'tenant', action: 'update', description: 'Update tenant settings' },
    { resource: 'tenant', action: 'manage', description: 'Full tenant management' },

    // Settings permissions
    { resource: 'settings', action: 'read', description: 'View settings' },
    { resource: 'settings', action: 'update', description: 'Update settings' },

    // Subscription permissions
    { resource: 'subscriptions', action: 'read', description: 'View subscriptions' },
    { resource: 'subscriptions', action: 'update', description: 'Update subscriptions' },
    { resource: 'subscriptions', action: 'cancel', description: 'Cancel subscriptions' },

    // Billing permissions
    { resource: 'billing', action: 'read', description: 'View billing info' },
    { resource: 'billing', action: 'update', description: 'Update billing' },
    { resource: 'billing', action: 'refund', description: 'Process refunds' },

    // Notification permissions
    { resource: 'notifications', action: 'read', description: 'View notifications' },
    { resource: 'notifications', action: 'send', description: 'Send notifications' },
    { resource: 'notifications', action: 'manage', description: 'Manage notification templates' },

    // Files permissions
    { resource: 'files', action: 'upload', description: 'Upload files' },
    { resource: 'files', action: 'download', description: 'Download files' },
    { resource: 'files', action: 'delete', description: 'Delete files' },

    // Dashboard permissions
    { resource: 'dashboard', action: 'read', description: 'View dashboard' },
    { resource: 'dashboard', action: 'customize', description: 'Customize dashboard' },

    // Reports permissions
    { resource: 'reports', action: 'read', description: 'View reports' },
    { resource: 'reports', action: 'generate', description: 'Generate reports' },
    { resource: 'reports', action: 'export', description: 'Export reports' },

    // Audit log permissions
    { resource: 'auditlogs', action: 'read', description: 'View audit logs' },

    // Profile permissions (for regular users)
    { resource: 'profile', action: 'read', description: 'View own profile' },
    { resource: 'profile', action: 'update', description: 'Update own profile' },
  ];

  const createdPermissions = await Promise.all(
    systemPermissions.map(p =>
      prisma.permission.create({
        data: { ...p, tenantId: null },
      })
    )
  );

  console.log(`Created ${createdPermissions.length} system permissions`);

  // Create System Roles
  const superAdminRole = await prisma.role.create({
    data: {
      name: 'SuperAdmin',
      description: 'Full system access across all tenants',
      isSystem: true,
      tenantId: null,
      permissions: createdPermissions.map(p => `${p.resource}:${p.action}`),
    },
  });

  const adminRole = await prisma.role.create({
    data: {
      name: 'Admin',
      description: 'Full tenant administration access',
      isSystem: true,
      tenantId: null,
      permissions: [
        'users:*',
        'roles:*',
        'tenant:*',
        'settings:*',
        'subscriptions:*',
        'billing:*',
        'notifications:*',
        'files:*',
        'dashboard:*',
        'reports:*',
        'auditlogs:read',
      ],
    },
  });

  const managerRole = await prisma.role.create({
    data: {
      name: 'Manager',
      description: 'Limited administrative access',
      isSystem: true,
      tenantId: null,
      permissions: [
        'users:read',
        'users:update',
        'tenant:read',
        'settings:read',
        'subscriptions:read',
        'billing:read',
        'notifications:send',
        'files:upload',
        'files:download',
        'dashboard:read',
        'reports:read',
      ],
    },
  });

  const userRole = await prisma.role.create({
    data: {
      name: 'User',
      description: 'Standard user access',
      isSystem: true,
      tenantId: null,
      permissions: [
        'profile:*',
        'notifications:read',
        'files:upload',
        'files:download',
      ],
    },
  });

  const viewerRole = await prisma.role.create({
    data: {
      name: 'Viewer',
      description: 'Read-only access',
      isSystem: true,
      tenantId: null,
      permissions: ['*:read'],
    },
  });

  console.log('Created system roles:', superAdminRole.name, adminRole.name, managerRole.name, userRole.name, viewerRole.name);

  // Create Demo Tenant
  const passwordHash = await bcrypt.hash('Demo123!', 10);

  const demoTenant = await prisma.tenant.create({
    data: {
      name: 'Demo Corp',
      subdomain: 'demo',
      status: 'active',
      planId: proPlan.id,
      settings: {
        branding: {
          name: 'Demo Corp',
          logo: null,
          primaryColor: '#3b82f6',
        },
        features: {
          enableInvitations: true,
          enableSSO: false,
        },
      },
      trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  });

  // Create Demo Users
  const demoAdmin = await prisma.user.create({
    data: {
      email: 'admin@demo.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'User',
      status: 'active',
      emailVerified: true,
      tenantId: demoTenant.id,
    },
  });

  const demoManager = await prisma.user.create({
    data: {
      email: 'manager@demo.com',
      passwordHash,
      firstName: 'Manager',
      lastName: 'User',
      status: 'active',
      emailVerified: true,
      tenantId: demoTenant.id,
    },
  });

  const demoUser = await prisma.user.create({
    data: {
      email: 'user@demo.com',
      passwordHash,
      firstName: 'Regular',
      lastName: 'User',
      status: 'active',
      emailVerified: true,
      tenantId: demoTenant.id,
    },
  });

  // Assign roles to demo users
  await prisma.userRoles.create({
    data: {
      userId: demoAdmin.id,
      roleId: adminRole.id,
    },
  });

  await prisma.userRoles.create({
    data: {
      userId: demoManager.id,
      roleId: managerRole.id,
    },
  });

  await prisma.userRoles.create({
    data: {
      userId: demoUser.id,
      roleId: userRole.id,
    },
  });

  // Create subscription for demo tenant
  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await prisma.subscription.create({
    data: {
      tenantId: demoTenant.id,
      planId: proPlan.id,
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      trialStart: now,
      trialEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });

  console.log('Created demo tenant with users');

  // Create Notification Templates
  const welcomeEmail = await prisma.notificationTemplate.create({
    data: {
      name: 'Welcome Email',
      type: 'email',
      subject: 'Welcome to {{tenantName}}!',
      body: `
        <h1>Welcome, {{firstName}}!</h1>
        <p>Thank you for joining {{tenantName}}. We're excited to have you on board.</p>
        <p>Your account is now active and you can start using the platform.</p>
        <p>If you have any questions, don't hesitate to reach out.</p>
        <p>Best regards,<br>{{tenantName}} Team</p>
      `,
      variables: ['firstName', 'tenantName'],
      isActive: true,
      tenantId: null,
    },
  });

  const invitationEmail = await prisma.notificationTemplate.create({
    data: {
      name: 'Invitation Email',
      type: 'email',
      subject: 'You\'re invited to join {{tenantName}}',
      body: `
        <h1>Invitation to join {{tenantName}}</h1>
        <p>Hello {{firstName}},</p>
        <p>{{inviterName}} has invited you to join {{tenantName}} on the Dexo Platform.</p>
        <p><a href="{{invitationLink}}">Click here to accept the invitation</a></p>
        <p>This invitation expires in 7 days.</p>
      `,
      variables: ['firstName', 'tenantName', 'inviterName', 'invitationLink'],
      isActive: true,
      tenantId: null,
    },
  });

  const passwordResetEmail = await prisma.notificationTemplate.create({
    data: {
      name: 'Password Reset Email',
      type: 'email',
      subject: 'Reset Your Password',
      body: `
        <h1>Reset Your Password</h1>
        <p>You requested to reset your password. Click the link below to proceed:</p>
        <p><a href="{{resetLink}}">Reset Password</a></p>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
      variables: ['resetLink'],
      isActive: true,
      tenantId: null,
    },
  });

  console.log('Created notification templates');

  // Create System Settings
  await prisma.setting.createMany({
    data: [
      {
        key: 'platform.name',
        value: 'Dexo Platform',
        isPublic: true,
      },
      {
        key: 'platform.version',
        value: '0.1.0',
        isPublic: true,
      },
      {
        key: 'auth.requireEmailVerification',
        value: false,
        isPublic: false,
      },
      {
        key: 'auth.enableRegistration',
        value: true,
        isPublic: true,
      },
      {
        key: 'auth.defaultTrialDays',
        value: 30,
        isPublic: false,
      },
      {
        key: 'files.maxFileSize',
        value: 10485760, // 10MB
        isPublic: false,
      },
      {
        key: 'files.allowedTypes',
        value: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx'],
        isPublic: false,
      },
    ],
  });

  console.log('Created system settings');

  console.log('Database seed completed successfully!');
  console.log('\nDemo Credentials:');
  console.log('  Tenant: demo (subdomain: demo.dexo.com)');
  console.log('  Admin: admin@demo.com / Demo123!');
  console.log('  Manager: manager@demo.com / Demo123!');
  console.log('  User: user@demo.com / Demo123!');
}

main()
  .catch(e => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
