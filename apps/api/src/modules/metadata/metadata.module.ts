import { Module } from '@nestjs/common';
import { MetadataController } from './metadata.controller.js';
import { MetadataService } from './metadata.service.js';

@Module({
  controllers: [MetadataController],
  providers: [MetadataService],
  exports: [MetadataService],
})
export class MetadataModule {}
