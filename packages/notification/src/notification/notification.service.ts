import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService as PrismaTenantService } from '@dexo/tenant';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaTenantService) {}

  async createTemplate(data: {
    name: string;
    type: 'email' | 'sms' | 'push' | 'inApp';
    subject?: string;
    body: string;
    variables?: string[];
    tenantId?: string;
  }) {
    return this.prisma.notificationTemplate.create({
      data: {
        name: data.name,
        type: data.type,
        subject: data.subject,
        body: data.body,
        variables: data.variables || [],
        tenantId: data.tenantId,
      },
    });
  }

  async findAllTemplates(tenantId?: string) {
    const where: any = {};
    if (tenantId) {
      where.OR = [{ tenantId }, { tenantId: null }];
    } else {
      where.tenantId = null;
    }
    return this.prisma.notificationTemplate.findMany({
      where,
      orderBy: { name: 'asc' },
    });
  }

  async findTemplate(id: string) {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id },
    });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  async updateTemplate(id: string, data: any) {
    const template = await this.prisma.notificationTemplate.update({
      where: { id },
      data,
    });
    return template;
  }

  async deleteTemplate(id: string) {
    await this.prisma.notificationTemplate.delete({
      where: { id },
    });
    return { message: 'Template deleted' };
  }

  async sendNotification(data: {
    templateId: string;
    to: string | string[];
    variables?: Record<string, any>;
  }) {
    const template = await this.findTemplate(data.templateId);
    // Integration with SendGrid/Twilio would go here
    return {
      message: 'Notification queued',
      template: template.name,
      to: data.to,
    };
  }
}
