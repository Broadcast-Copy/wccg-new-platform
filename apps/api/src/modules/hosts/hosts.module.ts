import { Module } from '@nestjs/common';
import { HostsController } from './hosts.controller.js';
import { HostsService } from './hosts.service.js';

@Module({
  controllers: [HostsController],
  providers: [HostsService],
  exports: [HostsService],
})
export class HostsModule {}
