import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';
import { PointsService } from '../points/points.service.js';

const CHECK_IN_RADIUS_M = 150;          // Geo-fence radius around the place pin
const CHECK_IN_POINTS = 50;
const REVIEW_POINTS = 20;
const MAX_DAILY_CHECKINS = 3;

@Injectable()
export class PlacesService {
  private readonly logger = new Logger(PlacesService.name);

  constructor(
    private readonly db: SupabaseDbService,
    private readonly points: PointsService,
  ) {}

  async list(opts: { category?: string; search?: string; bbox?: string; limit?: number }) {
    let q = this.db.from('directory_listings')
      .select(
        'id, slug, name, category, subcategory, description, address, city, lat, lng, ' +
        'cover_url, image_url, rating_avg, rating_count, check_in_count, price_tier, hours_json, status',
      )
      .eq('status', 'ACTIVE');

    if (opts.category) q = q.eq('category', opts.category);
    if (opts.search) q = q.ilike('name', `%${opts.search}%`);

    if (opts.bbox) {
      const [swLng, swLat, neLng, neLat] = opts.bbox.split(',').map(Number);
      if (!isFinite(swLng) || !isFinite(swLat) || !isFinite(neLng) || !isFinite(neLat)) {
        throw new BadRequestException('Invalid bbox');
      }
      q = q.gte('lat', swLat).lte('lat', neLat).gte('lng', swLng).lte('lng', neLng);
    }

    const limit = Math.min(500, Math.max(1, Number(opts.limit) || 100));
    const { data, error } = await q.limit(limit);
    if (error) throw error;
    return (data ?? []).map(this.mapRow);
  }

  async getBySlug(slug: string) {
    const { data, error } = await this.db.from('directory_listings')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundException(`Place ${slug} not found`);
    return this.mapRow(data);
  }

  async checkIn(userId: string, slug: string, lat: number, lng: number) {
    if (!isFinite(lat) || !isFinite(lng)) {
      throw new BadRequestException('Valid lat/lng required');
    }

    const place = await this.getBySlug(slug);
    if (place.lat == null || place.lng == null) {
      throw new BadRequestException('Place has no coordinates — cannot check in');
    }

    const distance = haversineMeters(lat, lng, place.lat, place.lng);
    if (distance > CHECK_IN_RADIUS_M) {
      throw new BadRequestException(
        `You're ${Math.round(distance)}m away — get within ${CHECK_IN_RADIUS_M}m of ${place.name} to check in.`,
      );
    }

    // Daily-cap check on the user side (3 distinct places per day).
    const today = new Date().toISOString().slice(0, 10);
    const { count } = await this.db.from('place_check_ins')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', `${today}T00:00:00Z`)
      .lt('created_at', `${today}T23:59:59Z`);
    if ((count ?? 0) >= MAX_DAILY_CHECKINS) {
      throw new BadRequestException(`You've hit the ${MAX_DAILY_CHECKINS} check-ins/day limit. Back tomorrow.`);
    }

    // Insert — unique index prevents same-place same-day double dip.
    const { data: row, error } = await this.db.from('place_check_ins')
      .insert({
        place_id: place.id,
        user_id: userId,
        lat,
        lng,
        distance_m: Math.round(distance),
        points_awarded: CHECK_IN_POINTS,
      })
      .select()
      .single();

    if (error) {
      if ((error as any).code === '23505') {
        throw new BadRequestException(`You already checked in to ${place.name} today.`);
      }
      throw error;
    }

    // Bump denorm counter.
    await this.db.from('directory_listings')
      .update({ check_in_count: (place.checkInCount ?? 0) + 1 })
      .eq('id', place.id);

    // Award server-side points.
    await this.points.award(userId, {
      amount: CHECK_IN_POINTS,
      reason: 'PLACE_CHECKIN',
      referenceType: 'place',
      referenceId: place.id,
      idempotencyKey: `place_checkin:${place.id}:${userId}:${today}`,
    });

    return {
      ok: true,
      placeId: place.id,
      checkInId: row.id,
      pointsAwarded: CHECK_IN_POINTS,
      distanceMeters: Math.round(distance),
    };
  }

  async review(
    userId: string,
    slug: string,
    dto: { rating: number; body?: string; photoUrls?: string[] },
  ) {
    if (!dto.rating || dto.rating < 1 || dto.rating > 5) {
      throw new BadRequestException('Rating must be 1..5');
    }
    const place = await this.getBySlug(slug);

    // Was there a prior review? Award only on first.
    const { data: existing } = await this.db.from('place_reviews')
      .select('id')
      .eq('place_id', place.id)
      .eq('user_id', userId)
      .maybeSingle();
    const isFirstReview = !existing;

    const { data: row, error } = await this.db.from('place_reviews')
      .upsert(
        {
          place_id: place.id,
          user_id: userId,
          rating: dto.rating,
          body: dto.body ?? null,
          photo_urls: dto.photoUrls ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'place_id,user_id' } as any,
      )
      .select()
      .single();
    if (error) throw error;

    let pointsAwarded = 0;
    if (isFirstReview) {
      await this.points.award(userId, {
        amount: REVIEW_POINTS,
        reason: 'PLACE_REVIEW',
        referenceType: 'place',
        referenceId: place.id,
        idempotencyKey: `place_review:${place.id}:${userId}`,
      });
      pointsAwarded = REVIEW_POINTS;
    }

    return { ok: true, reviewId: row.id, pointsAwarded };
  }

  async reviews(slug: string) {
    const place = await this.getBySlug(slug);
    const { data, error } = await this.db.from('place_reviews')
      .select('id, rating, body, photo_urls, created_at, user_id')
      .eq('place_id', place.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data ?? [];
  }

  private mapRow = (r: any) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    category: r.category,
    subcategory: r.subcategory ?? null,
    description: r.description ?? null,
    address: r.address ?? null,
    city: r.city ?? null,
    lat: r.lat,
    lng: r.lng,
    coverUrl: r.cover_url ?? r.image_url ?? null,
    ratingAvg: r.rating_avg,
    ratingCount: r.rating_count ?? 0,
    checkInCount: r.check_in_count ?? 0,
    priceTier: r.price_tier ?? null,
    hours: r.hours_json ?? null,
    wikiSlug: r.wiki_slug ?? null,
    status: r.status,
  });
}

/**
 * Haversine distance in meters. Used both for geo-fenced check-ins and for
 * sorting places by distance.
 */
export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
