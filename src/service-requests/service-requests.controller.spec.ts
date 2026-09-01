import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { ServiceRequestsController } from './service-requests.controller.js';
import { ServiceRequestsService } from './service-requests.service.js';

describe('ServiceRequestsController', () => {
  let controller: ServiceRequestsController;
  let service: jest.Mocked<Partial<ServiceRequestsService>>;

  beforeEach(() => {
    service = {
      create: jest.fn<any>().mockResolvedValue({ id: 'sr-1', title: 'Need plumbing' }),
      findMyRequests: jest.fn<any>().mockResolvedValue([]),
      findMyRequestById: jest.fn<any>().mockResolvedValue({ id: 'sr-1', title: 'Need plumbing' }),
      update: jest.fn<any>().mockResolvedValue({ id: 'sr-1', title: 'Updated plumbing' }),
      remove: jest.fn<any>().mockResolvedValue({ id: 'sr-1' }),
      changeStatus: jest.fn<any>().mockResolvedValue({ id: 'sr-1', status: 'completed' }),
      findAvailable: jest.fn<any>().mockResolvedValue({ data: [], meta: { total: 0 } }),
      contactClient: jest.fn<any>().mockResolvedValue({ conversationId: 'conv-1' }),
    };

    controller = new ServiceRequestsController(service as unknown as ServiceRequestsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create service request for authenticated client', async () => {
      const req = { user: { sub: 'u-client' } };
      const dto: any = { title: 'Need plumbing', categoryId: 'c-1', city: 'Austin', state: 'TX' };
      const result = await controller.create(req, dto);
      expect(service.create).toHaveBeenCalledWith('u-client', dto);
      expect(result).toHaveProperty('id', 'sr-1');
    });
  });

  describe('changeStatus', () => {
    it('should update request status', async () => {
      const req = { user: { sub: 'u-client' } };
      const result = await controller.changeStatus('sr-1', req, 'completed');
      expect(service.changeStatus).toHaveBeenCalledWith('sr-1', 'u-client', 'completed');
      expect(result).toEqual({ id: 'sr-1', status: 'completed' });
    });
  });
});
