import { Module } from '@nestjs/common';
import { PushController } from './push.controller.js';
import { PushService } from './push.service.js';
import { PointsModule } from '../points/points.module.js';

@Module({
  imports: [PointsModule],
  controllers: [PushController],
  providers: [PushService],
  exports: [PushService],
})
export class PushModule {}
