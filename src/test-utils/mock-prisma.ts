import { jest } from '@jest/globals';

export const createMockPrismaService = () => {
  const createModelMock = () => ({
    findUnique: jest.fn<any>().mockResolvedValue(null),
    findFirst: jest.fn<any>().mockResolvedValue(null),
    findMany: jest.fn<any>().mockResolvedValue([]),
    create: jest.fn<any>().mockImplementation((args: any) => Promise.resolve({ id: 'mock-id', ...(args?.data || {}) })),
    update: jest.fn<any>().mockImplementation((args: any) => Promise.resolve({ id: 'mock-id', ...(args?.data || {}) })),
    updateMany: jest.fn<any>().mockResolvedValue({ count: 1 }),
    delete: jest.fn<any>().mockResolvedValue({ id: 'mock-id' }),
    deleteMany: jest.fn<any>().mockResolvedValue({ count: 1 }),
    count: jest.fn<any>().mockResolvedValue(0),
    aggregate: jest.fn<any>().mockResolvedValue({ _count: 0, _sum: {}, _avg: {} }),
    groupBy: jest.fn<any>().mockResolvedValue([]),
    upsert: jest.fn<any>().mockImplementation((args: any) => Promise.resolve({ id: 'mock-id', ...(args?.create || {}) })),
  });

  return {
    user: createModelMock(),
    profile: createModelMock(),
    post: createModelMock(),
    review: createModelMock(),
    category: createModelMock(),
    ad: createModelMock(),
    adSubscription: createModelMock(),
    adsSubscription: createModelMock(),
    adPosition: createModelMock(),
    subscription: createModelMock(),
    paymentHistory: createModelMock(),
    serviceRequest: createModelMock(),
    conversation: createModelMock(),
    message: createModelMock(),
    notification: createModelMock(),
    merchandiseOrder: createModelMock(),
    loginActivity: createModelMock(),
    securityLog: createModelMock(),
    twoFactorRecoveryCode: createModelMock(),
    $transaction: jest.fn<any>().mockImplementation((cb: any) => {
      if (typeof cb === 'function') {
        return cb(createMockPrismaService());
      }
      return Promise.all(cb);
    }),
    $queryRaw: jest.fn<any>().mockResolvedValue([]),
    $executeRaw: jest.fn<any>().mockResolvedValue(0),
  };
};
