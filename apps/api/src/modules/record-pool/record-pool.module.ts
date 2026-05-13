import { Module } from '@nestjs/common';
import { RecordPoolController } from './record-pool.controller.js';
import { RecordPoolService } from './record-pool.service.js';

@Module({
  controllers: [RecordPoolController],
  providers: [RecordPoolService],
  exports: [RecordPoolService],
})
export class RecordPoolModule {}
