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

const SETTING_KEY = 'smtp';

/**
 * Per-tenant transactional email. Each tenant can configure its own SMTP
 * server (Setting key "smtp"); when a tenant has no config the platform
 * SMTP env vars (SMTP_HOST/PORT/USER/PASSWORD — MailHog in local dev) are
 * used, so emails always have a route. Lives in @dexo/shared so both the
 * auth package (welcome / password reset) and the API modules can send.
 */
@Injectable()
export class TenantMailService {
  private readonly logger = new Logger(TenantMailService.name);

  constructor(private prisma: PrismaService) {}

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
      fromEmail: process.env.EMAIL_FROM || 'noreply@dexo.com',
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

  /** Send using the tenant's SMTP if configured & enabled, else platform SMTP. */
  async send(tenantId: string | null | undefined, msg: TenantMailMessage): Promise<{ success: boolean; messageId?: string; error?: string; via: string }> {
    let cfg: TenantSmtpConfig | null = null;
    let via = 'platform';
    if (tenantId) {
      const tenantCfg = await this.getConfig(tenantId, false).catch(() => null);
      if (tenantCfg?.enabled && tenantCfg.host) {
        cfg = tenantCfg;
        via = 'tenant';
      }
    }
    if (!cfg) cfg = this.platformConfig();

    try {
      const transport = this.buildTransport(cfg);
      const from = cfg.fromName
        ? `"${cfg.fromName}" <${cfg.fromEmail || 'noreply@dexo.com'}>`
        : cfg.fromEmail || 'noreply@dexo.com';
      const info = await transport.sendMail({
        from,
        to: Array.isArray(msg.to) ? msg.to.join(', ') : msg.to,
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
      });
      this.logger.log(`Email sent via ${via} SMTP (${cfg.host}:${cfg.port}) to ${msg.to}: ${info.messageId}`);
      return { success: true, messageId: info.messageId, via };
    } catch (err: any) {
      this.logger.warn(`Email send failed via ${via} SMTP: ${err?.message}`);
      return { success: false, error: err?.message, via };
    }
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
