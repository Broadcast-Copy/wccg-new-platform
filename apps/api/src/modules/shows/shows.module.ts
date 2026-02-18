import { Module } from '@nestjs/common';
import { ShowsController } from './shows.controller.js';
import { ShowsService } from './shows.service.js';

@Module({
  controllers: [ShowsController],
  providers: [ShowsService],
  exports: [ShowsService],
})
export class ShowsModule {}
