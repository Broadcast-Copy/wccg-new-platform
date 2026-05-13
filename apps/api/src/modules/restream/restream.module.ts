import { Module } from '@nestjs/common';
import { RestreamController } from './restream.controller.js';
import { RestreamService } from './restream.service.js';

@Module({
  controllers: [RestreamController],
  providers: [RestreamService],
  exports: [RestreamService],
})
export class RestreamModule {}
