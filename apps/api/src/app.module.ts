import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from '@dexo/auth';
import { TenantModule } from '@dexo/tenant';
import { UserModule } from '@dexo/user';
import { RoleModule } from '@dexo/role';
import { PermissionModule } from '@dexo/permission';
import { SubscriptionModule } from '@dexo/subscription';
import { BillingModule } from '@dexo/billing';
import { NotificationModule } from '@dexo/notification';
import { FilesModule } from '@dexo/files';
import { SettingsModule } from '@dexo/settings';
import { DashboardModule } from '@dexo/dashboard';
import { AuditModule, QueueModule } from '@dexo/shared';
import { PrismaModule } from './prisma.module';
import { GlobalizationModule } from './modules/globalization/globalization.module';
import { PaymentGatewayModule } from './modules/payment-gateway/payment-gateway.module';
import { FinanceModule } from './modules/finance/finance.module';
import { DomainModule } from './modules/domain/domain.module';
import { SocialAuthModule } from './modules/social-auth/social-auth.module';
import { BranchModule } from './modules/branch/branch.module';
import { MobileAppModule } from './modules/mobile-app/mobile-app.module';
import { ContactModule } from './modules/contact/contact.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { BlogModule } from '@dexo/blog';
import { FitnessModule } from './modules/fitness/fitness.module';
import { BusinessTemplateModule } from './modules/business-template/business-template.module';
import { TenantLifecycleModule } from './modules/tenant-lifecycle/tenant-lifecycle.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { HealthModule } from './modules/health/health.module';
import { TenantMailApiModule } from './modules/tenant-mail/tenant-mail.module';
import { AttendanceDevicesModule } from './modules/attendance-devices/attendance-devices.module';
import { TenantStatusMiddleware } from './common/middleware/tenant-status.middleware';

@Module({
  imports: [
    PrismaModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),
    ScheduleModule.forRoot(),
    AuthModule,
    TenantLifecycleModule,
    BusinessTemplateModule,
    OnboardingModule,
    HealthModule,
    TenantModule,
    UserModule,
    RoleModule,
    PermissionModule,
    SubscriptionModule,
    BillingModule,
    NotificationModule,
    FilesModule,
    SettingsModule,
    DashboardModule,
    AuditModule,
    QueueModule,
    GlobalizationModule,
    PaymentGatewayModule,
    FinanceModule,
    DomainModule,
    SocialAuthModule,
    BranchModule,
    MobileAppModule,
    ContactModule,
    WhatsAppModule,
    BlogModule,
    FitnessModule,
    TenantMailApiModule,
    AttendanceDevicesModule,
    BusinessTemplateModule,
    TenantLifecycleModule,
    OnboardingModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantStatusMiddleware).forRoutes('*');
  }
}
