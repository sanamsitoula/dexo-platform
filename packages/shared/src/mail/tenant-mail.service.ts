import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma';

export interface TenantSmtpConfig {
  host: string;
  port: number;
  secure?: boolean;
  user?: string;
  pass?: string;
  fromName?: string;
  fromEmail?: string;
  enabled?: boolean;
}

export interface TenantMailMessage {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
}

export interface GlobalEmailConfig {
  provider: string;
  isEnabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user?: string | null;
  pass?: string | null;
  fromName?: string | null;
  fromEmail: string;
  replyTo?: string | null;
  dailyLimit?: number | null;
  monthlyLimit?: number | null;
}

const SETTING_KEY = 'smtp';

/**
 * Platform-wide transactional email — provider-agnostic, three-tier
 * hierarchy, no code change or redeploy needed to switch providers or
 * rotate credentials:
 *
 *   1. Tenant SMTP (Setting key "smtp")        — per-tenant white-label override
 *   2. Global Email Config (PlatformEmailConfig) — super-admin-editable via
 *      /api/platform-email, this is what "the platform's email provider" means
 *   3. System Default (SMTP_* env vars)         — last-resort dev fallback
 *      (MailHog locally), only reached if neither of the above exists
 *
 * Every send is logged to PlatformEmailLog for delivery monitoring. Lives in
 * @dexo/shared so both the auth package (welcome / password reset) and every
 * API module can send through the same routing logic.
 */
@Injectable()
export class TenantMailService {
  private readonly logger = new Logger(TenantMailService.name);

  constructor(private prisma: PrismaService) {}

  // ------------------------------ global config (super admin) ------------------------------

