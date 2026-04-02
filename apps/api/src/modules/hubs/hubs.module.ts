import { Module } from '@nestjs/common';
import { HubsController } from './hubs.controller.js';
import { HubsService } from './hubs.service.js';

@Module({
  controllers: [HubsController],
  providers: [HubsService],
  exports: [HubsService],
})
export class HubsModule {}
