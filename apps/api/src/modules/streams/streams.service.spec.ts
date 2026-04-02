import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { StreamsService } from './streams.service.js';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';

function mockBuilder(returnValue: any = { data: null, error: null, count: 0 }) {
  const b: any = {};
  for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'in', 'order', 'range', 'limit', 'single', 'maybeSingle', 'upsert']) {
    b[m] = jest.fn().mockReturnValue(b);
  }
  b.single = jest.fn().mockResolvedValue(returnValue);
  b.maybeSingle = jest.fn().mockResolvedValue(returnValue);
  b.then = (resolve: any) => resolve(returnValue);
  return b;
}

const MOCK_STREAM = {
  id: 's1', name: 'WCCG Main', slug: 'wccg-main', description: 'Main stream',
  category: 'MAIN', status: 'ACTIVE', sort_order: 0, image_url: null,
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
};

describe('StreamsService', () => {
  let service: StreamsService;
  let mockDb: { from: jest.Mock };

  beforeEach(async () => {
    mockDb = { from: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreamsService,
        { provide: SupabaseDbService, useValue: mockDb },
      ],
    }).compile();
    service = module.get<StreamsService>(StreamsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('returns formatted streams', async () => {
      const builder = mockBuilder({ data: [MOCK_STREAM], error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.findAll();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].id).toBe('s1');
      expect(result[0].name).toBe('WCCG Main');
      expect(result[0].sortOrder).toBe(0);
    });

    it('passes category filter', async () => {
      const builder = mockBuilder({ data: [], error: null });
      mockDb.from.mockReturnValue(builder);

      await service.findAll('TALK');
      expect(builder.eq).toHaveBeenCalledWith('category', 'TALK');
    });
  });

  describe('findById', () => {
    it('returns stream with source and metadata', async () => {
      const fullStream = {
        ...MOCK_STREAM,
        stream_sources: { id: 'src1', primary_url: 'https://stream.example.com', fallback_url: null, mount_point: null, format: 'mp3', bitrate: 128 },
        stream_metadata: { current_title: 'Song', current_artist: 'Artist', current_track: null, album_art: null, listener_count: 42, is_live: true, last_updated: '2026-04-02T00:00:00Z' },
      };
      const builder = mockBuilder({ data: fullStream, error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.findById('s1');
      expect(result.source?.primaryUrl).toBe('https://stream.example.com');
      expect(result.metadata.listenerCount).toBe(42);
      expect(result.metadata.isLive).toBe(true);
    });

    it('throws NotFoundException for missing stream', async () => {
      const builder = mockBuilder({ data: null, error: { message: 'not found' } });
      mockDb.from.mockReturnValue(builder);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('throws ConflictException for duplicate slug', async () => {
      const builder = mockBuilder({ data: null, error: { code: '23505', message: 'duplicate' } });
      mockDb.from.mockReturnValue(builder);

      await expect(
        service.create({ name: 'Test Stream' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('throws NotFoundException for missing stream', async () => {
      const builder = mockBuilder({ data: null, error: null });
      mockDb.from.mockReturnValue(builder);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('deletes existing stream', async () => {
      // First call: verify exists
      const existsBuilder = mockBuilder({ data: { id: 's1' }, error: null });
      // Second call: delete
      const deleteBuilder = mockBuilder({ data: null, error: null });

      let callCount = 0;
      mockDb.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return existsBuilder;
        return deleteBuilder;
      });

      const result = await service.remove('s1');
      expect(result).toEqual({ deleted: true, id: 's1' });
    });
  });
});
