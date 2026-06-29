/**
 * Platform Admin Seeding Script
 *
 * Creates platform admin users for testing the platform.
 * 
 * Default Admin:
 *   Email: admin@test.com
 *   Password: Admin@123
 * 
 * Run: npx ts-node --transpile-only seed-platform-admin.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface PlatformAdmin {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  isPlatformAdmin: boolean;
}

const PLATFORM_ADMINS: PlatformAdmin[] = [
  {
    email: 'admin@test.com',
    password: 'Admin@123',
    firstName: 'Platform',
    lastName: 'Admin',
    isPlatformAdmin: true,
  },
  {
    email: 'admin@fitnessapp.com',
    password: 'Admin123!',
    firstName: 'System',
    lastName: 'Administrator',
    isPlatformAdmin: true,
  },
];

async function main() {
  console.log('🌱 Seeding platform admin users...\n');

  for (const admin of PLATFORM_ADMINS) {
    try {
      const passwordHash = await bcrypt.hash(admin.password, 10);

      const user = await prisma.user.upsert({
        where: { email: admin.email },
        update: {
          passwordHash,
          isPlatformAdmin: admin.isPlatformAdmin,
          status: 'active',
          emailVerified: true,
        },
        create: {
          email: admin.email,
          passwordHash,
          firstName: admin.firstName,
          lastName: admin.lastName,
          status: 'active',
          emailVerified: true,
          isPlatformAdmin: admin.isPlatformAdmin,
          tenantId: null,
        },
      });

      console.log(`✅ Created/Updated platform admin: ${user.email}`);
      console.log(`   Password: ${admin.password}`);
      console.log(`   Name: ${user.firstName} ${user.lastName}`);
      console.log(`   Role: ${user.isPlatformAdmin ? 'Platform Admin' : 'Tenant User'}\n`);
    } catch (error) {
      console.error(`❌ Failed to seed admin ${admin.email}:`, error);
    }
  }

  console.log('✅ Platform admin seeding complete!\n');
  console.log('You can now log in at:');
  console.log('  - Admin Dashboard: http://localhost:3001');
  console.log('  - Web App: http://localhost:3000');
  console.log('\nDefault credentials:');
  console.log('  Email: admin@test.com');
  console.log('  Password: Admin@123');
}

main()
  .catch((e) => {
    console.error('Error seeding platform admins:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
