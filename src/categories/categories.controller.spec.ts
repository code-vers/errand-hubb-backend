import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { CategoriesController } from './categories.controller.js';
import { CategoriesService } from './categories.service.js';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let service: jest.Mocked<Partial<CategoriesService>>;

  beforeEach(() => {
    service = {
      create: jest.fn<any>().mockResolvedValue({ id: 'c-1', name: 'Cleaning' }),
      findAll: jest.fn<any>().mockResolvedValue([]),
      findActive: jest.fn<any>().mockResolvedValue([]),
      findOne: jest.fn<any>().mockResolvedValue({ id: 'c-1', name: 'Cleaning' }),
      update: jest.fn<any>().mockResolvedValue({ id: 'c-1', name: 'House Cleaning' }),
      remove: jest.fn<any>().mockResolvedValue({ id: 'c-1' }),
    };

    controller = new CategoriesController(service as unknown as CategoriesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create category', async () => {
      const dto = { name: 'Cleaning', description: 'Cleaning services' };
      const result = await controller.create(dto);
      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toHaveProperty('id', 'c-1');
    });
  });

  describe('findActive', () => {
    it('should return active categories', async () => {
      const result = await controller.findActive();
      expect(service.findActive).toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('uploadIcon', () => {
    it('should return uploaded icon url', () => {
      const mockFile: any = { filename: 'icon.png' };
      const result = controller.uploadIcon(mockFile);
      expect(result).toEqual({ url: '/media/categories/icon.png' });
    });
  });
});
