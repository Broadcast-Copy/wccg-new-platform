import { Module } from '@nestjs/common';
import { AdvertisingController } from './advertising.controller.js';
import { AdvertisingService } from './advertising.service.js';

@Module({
  controllers: [AdvertisingController],
  providers: [AdvertisingService],
  exports: [AdvertisingService],
})
export class AdvertisingModule {}
