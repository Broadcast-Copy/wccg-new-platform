import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CmsService } from './cms.service.js';
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

describe('CmsService', () => {
  let service: CmsService;
  let mockDb: { from: jest.Mock };

  beforeEach(async () => {
    mockDb = { from: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CmsService,
        { provide: SupabaseDbService, useValue: mockDb },
      ],
    }).compile();

    service = module.get<CmsService>(CmsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── findAll ──────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns formatted content blocks', async () => {
      const rows = [
        {
          id: 'block-1',
          slug: 'hero-title',
          content_type: 'text',
          title: 'Hero Title',
          value: 'Welcome to WCCG',
          metadata: {},
          page: 'home',
          updated_by: 'admin-1',
          created_at: '2026-04-01T00:00:00Z',
          updated_at: '2026-04-01T00:00:00Z',
        },
      ];
      const builder = mockBuilder({ data: rows, error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.findAll();

      expect(mockDb.from).toHaveBeenCalledWith('site_content');
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe('hero-title');
      expect(result[0].contentType).toBe('text');
      expect(result[0].value).toBe('Welcome to WCCG');
    });

    it('filters by page when provided', async () => {
      const builder = mockBuilder({ data: [], error: null });
      mockDb.from.mockReturnValue(builder);

      await service.findAll('home');

      expect(builder.eq).toHaveBeenCalledWith('page', 'home');
    });

    it('returns empty array when no content blocks exist', async () => {
      const builder = mockBuilder({ data: [], error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  // ─── findBySlug (not found) ───────────────────────────────────

  describe('findBySlug', () => {
    it('throws NotFoundException for missing slug', async () => {
      const builder = mockBuilder({ data: null, error: null });
      mockDb.from.mockReturnValue(builder);

      await expect(service.findBySlug('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('returns formatted content block when found', async () => {
      const row = {
        id: 'block-1',
        slug: 'hero-title',
        content_type: 'text',
        title: 'Hero Title',
        value: 'Welcome to WCCG',
        metadata: {},
        page: 'home',
        updated_by: 'admin-1',
        created_at: '2026-04-01T00:00:00Z',
        updated_at: '2026-04-01T00:00:00Z',
      };
      const builder = mockBuilder({ data: row, error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.findBySlug('hero-title');

      expect(result.slug).toBe('hero-title');
      expect(result.updatedBy).toBe('admin-1');
    });
  });

  // ─── upsert ───────────────────────────────────────────────────

  describe('upsert', () => {
    it('throws ForbiddenException for non-admin user', async () => {
      // requireAdmin check returns no admin role
      const builder = mockBuilder({ data: null, error: null });
      mockDb.from.mockReturnValue(builder);

      await expect(
        service.upsert('hero-title', 'non-admin', { title: 'New Title', content_type: 'text', value: 'New value' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('upserts content block when user is admin', async () => {
      const adminBuilder = mockBuilder({ data: { role_id: 'admin' }, error: null });
      const upsertedRow = {
        id: 'block-1',
        slug: 'hero-title',
        content_type: 'text',
        title: 'Updated Title',
        value: 'Updated value',
        metadata: {},
        page: 'home',
        updated_by: 'admin-1',
        created_at: '2026-04-01T00:00:00Z',
        updated_at: '2026-04-02T00:00:00Z',
      };
      const upsertBuilder = mockBuilder({ data: upsertedRow, error: null });

      mockDb.from
        .mockReturnValueOnce(adminBuilder)   // requireAdmin check
        .mockReturnValueOnce(upsertBuilder); // upsert call

      const result = await service.upsert('hero-title', 'admin-1', {
        title: 'Updated Title',
        content_type: 'text',
        value: 'Updated value',
        page: 'home',
      });

      expect(result.title).toBe('Updated Title');
      expect(result.value).toBe('Updated value');
    });
  });

  // ─── remove ───────────────────────────────────────────────────

  describe('remove', () => {
    it('throws ForbiddenException for non-admin user', async () => {
      const builder = mockBuilder({ data: null, error: null });
      mockDb.from.mockReturnValue(builder);

      await expect(
        service.remove('hero-title', 'non-admin'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deletes content block when user is admin', async () => {
      const adminBuilder = mockBuilder({ data: { role_id: 'admin' }, error: null });
      const deleteBuilder = mockBuilder({ data: null, error: null });

      mockDb.from
        .mockReturnValueOnce(adminBuilder)  // requireAdmin check
        .mockReturnValueOnce(deleteBuilder); // delete call

      const result = await service.remove('hero-title', 'admin-1');

      expect(result).toEqual({ deleted: true });
    });
  });
});
