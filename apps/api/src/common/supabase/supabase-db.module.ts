import { Global, Module } from '@nestjs/common';
import { SupabaseDbService } from './supabase-db.service.js';

@Global()
@Module({
  providers: [SupabaseDbService],
  exports: [SupabaseDbService],
})
export class SupabaseDbModule {}
