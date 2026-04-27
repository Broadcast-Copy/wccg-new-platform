import { Module } from '@nestjs/common';
import { WikiController } from './wiki.controller.js';
import { WikiService } from './wiki.service.js';

@Module({
  controllers: [WikiController],
  providers: [WikiService],
  exports: [WikiService],
})
export class WikiModule {}
