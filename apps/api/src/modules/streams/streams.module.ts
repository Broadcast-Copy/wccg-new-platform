import { Module } from '@nestjs/common';
import { StreamsController } from './streams.controller.js';
import { StreamsService } from './streams.service.js';

@Module({
  controllers: [StreamsController],
  providers: [StreamsService],
  exports: [StreamsService],
})
export class StreamsModule {}
