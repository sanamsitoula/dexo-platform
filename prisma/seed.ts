import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create Languages
  console.log('Creating languages...');
  const languages = [
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

  for (const lang of languages) {
    await prisma.language.upsert({
      where: { code: lang.code },
      update: {},
      create: lang,
    });
  }
  console.log(`Created ${languages.length} languages`);

  // Create Currencies
  console.log('Creating currencies...');
  const currencies = [
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

  for (const curr of currencies) {
    await prisma.currency.upsert({
      where: { code: curr.code },
      update: {},
      create: curr,
    });
  }
  console.log(`Created ${currencies.length} currencies`);

  // Create Plans
  console.log('Creating plans...');
  const freePlan = await prisma.plan.upsert({
    where: { slug: 'free' },
    update: {},
    create: {
      name: 'Free Plan',
      slug: 'free',
      description: 'Perfect for getting started',
      priceCents: 0,
      currency: 'USD',
      billingInterval: 'monthly',
      features: {
        users: 1,
        storage: 1073741824, // 1GB
        apiCalls: 1000,
      },
      limits: {
        users: 1,
        storage: 1073741824,
        apiCalls: 1000,
      },
    },
  });

  const starterPlan = await prisma.plan.upsert({
    where: { slug: 'starter' },
    update: {},
    create: {
      name: 'Starter Plan',
      slug: 'starter',
      description: 'For small teams and startups',
      priceCents: 2900,
      currency: 'USD',
      billingInterval: 'monthly',
      features: {
        users: 5,
        storage: 10737418240, // 10GB
        apiCalls: 10000,
        customDomain: true,
        prioritySupport: false,
      },
      limits: {
        users: 5,
        storage: 10737418240,
        apiCalls: 10000,
      },
    },
  });

  const proPlan = await prisma.plan.upsert({
    where: { slug: 'pro' },
    update: {},
    create: {
      name: 'Pro Plan',
      slug: 'pro',
      description: 'For growing businesses',
      priceCents: 9900,
      currency: 'USD',
      billingInterval: 'monthly',
      features: {
        users: 25,
        storage: 53687091200, // 50GB
        apiCalls: 100000,
        customDomain: true,
        prioritySupport: true,
        advancedAnalytics: true,
      },
      limits: {
        users: 25,
        storage: 53687091200,
        apiCalls: 100000,
      },
    },
  });

  const enterprisePlan = await prisma.plan.upsert({
    where: { slug: 'enterprise' },
    update: {},
    create: {
      name: 'Enterprise Plan',
      slug: 'enterprise',
      description: 'For large organizations',
      priceCents: 29900,
      currency: 'USD',
      billingInterval: 'monthly',
      features: {
        users: -1, // Unlimited
        storage: -1, // Unlimited
        apiCalls: -1, // Unlimited
        customDomain: true,
        prioritySupport: true,
        advancedAnalytics: true,
        sla: true,
        dedicatedSupport: true,
      },
      limits: {
        users: -1,
        storage: -1,
        apiCalls: -1,
      },
    },
  });

  console.log(`Created plans: ${[freePlan.slug, starterPlan.slug, proPlan.slug, enterprisePlan.slug].join(', ')}`);

  // Create System Permissions
  console.log('Creating system permissions...');
  const permissions = [
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

  const createdPermissions = [];
  for (const perm of permissions) {
    const existing = await prisma.permission.findFirst({
      where: {
        resource: perm.resource,
        action: perm.action,
        tenantId: null,
      },
    });

    let created;
    if (existing) {
      created = existing;
    } else {
      created = await prisma.permission.create({
        data: perm,
      });
    }
    createdPermissions.push(created);
  }

  console.log(`Created ${createdPermissions.length} system permissions`);

  // Create System Roles
  console.log('Creating system roles...');
  const allPermissionIds = createdPermissions.map(p => p.id);

  const superAdminRole = await prisma.role.upsert({
    where: { id: 'system-super-admin' },
    update: {},
    create: {
      id: 'system-super-admin',
      name: 'SuperAdmin',
      description: 'Full system access across all tenants',
      isSystem: true,
      permissions: allPermissionIds,
      tenantId: null,
    },
  });

  const adminPermissions = createdPermissions
    .filter(p => ['users', 'roles', 'tenant', 'settings', 'subscriptions', 'billing', 'notifications', 'files', 'dashboard', 'reports'].includes(p.resource))
    .map(p => p.id);

  const adminRole = await prisma.role.upsert({
    where: { id: 'system-admin' },
    update: {},
    create: {
      id: 'system-admin',
      name: 'Admin',
      description: 'Full tenant administration access',
      isSystem: true,
      permissions: adminPermissions,
      tenantId: null,
    },
  });

  const managerPermissions = createdPermissions
    .filter(p => ['users', 'tenant', 'reports'].includes(p.resource) && ['read', 'update'].includes(p.action))
    .map(p => p.id);

  const managerRole = await prisma.role.upsert({
    where: { id: 'system-manager' },
    update: {},
    create: {
      id: 'system-manager',
      name: 'Manager',
      description: 'Limited administrative access',
      isSystem: true,
      permissions: managerPermissions,
      tenantId: null,
    },
  });

  const userPermissions = createdPermissions
    .filter(p => p.resource === 'profile' || p.resource === 'notifications')
    .map(p => p.id);

  const userRole = await prisma.role.upsert({
    where: { id: 'system-user' },
    update: {},
    create: {
      id: 'system-user',
      name: 'User',
      description: 'Standard user access',
      isSystem: true,
      permissions: userPermissions,
      tenantId: null,
    },
  });

  const viewerPermissions = createdPermissions
    .filter(p => p.action === 'read')
    .map(p => p.id);

  const viewerRole = await prisma.role.upsert({
    where: { id: 'system-viewer' },
    update: {},
    create: {
      id: 'system-viewer',
      name: 'Viewer',
      description: 'Read-only access',
      isSystem: true,
      permissions: viewerPermissions,
      tenantId: null,
    },
  });

  console.log(`Created system roles: ${[superAdminRole.name, adminRole.name, managerRole.name, userRole.name, viewerRole.name].join(', ')}`);

  // Create System Notification Templates
  console.log('Creating notification templates...');
  const templates = [
    {
      name: 'welcome-email',
      type: 'email' as const,
      subject: 'Welcome to {{platformName}}!',
      body: 'Hi {{firstName}},\n\nWelcome to {{platformName}}! We\'re excited to have you on board.\n\nGet started by {{cta}}.',
      variables: ['firstName', 'platformName', 'cta'],
      isActive: true,
    },
    {
      name: 'password-reset',
      type: 'email' as const,
      subject: 'Reset your password',
      body: 'Hi {{firstName}},\n\nClick the link below to reset your password:\n{{resetLink}}\n\nThis link expires in 1 hour.',
      variables: ['firstName', 'resetLink'],
      isActive: true,
    },
    {
      name: 'invitation-email',
      type: 'email' as const,
      subject: '{{inviterName}} invited you to {{tenantName}}',
      body: 'Hi {{firstName}},\n\n{{inviterName}} has invited you to join {{tenantName}}.\n\nClick here to accept: {{invitationLink}}',
      variables: ['firstName', 'inviterName', 'tenantName', 'invitationLink'],
      isActive: true,
    },
    {
      name: 'subscription-expiring',
      type: 'email' as const,
      subject: 'Your subscription is expiring soon',
      body: 'Hi {{firstName}},\n\nYour subscription will expire on {{expiryDate}}.\n\nRenew now to continue enjoying our services.',
      variables: ['firstName', 'expiryDate'],
      isActive: true,
    },
  ];

  for (const template of templates) {
    await prisma.notificationTemplate.upsert({
      where: {
        id: `system-${template.name}`,
      },
      update: {},
      create: {
        id: `system-${template.name}`,
        ...template,
        tenantId: null,
      },
    });
  }

  console.log(`Created ${templates.length} notification templates`);

  // Create Global Settings
  console.log('Creating global settings...');
  const settings = [
    { key: 'platform.name', value: 'Dexo Platform' },
    { key: 'platform.url', value: 'https://dexo.example.com' },
    { key: 'platform.supportEmail', value: 'support@dexo.example.com' },
    { key: 'security.sessionTimeout', value: 3600 },
    { key: 'security.maxLoginAttempts', value: 5 },
    { key: 'security.lockoutDuration', value: 900 },
    { key: 'uploads.maxFileSize', value: 52428800 }, // 50MB
    { key: 'uploads.allowedTypes', value: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx'] },
  ];

  for (const setting of settings) {
    const existing = await prisma.setting.findFirst({
      where: { tenantId: null, key: setting.key },
    });
    if (existing) {
      await prisma.setting.update({
        where: { id: existing.id },
        data: { value: setting.value },
      });
    } else {
      await prisma.setting.create({
        data: {
          ...setting,
          tenantId: null,
          isPublic: setting.key.startsWith('platform.'),
        },
      });
    }
  }

  console.log(`Created ${settings.length} global settings`);

  // Create FitnessApp Tenant
  console.log('Creating FitnessApp tenant...');
  const fitnessAppTenant = await prisma.tenant.upsert({
    where: { subdomain: 'fitnessapp' },
    update: {},
    create: {
      name: 'FitnessApp',
      subdomain: 'fitnessapp',
      status: 'active',
      settings: {
        theme: 'fitness',
        features: {
          workoutTracking: true,
          nutritionPlanning: true,
          progressPhotos: true,
          personalTraining: false,
          groupClasses: true,
        },
        branding: {
          primaryColor: '#3B82F6',
          logoUrl: null,
        },
      },
    },
  });

  // Create FitnessApp Admin User
  console.log('Creating FitnessApp admin user...');
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash('Admin123!', saltRounds);
  
  const existingAdmin = await prisma.user.findFirst({
    where: { email: 'admin@fitnessapp.com' },
  });

  let fitnessAppAdmin;
  if (existingAdmin) {
    // Update password hash to bcrypt and set as platform admin
    fitnessAppAdmin = await prisma.user.update({
      where: { id: existingAdmin.id },
      data: { passwordHash: hashedPassword, isPlatformAdmin: true },
    });
  } else {
    fitnessAppAdmin = await prisma.user.create({
      data: {
        email: 'admin@fitnessapp.com',
        passwordHash: hashedPassword,
        firstName: 'Fitness',
        lastName: 'Admin',
        status: 'active',
        emailVerified: true,
        isPlatformAdmin: true,
        tenantId: fitnessAppTenant.id,
      },
    });
  }

  // Assign Admin Role to FitnessApp Admin
  const existingRole = await prisma.userRoles.findFirst({
    where: {
      userId: fitnessAppAdmin.id,
      roleId: adminRole.id,
    },
  });

  if (!existingRole) {
    await prisma.userRoles.create({
      data: {
        userId: fitnessAppAdmin.id,
        roleId: adminRole.id,
      },
    });
  }

  // Create Fitness-Specific Roles
  console.log('Creating fitness-specific roles...');
  const fitnessTrainerPermissions = createdPermissions
    .filter(p => ['users', 'profile', 'notifications', 'dashboard', 'reports'].includes(p.resource) && ['read', 'update'].includes(p.action))
    .map(p => p.id);

  const fitnessTrainerRole = await prisma.role.upsert({
    where: { id: 'fitnessapp-trainer' },
    update: {},
    create: {
      id: 'fitnessapp-trainer',
      name: 'Trainer',
      description: 'Fitness trainer with member management access',
      isSystem: false,
      permissions: fitnessTrainerPermissions,
      tenantId: fitnessAppTenant.id,
    },
  });

  const fitnessMemberPermissions = createdPermissions
    .filter(p => ['profile', 'notifications', 'files'].includes(p.resource) && ['read', 'update', 'upload'].includes(p.action))
    .map(p => p.id);

  const fitnessMemberRole = await prisma.role.upsert({
    where: { id: 'fitnessapp-member' },
    update: {},
    create: {
      id: 'fitnessapp-member',
      name: 'Member',
      description: 'Standard fitness app member',
      isSystem: false,
      permissions: fitnessMemberPermissions,
      tenantId: fitnessAppTenant.id,
    },
  });

  console.log(`Created fitness roles: ${fitnessTrainerRole.name}, ${fitnessMemberRole.name}`);

  // Create Fitness Trainer User
  console.log('Creating fitness trainer user...');
  const trainerPassword = await bcrypt.hash('Trainer123!', saltRounds);
  const existingTrainer = await prisma.user.findFirst({
    where: { email: 'trainer@fitnessapp.com' },
  });

  let fitnessTrainer;
  if (existingTrainer) {
    fitnessTrainer = existingTrainer;
  } else {
    fitnessTrainer = await prisma.user.create({
      data: {
        email: 'trainer@fitnessapp.com',
        passwordHash: trainerPassword,
        firstName: 'Mike',
        lastName: 'Johnson',
        status: 'active',
        emailVerified: true,
        tenantId: fitnessAppTenant.id,
      },
    });
  }

  const trainerRoleAssignment = await prisma.userRoles.findFirst({
    where: { userId: fitnessTrainer.id, roleId: fitnessTrainerRole.id },
  });
  if (!trainerRoleAssignment) {
    await prisma.userRoles.create({
      data: { userId: fitnessTrainer.id, roleId: fitnessTrainerRole.id },
    });
  }

  // Create Fitness Member User
  console.log('Creating fitness member user...');
  const memberPassword = await bcrypt.hash('Member123!', saltRounds);
  const existingMember = await prisma.user.findFirst({
    where: { email: 'member@fitnessapp.com' },
  });

  let fitnessMember;
  if (existingMember) {
    fitnessMember = existingMember;
  } else {
    fitnessMember = await prisma.user.create({
      data: {
        email: 'member@fitnessapp.com',
        passwordHash: memberPassword,
        firstName: 'Sarah',
        lastName: 'Williams',
        status: 'active',
        emailVerified: true,
        tenantId: fitnessAppTenant.id,
      },
    });
  }

  const memberRoleAssignment = await prisma.userRoles.findFirst({
    where: { userId: fitnessMember.id, roleId: fitnessMemberRole.id },
  });
  if (!memberRoleAssignment) {
    await prisma.userRoles.create({
      data: { userId: fitnessMember.id, roleId: fitnessMemberRole.id },
    });
  }

  // Create FitnessApp Subscription
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days
  
  await prisma.subscription.create({
    data: {
      tenantId: fitnessAppTenant.id,
      planId: proPlan.id,
      status: 'trial',
      currentPeriodStart: now,
      currentPeriodEnd: trialEnd,
      trialStart: now,
      trialEnd: trialEnd,
    },
  });

  // Create FitnessApp Notification Templates
  const fitnessTemplates = [
    {
      name: 'workout-reminder',
      type: 'email' as const,
      subject: 'Time for your workout! 💪',
      body: 'Hi {{firstName}},\n\nDon\'t forget your scheduled workout today!\n\n{{workoutDetails}}\n\nStay motivated!',
      variables: ['firstName', 'workoutDetails'],
      isActive: true,
    },
    {
      name: 'progress-update',
      type: 'email' as const,
      subject: 'Your fitness progress update',
      body: 'Hi {{firstName}},\n\nHere\'s your weekly progress summary:\n\n{{progressStats}}\n\nKeep up the great work!',
      variables: ['firstName', 'progressStats'],
      isActive: true,
    },
  ];

  for (const template of fitnessTemplates) {
    await prisma.notificationTemplate.upsert({
      where: {
        id: `fitnessapp-${template.name}`,
      },
      update: {},
      create: {
        id: `fitnessapp-${template.name}`,
        ...template,
        tenantId: fitnessAppTenant.id,
      },
    });
  }

  // Create FitnessApp Settings
  const fitnessSettings = [
    { key: 'workouts.defaultDuration', value: 45 },
    { key: 'workouts.maxPerDay', value: 5 },
    { key: 'nutrition.calorieGoal', value: 2000 },
    { key: 'social.allowSharing', value: true },
    { key: 'notifications.workoutReminders', value: true },
  ];

  for (const setting of fitnessSettings) {
    await prisma.setting.upsert({
      where: {
        tenantId_key: {
          tenantId: fitnessAppTenant.id,
          key: setting.key,
        },
      },
      update: { value: setting.value },
      create: {
        ...setting,
        tenantId: fitnessAppTenant.id,
        isPublic: false,
      },
    });
  }

  console.log(`Created FitnessApp tenant with users:`);
  console.log(`  Admin:  admin@fitnessapp.com / Admin123!`);
  console.log(`  Trainer: trainer@fitnessapp.com / Trainer123!`);
  console.log(`  Member:  member@fitnessapp.com / Member123!`);
  console.log('Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
