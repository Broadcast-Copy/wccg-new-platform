import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PodcastsService } from './podcasts.service.js';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';

// ── Mock Supabase query builder ─────────────────────────────────
function mockBuilder(returnValue: any = { data: null, error: null, count: 0 }) {
  const b: any = {};
  for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'gte', 'lte', 'in', 'order', 'range', 'limit', 'single', 'maybeSingle', 'upsert']) {
    b[m] = jest.fn().mockReturnValue(b);
  }
  b.single = jest.fn().mockResolvedValue(returnValue);
  b.maybeSingle = jest.fn().mockResolvedValue(returnValue);
  b.then = (resolve: any) => resolve(returnValue);
  return b;
}

describe('PodcastsService', () => {
  let service: PodcastsService;
  let mockDb: { from: jest.Mock };

  beforeEach(async () => {
    mockDb = { from: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PodcastsService,
        { provide: SupabaseDbService, useValue: mockDb },
      ],
    }).compile();

    service = module.get<PodcastsService>(PodcastsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── findAllSeries ─────────────────────────────────────────────

  describe('findAllSeries', () => {
    it('returns formatted series list', async () => {
      const rows = [
        {
          id: 'series-1',
          creator_id: 'user-1',
          title: 'Tech Talk',
          slug: 'tech-talk',
          description: 'A podcast about tech',
          cover_image_url: null,
          category: 'Technology',
          language: 'en',
          is_explicit: false,
          status: 'ACTIVE',
          subscriber_count: 10,
          total_plays: 500,
          tags: ['tech'],
          created_at: '2026-01-01T00:00:00Z',
          updated_at: null,
        },
      ];

      const builder = mockBuilder({ data: rows, error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.findAllSeries();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('series-1');
      expect(result[0].title).toBe('Tech Talk');
      expect(result[0].creatorId).toBe('user-1');
      expect(result[0].explicit).toBe(false);
    });

    it('returns empty array when no series exist', async () => {
      const builder = mockBuilder({ data: [], error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.findAllSeries();
      expect(result).toEqual([]);
    });

    it('applies category filter when provided', async () => {
      const builder = mockBuilder({ data: [], error: null });
      mockDb.from.mockReturnValue(builder);

      await service.findAllSeries({ category: 'Music' });

      // Verify eq was called with category filter
      expect(builder.eq).toHaveBeenCalledWith('category', 'Music');
    });
  });

  // ─── createSeries ──────────────────────────────────────────────

  describe('createSeries', () => {
    it('creates a series and returns formatted result', async () => {
      const createdRow = {
        id: 'series-new',
        creator_id: 'user-1',
        title: 'New Podcast',
        slug: 'new-podcast-abc123',
        description: 'Description here',
        cover_image_url: null,
        category: null,
        language: 'en',
        is_explicit: false,
        status: 'ACTIVE',
        subscriber_count: 0,
        total_plays: 0,
        tags: null,
        created_at: '2026-04-02T00:00:00Z',
        updated_at: null,
      };

      const builder = mockBuilder({ data: createdRow, error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.createSeries('user-1', {
        title: 'New Podcast',
        description: 'Description here',
      });

      expect(result.id).toBe('series-new');
      expect(result.title).toBe('New Podcast');
      expect(result.creatorId).toBe('user-1');
      expect(result.status).toBe('ACTIVE');
    });

    it('passes insert call to supabase with correct fields', async () => {
      const builder = mockBuilder({ data: { id: 'series-new', creator_id: 'user-1', title: 'Test', slug: 'test', description: null, cover_image_url: null, category: null, language: 'en', is_explicit: false, status: 'ACTIVE', subscriber_count: 0, total_plays: 0, tags: null, created_at: '2026-04-02T00:00:00Z', updated_at: null }, error: null });
      mockDb.from.mockReturnValue(builder);

      await service.createSeries('user-1', { title: 'Test', language: 'es', explicit: true });

      expect(mockDb.from).toHaveBeenCalledWith('podcast_series');
      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          creator_id: 'user-1',
          title: 'Test',
          language: 'es',
          is_explicit: true,
          status: 'ACTIVE',
        }),
      );
    });
  });

  // ─── createEpisode ─────────────────────────────────────────────

  describe('createEpisode', () => {
    it('throws NotFoundException when series does not exist', async () => {
      const builder = mockBuilder({ data: null, error: { message: 'not found' } });
      mockDb.from.mockReturnValue(builder);

      await expect(
        service.createEpisode('nonexistent', 'user-1', { title: 'Ep 1', audioUrl: 'https://audio.test/ep1.mp3' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user is not the creator and not admin', async () => {
      // First call: series lookup returns a different creator
      const seriesBuilder = mockBuilder({ data: { creator_id: 'other-user' }, error: null });
      // Second call: admin check returns null (not admin)
      const adminBuilder = mockBuilder({ data: null, error: null });

      let callCount = 0;
      mockDb.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? seriesBuilder : adminBuilder;
      });

      await expect(
        service.createEpisode('series-1', 'user-1', { title: 'Ep 1', audioUrl: 'https://audio.test/ep1.mp3' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('creates an episode when user is the creator', async () => {
      const episodeRow = {
        id: 'ep-1',
        series_id: 'series-1',
        title: 'Episode 1',
        slug: 'episode-1-abc123',
        description: null,
        show_notes: null,
        audio_url: 'https://audio.test/ep1.mp3',
        audio_duration: 3600,
        audio_file_size: null,
        cover_image_url: null,
        episode_number: 1,
        season_number: null,
        play_count: 0,
        download_count: 0,
        status: 'PUBLISHED',
        published_at: null,
        created_at: '2026-04-02T00:00:00Z',
        updated_at: null,
      };

      // First call: series lookup returns the user as creator
      const seriesBuilder = mockBuilder({ data: { creator_id: 'user-1' }, error: null });
      // Second call: insert episode
      const insertBuilder = mockBuilder({ data: episodeRow, error: null });

      let callCount = 0;
      mockDb.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? seriesBuilder : insertBuilder;
      });

      const result = await service.createEpisode('series-1', 'user-1', {
        title: 'Episode 1',
        audioUrl: 'https://audio.test/ep1.mp3',
        duration: 3600,
        episodeNumber: 1,
      });

      expect(result.id).toBe('ep-1');
      expect(result.title).toBe('Episode 1');
      expect(result.seriesId).toBe('series-1');
      expect(result.audioDuration).toBe(3600);
    });
  });

  // ─── incrementEpisodePlayCount ─────────────────────────────────

  describe('incrementEpisodePlayCount', () => {
    it('throws NotFoundException when episode does not exist', async () => {
      const builder = mockBuilder({ data: null, error: { message: 'not found' } });
      mockDb.from.mockReturnValue(builder);

      await expect(
        service.incrementEpisodePlayCount('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('increments play count from 0 to 1', async () => {
      // First call: fetch existing play_count
      const fetchBuilder = mockBuilder({ data: { play_count: 0 }, error: null });
      // Second call: update
      const updateBuilder = mockBuilder({ data: null, error: null });

      let callCount = 0;
      mockDb.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? fetchBuilder : updateBuilder;
      });

      const result = await service.incrementEpisodePlayCount('ep-1');

      expect(result.id).toBe('ep-1');
      expect(result.playCount).toBe(1);
    });

    it('increments play count from existing value', async () => {
      const fetchBuilder = mockBuilder({ data: { play_count: 42 }, error: null });
      const updateBuilder = mockBuilder({ data: null, error: null });

      let callCount = 0;
      mockDb.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? fetchBuilder : updateBuilder;
      });

      const result = await service.incrementEpisodePlayCount('ep-1');

      expect(result.playCount).toBe(43);
    });
  });
});
