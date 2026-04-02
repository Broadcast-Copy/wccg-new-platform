import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

// Common
import { SupabaseDbModule } from './common/supabase/supabase-db.module.js';
import { SupabaseAuthGuard } from './common/guards/supabase-auth.guard.js';

// Feature modules
import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { StreamsModule } from './modules/streams/streams.module.js';
import { ShowsModule } from './modules/shows/shows.module.js';
import { HostsModule } from './modules/hosts/hosts.module.js';
import { ScheduleModule } from './modules/schedule/schedule.module.js';
import { FavoritesModule } from './modules/favorites/favorites.module.js';
import { PointsModule } from './modules/points/points.module.js';
import { RewardsModule } from './modules/rewards/rewards.module.js';
import { EventsModule } from './modules/events/events.module.js';
import { MetadataModule } from './modules/metadata/metadata.module.js';
import { DirectoryModule } from './modules/directory/directory.module.js';
import { MixesModule } from './modules/mixes/mixes.module.js';
import { PodcastsModule } from './modules/podcasts/podcasts.module.js';
import { AdvertisingModule } from './modules/advertising/advertising.module.js';
import { FollowsModule } from './modules/follows/follows.module.js';
import { HubsModule } from './modules/hubs/hubs.module.js';
import { NotificationsModule } from './modules/notifications/notifications.module.js';
import { ModerationModule } from './modules/moderation/moderation.module.js';
import { CmsModule } from './modules/cms/cms.module.js';
import { AdsModule } from './modules/ads/ads.module.js';
import { NavigationModule } from './modules/navigation/navigation.module.js';
import { StreamModule } from './modules/stream/stream.module.js';

// Root controller + service (health / info)
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    // ── Config ─────────────────────────────────────────────────────
    ConfigModule.forRoot({ isGlobal: true }),

    // ── Database ───────────────────────────────────────────────────
    SupabaseDbModule,

    // ── Feature modules ────────────────────────────────────────────
    AuthModule,
    UsersModule,
    StreamsModule,
    ShowsModule,
    HostsModule,
    ScheduleModule,
    FavoritesModule,
    PointsModule,
    RewardsModule,
    EventsModule,
    MetadataModule,
    DirectoryModule,
    MixesModule,
    PodcastsModule,
    AdvertisingModule,
    FollowsModule,
    HubsModule,
    NotificationsModule,
    ModerationModule,

    // ── CMS / Admin-managed content ─────────────────────────────────
    CmsModule,
    AdsModule,
    NavigationModule,

    // ── Stream metadata proxy ────────────────────────────────────────
    StreamModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,

    // ── Global guards ──────────────────────────────────────────────
    // SupabaseAuthGuard runs on ALL routes by default.
    // Decorate public routes with @Public() to bypass.
    {
      provide: APP_GUARD,
      useClass: SupabaseAuthGuard,
    },
    // RolesGuard is NOT registered globally — use @UseGuards(RolesGuard)
    // on specific routes that need role checking, combined with @Roles().
  ],
})
export class AppModule {}
