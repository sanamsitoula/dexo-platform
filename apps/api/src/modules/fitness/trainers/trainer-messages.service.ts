import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '@dexo/shared';

@Injectable()
export class TrainerMessagesService {
  constructor(private prisma: PrismaService) {}

  async getThread(tenantId: string, memberId: string, trainerId: string) {
    return this.prisma.trainerMessage.findMany({
      where: { tenantId, memberId, trainerId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getMemberMessages(tenantId: string, memberId: string) {
    return this.prisma.trainerMessage.findMany({
      where: { tenantId, memberId },
      orderBy: { createdAt: 'desc' },
      include: { trainer: { select: { id: true, name: true } } },
      take: 100,
    });
  }

  async getTrainerInbox(tenantId: string, trainerId: string) {
    const messages = await this.prisma.trainerMessage.findMany({
      where: { tenantId, trainerId },
      orderBy: { createdAt: 'desc' },
      include: { member: { include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } } } },
      take: 200,
    });
    const map = new Map<string, any>();
    for (const m of messages) {
      if (!map.has(m.memberId)) {
        map.set(m.memberId, { memberId: m.memberId, member: m.member, lastMessage: m, unreadCount: 0 });
      }
      if (!m.isRead && m.senderType === 'MEMBER') {
        map.get(m.memberId).unreadCount++;
      }
    }
    return Array.from(map.values());
  }

  async send(tenantId: string, dto: any) {
    if (!dto.memberId || !dto.message) throw new BadRequestException('memberId and message are required');
    return this.prisma.trainerMessage.create({
      data: {
        tenantId,
        memberId: dto.memberId,
        trainerId: dto.trainerId,
        senderType: dto.senderType ?? 'MEMBER',
        message: dto.message,
      },
    });
  }

  async markRead(tenantId: string, id: string) {
    const m = await this.prisma.trainerMessage.findFirst({ where: { id, tenantId } });
    if (!m) throw new NotFoundException('Message not found');
    return this.prisma.trainerMessage.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markThreadRead(tenantId: string, memberId: string, trainerId: string) {
    return this.prisma.trainerMessage.updateMany({
      where: { tenantId, memberId, trainerId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }
}
