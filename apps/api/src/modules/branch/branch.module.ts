import { Module } from '@nestjs/common';
import { PrismaModule } from '@dexo/shared';
import { BranchService } from './branch.service';
import { BranchController } from './branch.controller';
import { BranchReportsService } from './branch-reports.service';
import { BranchReportsController } from './branch-reports.controller';

@Module({
  imports: [PrismaModule],
  providers: [BranchService, BranchReportsService],
  controllers: [BranchController, BranchReportsController],
  exports: [BranchService, BranchReportsService],
})
export class BranchModule {}
