import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventsService } from './events.service.js';
import { SupabaseDbService } from '../../common/supabase/supabase-db.service.js';

function mockBuilder(returnValue: any = { data: null, error: null, count: 0 }) {
  const b: any = {};
  for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'gte', 'in', 'order', 'range', 'limit', 'single', 'maybeSingle', 'upsert']) {
    b[m] = jest.fn().mockReturnValue(b);
  }
  b.single = jest.fn().mockResolvedValue(returnValue);
  b.maybeSingle = jest.fn().mockResolvedValue(returnValue);
  b.then = (resolve: any) => resolve(returnValue);
  return b;
}

describe('EventsService', () => {
  let service: EventsService;
  let mockDb: { from: jest.Mock };

  beforeEach(async () => {
    mockDb = { from: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventsService,
        { provide: SupabaseDbService, useValue: mockDb },
      ],
    }).compile();
    service = module.get<EventsService>(EventsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('returns formatted events', async () => {
      const builder = mockBuilder({
        data: [{ id: 'e1', title: 'Test', creator_id: 'u1', status: 'PUBLISHED', visibility: 'PUBLIC' }],
        error: null,
      });
      mockDb.from.mockReturnValue(builder);

      const result = await service.findAll();
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].id).toBe('e1');
    });
  });

  describe('findById', () => {
    it('throws NotFoundException for missing event', async () => {
      const builder = mockBuilder({ data: null, error: { message: 'not found' } });
      mockDb.from.mockReturnValue(builder);

      await expect(service.findById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('register', () => {
    it('throws NotFoundException for missing event', async () => {
      const builder = mockBuilder({ data: null, error: null });
      mockDb.from.mockReturnValue(builder);

      await expect(
        service.register('nonexistent', 'user-1', {}),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException for cancelled event', async () => {
      const builder = mockBuilder({ data: { id: 'e1', status: 'CANCELLED' }, error: null });
      mockDb.from.mockReturnValue(builder);

      await expect(
        service.register('e1', 'user-1', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException for duplicate registration', async () => {
      // First call: get event (exists, not cancelled)
      const eventBuilder = mockBuilder({ data: { id: 'e1', status: 'PUBLISHED', max_attendees: null }, error: null });
      // Second call: check duplicate (count > 0)
      const dupBuilder = mockBuilder({ data: null, error: null, count: 1 });

      let callCount = 0;
      mockDb.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return eventBuilder;
        return dupBuilder;
      });

      await expect(
        service.register('e1', 'user-1', {}),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('checkin', () => {
    it('throws NotFoundException for missing registration', async () => {
      const builder = mockBuilder({ data: null, error: null });
      mockDb.from.mockReturnValue(builder);

      await expect(
        service.checkin('nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('throws NotFoundException for missing event', async () => {
      const builder = mockBuilder({ data: null, error: null });
      mockDb.from.mockReturnValue(builder);

      await expect(
        service.remove('nonexistent', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException for non-owner', async () => {
      // Event exists but different creator
      const eventBuilder = mockBuilder({ data: { creator_id: 'other-user' }, error: null });
      // Organizer check returns empty
      const orgBuilder = mockBuilder({ data: [], error: null });

      let callCount = 0;
      mockDb.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return eventBuilder;
        return orgBuilder;
      });

      await expect(
        service.remove('e1', 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
