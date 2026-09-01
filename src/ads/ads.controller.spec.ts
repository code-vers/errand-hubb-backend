import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { AdsController } from './ads.controller.js';
import { AdsService } from './ads.service.js';
import { ForbiddenException } from '@nestjs/common';

describe('AdsController', () => {
  let controller: AdsController;
  let service: jest.Mocked<Partial<AdsService>>;

  beforeEach(() => {
    service = {
      create: jest.fn<any>().mockResolvedValue({ id: 'ad-1', title: 'Car Repair Ad' }),
      findAll: jest.fn<any>().mockResolvedValue({ data: [], meta: { total: 0 } }),
      findByUser: jest.fn<any>().mockResolvedValue([]),
      getCategories: jest.fn<any>().mockResolvedValue([]),
      findOne: jest.fn<any>().mockResolvedValue({ id: 'ad-1', title: 'Car Repair Ad' }),
      update: jest.fn<any>().mockResolvedValue({ id: 'ad-1', title: 'Updated Ad' }),
      remove: jest.fn<any>().mockResolvedValue({ id: 'ad-1' }),
      reorderAds: jest.fn<any>().mockResolvedValue({ success: true }),
    };

    controller = new AdsController(service as unknown as AdsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create ad for user', async () => {
      const req = { user: { sub: 'u-1' } };
      const dto: any = { title: 'Car Repair Ad', categoryId: 'c-1', location: 'Austin', price: 50 };
      const result = await controller.create(req, dto);
      expect(service.create).toHaveBeenCalledWith('u-1', dto);
      expect(result).toHaveProperty('id', 'ad-1');
    });
  });

  describe('adminCreate', () => {
    it('should throw ForbiddenException if user is not admin', () => {
      const req = { user: { role: 'client' } };
      expect(() => controller.adminCreate(req, {} as any)).toThrow(ForbiddenException);
    });

    it('should create ad when user is admin', async () => {
      const req = { user: { sub: 'u-admin', role: 'admin' } };
      const dto: any = { title: 'Admin Banner Ad' };
      const result = await controller.adminCreate(req, dto);
      expect(service.create).toHaveBeenCalledWith('u-admin', dto);
      expect(result).toHaveProperty('id', 'ad-1');
    });
  });

  describe('uploadImage', () => {
    it('should return uploaded ad image url', () => {
      const mockFile: any = { filename: 'banner.jpg' };
      const result = controller.uploadImage(mockFile);
      expect(result).toEqual({ url: '/media/ads/banner.jpg' });
    });
  });
});
