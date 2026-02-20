import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseDbService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseDbService.name);
  public client!: SupabaseClient;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const url = this.config.get<string>('SUPABASE_URL')!;
    // Use the secret key (service role equivalent) for server-side operations
    // This bypasses RLS, which is what we want for the API server
    const key = this.config.get<string>('SUPABASE_SECRET_KEY')
      ?? this.config.get<string>('SUPABASE_ANON_KEY')!;

    this.client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    this.logger.log('Supabase client initialized');
  }

  /** Shorthand for this.client.from(table) */
  from(table: string): any {
    return this.client.from(table);
  }
}
