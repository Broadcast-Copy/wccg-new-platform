import { Module } from '@nestjs/common';
import { MasterControlController } from './master-control.controller.js';
import { MasterControlService } from './master-control.service.js';

@Module({
  controllers: [MasterControlController],
  providers: [MasterControlService],
  exports: [MasterControlService],
})
export class MasterControlModule {}
