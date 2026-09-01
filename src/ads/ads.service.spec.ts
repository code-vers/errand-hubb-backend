import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { AdsService } from './ads.service.js';
import { createMockPrismaService } from '../test-utils/mock-prisma.js';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('AdsService', () => {
  let service: AdsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    service = new AdsService(mockPrisma);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create advertisement', async () => {
      mockPrisma.ad.create.mockResolvedValueOnce({
        id: 'ad-1',
        title: 'New Service Ad',
        userId: 'u-1',
      });

      const result = await service.create('u-1', {
        title: 'New Service Ad',
        description: 'Quality cleaning',
        categoryId: 'c-1',
        price: 50,
      } as any);

      expect(mockPrisma.ad.create).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'ad-1');
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if ad does not exist', async () => {
      mockPrisma.ad.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should return ad when found', async () => {
      mockPrisma.ad.findUnique.mockResolvedValueOnce({ id: 'ad-1', title: 'New Service Ad' });
      const result = await service.findOne('ad-1');
      expect(result).toHaveProperty('id', 'ad-1');
    });
  });

  describe('update', () => {
    it('should throw ForbiddenException if updater is not the owner', async () => {
      mockPrisma.ad.findUnique.mockResolvedValueOnce({ id: 'ad-1', userId: 'owner-id' });
      await expect(service.update('ad-1', 'not-owner', { title: 'Updated' } as any)).rejects.toThrow(ForbiddenException);
    });

    it('should update ad when authorized', async () => {
      mockPrisma.ad.findUnique.mockResolvedValueOnce({ id: 'ad-1', userId: 'owner-id' });
      mockPrisma.ad.update.mockResolvedValueOnce({ id: 'ad-1', title: 'Updated' });

      const result = await service.update('ad-1', 'owner-id', { title: 'Updated' } as any);
      expect(mockPrisma.ad.update).toHaveBeenCalled();
      expect(result).toHaveProperty('title', 'Updated');
    });
  });
});
