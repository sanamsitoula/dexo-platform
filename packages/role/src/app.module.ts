import { Module } from '@nestjs/common';
import { RoleController } from './role/role.controller';
import { RoleService } from './role/role.service';

@Module({
  controllers: [RoleController],
  providers: [RoleService],
  exports: [RoleService],
})
export class AppModule {}
