import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard, PlatformAdminGuard } from '@dexo/auth';
import { RoleService } from './role.service';
import { CreateRoleDto, UpdateRoleDto, AssignRoleDto, RemoveRoleDto } from './dto';

@ApiTags('roles')
@Controller('roles')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new role (platform or tenant-scoped)' })
  @ApiResponse({ status: 201, description: 'Role created successfully' })
  @ApiResponse({ status: 409, description: 'Role with this name already exists' })
  async create(@Body() createRoleDto: CreateRoleDto, @Req() req: any) {
    const user = req.user;
    const tenantId = user.isPlatformAdmin ? undefined : user.tenantId;

    if (!user.isPlatformAdmin && !user.tenantId) {
      throw new ForbiddenException('Access denied');
    }

    if (!user.isPlatformAdmin) {
      createRoleDto.isSystem = false;
    }

    return this.roleService.create(createRoleDto, tenantId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all roles (tenant-scoped or platform-wide)' })
  @ApiResponse({ status: 200, description: 'Roles retrieved successfully' })
  async findAll(@Req() req: any) {
    const user = req.user;
    const tenantId = user.isPlatformAdmin ? undefined : user.tenantId;

    if (!user.isPlatformAdmin && !user.tenantId) {
      throw new ForbiddenException('Access denied');
    }

    return this.roleService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiResponse({ status: 200, description: 'Role retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async findOne(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    const role = await this.roleService.findOne(id);

    if (!user.isPlatformAdmin && role.tenantId && role.tenantId !== user.tenantId) {
      throw new ForbiddenException('Access denied');
    }

    return role;
  }

  @Get('name/:name')
  @ApiOperation({ summary: 'Get role by name' })
  @ApiResponse({ status: 200, description: 'Role retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async findByName(@Param('name') name: string, @Req() req: any) {
    const user = req.user;
    const tenantId = user.isPlatformAdmin ? undefined : user.tenantId;
    return this.roleService.findByName(name, tenantId);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all roles for a user' })
  @ApiResponse({ status: 200, description: 'User roles retrieved successfully' })
  async getUserRoles(@Param('userId') userId: string, @Req() req: any) {
    const user = req.user;

    if (!user.isPlatformAdmin && !user.tenantId) {
      throw new ForbiddenException('Access denied');
    }

    return this.roleService.getUserRoles(userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update role' })
  @ApiResponse({ status: 200, description: 'Role updated successfully' })
  @ApiResponse({ status: 400, description: 'Cannot modify system roles' })
  @ApiResponse({ status: 404, description: 'Role not found' })
  async update(@Param('id') id: string, @Body() updateRoleDto: UpdateRoleDto, @Req() req: any) {
    const user = req.user;

    if (!user.isPlatformAdmin && !user.tenantId) {
      throw new ForbiddenException('Access denied');
    }

    if (!user.isPlatformAdmin) {
      const existing = await this.roleService.findOne(id);
      if (existing.tenantId && existing.tenantId !== user.tenantId) {
        throw new ForbiddenException('Access denied');
      }
      if (existing.isSystem) {
        throw new ForbiddenException('Cannot modify system roles');
      }
    }

    return this.roleService.update(id, updateRoleDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete role' })
  @ApiResponse({ status: 204, description: 'Role deleted successfully' })
  @ApiResponse({ status: 400, description: 'Cannot delete system roles or assigned roles' })
  async remove(@Param('id') id: string, @Req() req: any) {
    const user = req.user;

    if (!user.isPlatformAdmin && !user.tenantId) {
      throw new ForbiddenException('Access denied');
    }

    if (!user.isPlatformAdmin) {
      const existing = await this.roleService.findOne(id);
      if (existing.tenantId && existing.tenantId !== user.tenantId) {
        throw new ForbiddenException('Access denied');
      }
      if (existing.isSystem) {
        throw new ForbiddenException('Cannot delete system roles');
      }
    }

    await this.roleService.remove(id);
  }

  @Post('assign')
  @ApiOperation({ summary: 'Assign roles to user' })
  @ApiResponse({ status: 201, description: 'Roles assigned successfully' })
  async assignRoles(@Body() assignRoleDto: AssignRoleDto, @Req() req: any) {
    const user = req.user;

    if (!user.isPlatformAdmin && !user.tenantId) {
      throw new ForbiddenException('Access denied');
    }

    return this.roleService.assignRoles(assignRoleDto);
  }

  @Delete('remove')
  @ApiOperation({ summary: 'Remove role from user' })
  @ApiResponse({ status: 200, description: 'Role removed successfully' })
  async removeRole(@Body() removeRoleDto: RemoveRoleDto, @Req() req: any) {
    const user = req.user;

    if (!user.isPlatformAdmin && !user.tenantId) {
      throw new ForbiddenException('Access denied');
    }

    return this.roleService.removeRole(removeRoleDto);
  }

  @Post('seed')
  @UseGuards(PlatformAdminGuard)
  @ApiOperation({ summary: 'Seed system roles (platform admin only)' })
  @ApiResponse({ status: 201, description: 'System roles seeded successfully' })
  async seedSystemRoles() {
    return this.roleService.seedSystemRoles();
  }
}
