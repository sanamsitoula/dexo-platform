import { Module } from '@nestjs/common';
import { PrismaModule } from '@dexo/shared';
import { ZkPullerService } from './zk-puller.service';
import { AttendanceDevicesService } from './attendance-devices.service';
import { AttendanceReportsService } from './attendance-reports.service';
import {
  AttendanceDevicesController,
  AttendanceLogsController,
  AttendanceReportsController,
} from './attendance-devices.controller';

@Module({
  imports: [PrismaModule],
  providers: [ZkPullerService, AttendanceDevicesService, AttendanceReportsService],
  controllers: [AttendanceDevicesController, AttendanceLogsController, AttendanceReportsController],
  exports: [AttendanceDevicesService],
})
export class AttendanceDevicesModule {}
