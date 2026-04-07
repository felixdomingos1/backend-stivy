import { DeepMockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

declare global {
  var prismaMock: DeepMockProxy<PrismaClient>;
}

export { };
