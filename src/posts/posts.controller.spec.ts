import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { PostsController } from './posts.controller.js';
import { PostsService } from './posts.service.js';

describe('PostsController', () => {
  let controller: PostsController;
  let service: jest.Mocked<Partial<PostsService>>;

  beforeEach(() => {
    service = {
      create: jest.fn<any>().mockResolvedValue({ id: 'p-1', title: 'Groceries' }),
      findAll: jest.fn<any>().mockResolvedValue({ data: [], meta: { total: 0 } }),
      findByUser: jest.fn<any>().mockResolvedValue([]),
      findOne: jest.fn<any>().mockResolvedValue({ id: 'p-1', title: 'Groceries' }),
      update: jest.fn<any>().mockResolvedValue({ id: 'p-1', title: 'Updated' }),
      remove: jest.fn<any>().mockResolvedValue({ id: 'p-1' }),
      markCompleted: jest.fn<any>().mockResolvedValue({ id: 'p-1', status: 'completed' }),
      assignPost: jest.fn<any>().mockResolvedValue({ id: 'p-1', assignedToId: 'e-1' }),
      adminUpdate: jest.fn<any>().mockResolvedValue({ id: 'p-1', title: 'Admin Updated' }),
      adminRemove: jest.fn<any>().mockResolvedValue({ id: 'p-1' }),
    };

    controller = new PostsController(service as unknown as PostsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create post with authenticated user ID', async () => {
      const req = { user: { sub: 'u-1' } };
      const dto: any = { title: 'Groceries', description: 'Buy milk', categoryId: 'c-1', city: 'Austin', state: 'TX' };
      const result = await controller.create(req, dto);
      expect(service.create).toHaveBeenCalledWith('u-1', dto);
      expect(result).toHaveProperty('id', 'p-1');
    });
  });

  describe('findAll', () => {
    it('should call postsService.findAll with query parameters', async () => {
      const result = await controller.findAll('c-1', 'Austin', 'milk', '10', '50', '1', '10');
      expect(service.findAll).toHaveBeenCalled();
      expect(result).toHaveProperty('meta');
    });
  });

  describe('markCompleted', () => {
    it('should mark post completed', async () => {
      const req = { user: { sub: 'u-1' } };
      const result = await controller.markCompleted('p-1', req, 'e-1');
      expect(service.markCompleted).toHaveBeenCalledWith('p-1', 'u-1', 'e-1');
      expect(result).toEqual({ id: 'p-1', status: 'completed' });
    });
  });

  describe('assignPost', () => {
    it('should assign errander to post', async () => {
      const req = { user: { sub: 'u-1' } };
      const result = await controller.assignPost('p-1', req, 'e-1');
      expect(service.assignPost).toHaveBeenCalledWith('p-1', 'u-1', 'e-1');
      expect(result).toEqual({ id: 'p-1', assignedToId: 'e-1' });
    });
  });
});
