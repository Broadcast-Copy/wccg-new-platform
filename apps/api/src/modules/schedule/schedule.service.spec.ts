import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { ScheduleService } from './schedule.service.js';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';

// ── Mock Supabase query builder ─────────────────────────────────
function mockBuilder(returnValue: any = { data: null, error: null, count: 0 }) {
  const b: any = {};
  for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'gte', 'lte', 'lt', 'gt', 'in', 'or', 'order', 'range', 'limit', 'single', 'maybeSingle', 'upsert']) {
    b[m] = jest.fn().mockReturnValue(b);
  }
  b.single = jest.fn().mockResolvedValue(returnValue);
  b.maybeSingle = jest.fn().mockResolvedValue(returnValue);
  b.then = (resolve: any) => resolve(returnValue);
  return b;
}

describe('ScheduleService', () => {
  let service: ScheduleService;
  let mockDb: { from: jest.Mock };

  beforeEach(async () => {
    mockDb = { from: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleService,
        { provide: SupabaseDbService, useValue: mockDb },
      ],
    }).compile();

    service = module.get<ScheduleService>(ScheduleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── findByStream ──────────────────────────────────────────────

  describe('findByStream', () => {
    it('returns formatted blocks for a stream (no date filter)', async () => {
      const rows = [
        {
          id: 'block-1',
          stream_id: 'stream-1',
          show_id: 'show-1',
          title: 'Morning Show',
          day_of_week: 1,
          start_time: '06:00',
          end_time: '10:00',
          is_override: false,
          override_date: null,
          is_active: true,
          color: '#ff0000',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: null,
          shows: {
            id: 'show-1',
            name: 'Morning Vibes',
            slug: 'morning-vibes',
            image_url: 'https://img.test/mv.jpg',
            show_hosts: [
              {
                is_primary: true,
                hosts: { id: 'host-1', name: 'DJ Mike', avatar_url: 'https://img.test/mike.jpg' },
              },
            ],
          },
        },
      ];

      const builder = mockBuilder({ data: rows, error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.findByStream('stream-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('block-1');
      expect(result[0].streamId).toBe('stream-1');
      expect(result[0].title).toBe('Morning Show');
      expect(result[0].show).toBeDefined();
      expect(result[0].show!.name).toBe('Morning Vibes');
      expect(result[0].show!.hosts).toHaveLength(1);
      expect(result[0].show!.hosts[0].name).toBe('DJ Mike');
      expect(result[0].show!.hosts[0].isPrimary).toBe(true);
    });

    it('returns empty array when no blocks found', async () => {
      const builder = mockBuilder({ data: [], error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.findByStream('stream-1');
      expect(result).toEqual([]);
    });

    it('handles null show gracefully', async () => {
      const rows = [
        {
          id: 'block-2',
          stream_id: 'stream-1',
          show_id: null,
          title: 'Automation Block',
          day_of_week: 0,
          start_time: '00:00',
          end_time: '06:00',
          is_override: false,
          override_date: null,
          is_active: true,
          color: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: null,
          shows: null,
        },
      ];

      const builder = mockBuilder({ data: rows, error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.findByStream('stream-1');
      expect(result[0].show).toBeNull();
    });
  });

  // ─── resolveNow ────────────────────────────────────────────────

  describe('resolveNow', () => {
    it('returns null when nothing is on air for a specific stream', async () => {
      const builder = mockBuilder({ data: [], error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.resolveNow('stream-1');
      expect(result).toBeNull();
    });

    it('returns empty array when nothing is on air across all streams', async () => {
      const builder = mockBuilder({ data: [], error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.resolveNow();
      expect(result).toEqual([]);
    });

    it('returns override block when one matches', async () => {
      const overrideRow = {
        id: 'block-override',
        stream_id: 'stream-1',
        show_id: 'show-1',
        title: 'Special Show',
        day_of_week: null,
        start_time: '08:00',
        end_time: '22:00',
        is_override: true,
        override_date: '2026-04-02',
        is_active: true,
        color: null,
        created_at: '2026-04-01T00:00:00Z',
        updated_at: null,
        shows: {
          id: 'show-1',
          name: 'Special',
          slug: 'special',
          image_url: null,
          show_hosts: [],
        },
        streams: {
          id: 'stream-1',
          name: 'WCCG Main',
          slug: 'wccg-main',
          stream_metadata: {
            current_title: 'Now Playing',
            current_artist: 'Artist',
            album_art: null,
            listener_count: 42,
            is_live: true,
          },
        },
      };

      const builder = mockBuilder({ data: [overrideRow], error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.resolveNow('stream-1');

      // For a single stream, returns a single object (not array)
      expect(result).toBeDefined();
      expect((result as any).id).toBe('block-override');
      expect((result as any).stream.name).toBe('WCCG Main');
      expect((result as any).nowPlaying.listenerCount).toBe(42);
    });
  });

  // ─── createBlock ───────────────────────────────────────────────

  describe('createBlock', () => {
    it('rejects invalid time format', async () => {
      await expect(
        service.createBlock({
          streamId: 'stream-1',
          title: 'Test',
          dayOfWeek: 1,
          startTime: '6am',
          endTime: '10:00',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when start_time >= end_time', async () => {
      await expect(
        service.createBlock({
          streamId: 'stream-1',
          title: 'Test',
          dayOfWeek: 1,
          startTime: '10:00',
          endTime: '06:00',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects when start_time equals end_time', async () => {
      await expect(
        service.createBlock({
          streamId: 'stream-1',
          title: 'Test',
          dayOfWeek: 1,
          startTime: '10:00',
          endTime: '10:00',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException on overlapping block', async () => {
      // First call: overlap check returns count > 0
      const overlapBuilder = mockBuilder({ data: null, error: null, count: 1 });
      mockDb.from.mockReturnValue(overlapBuilder);

      await expect(
        service.createBlock({
          streamId: 'stream-1',
          title: 'Overlapping',
          dayOfWeek: 1,
          startTime: '07:00',
          endTime: '09:00',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates a block successfully when no overlap', async () => {
      const createdRow = {
        id: 'block-new',
        stream_id: 'stream-1',
        show_id: null,
        title: 'New Block',
        day_of_week: 2,
        start_time: '14:00',
        end_time: '16:00',
        is_override: false,
        override_date: null,
        is_active: true,
        color: null,
        created_at: '2026-04-02T00:00:00Z',
        updated_at: null,
        shows: null,
      };

      // First call: overlap check returns count 0
      const overlapBuilder = mockBuilder({ data: null, error: null, count: 0 });
      // Second call: insert returns the created row
      const insertBuilder = mockBuilder({ data: createdRow, error: null });

      let callCount = 0;
      mockDb.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? overlapBuilder : insertBuilder;
      });

      const result = await service.createBlock({
        streamId: 'stream-1',
        title: 'New Block',
        dayOfWeek: 2,
        startTime: '14:00',
        endTime: '16:00',
      });

      expect(result.id).toBe('block-new');
      expect(result.title).toBe('New Block');
      expect(result.show).toBeNull();
    });
  });

  // ─── removeBlock ───────────────────────────────────────────────

  describe('removeBlock', () => {
    it('throws NotFoundException for missing block', async () => {
      const builder = mockBuilder({ data: null, error: null });
      mockDb.from.mockReturnValue(builder);

      await expect(service.removeBlock('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('deletes an existing block', async () => {
      const findBuilder = mockBuilder({ data: { id: 'block-1' }, error: null });
      const deleteBuilder = mockBuilder({ data: null, error: null });

      let callCount = 0;
      mockDb.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? findBuilder : deleteBuilder;
      });

      const result = await service.removeBlock('block-1');
      expect(result).toEqual({ deleted: true, id: 'block-1' });
    });
  });
});
