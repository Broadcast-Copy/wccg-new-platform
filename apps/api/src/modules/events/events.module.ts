import { Module } from '@nestjs/common';
import { EventsController } from './events.controller.js';
import { RegistrationsController } from './registrations.controller.js';
import { EventsService } from './events.service.js';

@Module({
  controllers: [EventsController, RegistrationsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
