import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsArray } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({ example: 'user-uuid' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: ['role-uuid-1', 'role-uuid-2'] })
  @IsArray()
  @IsUUID('4', { each: true })
  roleIds: string[];
}

export class RemoveRoleDto {
  @ApiProperty({ example: 'user-uuid' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: 'role-uuid' })
  @IsUUID()
  roleId: string;
}
