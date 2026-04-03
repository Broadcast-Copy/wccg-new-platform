import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { ShowsService } from './shows.service.js';
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

describe('ShowsService', () => {
  let service: ShowsService;
  let mockDb: { from: jest.Mock };

  beforeEach(async () => {
    mockDb = { from: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShowsService,
        { provide: SupabaseDbService, useValue: mockDb },
      ],
    }).compile();

    service = module.get<ShowsService>(ShowsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── findAll ───────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns formatted shows with hosts', async () => {
      const rows = [
        {
          id: 'show-1',
          name: 'Morning Vibes',
          slug: 'morning-vibes',
          description: 'Wake up with us',
          image_url: 'https://img.test/mv.jpg',
          is_active: true,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: null,
          show_hosts: [
            {
              is_primary: true,
              hosts: { id: 'host-1', name: 'DJ Mike', slug: 'dj-mike', avatar_url: null },
            },
          ],
        },
      ];

      const builder = mockBuilder({ data: rows, error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.findAll();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('show-1');
      expect(result[0].name).toBe('Morning Vibes');
      expect(result[0].hosts).toHaveLength(1);
      expect(result[0].hosts[0].name).toBe('DJ Mike');
      expect(result[0].hosts[0].isPrimary).toBe(true);
    });

    it('returns empty array when no shows exist', async () => {
      const builder = mockBuilder({ data: [], error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.findAll();
      expect(result).toEqual([]);
    });

    it('filters by hostId in post-processing', async () => {
      const rows = [
        {
          id: 'show-1',
          name: 'Show A',
          slug: 'show-a',
          description: null,
          image_url: null,
          is_active: true,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: null,
          show_hosts: [
            { host_id: 'host-1', is_primary: true, hosts: { id: 'host-1', name: 'DJ A', slug: 'dj-a', avatar_url: null } },
          ],
        },
        {
          id: 'show-2',
          name: 'Show B',
          slug: 'show-b',
          description: null,
          image_url: null,
          is_active: true,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: null,
          show_hosts: [
            { host_id: 'host-2', is_primary: true, hosts: { id: 'host-2', name: 'DJ B', slug: 'dj-b', avatar_url: null } },
          ],
        },
      ];

      const builder = mockBuilder({ data: rows, error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.findAll({ hostId: 'host-1' });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('show-1');
    });
  });

  // ─── findById ──────────────────────────────────────────────────

  describe('findById', () => {
    it('throws NotFoundException when show does not exist', async () => {
      const builder = mockBuilder({ data: null, error: { message: 'not found' } });
      mockDb.from.mockReturnValue(builder);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('returns show with hosts and episodes', async () => {
      const showRow = {
        id: 'show-1',
        name: 'Morning Vibes',
        slug: 'morning-vibes',
        description: 'Great show',
        image_url: null,
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: null,
        show_hosts: [
          {
            is_primary: true,
            hosts: { id: 'host-1', name: 'DJ Mike', slug: 'dj-mike', avatar_url: null },
          },
        ],
      };

      const episodes = [
        {
          id: 'ep-1',
          show_id: 'show-1',
          title: 'Episode 1',
          description: null,
          air_date: '2026-04-01',
          duration: 3600,
          audio_url: 'https://audio.test/ep1.mp3',
          image_url: null,
          created_at: '2026-04-01T00:00:00Z',
          updated_at: null,
        },
      ];

      // First call: show lookup (uses .single())
      const showBuilder = mockBuilder({ data: showRow, error: null });
      // Second call: episodes lookup (uses .then())
      const episodesBuilder = mockBuilder({ data: episodes, error: null });

      let callCount = 0;
      mockDb.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? showBuilder : episodesBuilder;
      });

      const result = await service.findById('show-1');

      expect(result.id).toBe('show-1');
      expect(result.hosts).toHaveLength(1);
      expect(result.episodes).toHaveLength(1);
      expect(result.episodes[0].title).toBe('Episode 1');
    });
  });

  // ─── create ────────────────────────────────────────────────────

  describe('create', () => {
    it('creates a show and associates hosts', async () => {
      const insertedShow = {
        id: 'show-new',
        name: 'New Show',
        slug: 'new-show',
        description: null,
        image_url: null,
        is_active: true,
        created_at: '2026-04-02T00:00:00Z',
        updated_at: null,
      };

      const fullShow = {
        ...insertedShow,
        show_hosts: [
          {
            is_primary: true,
            hosts: { id: 'host-1', name: 'DJ Mike', slug: 'dj-mike', avatar_url: null },
          },
        ],
      };

      // Call 1: insert show (returns single)
      const insertBuilder = mockBuilder({ data: insertedShow, error: null });
      // Call 2: insert show_hosts
      const hostInsertBuilder = mockBuilder({ data: null, error: null });
      // Call 3: findById -> show select (single)
      const findShowBuilder = mockBuilder({ data: fullShow, error: null });
      // Call 4: findById -> episodes select
      const findEpisodesBuilder = mockBuilder({ data: [], error: null });

      let callCount = 0;
      mockDb.from.mockImplementation(() => {
        callCount++;
        switch (callCount) {
          case 1: return insertBuilder;
          case 2: return hostInsertBuilder;
          case 3: return findShowBuilder;
          case 4: return findEpisodesBuilder;
          default: return mockBuilder();
        }
      });

      const result = await service.create({
        name: 'New Show',
        hostIds: ['host-1'],
      });

      expect(result.id).toBe('show-new');
      expect(result.hosts).toHaveLength(1);
    });

    it('throws ConflictException on duplicate slug', async () => {
      const builder = mockBuilder({ data: null, error: { code: '23505', message: 'duplicate' } });
      mockDb.from.mockReturnValue(builder);

      await expect(
        service.create({ name: 'Existing Show' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── remove ────────────────────────────────────────────────────

  describe('remove', () => {
    it('throws NotFoundException when show does not exist', async () => {
      const builder = mockBuilder({ data: null, error: null });
      mockDb.from.mockReturnValue(builder);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('deletes an existing show', async () => {
      const findBuilder = mockBuilder({ data: { id: 'show-1' }, error: null });
      const deleteBuilder = mockBuilder({ data: null, error: null });

      let callCount = 0;
      mockDb.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? findBuilder : deleteBuilder;
      });

      const result = await service.remove('show-1');
      expect(result).toEqual({ deleted: true, id: 'show-1' });
    });
  });
});
