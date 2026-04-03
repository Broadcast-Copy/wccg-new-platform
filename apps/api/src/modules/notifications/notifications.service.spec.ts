import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
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

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockDb: { from: jest.Mock };

  beforeEach(async () => {
    mockDb = { from: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: SupabaseDbService, useValue: mockDb },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── findByUser ────────────────────────────────────────────────

  describe('findByUser', () => {
    it('returns formatted notifications for a user', async () => {
      const rows = [
        {
          id: 'notif-1',
          user_id: 'user-1',
          type: 'reward',
          title: 'Points earned',
          body: 'You earned 50 points',
          action_url: '/rewards',
          read: false,
          read_at: null,
          metadata: {},
          created_at: '2026-04-01T00:00:00Z',
        },
      ];
      const builder = mockBuilder({ data: rows, error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.findByUser('user-1');

      expect(mockDb.from).toHaveBeenCalledWith('notifications');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('notif-1');
      expect(result[0].type).toBe('reward');
      expect(result[0].actionUrl).toBe('/rewards');
      expect(result[0].read).toBe(false);
    });

    it('returns empty array when user has no notifications', async () => {
      const builder = mockBuilder({ data: [], error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.findByUser('user-1');
      expect(result).toEqual([]);
    });
  });

  // ─── getUnreadCount ───────────────────────────────────────────

  describe('getUnreadCount', () => {
    it('returns the unread count', async () => {
      const builder = mockBuilder({ count: 5, error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.getUnreadCount('user-1');

      expect(result).toEqual({ unreadCount: 5 });
    });

    it('returns zero when no unread notifications', async () => {
      const builder = mockBuilder({ count: 0, error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.getUnreadCount('user-1');

      expect(result).toEqual({ unreadCount: 0 });
    });
  });

  // ─── markAsRead (not owner) ───────────────────────────────────

  describe('markAsRead', () => {
    it('throws NotFoundException for missing notification', async () => {
      const builder = mockBuilder({ data: null, error: { message: 'not found' } });
      mockDb.from.mockReturnValue(builder);

      await expect(
        service.markAsRead('nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when marking another user\'s notification', async () => {
      const builder = mockBuilder({ data: { user_id: 'other-user' }, error: null });
      mockDb.from.mockReturnValue(builder);

      await expect(
        service.markAsRead('notif-1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('marks own notification as read successfully', async () => {
      // First call: fetch notification (owner check)
      const fetchBuilder = mockBuilder({ data: { user_id: 'user-1' }, error: null });
      // Second call: update
      const updateBuilder = mockBuilder({ data: null, error: null });

      mockDb.from
        .mockReturnValueOnce(fetchBuilder)
        .mockReturnValueOnce(updateBuilder);

      const result = await service.markAsRead('notif-1', 'user-1');

      expect(result).toEqual({ id: 'notif-1', read: true });
    });
  });

  // ─── markAllAsRead ────────────────────────────────────────────

  describe('markAllAsRead', () => {
    it('marks all notifications as read and returns success', async () => {
      const builder = mockBuilder({ data: null, error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.markAllAsRead('user-1');

      expect(mockDb.from).toHaveBeenCalledWith('notifications');
      expect(result.success).toBe(true);
    });
  });
});
