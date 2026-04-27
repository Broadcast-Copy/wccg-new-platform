import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { PlacesService } from './places.service.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { SupabaseUser } from '../../common/guards/supabase-auth.guard.js';

/**
 * Places — Phase B (B2).
 *
 * Built on top of `directory_listings`. Adds:
 *  - Geo-validated check-ins (+50 WP, capped at 3/day, idempotent per place per day)
 *  - Reviews (+20 WP first review per place)
 *  - Bounding-box query for the map page
 */
@Controller('places')
export class PlacesController {
  constructor(private readonly places: PlacesService) {}

  /**
   * GET /places — list, filterable. Public.
   * Optional: ?bbox=swLng,swLat,neLng,neLat for the map viewport.
   */
  @Public()
  @Get()
  list(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('bbox') bbox?: string,
    @Query('limit') limit?: number,
  ) {
    return this.places.list({ category, search, bbox, limit });
  }

  /**
   * GET /places/:slug — single place profile. Public.
   */
  @Public()
  @Get(':slug')
  get(@Param('slug') slug: string) {
    return this.places.getBySlug(slug);
  }

  /**
   * POST /places/:slug/check-in — geo-validated check-in.
   * Body: { lat, lng } (current device coords).
   */
  @Post(':slug/check-in')
  checkIn(
    @CurrentUser() user: SupabaseUser,
    @Param('slug') slug: string,
    @Body() dto: { lat: number; lng: number },
  ) {
    return this.places.checkIn(user.sub, slug, dto.lat, dto.lng);
  }

  /**
   * POST /places/:slug/reviews — submit a review (+20 WP first time).
   */
  @Post(':slug/reviews')
  review(
    @CurrentUser() user: SupabaseUser,
    @Param('slug') slug: string,
    @Body() dto: { rating: number; body?: string; photoUrls?: string[] },
  ) {
    return this.places.review(user.sub, slug, dto);
  }

  /**
   * GET /places/:slug/reviews — public reviews list.
   */
  @Public()
  @Get(':slug/reviews')
  reviews(@Param('slug') slug: string) {
    return this.places.reviews(slug);
  }
}
