import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PointsService } from './points.service.js';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';

function mockBuilder(returnValue: any = { data: null, error: null, count: 0 }) {
  const b: any = {};
  for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'in', 'order', 'range', 'limit', 'single', 'maybeSingle']) {
    b[m] = jest.fn().mockReturnValue(b);
  }
  b.single = jest.fn().mockResolvedValue(returnValue);
  b.maybeSingle = jest.fn().mockResolvedValue(returnValue);
  b.then = (resolve: any) => resolve(returnValue);
  return b;
}

describe('PointsService', () => {
  let service: PointsService;
  let mockDb: { from: jest.Mock };

  beforeEach(async () => {
    mockDb = { from: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PointsService,
        { provide: SupabaseDbService, useValue: mockDb },
      ],
    }).compile();
    service = module.get<PointsService>(PointsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getBalance', () => {
    it('returns 0 for user with no entries', async () => {
      const builder = mockBuilder({ data: null, error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.getBalance('user-1');
      expect(result).toEqual({ userId: 'user-1', balance: 0 });
    });

    it('returns balance from latest entry', async () => {
      const builder = mockBuilder({ data: { balance: 500 }, error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.getBalance('user-1');
      expect(result).toEqual({ userId: 'user-1', balance: 500 });
    });
  });

  describe('award', () => {
    it('rejects non-positive amounts', async () => {
      await expect(
        service.award('user-1', { amount: 0, reason: 'test' }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.award('user-1', { amount: -5, reason: 'test' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('awards points and returns new entry', async () => {
      const entry = {
        id: 'entry-1', user_id: 'user-1', amount: 100,
        reason: 'listening', reference_type: null, reference_id: null,
        balance: 600, created_at: '2026-04-02T00:00:00Z',
      };

      // First call: get balance
      const balanceBuilder = mockBuilder({ data: { balance: 500 }, error: null });
      // Second call: insert entry
      const insertBuilder = mockBuilder({ data: entry, error: null });

      let callCount = 0;
      mockDb.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return balanceBuilder;
        return insertBuilder;
      });

      const result = await service.award('user-1', { amount: 100, reason: 'listening' });
      expect(result.balance).toBe(600);
      expect(result.type).toBe('earn');
    });
  });

  describe('redeem', () => {
    it('rejects non-positive amounts', async () => {
      await expect(
        service.redeem('user-1', { amount: 0, reason: 'test' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects insufficient balance', async () => {
      const builder = mockBuilder({ data: { balance: 50 }, error: null });
      mockDb.from.mockReturnValue(builder);

      await expect(
        service.redeem('user-1', { amount: 100, reason: 'redeem' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects missing reward', async () => {
      // First call: balance check (sufficient)
      const balanceBuilder = mockBuilder({ data: { balance: 500 }, error: null });
      // Second call: reward lookup (not found)
      const rewardBuilder = mockBuilder({ data: null, error: null });

      let callCount = 0;
      mockDb.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return balanceBuilder;
        return rewardBuilder;
      });

      await expect(
        service.redeem('user-1', { amount: 100, reason: 'redeem', rewardId: 'nonexistent' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejects inactive reward', async () => {
      const balanceBuilder = mockBuilder({ data: { balance: 500 }, error: null });
      const rewardBuilder = mockBuilder({ data: { id: 'r1', is_active: false, stock_count: 5 }, error: null });

      let callCount = 0;
      mockDb.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return balanceBuilder;
        return rewardBuilder;
      });

      await expect(
        service.redeem('user-1', { amount: 100, reason: 'redeem', rewardId: 'r1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects out of stock reward', async () => {
      const balanceBuilder = mockBuilder({ data: { balance: 500 }, error: null });
      const rewardBuilder = mockBuilder({ data: { id: 'r1', is_active: true, stock_count: 0 }, error: null });

      let callCount = 0;
      mockDb.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return balanceBuilder;
        return rewardBuilder;
      });

      await expect(
        service.redeem('user-1', { amount: 100, reason: 'redeem', rewardId: 'r1' }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
