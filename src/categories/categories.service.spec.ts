import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { CategoriesService } from './categories.service.js';
import { createMockPrismaService } from '../test-utils/mock-prisma.js';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = createMockPrismaService();
    service = new CategoriesService(mockPrisma);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw ConflictException if category name exists', async () => {
      mockPrisma.category.findUnique.mockResolvedValueOnce({ id: 'c-1', name: 'Cleaning' });
      await expect(service.create({ name: 'Cleaning' } as any)).rejects.toThrow(ConflictException);
    });

    it('should create new category', async () => {
      mockPrisma.category.findUnique.mockResolvedValueOnce(null);
      mockPrisma.category.create.mockResolvedValueOnce({ id: 'c-1', name: 'Cleaning' });

      const result = await service.create({ name: 'Cleaning' } as any);
      expect(mockPrisma.category.create).toHaveBeenCalled();
      expect(result).toHaveProperty('id', 'c-1');
    });
  });

  describe('findActive', () => {
    it('should return active categories', async () => {
      mockPrisma.category.findMany.mockResolvedValueOnce([{ id: 'c-1', name: 'Cleaning', isActive: true }]);
      const result = await service.findActive();
      expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
        where: { status: 'active' },
        orderBy: { name: 'asc' },
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if category not found', async () => {
      mockPrisma.category.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne('c-nonexistent')).rejects.toThrow(NotFoundException);
    });
  });
});
