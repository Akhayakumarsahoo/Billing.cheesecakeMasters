import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Prisma } from '@prisma/client';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 2,
});
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ adapter, log: ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Decimal is available directly from the Prisma namespace
export const Decimal = Prisma.Decimal;
export type Decimal = Prisma.Decimal;



