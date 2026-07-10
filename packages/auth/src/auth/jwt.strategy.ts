import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '@dexo/shared';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    // Allow 'active' AND 'pending_verification' (dev convenience). Block 'locked' / 'suspended'.
    if (!user || (user.status !== 'active' && user.status !== 'pending_verification')) {
      throw new UnauthorizedException('Invalid token');
    }

    const { passwordHash: _ph, ...result } = user;

    return {
      id: result.id,
      email: result.email,
      tenantId: result.tenantId,
      firstName: result.firstName,
      lastName: result.lastName,
      isPlatformAdmin: result.isPlatformAdmin,
    };
  }
}
