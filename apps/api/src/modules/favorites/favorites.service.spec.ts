import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FavoritesService } from './favorites.service.js';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';

// ── Mock Supabase query builder ─────────────────────────────────
function mockBuilder(returnValue: any = { data: null, error: null, count: 0 }) {
  const b: any = {};
  for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'gte', 'lte', 'in', 'order', 'range', 'limit', 'single', 'maybeSingle', 'upsert', 'is']) {
    b[m] = jest.fn().mockReturnValue(b);
  }
  b.single = jest.fn().mockResolvedValue(returnValue);
  b.maybeSingle = jest.fn().mockResolvedValue(returnValue);
  b.then = (resolve: any) => resolve(returnValue);
  return b;
}

describe('FavoritesService', () => {
  let service: FavoritesService;
  let mockDb: { from: jest.Mock };

  beforeEach(async () => {
    mockDb = { from: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FavoritesService,
        { provide: SupabaseDbService, useValue: mockDb },
      ],
    }).compile();

    service = module.get<FavoritesService>(FavoritesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── findByUser ────────────────────────────────────────────────

  describe('findByUser', () => {
    it('returns formatted favorites for a user', async () => {
      const rows = [
        {
          id: 'fav-1',
          user_id: 'user-1',
          target_type: 'STREAM',
          stream_id: 'stream-1',
          show_id: null,
          streams: { name: 'Main Stream', slug: 'main', image_url: null },
          shows: null,
          created_at: '2026-04-01T00:00:00Z',
        },
      ];
      const builder = mockBuilder({ data: rows, error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.findByUser('user-1');

      expect(mockDb.from).toHaveBeenCalledWith('favorites');
      expect(result).toHaveLength(1);
      expect(result[0].targetType).toBe('stream');
      expect(result[0].target?.name).toBe('Main Stream');
    });

    it('returns empty array when user has no favorites', async () => {
      const builder = mockBuilder({ data: [], error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.findByUser('user-1');
      expect(result).toEqual([]);
    });
  });

  // ─── add (idempotent) ─────────────────────────────────────────

  describe('add', () => {
    it('rejects invalid target type', async () => {
      await expect(
        service.add('user-1', { targetType: 'podcast', targetId: 'x' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when stream target does not exist', async () => {
      // First call: streams lookup returns null
      const builder = mockBuilder({ data: null, error: null });
      mockDb.from.mockReturnValue(builder);

      await expect(
        service.add('user-1', { targetType: 'stream', targetId: 'missing-stream' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns existing favorite with alreadyExisted flag', async () => {
      const existingFav = {
        id: 'fav-1',
        user_id: 'user-1',
        target_type: 'STREAM',
        stream_id: 'stream-1',
        show_id: null,
        created_at: '2026-04-01T00:00:00Z',
      };

      // Every call to db.from() returns a builder that resolves to the existing fav.
      // Call 1: streams lookup (verifying target exists) => { data: { id: 'stream-1' } }
      // Call 2: favorites check (already exists) => { data: existingFav }
      const streamBuilder = mockBuilder({ data: { id: 'stream-1' }, error: null });
      const existingBuilder = mockBuilder({ data: existingFav, error: null });

      mockDb.from
        .mockReturnValueOnce(streamBuilder)   // streams lookup
        .mockReturnValueOnce(existingBuilder); // favorites duplicate check

      const result = await service.add('user-1', { targetType: 'stream', targetId: 'stream-1' });

      expect(result.alreadyExisted).toBe(true);
      expect(result.id).toBe('fav-1');
    });
  });

  // ─── remove (not owner) ───────────────────────────────────────

  describe('remove', () => {
    it('throws NotFoundException for missing favorite', async () => {
      const builder = mockBuilder({ data: null, error: null });
      mockDb.from.mockReturnValue(builder);

      await expect(
        service.remove('user-1', 'nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when removing another user\'s favorite', async () => {
      const builder = mockBuilder({
        data: { id: 'fav-1', user_id: 'other-user' },
        error: null,
      });
      mockDb.from.mockReturnValue(builder);

      await expect(
        service.remove('user-1', 'fav-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── check ────────────────────────────────────────────────────

  describe('check', () => {
    it('returns isFavorited true when favorite exists', async () => {
      const builder = mockBuilder({ data: { id: 'fav-1' }, error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.check('user-1', 'stream', 'stream-1');

      expect(result.isFavorited).toBe(true);
      expect(result.favoriteId).toBe('fav-1');
    });

    it('returns isFavorited false when not favorited', async () => {
      const builder = mockBuilder({ data: null, error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.check('user-1', 'stream', 'stream-1');

      expect(result.isFavorited).toBe(false);
      expect(result.favoriteId).toBeNull();
    });
  });
});
