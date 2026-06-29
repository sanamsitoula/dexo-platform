import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService as PrismaTenantService } from '@dexo/tenant';
import { AuditService } from '@dexo/shared';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { InviteUserDto, AcceptInvitationDto, ResendInvitationDto } from './dto/invitation.dto';

@Injectable()
export class UserService {
  constructor(
    private prisma: PrismaTenantService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private audit: AuditService,
  ) {}

  /**
   * Invite a user to join a tenant
   */
  async inviteUser(inviterUserId: string, inviteDto: InviteUserDto) {
    const inviter = await this.prisma.user.findUnique({
      where: { id: inviterUserId },
      include: { tenant: true },
    });

    if (!inviter || !inviter.tenantId) {
      throw new BadRequestException('Inviter must belong to a tenant');
    }

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: inviteDto.email },
    });

    let invitationToken: string;
    const invitationExpiresAt = new Date();
    invitationExpiresAt.setDate(invitationExpiresAt.getDate() + 7); // 7 days

    if (existingUser) {
      // User exists, check if they're already in this tenant
      if (existingUser.tenantId === inviter.tenantId) {
        throw new ConflictException('User is already a member of this tenant');
      }

      // Create an invitation for existing user to join tenant
      invitationToken = this.jwtService.sign(
        {
          sub: existingUser.id,
          email: existingUser.email,
          targetTenantId: inviter.tenantId,
          type: 'tenant_invitation',
        },
        {
          secret: this.configService.get('JWT_SECRET') || 'secret',
          expiresIn: '7d',
        },
      );

      // In production, send email via queue
      // await this.queueService.addTemplateEmailJob('invitation-email', existingUser.email, {
      //   firstName: existingUser.firstName || 'there',
      //   inviterName: `${inviter.firstName} ${inviter.lastName}`,
      //   tenantName: inviter.tenant.name,
      //   invitationLink: `${this.configService.get('FRONTEND_URL')}/accept-invitation?token=${invitationToken}`,
      // });
    } else {
      // New user - create invitation
      invitationToken = this.jwtService.sign(
        {
          email: inviteDto.email,
          tenantId: inviter.tenantId,
          roleId: inviteDto.roleId,
          inviterId: inviterUserId,
          type: 'user_invitation',
        },
        {
          secret: this.configService.get('JWT_SECRET') || 'secret',
          expiresIn: '7d',
        },
      );

      // In production, send email via queue
      // await this.queueService.addTemplateEmailJob('invitation-email', inviteDto.email, {
      //   firstName: inviteDto.firstName || 'there',
      //   inviterName: `${inviter.firstName} ${inviter.lastName}`,
      //   tenantName: inviter.tenant.name,
      //   invitationLink: `${this.configService.get('FRONTEND_URL')}/accept-invitation?token=${invitationToken}`,
      // });
    }

    await this.audit.logUserAction('user.invited', inviterUserId, inviter.tenantId, inviteDto.email, {
      email: inviteDto.email,
      roleId: inviteDto.roleId,
      method: 'invitation',
    });

    return {
      message: 'Invitation sent successfully',
      invitationToken, // Only for development
      expiresAt: invitationExpiresAt,
    };
  }

  /**
   * Accept an invitation and create/join tenant
   */
  async acceptInvitation(dto: AcceptInvitationDto) {
    try {
      const payload = this.jwtService.verify(dto.token, {
        secret: this.configService.get('JWT_SECRET') || 'secret',
      });

      if (payload.type === 'user_invitation') {
        // New user accepting invitation
        const existingUser = await this.prisma.user.findUnique({
          where: { email: payload.email },
        });

        if (existingUser) {
          throw new ConflictException('User already exists. Please log in.');
        }

        const saltRounds = parseInt(this.configService.get('BCRYPT_SALT_ROUNDS') || '10', 10);
        const passwordHash = await bcrypt.hash(dto.password, saltRounds);

        const user = await this.prisma.user.create({
          data: {
            email: payload.email,
            passwordHash,
            firstName: dto.firstName,
            lastName: dto.lastName,
            tenantId: payload.tenantId,
            status: 'active',
            emailVerified: true,
          },
        });

        // Assign role if specified
        if (payload.roleId) {
          await this.prisma.userRoles.create({
            data: {
              userId: user.id,
              roleId: payload.roleId,
              assignedById: payload.inviterId,
            },
          });
        }

        // Generate tokens
        const tokenPayload = {
          sub: user.id,
          email: user.email,
          tenantId: user.tenantId,
        };

        const accessToken = this.jwtService.sign(tokenPayload, {
          expiresIn: this.configService.get('JWT_EXPIRATION') || '1h',
        });

        const refreshToken = this.jwtService.sign(tokenPayload, {
          secret: this.configService.get('REFRESH_TOKEN_SECRET') || this.jwtService.options.secret,
          expiresIn: this.configService.get('REFRESH_TOKEN_EXPIRATION') || '7d',
        });

        return {
          message: 'Invitation accepted successfully',
          accessToken,
          refreshToken,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            tenantId: user.tenantId,
          },
        };
      } else if (payload.type === 'tenant_invitation') {
        // Existing user joining new tenant
        const user = await this.prisma.user.findUnique({
          where: { id: payload.sub },
        });

        if (!user) {
          throw new BadRequestException('User not found');
        }

        // Update user's tenant
        await this.prisma.user.update({
          where: { id: user.id },
          data: { tenantId: payload.targetTenantId },
        });

        return {
          message: 'Successfully joined the tenant',
        };
      } else {
        throw new BadRequestException('Invalid invitation type');
      }
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new BadRequestException('Invitation has expired');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new BadRequestException('Invalid invitation token');
      }
      throw error;
    }
  }

  /**
   * Resend an invitation
   */
  async resendInvitation(userId: string, dto: ResendInvitationDto) {
    const inviter = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenant: true },
    });

    if (!inviter || !inviter.tenantId) {
      throw new BadRequestException('Invalid inviter');
    }

    // Check if there's a pending invitation for this email
    // In a full implementation, you'd store invitations in the database
    // For now, we'll generate a new token

    const invitationToken = this.jwtService.sign(
      {
        email: dto.email,
        tenantId: inviter.tenantId,
        inviterId: userId,
        type: 'user_invitation',
      },
      {
        secret: this.configService.get('JWT_SECRET') || 'secret',
        expiresIn: '7d',
      },
    );

    // Send email
    // await this.queueService.addTemplateEmailJob('invitation-email', dto.email, {
    //   firstName: 'there',
    //   inviterName: `${inviter.firstName} ${inviter.lastName}`,
    //   tenantName: inviter.tenant.name,
    //   invitationLink: `${this.configService.get('FRONTEND_URL')}/accept-invitation?token=${invitationToken}`,
    // });

    return {
      message: 'Invitation resent successfully',
      invitationToken, // Only for development
    };
  }

  /**
   * Cancel an invitation
   */
  async cancelInvitation(userId: string, dto: ResendInvitationDto) {
    // In a full implementation, you'd remove the invitation from the database
    return {
      message: 'Invitation cancelled successfully',
    };
  }

  /**
   * Get pending invitations for a tenant
   */
  async getPendingInvitations(tenantId: string) {
    // In a full implementation, you'd query an invitations table
    // For now, return empty array
    return [];
  }

  /**
   * Get user profile with roles
   */
  async getUserProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
        tenant: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { passwordHash, ...result } = user;
    return result;
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, data: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    avatarUrl?: string;
  }) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
    });

    const { passwordHash, ...result } = user;
    return result;
  }

  /**
   * Get users in a tenant
   */
  async getTenantUsers(tenantId: string) {
    const users = await this.prisma.user.findMany({
      where: { tenantId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return users.map(({ passwordHash, ...u }) => u);
  }

  /**
   * Deactivate a user
   */
  async deactivateUser(userId: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new NotFoundException('User not found in this tenant');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'inactive' },
    });

    return {
      message: 'User deactivated successfully',
    };
  }

  /**
   * Reactivate a user
   */
  async reactivateUser(userId: string, tenantId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, tenantId },
    });

    if (!user) {
      throw new NotFoundException('User not found in this tenant');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'active' },
    });

    return {
      message: 'User reactivated successfully',
    };
  }

  /**
   * Admin: Reset a user's password
   * Only available to platform admins (or for users in admin's own tenant)
   */
  async adminResetPassword(
    requester: any,
    body: { email: string; newPassword: string; tenantId?: string },
  ) {
    if (!body.email || !body.newPassword) {
      throw new BadRequestException('Email and newPassword are required');
    }
    if (body.newPassword.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    // Build where clause based on requester permissions
    const where: any = { email: body.email.toLowerCase() };
    if (!requester.isPlatformAdmin) {
      // Non-platform-admin can only reset passwords in their own tenant
      if (!requester.tenantId) {
        throw new BadRequestException('You must specify a tenantId or be a platform admin');
      }
      where.tenantId = requester.tenantId;
    } else if (body.tenantId) {
      where.tenantId = body.tenantId;
    }

    const user = await this.prisma.user.findFirst({ where });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const saltRounds = parseInt(
      this.configService.get('BCRYPT_SALT_ROUNDS') || '10',
      10,
    );
    const passwordHash = await bcrypt.hash(body.newPassword, saltRounds);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        // Clear any existing sessions / require re-login
        status: 'active',
      },
    });

    return {
      message: 'Password reset successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }
}
