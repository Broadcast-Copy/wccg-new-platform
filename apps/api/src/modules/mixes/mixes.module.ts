import { Module } from '@nestjs/common';
import { MixesController } from './mixes.controller.js';
import { MixesService } from './mixes.service.js';

@Module({
  controllers: [MixesController],
  providers: [MixesService],
  exports: [MixesService],
})
export class MixesModule {}
