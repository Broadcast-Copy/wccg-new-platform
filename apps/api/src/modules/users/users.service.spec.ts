import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service.js';
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

const MOCK_PROFILE = {
  id: 'user-1', email: 'test@test.com', first_name: 'John', last_name: 'Doe',
  display_name: 'johndoe', avatar_url: null, is_active: true,
  user_roles: [{ role_id: 'listener' }],
  created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
};

describe('UsersService', () => {
  let service: UsersService;
  let mockDb: { from: jest.Mock };

  beforeEach(async () => {
    mockDb = { from: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: SupabaseDbService, useValue: mockDb },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findMe', () => {
    it('returns formatted profile', async () => {
      const builder = mockBuilder({ data: MOCK_PROFILE, error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.findMe('user-1');
      expect(result.id).toBe('user-1');
      expect(result.displayName).toBe('johndoe');
      expect(result.roles).toEqual(['listener']);
    });

    it('throws NotFoundException for missing user', async () => {
      const builder = mockBuilder({ data: null, error: null });
      mockDb.from.mockReturnValue(builder);

      await expect(service.findMe('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findMyRoles', () => {
    it('returns roles array', async () => {
      const builder = mockBuilder({
        data: [{ role_id: 'listener' }, { role_id: 'content_creator' }],
        error: null,
      });
      // Override .then to return data array
      builder.then = (resolve: any) => resolve({ data: [{ role_id: 'listener' }, { role_id: 'content_creator' }], error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.findMyRoles('user-1');
      expect(result.roles).toEqual(['listener', 'content_creator']);
    });

    it('defaults to listener if no roles', async () => {
      const builder = mockBuilder({ data: [], error: null });
      builder.then = (resolve: any) => resolve({ data: [], error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.findMyRoles('user-1');
      expect(result.roles).toEqual(['listener']);
    });
  });

  describe('updateMe', () => {
    it('rejects empty update', async () => {
      await expect(
        service.updateMe('user-1', { isActive: false }),
      ).rejects.toThrow(BadRequestException);
    });

    it('strips restricted fields', async () => {
      const builder = mockBuilder({ data: MOCK_PROFILE, error: null });
      mockDb.from.mockReturnValue(builder);

      // isActive should be stripped, only displayName passes through
      await service.updateMe('user-1', { displayName: 'newname', isActive: false });

      // The update call should not include is_active
      const updateCalls = builder.update.mock.calls;
      if (updateCalls.length > 0) {
        expect(updateCalls[0][0]).not.toHaveProperty('is_active');
      }
    });
  });

  describe('isSuperAdmin', () => {
    it('returns true for super admin', async () => {
      const builder = mockBuilder({ data: { role_id: 'super_admin' }, error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.isSuperAdmin('user-1');
      expect(result).toBe(true);
    });

    it('returns false for non-admin', async () => {
      const builder = mockBuilder({ data: null, error: null });
      mockDb.from.mockReturnValue(builder);

      const result = await service.isSuperAdmin('user-1');
      expect(result).toBe(false);
    });
  });

  describe('updateRoles', () => {
    it('throws NotFoundException for missing user', async () => {
      const builder = mockBuilder({ data: null, error: null });
      mockDb.from.mockReturnValue(builder);

      await expect(
        service.updateRoles('nonexistent', ['listener']),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
