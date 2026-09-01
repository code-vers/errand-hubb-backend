import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { UsersController } from './users.controller.js';
import { UsersService } from './users.service.js';
import { NotFoundException } from '@nestjs/common';

describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<Partial<UsersService>>;

  beforeEach(() => {
    service = {
      findOneById: jest.fn<any>().mockResolvedValue({ id: 'u-1', firstName: 'Alice', rating: 4.8, reviewCount: 5 }),
      updateFullProfile: jest.fn<any>().mockResolvedValue({ id: 'u-1', firstName: 'Alice Updated' }),
      requestDeleteAccount: jest.fn<any>().mockResolvedValue({ message: 'Verification code sent' }),
      deleteAccount: jest.fn<any>().mockResolvedValue({ message: 'Account deleted' }),
      findAllUsersForAdmin: jest.fn<any>().mockResolvedValue([]),
      updateUserStatus: jest.fn<any>().mockResolvedValue({ id: 'u-1', status: 'banned' }),
    };

    controller = new UsersController(service as unknown as UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMe', () => {
    it('should return current user profile', async () => {
      const req = { user: { id: 'u-1' } };
      const result = await controller.getMe(req);
      expect(service.findOneById).toHaveBeenCalledWith('u-1');
      expect(result).toHaveProperty('id', 'u-1');
      expect(result).toHaveProperty('rating', 4.8);
    });

    it('should throw NotFoundException if user not found', async () => {
      service.findOneById?.mockResolvedValueOnce(null);
      const req = { user: { id: 'nonexistent' } };
      await expect(controller.getMe(req)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    it('should update full profile successfully', async () => {
      const req = { user: { id: 'u-1' } };
      const dto: any = { firstName: 'Alice Updated', lastName: 'Smith' };
      const result = await controller.updateProfile(req, dto, undefined);
      expect(service.updateFullProfile).toHaveBeenCalled();
      expect(result).toHaveProperty('firstName', 'Alice Updated');
    });
  });

  describe('admin methods', () => {
    it('should fetch all users for admin', async () => {
      const result = await controller.getAllUsersForAdmin();
      expect(service.findAllUsersForAdmin).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should update user status for admin', async () => {
      const result = await controller.updateUserStatus('u-1', 'banned');
      expect(service.updateUserStatus).toHaveBeenCalledWith('u-1', 'banned');
      expect(result).toEqual({ id: 'u-1', status: 'banned' });
    });
  });
});
