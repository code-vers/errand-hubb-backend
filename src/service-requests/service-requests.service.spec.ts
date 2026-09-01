import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { ServiceRequestsService } from './service-requests.service.js';
import { createMockPrismaService } from '../test-utils/mock-prisma.js';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('ServiceRequestsService', () => {
  let service: ServiceRequestsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    service = new ServiceRequestsService(mockPrisma);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create service request', async () => {
      mockPrisma.serviceRequest.create.mockResolvedValueOnce({
        id: 'sr-1',
        title: 'Need Plumbing',
        status: 'active',
      });

      const result = await service.create('u-1', {
        title: 'Need Plumbing',
        description: 'Fix leaky pipe',
        categoryId: 'c-1',
        city: 'Austin',
        state: 'TX',
        budget: 100,
      });

      expect(mockPrisma.serviceRequest.create).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'sr-1');
    });
  });

  describe('findMyRequestById', () => {
    it('should throw NotFoundException if request not found', async () => {
      mockPrisma.serviceRequest.findUnique.mockResolvedValueOnce(null);
      await expect(service.findMyRequestById('sr-1', 'u-1')).rejects.toThrow(NotFoundException);
    });

    it('should return request when found', async () => {
      mockPrisma.serviceRequest.findUnique.mockResolvedValueOnce({
        id: 'sr-1',
        userId: 'u-1',
        title: 'Need Plumbing',
      });

      const result = await service.findMyRequestById('sr-1', 'u-1');
      expect(result).toHaveProperty('id', 'sr-1');
    });
  });

  describe('changeStatus', () => {
    it('should throw NotFoundException if request does not exist or user is unauthorized', async () => {
      mockPrisma.serviceRequest.findUnique.mockResolvedValueOnce(null);
      await expect(service.changeStatus('sr-1', 'u-1', 'completed')).rejects.toThrow(NotFoundException);
    });

    it('should update request status', async () => {
      mockPrisma.serviceRequest.findUnique.mockResolvedValueOnce({
        id: 'sr-1',
        userId: 'u-1',
        status: 'active',
      });
      mockPrisma.serviceRequest.update.mockResolvedValueOnce({
        id: 'sr-1',
        status: 'completed',
      });

      const result = await service.changeStatus('sr-1', 'u-1', 'completed');
      expect(mockPrisma.serviceRequest.update).toHaveBeenCalled();
      expect(result).toHaveProperty('status', 'completed');
    });
  });
});
