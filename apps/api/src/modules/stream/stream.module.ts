import { Module } from '@nestjs/common';
import { StreamController } from './stream.controller.js';
import { StreamService } from './stream.service.js';

@Module({
  controllers: [StreamController],
  providers: [StreamService],
  exports: [StreamService],
})
export class StreamModule {}
