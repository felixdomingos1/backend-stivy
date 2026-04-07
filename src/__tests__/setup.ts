import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

jest.mock('../config/database', () => ({
  __esModule: true,
  default: mockDeep<PrismaClient>()
}));

import prisma from '../config/database';

const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>;

beforeEach(() => {
  mockReset(prismaMock);
});

global.prismaMock = prismaMock;

export { prismaMock };
