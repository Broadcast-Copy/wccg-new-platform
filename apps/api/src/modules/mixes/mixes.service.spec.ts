import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { MixesService } from './mixes.service.js';
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

describe('MixesService', () => {
  let service: MixesService;
  let mockDb: { from: jest.Mock };

  beforeEach(async () => {
    mockDb = { from: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MixesService,
        { provide: SupabaseDbService, useValue: mockDb },
      ],
    }).compile();

    service = module.get<MixesService>(MixesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── findAll ───────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns formatted mixes list', async () => {
      const rows = [
        {
          id: 'mix-1',
          host_id: 'host-1',
          uploader_id: 'user-1',
          title: 'Summer Vibes Vol. 1',
          description: 'A chill summer mix',
          audio_url: 'https://audio.test/mix1.mp3',
          cover_image_url: null,
          duration: 3600,
          genre: 'House',
          tags: ['summer', 'chill'],
          play_count: 100,
          status: 'published',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: null,
          hosts: { name: 'DJ Mike' },
        },
      ];

      const builder = mockBuilder({ data: rows, error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('mix-1');
      expect(result[0].title).toBe('Summer Vibes Vol. 1');
      expect(result[0].hostName).toBe('DJ Mike');
      expect(result[0].playCount).toBe(100);
      expect(result[0].tags).toEqual(['summer', 'chill']);
    });

    it('returns empty array when no mixes exist', async () => {
      const builder = mockBuilder({ data: [], error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.findAll();
      expect(result).toEqual([]);
    });

    it('applies hostId filter', async () => {
      const builder = mockBuilder({ data: [], error: null });
      mockDb.from.mockReturnValue(builder);

      await service.findAll({ hostId: 'host-1' });
      expect(builder.eq).toHaveBeenCalledWith('host_id', 'host-1');
    });

    it('applies genre filter', async () => {
      const builder = mockBuilder({ data: [], error: null });
      mockDb.from.mockReturnValue(builder);

      await service.findAll({ genre: 'House' });
      expect(builder.eq).toHaveBeenCalledWith('genre', 'House');
    });
  });

  // ─── create ────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a mix with status draft', async () => {
      const createdRow = {
        id: 'mix-new',
        host_id: 'host-1',
        uploader_id: 'user-1',
        title: 'New Mix',
        description: null,
        audio_url: 'https://audio.test/new.mp3',
        cover_image_url: null,
        duration: null,
        genre: null,
        tags: null,
        play_count: 0,
        status: 'draft',
        created_at: '2026-04-02T00:00:00Z',
        updated_at: null,
        hosts: { name: 'DJ Mike' },
      };

      const builder = mockBuilder({ data: createdRow, error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.create('user-1', {
        title: 'New Mix',
        audioUrl: 'https://audio.test/new.mp3',
        hostId: 'host-1',
      });

      expect(result.id).toBe('mix-new');
      expect(result.status).toBe('draft');
      expect(result.uploaderId).toBe('user-1');
      expect(result.hostName).toBe('DJ Mike');
    });

    it('passes correct insert payload', async () => {
      const builder = mockBuilder({ data: { id: 'mix-new', host_id: 'host-1', uploader_id: 'user-1', title: 'Test', description: 'desc', audio_url: 'https://audio.test/x.mp3', cover_image_url: null, duration: 1800, genre: 'Techno', tags: ['deep'], play_count: 0, status: 'draft', created_at: '2026-04-02T00:00:00Z', updated_at: null, hosts: { name: 'DJ Mike' } }, error: null });
      mockDb.from.mockReturnValue(builder);

      await service.create('user-1', {
        title: 'Test',
        audioUrl: 'https://audio.test/x.mp3',
        hostId: 'host-1',
        description: 'desc',
        duration: 1800,
        genre: 'Techno',
        tags: ['deep'],
      });

      expect(builder.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          uploader_id: 'user-1',
          host_id: 'host-1',
          title: 'Test',
          audio_url: 'https://audio.test/x.mp3',
          description: 'desc',
          duration: 1800,
          genre: 'Techno',
          tags: ['deep'],
          status: 'draft',
          play_count: 0,
        }),
      );
    });
  });

  // ─── update (not owner) ────────────────────────────────────────

  describe('update', () => {
    it('throws NotFoundException when mix does not exist', async () => {
      const builder = mockBuilder({ data: null, error: { message: 'not found' } });
      mockDb.from.mockReturnValue(builder);

      await expect(
        service.update('nonexistent', 'user-1', { title: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user is not the uploader and not admin', async () => {
      // Call 1: fetch existing mix (uploader is someone else)
      const fetchBuilder = mockBuilder({ data: { uploader_id: 'other-user' }, error: null });
      // Call 2: admin check returns null
      const adminBuilder = mockBuilder({ data: null, error: null });

      let callCount = 0;
      mockDb.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? fetchBuilder : adminBuilder;
      });

      await expect(
        service.update('mix-1', 'user-1', { title: 'Updated' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows the uploader to update their mix', async () => {
      const existingRow = { uploader_id: 'user-1' };
      const updatedRow = {
        id: 'mix-1',
        host_id: 'host-1',
        uploader_id: 'user-1',
        title: 'Updated Title',
        description: null,
        audio_url: 'https://audio.test/mix1.mp3',
        cover_image_url: null,
        duration: 3600,
        genre: 'House',
        tags: null,
        play_count: 5,
        status: 'published',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-04-02T00:00:00Z',
        hosts: { name: 'DJ Mike' },
      };

      // Call 1: fetch existing (single)
      const fetchBuilder = mockBuilder({ data: existingRow, error: null });
      // Call 2: update
      const updateBuilder = mockBuilder({ data: null, error: null });
      // Call 3: findById re-fetch (single)
      const refetchBuilder = mockBuilder({ data: updatedRow, error: null });

      let callCount = 0;
      mockDb.from.mockImplementation(() => {
        callCount++;
        switch (callCount) {
          case 1: return fetchBuilder;
          case 2: return updateBuilder;
          case 3: return refetchBuilder;
          default: return mockBuilder();
        }
      });

      const result = await service.update('mix-1', 'user-1', { title: 'Updated Title' });

      expect(result.id).toBe('mix-1');
      expect(result.title).toBe('Updated Title');
    });
  });

  // ─── remove (not owner) ────────────────────────────────────────

  describe('remove', () => {
    it('throws NotFoundException when mix does not exist', async () => {
      const builder = mockBuilder({ data: null, error: { message: 'not found' } });
      mockDb.from.mockReturnValue(builder);

      await expect(
        service.remove('nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when user is not the uploader and not admin', async () => {
      // Call 1: fetch existing mix
      const fetchBuilder = mockBuilder({ data: { uploader_id: 'other-user' }, error: null });
      // Call 2: admin check returns null
      const adminBuilder = mockBuilder({ data: null, error: null });

      let callCount = 0;
      mockDb.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? fetchBuilder : adminBuilder;
      });

      await expect(
        service.remove('mix-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows the uploader to delete their mix', async () => {
      // Call 1: fetch existing
      const fetchBuilder = mockBuilder({ data: { uploader_id: 'user-1' }, error: null });
      // Call 2: delete
      const deleteBuilder = mockBuilder({ data: null, error: null });

      let callCount = 0;
      mockDb.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? fetchBuilder : deleteBuilder;
      });

      const result = await service.remove('mix-1', 'user-1');
      expect(result).toEqual({ deleted: true, id: 'mix-1' });
    });
  });

  // ─── incrementPlayCount ────────────────────────────────────────

  describe('incrementPlayCount', () => {
    it('throws NotFoundException when mix does not exist', async () => {
      const builder = mockBuilder({ data: null, error: { message: 'not found' } });
      mockDb.from.mockReturnValue(builder);

      await expect(
        service.incrementPlayCount('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });

    it('increments play count from 0 to 1', async () => {
      const fetchBuilder = mockBuilder({ data: { play_count: 0 }, error: null });
      const updateBuilder = mockBuilder({ data: null, error: null });

      let callCount = 0;
      mockDb.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? fetchBuilder : updateBuilder;
      });

      const result = await service.incrementPlayCount('mix-1');

      expect(result.id).toBe('mix-1');
      expect(result.playCount).toBe(1);
    });

    it('increments play count from existing value', async () => {
      const fetchBuilder = mockBuilder({ data: { play_count: 99 }, error: null });
      const updateBuilder = mockBuilder({ data: null, error: null });

      let callCount = 0;
      mockDb.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? fetchBuilder : updateBuilder;
      });

      const result = await service.incrementPlayCount('mix-1');
      expect(result.playCount).toBe(100);
    });

    it('handles null play_count as 0', async () => {
      const fetchBuilder = mockBuilder({ data: { play_count: null }, error: null });
      const updateBuilder = mockBuilder({ data: null, error: null });

      let callCount = 0;
      mockDb.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? fetchBuilder : updateBuilder;
      });

      const result = await service.incrementPlayCount('mix-1');
      expect(result.playCount).toBe(1);
    });
  });
});
