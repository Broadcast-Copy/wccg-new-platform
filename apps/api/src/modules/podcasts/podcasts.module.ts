import { Module } from '@nestjs/common';
import { PodcastsController } from './podcasts.controller.js';
import { PodcastsService } from './podcasts.service.js';

@Module({
  controllers: [PodcastsController],
  providers: [PodcastsService],
  exports: [PodcastsService],
})
export class PodcastsModule {}
