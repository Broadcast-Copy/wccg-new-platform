import { Module } from '@nestjs/common';
import { DjPortalController } from './dj-portal.controller.js';
import { DjPortalService } from './dj-portal.service.js';

@Module({
  controllers: [DjPortalController],
  providers: [DjPortalService],
  exports: [DjPortalService],
})
export class DjPortalModule {}
