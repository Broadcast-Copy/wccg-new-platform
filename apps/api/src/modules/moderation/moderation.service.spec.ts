import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ModerationService } from './moderation.service.js';
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

describe('ModerationService', () => {
  let service: ModerationService;
  let mockDb: { from: jest.Mock };

  beforeEach(async () => {
    mockDb = { from: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModerationService,
        { provide: SupabaseDbService, useValue: mockDb },
      ],
    }).compile();

    service = module.get<ModerationService>(ModerationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── findQueue ─────────────────────────────────────────────────

  describe('findQueue', () => {
    it('returns formatted pending items', async () => {
      const rows = [
        {
          id: 'mod-1',
          content_type: 'post',
          content_id: 'post-1',
          submitter_id: 'user-1',
          status: 'pending',
          reviewer_id: null,
          reviewer_notes: null,
          rejection_reason: null,
          reviewed_at: null,
          metadata: {},
          created_at: '2026-04-01T00:00:00Z',
          updated_at: '2026-04-01T00:00:00Z',
        },
      ];
      const builder = mockBuilder({ data: rows, error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.findQueue();

      expect(mockDb.from).toHaveBeenCalledWith('moderation_queue');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('mod-1');
      expect(result[0].contentType).toBe('post');
      expect(result[0].status).toBe('pending');
    });

    it('returns empty array when no pending items', async () => {
      const builder = mockBuilder({ data: [], error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.findQueue();
      expect(result).toEqual([]);
    });
  });

  // ─── approve ──────────────────────────────────────────────────

  describe('approve', () => {
    it('throws NotFoundException for missing item', async () => {
      const builder = mockBuilder({ data: null, error: { message: 'not found' } });
      mockDb.from.mockReturnValue(builder);

      await expect(
        service.approve('nonexistent', 'reviewer-1', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for already-reviewed item', async () => {
      const builder = mockBuilder({ data: { status: 'approved' }, error: null });
      mockDb.from.mockReturnValue(builder);

      await expect(
        service.approve('mod-1', 'reviewer-1', {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── reject ───────────────────────────────────────────────────

  describe('reject', () => {
    it('throws NotFoundException for missing item', async () => {
      const builder = mockBuilder({ data: null, error: { message: 'not found' } });
      mockDb.from.mockReturnValue(builder);

      await expect(
        service.reject('nonexistent', 'reviewer-1', { reason: 'spam' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for already-rejected item', async () => {
      const builder = mockBuilder({ data: { status: 'rejected' }, error: null });
      mockDb.from.mockReturnValue(builder);

      await expect(
        service.reject('mod-1', 'reviewer-1', { reason: 'spam' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
