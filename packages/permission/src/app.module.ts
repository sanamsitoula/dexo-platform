import { Module } from '@nestjs/common';
import { PermissionController } from './permission/permission.controller';
import { PermissionService } from './permission/permission.service';

@Module({
  controllers: [PermissionController],
  providers: [PermissionService],
  exports: [PermissionService],
})
export class AppModule {}
