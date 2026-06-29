import { Module } from '@nestjs/common';
import { FilesController } from './files/files.controller';
import { FilesService } from './files/files.service';

@Module({
  controllers: [FilesController],
  providers: [FilesService],
  exports: [FilesService],
})
export class AppModule {}
