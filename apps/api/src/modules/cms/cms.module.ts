import { Module } from '@nestjs/common';
import { CmsController } from './cms.controller.js';
import { CmsService } from './cms.service.js';

@Module({
  controllers: [CmsController],
  providers: [CmsService],
  exports: [CmsService],
})
export class CmsModule {}