  async getGlobalConfig(maskSecret = true): Promise<GlobalEmailConfig | null> {
    const row = await this.prisma.platformEmailConfig.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!row) return null;
    return maskSecret && row.pass ? { ...row, pass: '********' } : row;
  }

  async saveGlobalConfig(dto: Partial<GlobalEmailConfig>, updatedBy?: string): Promise<GlobalEmailConfig> {
    const existing = await this.prisma.platformEmailConfig.findFirst({ orderBy: { createdAt: 'asc' } });
    let pass = dto.pass;
    if (pass === '********') pass = existing?.pass ?? undefined;

    const data = {
      provider: dto.provider || existing?.provider || 'smtp',
      isEnabled: dto.isEnabled ?? existing?.isEnabled ?? true,
      host: dto.host ?? existing?.host ?? '',
      port: Number(dto.port ?? existing?.port ?? 587),
      secure: dto.secure ?? existing?.secure ?? false,
      user: dto.user ?? existing?.user ?? null,
      pass: pass ?? existing?.pass ?? null,
      fromName: dto.fromName ?? existing?.fromName ?? null,
      fromEmail: dto.fromEmail || existing?.fromEmail || 'noreply@onedexo.com',
      replyTo: dto.replyTo ?? existing?.replyTo ?? null,
      dailyLimit: dto.dailyLimit ?? existing?.dailyLimit ?? null,
      monthlyLimit: dto.monthlyLimit ?? existing?.monthlyLimit ?? null,
      updatedBy: updatedBy || null,
    };

    const saved = existing
      ? await this.prisma.platformEmailConfig.update({ where: { id: existing.id }, data })
      : await this.prisma.platformEmailConfig.create({ data });

    return { ...saved, pass: saved.pass ? '********' : undefined };
  }

  /**
   * One-time bootstrap: if no global config exists yet in the DB but
   * GLOBAL_SMTP_* env vars are set (e.g. the initial Brevo credential
   * dropped into .env), seed PlatformEmailConfig from them so the platform
   * has a working global provider immediately without anyone touching the
   * admin UI first. Safe to call repeatedly — no-ops once a DB row exists.
   */
  async bootstrapGlobalConfigFromEnv(): Promise<void> {
    const existing = await this.prisma.platformEmailConfig.findFirst();
    if (existing) return;
    const host = process.env.GLOBAL_SMTP_HOST;
    if (!host) return;
    await this.prisma.platformEmailConfig.create({
      data: {
        provider: process.env.GLOBAL_SMTP_PROVIDER || 'smtp',
        isEnabled: true,
        host,
        port: parseInt(process.env.GLOBAL_SMTP_PORT || '587', 10),
        secure: process.env.GLOBAL_SMTP_SECURE === 'true',
        user: process.env.GLOBAL_SMTP_USER || null,
        pass: process.env.GLOBAL_SMTP_PASSWORD || null,
        fromName: process.env.GLOBAL_SMTP_FROM_NAME || 'OneDexo',
        fromEmail: process.env.GLOBAL_SMTP_FROM_EMAIL || 'noreply@onedexo.com',
      },
    });
    this.logger.log('Bootstrapped global email config from GLOBAL_SMTP_* env vars.');
  }

  async testGlobalConfig(to: string): Promise<{ success: boolean; error?: string }> {
    const cfg = await this.getGlobalConfig(false);
    if (!cfg) return { success: false, error: 'No global email config saved yet' };
    const result = await this.sendWith(cfg as TenantSmtpConfig, 'global', null, {
      to,
      subject: 'OneDexo — global email test',
      text: 'Your global platform email configuration works.',
      html: this.shell('Global email test successful ✅', '<p style="color:#374151">Your platform-wide email provider is configured correctly. This test bypassed tenant overrides.</p>', 'OneDexo'),
    });
    await this.prisma.platformEmailConfig.updateMany({
      data: {
        lastTestedAt: new Date(),
        lastTestStatus: result.success ? 'SUCCESS' : 'FAILED',
        lastTestError: result.success ? null : result.error || null,
      },
    });
    return result;
  }

  async getLogs(tenantId?: string, limit = 50) {
    return this.prisma.platformEmailLog.findMany({
      where: tenantId ? { tenantId } : undefined,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    });
  }

  // ------------------------------ config ------------------------------

  async getConfig(tenantId: string, maskSecret = true): Promise<TenantSmtpConfig | null> {
    const row = await this.prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key: SETTING_KEY } },
    });
    if (!row) return null;
    const cfg = row.value as unknown as TenantSmtpConfig;
    return maskSecret && cfg?.pass ? { ...cfg, pass: '********' } : cfg;
  }

  async saveConfig(tenantId: string, dto: TenantSmtpConfig): Promise<TenantSmtpConfig> {
    // Keep the stored password when the client sends back the masked value.
    if (dto.pass === '********') {
      const existing = await this.getConfig(tenantId, false);
      dto.pass = existing?.pass;
    }
    const value = {
      host: dto.host,
      port: Number(dto.port) || 587,
      secure: !!dto.secure,
      user: dto.user || undefined,
      pass: dto.pass || undefined,
      fromName: dto.fromName || undefined,
      fromEmail: dto.fromEmail || undefined,
      enabled: dto.enabled !== false,
    };
    await this.prisma.setting.upsert({
      where: { tenantId_key: { tenantId, key: SETTING_KEY } },
      update: { value: value as any },
      create: { tenantId, key: SETTING_KEY, value: value as any },
    });
    return { ...value, pass: value.pass ? '********' : undefined };
  }

  // ------------------------------ transport ------------------------------

  private platformConfig(): TenantSmtpConfig {
    return {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '1025', 10),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || undefined,
      pass: process.env.SMTP_PASSWORD || process.env.SMTP_PASS || undefined,
      fromEmail: process.env.EMAIL_FROM || 'noreply@onedexo.com',
      enabled: true,
    };
  }

  private buildTransport(cfg: TenantSmtpConfig) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodemailer = require('nodemailer');
    return nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: !!cfg.secure,
      auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
    });
  }

  /**
   * Resolve + send following the hierarchy: Tenant SMTP -> Global (DB) ->
   * System Default (env). The decision is entirely data-driven — no code
   * path branches on a provider name.
   */
  async send(tenantId: string | null | undefined, msg: TenantMailMessage): Promise<{ success: boolean; messageId?: string; error?: string; via: string }> {
    let cfg: TenantSmtpConfig | null = null;
    let via: 'tenant' | 'global' | 'system' = 'system';

    if (tenantId) {
      const tenantCfg = await this.getConfig(tenantId, false).catch(() => null);
      if (tenantCfg?.enabled && tenantCfg.host) {
        cfg = tenantCfg;
        via = 'tenant';
      }
    }
    if (!cfg) {
      const globalCfg = await this.getGlobalConfig(false).catch(() => null);
      if (globalCfg?.isEnabled && globalCfg.host) {
        cfg = globalCfg as TenantSmtpConfig;
        via = 'global';
      }
    }
    if (!cfg) {
      cfg = this.platformConfig();
      via = 'system';
    }

    return this.sendWith(cfg, via, tenantId ?? null, msg);
  }

  private async sendWith(
    cfg: TenantSmtpConfig,
    via: 'tenant' | 'global' | 'system',
    tenantId: string | null,
    msg: TenantMailMessage,
  ): Promise<{ success: boolean; messageId?: string; error?: string; via: string }> {
    let result: { success: boolean; messageId?: string; error?: string };
    try {
      const transport = this.buildTransport(cfg);
      const from = cfg.fromName
        ? `"${cfg.fromName}" <${cfg.fromEmail || 'noreply@onedexo.com'}>`
        : cfg.fromEmail || 'noreply@onedexo.com';
      const info = await transport.sendMail({
        from,
        to: Array.isArray(msg.to) ? msg.to.join(', ') : msg.to,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
      });
      this.logger.log(`Email sent via ${via} SMTP (${cfg.host}:${cfg.port}) to ${msg.to}: ${info.messageId}`);
      result = { success: true, messageId: info.messageId };
    } catch (err: any) {
      this.logger.warn(`Email send failed via ${via} SMTP: ${err?.message}`);
      result = { success: false, error: err?.message };
    }

    await this.prisma.platformEmailLog
      .create({
        data: {
          tenantId,
          to: Array.isArray(msg.to) ? msg.to.join(', ') : msg.to,
          subject: msg.subject,
          via,
          status: result.success ? 'SENT' : 'FAILED',
          messageId: result.messageId || null,
          error: result.error || null,
        },
      })
      .catch(() => { /* logging must never break the send path */ });

    return { ...result, via };
  }

  // ------------------------------ templates ------------------------------

  private async tenantName(tenantId?: string | null): Promise<string> {
    if (!tenantId) return 'Dexo';
    const t = await this.prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
    return t?.name || 'Dexo';
  }

  private shell(title: string, bodyHtml: string, brand: string): string {
    return `<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:Arial,Helvetica,sans-serif">
<div style="max-width:560px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
  <div style="background:#111827;color:#fff;padding:20px 28px;font-size:18px;font-weight:bold">${brand}</div>
  <div style="padding:28px">
    <h2 style="margin:0 0 12px;color:#111827;font-size:20px">${title}</h2>
    ${bodyHtml}
  </div>
  <div style="padding:16px 28px;color:#9ca3af;font-size:12px;border-top:1px solid #f3f4f6">Sent by ${brand} · powered by Dexo</div>
</div></body></html>`;
  }

  /** Sent once to a tenant's owner right after their tenant is provisioned — distinct copy from
   *  member-facing sendWelcome() since the recipient is a business admin, not a gym/store customer. */
  async sendTenantAdminWelcome(tenantId: string, to: string, firstName: string, adminUrl: string) {
    const brand = await this.tenantName(tenantId);
    return this.send(tenantId, {
      to,
      subject: `Welcome to ${brand} — your dashboard is ready 🎉`,
      text: `Hi ${firstName},\n\nYour ${brand} account has been created and your admin dashboard is ready.\n\nLog in here: ${adminUrl}\n\nFrom there you can manage your team, content, and customers.`,
      html: this.shell(
        `Welcome, ${firstName}!`,
        `<p style="color:#374151;line-height:1.6">Your <strong>${brand}</strong> admin dashboard is ready. Log in to manage your team, content, and customers.</p>
         <p style="margin:24px 0"><a href="${adminUrl}" style="background:#dc2626;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:bold">Log in →</a></p>
         <p style="color:#6b7280;font-size:13px">If the button doesn't work, open: ${adminUrl}</p>`,
        brand,
      ),
    });
  }

  async sendWelcome(tenantId: string, to: string, firstName: string, appUrl?: string) {
    const brand = await this.tenantName(tenantId);
    const link = appUrl || process.env.TENANT_APP_URL || 'http://localhost:4007';
    return this.send(tenantId, {
      to,
      subject: `Welcome to ${brand}! 🎉`,
      text: `Hi ${firstName},\n\nWelcome to ${brand}! Your account is ready.\n\nOpen the app to complete your onboarding: ${link}\n\nSee you at the gym!`,
      html: this.shell(
        `Welcome, ${firstName}!`,
        `<p style="color:#374151;line-height:1.6">Your ${brand} account is ready. Complete your onboarding to get your personalised workout and diet plan.</p>
         <p style="margin:24px 0"><a href="${link}" style="background:#dc2626;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:bold">Open the app →</a></p>
         <p style="color:#6b7280;font-size:13px">If the button doesn't work, open: ${link}</p>`,
        brand,
      ),
    });
  }

  async sendPasswordReset(tenantId: string | null, to: string, firstName: string, resetLink: string) {
    const brand = await this.tenantName(tenantId);
    return this.send(tenantId, {
      to,
      subject: `Reset your ${brand} password`,
      text: `Hi ${firstName},\n\nClick the link below to reset your password:\n${resetLink}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
      html: this.shell(
        'Reset your password',
        `<p style="color:#374151;line-height:1.6">Hi ${firstName}, we received a request to reset your password. This link expires in <b>1 hour</b>.</p>
         <p style="margin:24px 0"><a href="${resetLink}" style="background:#111827;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:bold">Reset password</a></p>
         <p style="color:#6b7280;font-size:13px">If you didn't request this, you can safely ignore this email.</p>`,
        brand,
      ),
    });
  }

  async sendVerificationEmail(tenantId: string | null, to: string, firstName: string, verifyLink: string) {
    const brand = await this.tenantName(tenantId);
    return this.send(tenantId, {
      to,
      subject: `Verify your ${brand} email`,
      text: `Hi ${firstName},\n\nPlease verify your email to activate your account:\n${verifyLink}\n\nThis link expires in 24 hours.`,
      html: this.shell(
        'Verify your email',
        `<p style="color:#374151;line-height:1.6">Hi ${firstName}, welcome to ${brand}! Verify your email to activate your account. This link expires in <b>24 hours</b>.</p>
         <p style="margin:24px 0"><a href="${verifyLink}" style="background:#111827;color:#fff;text-decoration:none;padding:12px 24px;border-radius:999px;font-weight:bold">Verify email</a></p>
         <p style="color:#6b7280;font-size:13px">If you didn't create this account, you can safely ignore this email.</p>`,
        brand,
      ),
    });
  }

  async sendTest(tenantId: string, to: string) {
    const brand = await this.tenantName(tenantId);
    return this.send(tenantId, {
      to,
      subject: `${brand} — SMTP test email`,
      text: 'Your SMTP configuration works. This is a test email from Dexo.',
      html: this.shell('SMTP test successful ✅', `<p style="color:#374151">Your SMTP configuration for <b>${brand}</b> works. Transactional emails (welcome, password reset, payment receipts) will be delivered through it.</p>`, brand),
    });
  }
}
