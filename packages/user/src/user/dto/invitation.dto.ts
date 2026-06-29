import { IsEmail, IsString, IsOptional, IsArray } from 'class-validator';

export class InviteUserDto {
  @IsEmail()
  email: string;

  @IsString()
  firstName?: string;

  @IsString()
  lastName?: string;

  @IsString()
  @IsOptional()
  roleId?: string;

  @IsOptional()
  message?: string;
}

export class BulkInviteUserDto {
  @IsArray()
  @IsEmail({}, { each: true })
  emails: string[];

  @IsString()
  @IsOptional()
  roleId?: string;

  @IsOptional()
  message?: string;
}

export class AcceptInvitationDto {
  @IsString()
  token: string;

  @IsString()
  password: string;

  @IsString()
  firstName?: string;

  @IsString()
  lastName?: string;
}

export class ResendInvitationDto {
  @IsEmail()
  email: string;
}

export class CancelInvitationDto {
  @IsEmail()
  email: string;
}
