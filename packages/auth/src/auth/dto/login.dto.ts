import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsString()
  @MinLength(1, { message: 'Password is required' })
  password: string;

  @IsOptional()
  @IsString()
  tenantId?: string;

  /** Tenant subdomain (alternative to tenantId). The auth service will resolve to a tenantId. */
  @IsOptional()
  @IsString()
  subdomain?: string;
}
