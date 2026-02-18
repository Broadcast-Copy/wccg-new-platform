import { Module } from '@nestjs/common';
import { ScheduleController } from './schedule.controller.js';
import { ScheduleService } from './schedule.service.js';

@Module({
  controllers: [ScheduleController],
  providers: [ScheduleService],
  exports: [ScheduleService],
})
export class ScheduleModule {}
