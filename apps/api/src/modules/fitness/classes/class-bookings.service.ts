import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

@Injectable()
export class ClassBookingsService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string, params?: { memberId?: string; classId?: string; from?: string; to?: string; status?: string }) {
    const where: any = { tenantId };
    if (params?.memberId) where.memberId = params.memberId;
    if (params?.classId) where.classId = params.classId;
    if (params?.status) where.status = params.status;
    if (params?.from || params?.to) {
      where.bookingDate = {};
      if (params.from) where.bookingDate.gte = new Date(params.from);
      if (params.to) where.bookingDate.lte = new Date(params.to);
    }
    return this.prisma.classBooking.findMany({
      where,
      orderBy: { bookingDate: 'asc' },
      include: {
        member: { include: { user: { select: { firstName: true, lastName: true } } } },
        class: { include: { trainer: { select: { name: true } } } },
      },
    });
  }

  async findOne(tenantId: string, id: string) {
    const b = await this.prisma.classBooking.findFirst({
      where: { id, tenantId },
      include: { member: true, class: true },
    });
    if (!b) throw new NotFoundException('Booking not found');
    return b;
  }

  async book(tenantId: string, dto: any) {
    if (!dto.memberId || !dto.classId) throw new BadRequestException('memberId and classId required');
    const cls = await this.prisma.groupClass.findFirst({ where: { id: dto.classId, tenantId } });
    if (!cls) throw new NotFoundException('Class not found');
    if (cls.currentCount >= cls.maxCapacity) throw new BadRequestException('Class is full');
    const bookingDate = dto.bookingDate ? new Date(dto.bookingDate) : new Date();
    const booking = await this.prisma.classBooking.create({
      data: {
        tenantId,
        memberId: dto.memberId,
        classId: dto.classId,
        membershipId: dto.membershipId,
        bookingDate,
        status: 'BOOKED',
      },
    });
    await this.prisma.groupClass.update({ where: { id: dto.classId }, data: { currentCount: { increment: 1 } } });
    return booking;
  }

  async cancel(tenantId: string, id: string) {
    const b = await this.findOne(tenantId, id);
    if (b.status === 'CANCELLED') throw new BadRequestException('Already cancelled');
    const updated = await this.prisma.classBooking.update({
      where: { id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
    await this.prisma.groupClass.update({ where: { id: b.classId }, data: { currentCount: { decrement: 1 } } });
    return updated;
  }

  async markAttended(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.classBooking.update({ where: { id }, data: { status: 'ATTENDED' } });
  }
}
