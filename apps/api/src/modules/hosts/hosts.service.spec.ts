import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { HostsService } from './hosts.service.js';
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

describe('HostsService', () => {
  let service: HostsService;
  let mockDb: { from: jest.Mock };

  beforeEach(async () => {
    mockDb = { from: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HostsService,
        { provide: SupabaseDbService, useValue: mockDb },
      ],
    }).compile();

    service = module.get<HostsService>(HostsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── findAll ───────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns formatted hosts list', async () => {
      const rows = [
        {
          id: 'host-1',
          name: 'DJ Mike',
          slug: 'dj-mike',
          bio: 'Legendary DJ',
          avatar_url: 'https://img.test/mike.jpg',
          email: 'mike@wccg.fm',
          is_active: true,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: null,
        },
        {
          id: 'host-2',
          name: 'MC Sarah',
          slug: 'mc-sarah',
          bio: null,
          avatar_url: null,
          email: null,
          is_active: true,
          created_at: '2026-01-02T00:00:00Z',
          updated_at: null,
        },
      ];

      const builder = mockBuilder({ data: rows, error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.findAll();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('host-1');
      expect(result[0].name).toBe('DJ Mike');
      expect(result[0].avatarUrl).toBe('https://img.test/mike.jpg');
      expect(result[1].bio).toBeNull();
    });

    it('returns empty array when no hosts exist', async () => {
      const builder = mockBuilder({ data: [], error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  // ─── findById ──────────────────────────────────────────────────

  describe('findById', () => {
    it('throws NotFoundException when host does not exist', async () => {
      const builder = mockBuilder({ data: null, error: { message: 'not found' } });
      mockDb.from.mockReturnValue(builder);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('returns host with associated shows', async () => {
      const hostRow = {
        id: 'host-1',
        name: 'DJ Mike',
        slug: 'dj-mike',
        bio: 'Legendary DJ',
        avatar_url: null,
        email: 'mike@wccg.fm',
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: null,
        show_hosts: [
          {
            is_primary: true,
            shows: { id: 'show-1', name: 'Morning Vibes', slug: 'morning-vibes', image_url: null },
          },
          {
            is_primary: false,
            shows: { id: 'show-2', name: 'Late Night', slug: 'late-night', image_url: null },
          },
        ],
      };

      const builder = mockBuilder({ data: hostRow, error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.findById('host-1');

      expect(result.id).toBe('host-1');
      expect(result.name).toBe('DJ Mike');
      expect(result.shows).toHaveLength(2);
      expect(result.shows[0].name).toBe('Morning Vibes');
      expect(result.shows[0].isPrimary).toBe(true);
      expect(result.shows[1].isPrimary).toBe(false);
    });
  });

  // ─── create ────────────────────────────────────────────────────

  describe('create', () => {
    it('throws ConflictException on duplicate slug', async () => {
      const builder = mockBuilder({ data: null, error: { code: '23505', message: 'duplicate key' } });
      mockDb.from.mockReturnValue(builder);

      await expect(
        service.create({ name: 'DJ Mike', slug: 'dj-mike' }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates a host and returns result via findById', async () => {
      const insertedRow = {
        id: 'host-new',
        name: 'New Host',
        slug: 'new-host',
        bio: 'Fresh on air',
        avatar_url: null,
        email: null,
        is_active: true,
        created_at: '2026-04-02T00:00:00Z',
        updated_at: null,
      };

      const fullHost = {
        ...insertedRow,
        show_hosts: [],
      };

      // Call 1: insert (uses .single())
      const insertBuilder = mockBuilder({ data: insertedRow, error: null });
      // Call 2: findById re-fetch (uses .single())
      const findBuilder = mockBuilder({ data: fullHost, error: null });

      let callCount = 0;
      mockDb.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? insertBuilder : findBuilder;
      });

      const result = await service.create({ name: 'New Host', bio: 'Fresh on air' });

      expect(result.id).toBe('host-new');
      expect(result.name).toBe('New Host');
      expect(result.shows).toEqual([]);
    });

    it('auto-generates slug from name when slug is not provided', async () => {
      const insertedRow = {
        id: 'host-new',
        name: 'DJ Cool Beans',
        slug: 'dj-cool-beans',
        bio: null,
        avatar_url: null,
        email: null,
        is_active: true,
        created_at: '2026-04-02T00:00:00Z',
        updated_at: null,
      };

      const insertBuilder = mockBuilder({ data: insertedRow, error: null });
      const findBuilder = mockBuilder({ data: { ...insertedRow, show_hosts: [] }, error: null });

      let callCount = 0;
      mockDb.from.mockImplementation(() => {
        callCount++;
        return callCount === 1 ? insertBuilder : findBuilder;
      });

      await service.create({ name: 'DJ Cool Beans' });

      expect(insertBuilder.insert).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'dj-cool-beans' }),
      );
    });
  });

  // ─── remove ────────────────────────────────────────────────────

  describe('remove', () => {
    it('throws NotFoundException when host does not exist', async () => {
      const builder = mockBuilder({ data: null, error: { message: 'not found' } });
      mockDb.from.mockReturnValue(builder);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('deletes show_hosts associations then the host', async () => {
      const hostRow = {
        id: 'host-1',
        name: 'DJ Mike',
        slug: 'dj-mike',
        bio: null,
        avatar_url: null,
        email: null,
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: null,
        show_hosts: [],
      };

      // Call 1: findById (single) -- verifies existence
      const findBuilder = mockBuilder({ data: hostRow, error: null });
      // Call 2: delete show_hosts
      const deleteHostsBuilder = mockBuilder({ data: null, error: null });
      // Call 3: delete host
      const deleteBuilder = mockBuilder({ data: null, error: null });

      let callCount = 0;
      mockDb.from.mockImplementation(() => {
        callCount++;
        switch (callCount) {
          case 1: return findBuilder;
          case 2: return deleteHostsBuilder;
          case 3: return deleteBuilder;
          default: return mockBuilder();
        }
      });

      const result = await service.remove('host-1');

      expect(result).toEqual({ deleted: true, id: 'host-1' });
      // Verify show_hosts was targeted for deletion
      expect(mockDb.from).toHaveBeenCalledWith('show_hosts');
      expect(mockDb.from).toHaveBeenCalledWith('hosts');
    });
  });
});
