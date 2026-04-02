import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { HubsService } from './hubs.service.js';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';

// ── Mock Supabase query builder ─────────────────────────────────
function createMockQueryBuilder(returnValue: any = { data: null, error: null, count: 0 }) {
  const builder: any = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'in', 'gte', 'order', 'range', 'single', 'maybeSingle'];
  for (const method of methods) {
    builder[method] = jest.fn().mockReturnValue(builder);
  }
  // Terminal methods resolve to returnValue
  builder.single = jest.fn().mockResolvedValue(returnValue);
  builder.maybeSingle = jest.fn().mockResolvedValue(returnValue);
  // Default: select/insert/update/delete return builder, and the chain resolves
  builder.then = (resolve: any) => resolve(returnValue);
  return builder;
}

describe('HubsService', () => {
  let service: HubsService;
  let mockDb: { from: jest.Mock };

  beforeEach(async () => {
    mockDb = { from: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HubsService,
        { provide: SupabaseDbService, useValue: mockDb },
      ],
    }).compile();

    service = module.get<HubsService>(HubsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── Validation ─────────────────────────────────────────────────

  describe('hub type validation', () => {
    it('rejects invalid hub type', async () => {
      await expect(service.listPosts('invalid' as any)).rejects.toThrow(BadRequestException);
    });

    it('accepts valid hub types', async () => {
      const builder = createMockQueryBuilder({ data: [], error: null, count: 0 });
      mockDb.from.mockReturnValue(builder);

      // Should not throw
      for (const type of ['creator', 'vendor', 'listener']) {
        await expect(service.getStats(type as any)).resolves.toBeDefined();
      }
    });
  });

  // ─── Posts ──────────────────────────────────────────────────────

  describe('createPost', () => {
    it('rejects empty content', async () => {
      await expect(
        service.createPost('creator', 'user-1', { content: '', postType: 'update' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects whitespace-only content', async () => {
      await expect(
        service.createPost('creator', 'user-1', { content: '   ', postType: 'update' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a post successfully', async () => {
      const mockPost = {
        id: 'post-1',
        hub_type: 'creator',
        user_id: 'user-1',
        post_type: 'update',
        content: 'Hello world',
        media_url: null,
        link_url: null,
        link_title: null,
        likes_count: 0,
        created_at: '2026-04-02T00:00:00Z',
      };

      const builder = createMockQueryBuilder({ data: mockPost, error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.createPost('creator', 'user-1', {
        content: 'Hello world',
        postType: 'update',
      });

      expect(result.id).toBe('post-1');
      expect(result.hubType).toBe('creator');
      expect(result.content).toBe('Hello world');
    });
  });

  describe('deletePost', () => {
    it('throws NotFound for missing post', async () => {
      const builder = createMockQueryBuilder({ data: null, error: null });
      mockDb.from.mockReturnValue(builder);

      await expect(
        service.deletePost('creator', 'nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws Forbidden when deleting another user\'s post', async () => {
      const builder = createMockQueryBuilder({ data: { id: 'post-1', user_id: 'other-user' }, error: null });
      mockDb.from.mockReturnValue(builder);

      await expect(
        service.deletePost('creator', 'post-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ─── Membership ─────────────────────────────────────────────────

  describe('joinHub', () => {
    it('throws Conflict if already a member', async () => {
      const builder = createMockQueryBuilder({ data: { id: 'mem-1' }, error: null });
      mockDb.from.mockReturnValue(builder);

      await expect(
        service.joinHub('creator', 'user-1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('leaveHub', () => {
    it('throws NotFound if not a member', async () => {
      const builder = createMockQueryBuilder({ data: null, error: null });
      mockDb.from.mockReturnValue(builder);

      await expect(
        service.leaveHub('creator', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── Likes ──────────────────────────────────────────────────────

  describe('likePost', () => {
    it('throws NotFound for missing post', async () => {
      const builder = createMockQueryBuilder({ data: null, error: null });
      mockDb.from.mockReturnValue(builder);

      await expect(
        service.likePost('creator', 'nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('unlikePost', () => {
    it('throws NotFound if not liked', async () => {
      const builder = createMockQueryBuilder({ data: null, error: null });
      mockDb.from.mockReturnValue(builder);

      await expect(
        service.unlikePost('creator', 'post-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
