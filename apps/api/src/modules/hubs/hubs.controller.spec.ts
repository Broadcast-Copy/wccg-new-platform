import { Test, TestingModule } from '@nestjs/testing';
import { HubsController } from './hubs.controller.js';
import { HubsService } from './hubs.service.js';

describe('HubsController', () => {
  let controller: HubsController;
  let mockService: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockService = {
      listPosts: jest.fn().mockResolvedValue({ posts: [], total: 0, page: 1, pageSize: 20 }),
      createPost: jest.fn().mockResolvedValue({ id: 'post-1' }),
      deletePost: jest.fn().mockResolvedValue({ deleted: true }),
      likePost: jest.fn().mockResolvedValue({ liked: true }),
      unlikePost: jest.fn().mockResolvedValue({ unliked: true }),
      checkMembership: jest.fn().mockResolvedValue({ isMember: false }),
      joinHub: jest.fn().mockResolvedValue({ joined: true }),
      leaveHub: jest.fn().mockResolvedValue({ left: true }),
      getStats: jest.fn().mockResolvedValue({ members: 0, totalPosts: 0, postsThisWeek: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HubsController],
      providers: [{ provide: HubsService, useValue: mockService }],
    }).compile();

    controller = module.get<HubsController>(HubsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ─── Posts routes ───────────────────────────────────────────────

  describe('listPosts', () => {
    it('calls service with hub type and page', async () => {
      await controller.listPosts('creator', '2');
      expect(mockService.listPosts).toHaveBeenCalledWith('creator', 2);
    });

    it('defaults to page 1', async () => {
      await controller.listPosts('vendor');
      expect(mockService.listPosts).toHaveBeenCalledWith('vendor', 1);
    });
  });

  describe('createPost', () => {
    it('passes user sub and body to service', async () => {
      const user = { sub: 'user-1' } as any;
      const body = { content: 'Hello', postType: 'update' };
      await controller.createPost('creator', user, body);
      expect(mockService.createPost).toHaveBeenCalledWith('creator', 'user-1', body);
    });
  });

  describe('deletePost', () => {
    it('passes correct params', async () => {
      const user = { sub: 'user-1' } as any;
      await controller.deletePost('creator', 'post-1', user);
      expect(mockService.deletePost).toHaveBeenCalledWith('creator', 'post-1', 'user-1');
    });
  });

  // ─── Like routes ────────────────────────────────────────────────

  describe('likePost', () => {
    it('passes correct params', async () => {
      const user = { sub: 'user-1' } as any;
      await controller.likePost('creator', 'post-1', user);
      expect(mockService.likePost).toHaveBeenCalledWith('creator', 'post-1', 'user-1');
    });
  });

  describe('unlikePost', () => {
    it('passes correct params', async () => {
      const user = { sub: 'user-1' } as any;
      await controller.unlikePost('vendor', 'post-2', user);
      expect(mockService.unlikePost).toHaveBeenCalledWith('vendor', 'post-2', 'user-1');
    });
  });

  // ─── Membership routes ──────────────────────────────────────────

  describe('checkMembership', () => {
    it('passes user sub', async () => {
      const user = { sub: 'user-1' } as any;
      await controller.checkMembership('listener', user);
      expect(mockService.checkMembership).toHaveBeenCalledWith('listener', 'user-1');
    });
  });

  describe('joinHub', () => {
    it('passes correct params', async () => {
      const user = { sub: 'user-1' } as any;
      await controller.joinHub('listener', user);
      expect(mockService.joinHub).toHaveBeenCalledWith('listener', 'user-1');
    });
  });

  describe('leaveHub', () => {
    it('passes correct params', async () => {
      const user = { sub: 'user-1' } as any;
      await controller.leaveHub('creator', user);
      expect(mockService.leaveHub).toHaveBeenCalledWith('creator', 'user-1');
    });
  });

  // ─── Stats route ────────────────────────────────────────────────

  describe('getStats', () => {
    it('passes hub type', async () => {
      await controller.getStats('vendor');
      expect(mockService.getStats).toHaveBeenCalledWith('vendor');
    });
  });
});
