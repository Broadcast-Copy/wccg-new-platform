import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { RewardsService } from './rewards.service.js';
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

describe('RewardsService', () => {
  let service: RewardsService;
  let mockDb: { from: jest.Mock };

  beforeEach(async () => {
    mockDb = { from: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RewardsService,
        { provide: SupabaseDbService, useValue: mockDb },
      ],
    }).compile();

    service = module.get<RewardsService>(RewardsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── findAll ──────────────────────────────────────────────────

  describe('findAll', () => {
    it('returns formatted rewards list', async () => {
      const rows = [
        {
          id: 'reward-1',
          name: 'T-Shirt',
          description: 'WCCG branded tee',
          image_url: null,
          points_cost: 500,
          category: 'merch',
          stock_count: 10,
          is_active: true,
          created_at: '2026-04-01T00:00:00Z',
          updated_at: '2026-04-01T00:00:00Z',
        },
      ];
      const builder = mockBuilder({ data: rows, error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.findAll();

      expect(mockDb.from).toHaveBeenCalledWith('reward_catalog');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('T-Shirt');
      expect(result[0].pointsCost).toBe(500);
      expect(result[0].isActive).toBe(true);
    });

    it('returns empty array when no rewards exist', async () => {
      const builder = mockBuilder({ data: [], error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.findAll();
      expect(result).toEqual([]);
    });
  });

  // ─── findById (not found) ─────────────────────────────────────

  describe('findById', () => {
    it('throws NotFoundException for missing reward', async () => {
      const builder = mockBuilder({ data: null, error: { message: 'not found' } });
      mockDb.from.mockReturnValue(builder);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('returns formatted reward when found', async () => {
      const row = {
        id: 'reward-1',
        name: 'T-Shirt',
        description: 'WCCG branded tee',
        image_url: 'https://example.com/img.png',
        points_cost: 500,
        category: 'merch',
        stock_count: 10,
        is_active: true,
        created_at: '2026-04-01T00:00:00Z',
        updated_at: '2026-04-01T00:00:00Z',
      };
      const builder = mockBuilder({ data: row, error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.findById('reward-1');

      expect(result.id).toBe('reward-1');
      expect(result.imageUrl).toBe('https://example.com/img.png');
    });
  });

  // ─── create ───────────────────────────────────────────────────

  describe('create', () => {
    it('creates a reward and returns formatted result', async () => {
      const createdRow = {
        id: 'reward-new',
        name: 'Sticker Pack',
        description: 'Cool stickers',
        image_url: null,
        points_cost: 100,
        category: 'merch',
        stock_count: 50,
        is_active: true,
        created_at: '2026-04-02T00:00:00Z',
        updated_at: '2026-04-02T00:00:00Z',
      };
      const builder = mockBuilder({ data: createdRow, error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.create({
        name: 'Sticker Pack',
        description: 'Cool stickers',
        pointsCost: 100,
        category: 'merch',
        stockCount: 50,
      });

      expect(mockDb.from).toHaveBeenCalledWith('reward_catalog');
      expect(result.name).toBe('Sticker Pack');
      expect(result.pointsCost).toBe(100);
      expect(result.stockCount).toBe(50);
    });
  });

  // ─── remove ───────────────────────────────────────────────────

  describe('remove', () => {
    it('throws NotFoundException for missing reward', async () => {
      const builder = mockBuilder({ data: null, error: { message: 'not found' } });
      mockDb.from.mockReturnValue(builder);

      await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('deletes reward and returns confirmation', async () => {
      const row = {
        id: 'reward-1',
        name: 'T-Shirt',
        description: null,
        image_url: null,
        points_cost: 500,
        category: 'merch',
        stock_count: 10,
        is_active: true,
        created_at: '2026-04-01T00:00:00Z',
        updated_at: '2026-04-01T00:00:00Z',
      };
      // First call: findById check, second call: delete
      const findBuilder = mockBuilder({ data: row, error: null });
      const deleteBuilder = mockBuilder({ data: null, error: null });

      mockDb.from
        .mockReturnValueOnce(findBuilder)
        .mockReturnValueOnce(deleteBuilder);

      const result = await service.remove('reward-1');

      expect(result).toEqual({ deleted: true, id: 'reward-1' });
    });
  });
});
