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
import { AiPlatformModule } from '@dexo/ai-platform';
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
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { PlatformBillingModule, IrdModule } from '@dexo/finance';
import { SalonModule } from './modules/salon/salon.module';
import { SchoolModule } from './modules/school/school.module';
import { EcommerceModule } from './modules/ecommerce/ecommerce.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { BlogModule } from '@dexo/blog';
import { FitnessModule } from './modules/fitness/fitness.module';
import { BusinessTemplateModule } from './modules/business-template/business-template.module';
import { TenantLifecycleModule } from './modules/tenant-lifecycle/tenant-lifecycle.module';
import { OnboardingModule } from './modules/onboarding/onboarding.module';
import { HealthModule } from './modules/health/health.module';
import { TenantMailApiModule } from './modules/tenant-mail/tenant-mail.module';
import { AttendanceDevicesModule } from './modules/attendance-devices/attendance-devices.module';
import { AiGatewayModule } from './modules/ai-gateway/ai-gateway.module';
import { PlatformEmailModule } from './modules/platform-email/platform-email.module';
import { FitnessAiModule } from './modules/fitness/ai-integration/fitness-ai.module';
import { TenantStatusMiddleware } from './common/middleware/tenant-status.middleware';

@Module({
  imports: [
    PrismaModule,
    AiPlatformModule,
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
    MarketplaceModule,
    PlatformBillingModule,
    IrdModule,
    BlogModule,
    FitnessModule,
    FitnessAiModule,
    SalonModule,
    SchoolModule,
    EcommerceModule,
    WebhooksModule,
    AiGatewayModule,
    TenantMailApiModule,
    PlatformEmailModule,
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
