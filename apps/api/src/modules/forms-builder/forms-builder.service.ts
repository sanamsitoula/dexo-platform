import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService, AuditService } from '@dexo/shared';
// Root import — deep '@dexo/shared/src/*' paths crash at runtime (see provisioning.service.ts).
import { getFieldTypeDef } from '@dexo/shared';

interface ActorCtx {
  tenantId: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'form';
}

/**
 * Tenant-scoped Forms Builder — mirrors MenuBuilderService/PageBuilderService
 * conventions: every read/write scoped by the caller's own tenantId (never
 * client-supplied). Forms are embedded on pages via the "form" Component
 * Library entry (content: { formId }), not routed at a top-level path, so
 * (unlike Page) form slugs don't need a reserved-word guard.
 */
@Injectable()
export class FormsBuilderService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  // ---------------------------------------------------------------- Forms

  async listForms(tenantId: string) {
    return this.prisma.form.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { fields: true, submissions: true } } },
    });
  }

  async getForm(tenantId: string, formId: string) {
    const form = await this.prisma.form.findFirst({
      where: { id: formId, tenantId },
      include: { fields: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } },
    });
    if (!form) throw new NotFoundException('Form not found');
    return form;
  }

  async createForm(ctx: ActorCtx, dto: any) {
    const slug = slugify(dto.slug || dto.name);
    const form = await this.prisma.form.create({
      data: {
        tenantId: ctx.tenantId,
        name: dto.name,
        slug,
        submitLabel: dto.submitLabel || 'Submit',
        successMessage: dto.successMessage || "Thanks — we'll be in touch soon.",
        notifyEmail: dto.notifyEmail,
        createdBy: ctx.userId,
        updatedBy: ctx.userId,
      },
    });
    await this.logAudit(ctx, 'create', 'form', form.id, { before: null, after: form });
    return form;
  }

  async updateForm(ctx: ActorCtx, formId: string, dto: any) {
    const existing = await this.mustOwnForm(ctx.tenantId, formId);
    const data: any = { updatedBy: ctx.userId };
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = slugify(dto.slug);
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.submitLabel !== undefined) data.submitLabel = dto.submitLabel;
    if (dto.successMessage !== undefined) data.successMessage = dto.successMessage;
    if (dto.notifyEmail !== undefined) data.notifyEmail = dto.notifyEmail;

    const updated = await this.prisma.form.update({ where: { id: formId }, data });
    await this.logAudit(ctx, dto.status && dto.status !== existing.status
      ? (dto.status === 'published' ? 'publish' : 'unpublish')
      : 'update', 'form', formId, { before: existing, after: updated });
    return updated;
  }

  async deleteForm(ctx: ActorCtx, formId: string) {
    const existing = await this.mustOwnForm(ctx.tenantId, formId);
    await this.prisma.form.delete({ where: { id: formId } });
    await this.logAudit(ctx, 'delete', 'form', formId, { before: existing, after: null });
    return { message: 'Form deleted' };
  }

  // --------------------------------------------------------------- Fields

  async createField(ctx: ActorCtx, formId: string, dto: any) {
    await this.mustOwnForm(ctx.tenantId, formId);
    const def = getFieldTypeDef(dto.type);
    if (!def) throw new ForbiddenException(`Unknown field type "${dto.type}"`);
    if (def.needsOptions && (!Array.isArray(dto.options) || dto.options.length === 0)) {
      throw new BadRequestException(`Field type "${dto.type}" requires at least one option`);
    }

    const maxOrder = await this.prisma.formField.aggregate({
      where: { tenantId: ctx.tenantId, formId },
      _max: { sortOrder: true },
    });

    const field = await this.prisma.formField.create({
      data: {
        tenantId: ctx.tenantId,
        formId,
        type: dto.type,
        label: dto.label,
        placeholder: dto.placeholder,
        required: !!dto.required,
        options: dto.options ?? [],
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      },
    });
    await this.logAudit(ctx, 'create', 'form_field', field.id, { before: null, after: field });
    return field;
  }

  async updateField(ctx: ActorCtx, fieldId: string, dto: any) {
    const existing = await this.mustOwnField(ctx.tenantId, fieldId);
    const data: any = {};
    if (dto.label !== undefined) data.label = dto.label;
    if (dto.placeholder !== undefined) data.placeholder = dto.placeholder;
    if (dto.required !== undefined) data.required = dto.required;
    if (dto.options !== undefined) data.options = dto.options;
    if (dto.type !== undefined) {
      const def = getFieldTypeDef(dto.type);
      if (!def) throw new ForbiddenException(`Unknown field type "${dto.type}"`);
      data.type = dto.type;
    }

    const updated = await this.prisma.formField.update({ where: { id: fieldId }, data });
    await this.logAudit(ctx, 'update', 'form_field', fieldId, { before: existing, after: updated });
    return updated;
  }

  async deleteField(ctx: ActorCtx, fieldId: string) {
    const existing = await this.mustOwnField(ctx.tenantId, fieldId);
    await this.prisma.formField.delete({ where: { id: fieldId } });
    await this.logAudit(ctx, 'delete', 'form_field', fieldId, { before: existing, after: null });
    return { message: 'Field deleted' };
  }

  async reorderField(ctx: ActorCtx, fieldId: string, direction: 'up' | 'down') {
    const field = await this.mustOwnField(ctx.tenantId, fieldId);
    const sibling = await this.prisma.formField.findFirst({
      where: {
        tenantId: ctx.tenantId,
        formId: field.formId,
        sortOrder: direction === 'up' ? { lt: field.sortOrder } : { gt: field.sortOrder },
      },
      orderBy: { sortOrder: direction === 'up' ? 'desc' : 'asc' },
    });
    if (!sibling) return field;

    await this.prisma.$transaction([
      this.prisma.formField.update({ where: { id: field.id }, data: { sortOrder: sibling.sortOrder } }),
      this.prisma.formField.update({ where: { id: sibling.id }, data: { sortOrder: field.sortOrder } }),
    ]);
    return this.prisma.formField.findUnique({ where: { id: fieldId } });
  }

  // ----------------------------------------------------------- Submissions

  async listSubmissions(tenantId: string, formId: string) {
    await this.mustOwnForm(tenantId, formId);
    return this.prisma.formSubmission.findMany({
      where: { tenantId, formId },
      orderBy: { createdAt: 'desc' },
      take: 200, // dev-grade cap; pagination is future work if a tenant needs more
    });
  }

  // ------------------------------------------------------------- Public

  /** Published form + its fields, for embedding on the public site. No auth. */
  async getPublicForm(subdomain: string, formId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { subdomain }, select: { id: true } });
    if (!tenant) return null;
    const form = await this.prisma.form.findFirst({
      where: { id: formId, tenantId: tenant.id, status: 'published' },
      include: { fields: { orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] } },
    });
    return form;
  }

  /** Validates required fields are present, then stores the submission.
   * No auth — this is the public-site submit endpoint. */
  async submitForm(subdomain: string, formId: string, data: Record<string, any>, ipAddress?: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { subdomain }, select: { id: true } });
    if (!tenant) throw new NotFoundException('Form not found');
    const form = await this.prisma.form.findFirst({
      where: { id: formId, tenantId: tenant.id, status: 'published' },
      include: { fields: true },
    });
    if (!form) throw new NotFoundException('Form not found');

    for (const field of form.fields) {
      if (field.required && (data[field.id] === undefined || data[field.id] === null || data[field.id] === '')) {
        throw new BadRequestException(`"${field.label}" is required`);
      }
    }

    const submission = await this.prisma.formSubmission.create({
      data: { tenantId: tenant.id, formId, data, ipAddress },
    });
    // Email notification (notifyEmail) is a follow-up — TenantMailService
    // integration deferred; submissions are safely stored and visible in
    // tenant-admin regardless, so nothing is lost while that's pending.
    return { message: form.successMessage, id: submission.id };
  }

  // ------------------------------------------------------------- helpers

  private async mustOwnForm(tenantId: string, formId: string) {
    const form = await this.prisma.form.findFirst({ where: { id: formId, tenantId } });
    if (!form) throw new NotFoundException('Form not found');
    return form;
  }

  private async mustOwnField(tenantId: string, fieldId: string) {
    const field = await this.prisma.formField.findFirst({ where: { id: fieldId, tenantId } });
    if (!field) throw new NotFoundException('Field not found');
    return field;
  }

  private async logAudit(ctx: ActorCtx, action: string, resourceType: 'form' | 'form_field', resourceId: string, diff: { before: any; after: any }) {
    await this.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: `${resourceType}.${action}`,
      resourceType,
      resourceId,
      changes: diff,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    });
  }
}
