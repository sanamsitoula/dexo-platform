import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtAuthGuard } from '@dexo/auth';
import { Public } from '@dexo/auth';
import { InviteUserDto, AcceptInvitationDto, ResendInvitationDto } from './dto/invitation.dto';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('invite')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Invite a user to join tenant' })
  async inviteUser(@Request() req: any, @Body() inviteDto: InviteUserDto) {
    return this.userService.inviteUser(req.user.id, inviteDto);
  }

  @Public()
  @Post('accept-invitation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an invitation' })
  async acceptInvitation(@Body() dto: AcceptInvitationDto) {
    return this.userService.acceptInvitation(dto);
  }

  @Post('resend-invitation')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend an invitation' })
  async resendInvitation(@Request() req: any, @Body() dto: ResendInvitationDto) {
    return this.userService.resendInvitation(req.user.id, dto);
  }

  @Post('cancel-invitation')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an invitation' })
  async cancelInvitation(@Request() req: any, @Body() dto: ResendInvitationDto) {
    return this.userService.cancelInvitation(req.user.id, dto);
  }

  @Get('invitations/pending')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get pending invitations for tenant' })
  async getPendingInvitations(@Request() req: any) {
    return this.userService.getPendingInvitations(req.user.tenantId);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Request() req: any) {
    return this.userService.getUserProfile(req.user.id);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(@Request() req: any, @Body() data: any) {
    return this.userService.updateUserProfile(req.user.id, data);
  }

  @Get('tenant')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get all users in tenant' })
  async getTenantUsers(@Request() req: any) {
    return this.userService.getTenantUsers(req.user.tenantId);
  }

  @Post(':userId/deactivate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a user' })
  async deactivateUser(@Param('userId') userId: string, @Request() req: any) {
    return this.userService.deactivateUser(userId, req.user.tenantId);
  }

  @Post(':userId/reactivate')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate a user' })
  async reactivateUser(@Param('userId') userId: string, @Request() req: any) {
    return this.userService.reactivateUser(userId, req.user.tenantId);
  }

  @Post('reset-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset a user password (Platform Admin only)' })
  async resetUserPassword(@Request() req: any, @Body() body: { email: string; newPassword: string; tenantId?: string }) {
    return this.userService.adminResetPassword(req.user, body);
  }

  @Get(':userId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user by ID' })
  async getUserById(@Param('userId') userId: string) {
    return this.userService.getUserProfile(userId);
  }
}
