import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

@Injectable()
export class SalonService {
  constructor(private prisma: PrismaService) {}

  // ---- Services ----
  listServices(tenantId: string) {
    return this.prisma.service.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }

  createService(tenantId: string, dto: any) {
    if (!dto?.name || dto.price == null || dto.duration == null) {
      throw new BadRequestException('name, price and duration are required');
    }
    return this.prisma.service.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description || null,
        duration: Number(dto.duration),
        price: dto.price,
        category: dto.category || null,
      },
    });
  }

  async updateService(tenantId: string, id: string, dto: any) {
    await this.assertExists(this.prisma.service, tenantId, id, 'Service');
    return this.prisma.service.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        duration: dto.duration != null ? Number(dto.duration) : undefined,
        price: dto.price,
        category: dto.category,
      },
    });
  }

  async deleteService(tenantId: string, id: string) {
    await this.assertExists(this.prisma.service, tenantId, id, 'Service');
    return this.prisma.service.delete({ where: { id } });
  }

  // ---- Stylists ----
  listStylists(tenantId: string) {
    return this.prisma.stylist.findMany({ where: { tenantId }, orderBy: { name: 'asc' } });
  }

  createStylist(tenantId: string, dto: any) {
    if (!dto?.name) throw new BadRequestException('name is required');
    return this.prisma.stylist.create({
      data: {
        tenantId,
        name: dto.name,
        email: dto.email || null,
        phone: dto.phone || null,
        specialization: dto.specialization || null,
        commissionRate: dto.commissionRate ?? null,
        userId: dto.userId || null,
      },
    });
  }

  async updateStylist(tenantId: string, id: string, dto: any) {
    await this.assertExists(this.prisma.stylist, tenantId, id, 'Stylist');
    return this.prisma.stylist.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        specialization: dto.specialization,
        commissionRate: dto.commissionRate,
      },
    });
  }

  async deleteStylist(tenantId: string, id: string) {
    await this.assertExists(this.prisma.stylist, tenantId, id, 'Stylist');
    return this.prisma.stylist.delete({ where: { id } });
  }

  // ---- Appointments ----
  listAppointments(tenantId: string, params?: { status?: string; stylistId?: string; date?: string }) {
    const where: any = { tenantId };
    if (params?.status) where.status = params.status;
    if (params?.stylistId) where.stylistId = params.stylistId;
    if (params?.date) {
      const day = new Date(params.date);
      const next = new Date(day.getTime() + 24 * 60 * 60 * 1000);
      where.scheduledAt = { gte: day, lt: next };
    }
    return this.prisma.appointment.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      include: { service: true, stylist: true, customer: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
  }

  async createAppointment(tenantId: string, dto: any) {
    if (!dto?.serviceId || !dto?.scheduledAt) {
      throw new BadRequestException('serviceId and scheduledAt are required');
    }
    const service = await this.prisma.service.findFirst({ where: { id: dto.serviceId, tenantId } });
    if (!service) throw new NotFoundException('Service not found');

    const scheduledAt = new Date(dto.scheduledAt);
    const duration = dto.duration != null ? Number(dto.duration) : service.duration;

    // Prevent double-booking a stylist for overlapping times.
    if (dto.stylistId) {
      const overlapping = await this.prisma.appointment.findFirst({
        where: {
          tenantId,
          stylistId: dto.stylistId,
          status: { in: ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS'] },
          scheduledAt: { lt: new Date(scheduledAt.getTime() + duration * 60000) },
        },
        orderBy: { scheduledAt: 'desc' },
      });
      if (
        overlapping &&
        new Date(overlapping.scheduledAt.getTime() + overlapping.duration * 60000) > scheduledAt
      ) {
        throw new BadRequestException('Stylist already has an appointment in that time slot');
      }
    }

    return this.prisma.appointment.create({
      data: {
        tenantId,
        customerId: dto.customerId || null,
        stylistId: dto.stylistId || null,
        serviceId: dto.serviceId,
        scheduledAt,
        duration,
        notes: dto.notes || null,
      },
      include: { service: true, stylist: true },
    });
  }

  async updateAppointmentStatus(tenantId: string, id: string, status: string) {
    const valid = ['SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
    if (!valid.includes(status)) throw new BadRequestException(`status must be one of ${valid.join(', ')}`);
    await this.assertExists(this.prisma.appointment, tenantId, id, 'Appointment');
    return this.prisma.appointment.update({ where: { id }, data: { status: status as any } });
  }

  private async assertExists(model: any, tenantId: string, id: string, label: string) {
    const row = await model.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!row) throw new NotFoundException(`${label} not found`);
  }
}
